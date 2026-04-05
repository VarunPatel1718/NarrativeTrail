"""
main.py — NarrativeTrail FastAPI backend
All heavy computation done at startup. Every endpoint responds in <100ms.
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from collections import defaultdict
import pandas as pd, numpy as np, json, os, pickle, logging
from dotenv import load_dotenv
import duckdb

load_dotenv()

# ── Silence noisy libraries ───────────────────────────────────────────────────
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("bertopic").setLevel(logging.ERROR)
logging.getLogger("numba").setLevel(logging.ERROR)
logging.getLogger("umap").setLevel(logging.ERROR)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import startup
startup.run()

app = FastAPI(title="NarrativeTrail API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

# ═════════════════════════════════════════════════════════════════════════════
# LOAD DATA
# ═════════════════════════════════════════════════════════════════════════════
print("Loading data...")
df   = pd.read_parquet(f"{DATA_DIR}/processed.parquet")
meta = pd.read_parquet(f"{DATA_DIR}/search_meta.parquet")
con  = duckdb.connect(f"{DATA_DIR}/narrativetrail.db", read_only=True)

import faiss
with open(f"{DATA_DIR}/faiss_index.pkl", "rb") as f:
    _faiss_index = pickle.load(f)
with open(f"{DATA_DIR}/post_ids.pkl", "rb") as f:
    _post_ids: list = pickle.load(f)
_embeddings = np.load(f"{DATA_DIR}/embeddings.npy", allow_pickle=True)

with open(f"{DATA_DIR}/network_subreddit.json") as f: _net_sub  = json.load(f)
with open(f"{DATA_DIR}/network_author.json")    as f: _net_auth = json.load(f)
with open(f"{DATA_DIR}/network_source.json")    as f: _net_src  = json.load(f)
with open(f"{DATA_DIR}/events.json")            as f: _events   = json.load(f)

# ── Normalise clusters.json (handles old k-format AND new topics/points format)
def _to_native(obj):
    if isinstance(obj, dict):  return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):  return [_to_native(v) for v in obj]
    if hasattr(obj, "item"):   return obj.item()
    return obj

def _normalise_clusters(raw: dict) -> dict:
    if "topics" in raw and "points" in raw:
        return _to_native(raw)
    available = [k for k in raw if k.isdigit()]
    if not available:
        return {"topics": [], "points": []}
    best = "8" if "8" in available else available[0]
    d    = raw[best]
    topics = []
    for cid, words in d.get("cluster_labels", {}).items():
        cid_int = int(cid)
        count   = d["labels"].count(cid_int) if "labels" in d else 0
        topics.append({"id": cid_int, "count": count,
                       "label": " ".join(words[:3]) if words else f"Topic {cid}",
                       "words": words[:8]})
    if "labels" in d:
        nc = d["labels"].count(-1)
        if nc:
            topics.append({"id": -1, "count": nc, "label": "Uncategorized", "words": []})
    points = []
    for i in range(len(d.get("labels", []))):
        points.append({
            "id":        str(i),
            "title":     d["titles"][i][:80]    if "titles"     in d else "",
            "subreddit": d["subreddits"][i]      if "subreddits" in d else "",
            "topic_id":  int(d["labels"][i]),
            "x":         float(d["coords"][i][0]) if "coords" in d else 0.0,
            "y":         float(d["coords"][i][1]) if "coords" in d else 0.0,
        })
    return _to_native({"topics": topics, "points": points})

with open(f"{DATA_DIR}/clusters.json") as f:
    _clusters = _normalise_clusters(json.load(f))
print(f"  clusters  : {len([t for t in _clusters['topics'] if t['id'] >= 0])} topics")

# ── Sentence transformer (global — prevents OOM on every request) ─────────────
from sentence_transformers import SentenceTransformer
_model = SentenceTransformer("all-MiniLM-L6-v2")

# ── Groq ──────────────────────────────────────────────────────────────────────
try:
    from groq import Groq
    _groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
    AI_OK = True
except Exception:
    _groq  = None
    AI_OK  = False

# ═════════════════════════════════════════════════════════════════════════════
# PRECOMPUTE COORDINATION EVENTS AT STARTUP
# Groupby window+subreddit → only flagged burst windows get cosine similarity
# ~200 groups pass threshold vs 8500 per-row iterations in old approach
# Completes in ~10 sec at startup, serves in <50ms per request
# ═════════════════════════════════════════════════════════════════════════════
print("Pre-computing coordination events...")

_coord_df = df[~df["is_spam"]].copy()
_coord_df["created_utc"] = pd.to_datetime(_coord_df["created_utc"])
_coord_df = _coord_df.sort_values("created_utc").reset_index(drop=True)
_coord_df["window"] = _coord_df["created_utc"].dt.floor("6h")

_idx_map     = {pid: i for i, pid in enumerate(_post_ids)}
_coord_events: list = []
_coord_heatmap: list = []

LABEL_MAP = {
    "SINGLE_ACTOR_FLOOD":      "Single actor flood ⚠️",
    "SMALL_GROUP_BURST":       "Small group burst",
    "MASS_SYNCHRONIZED_BURST": "Mass synchronized 🔴",
    "ORGANIC_NEWS_RESPONSE":   "Organic response ✓",
}

for (_window, _sub), _grp in _coord_df.groupby(["window", "subreddit"]):
    if len(_grp) < 3:
        continue

    # Burst score = posts in window / expected avg posts per 6h window
    _sub_n = len(_coord_df[_coord_df["subreddit"] == _sub])
    _total_windows = max(1, (
        _coord_df["created_utc"].max() - _coord_df["created_utc"].min()
    ).total_seconds() / 3600 / 6)
    _avg   = _sub_n / _total_windows
    _burst = min(99, round((len(_grp) / max(_avg, 0.1)) * 10, 1))

    if _burst < 15:
        continue

    # Cosine similarity only on burst-flagged windows (fast — small groups)
    _idxs = [_idx_map[p] for p in _grp["id"] if p in _idx_map]
    _mean_sim = 0.0
    if len(_idxs) >= 2:
        _e  = _embeddings[_idxs].astype("float32")
        _n  = np.linalg.norm(_e, axis=1, keepdims=True)
        _nm = _e / np.where(_n == 0, 1, _n)
        _s  = _nm @ _nm.T
        np.fill_diagonal(_s, 0)
        _mean_sim = float(_s.sum() / (len(_idxs) * max(len(_idxs) - 1, 1)))

    _unique = int(_grp["author"].nunique())

    if   _unique == 1:   _pat = "SINGLE_ACTOR_FLOOD"
    elif _unique <= 3:   _pat = "SMALL_GROUP_BURST"
    elif _burst > 50:    _pat = "MASS_SYNCHRONIZED_BURST"
    else:                _pat = "ORGANIC_NEWS_RESPONSE"

    _coord_events.append({
        "window":           str(_window),
        "subreddit":        _sub,
        "ideological_bloc": _grp["ideological_bloc"].iloc[0],
        "post_count":       int(len(_grp)),
        "unique_authors":   _unique,
        "burst_score":      _burst,
        "mean_similarity":  round(_mean_sim, 3),
        "pattern":          _pat,
        "label":            LABEL_MAP.get(_pat, _pat),
        "top_authors":      {str(k): int(v) for k, v in
                             _grp["author"].value_counts().head(5).to_dict().items()},
        "sample_titles":    _grp.nlargest(3, "score")["title"].tolist(),
        "permalink_sample": _grp.iloc[0]["permalink"],
    })
    _coord_heatmap.append({
        "window":      str(_window),
        "subreddit":   _sub,
        "burst_score": _burst,
        "post_count":  int(len(_grp)),
        "pattern":     _pat,
    })

# Cross-community synchronized bursts (same 6h window, 3+ subreddits)
_cross: dict = defaultdict(list)
for _ev in _coord_events:
    _cross[_ev["window"]].append(_ev)

_synchronized = sorted([
    {
        "window":      w,
        "communities": [e["subreddit"] for e in evs],
        "total_posts": sum(e["post_count"] for e in evs),
        "avg_burst":   round(sum(e["burst_score"] for e in evs) / len(evs), 1),
        "blocs":       list(set(e["ideological_bloc"] for e in evs)),
    }
    for w, evs in _cross.items() if len(evs) >= 3
], key=lambda x: x["avg_burst"], reverse=True)[:10]

_coord_events.sort(key=lambda x: x["burst_score"], reverse=True)
print(f"  coordination: {len(_coord_events)} burst events")
print(f"Ready — {len(df)} posts | AI={AI_OK}")

# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════
_embed_cache: dict = {}

def get_embedding(q: str) -> np.ndarray:
    if q not in _embed_cache:
        emb = _model.encode([q]).astype("float32")
        faiss.normalize_L2(emb)
        _embed_cache[q] = emb
    return _embed_cache[q]

def sem_search(q: str, top_k: int = 200):
    D, I = _faiss_index.search(get_embedding(q), top_k)
    return [_post_ids[i] for i in I[0] if i < len(_post_ids)], D[0]

def ai(prompt: str, max_tokens: int = 200, fast: bool = True) -> str:
    if not AI_OK or not _groq:
        return "AI unavailable."
    try:
        r = _groq.chat.completions.create(
            model="llama-3.1-8b-instant" if fast else "llama-3.3-70b-versatile",
            max_tokens=max_tokens, temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        return f"AI error: {str(e)[:60]}"

# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status": "ok", "total_posts": len(df),
            "date_start": str(df["created_utc"].min()),
            "date_end":   str(df["created_utc"].max()), "ai": AI_OK}


@app.get("/api/stats")
def stats():
    c   = df[~df["is_spam"]]
    top = c.nlargest(1, "score").iloc[0]
    return {
        "total_posts":      len(c),
        "total_authors":    int(c["author"].nunique()),
        "total_subreddits": int(c["subreddit"].nunique()),
        "date_start":       str(c["created_utc"].min()),
        "date_end":         str(c["created_utc"].max()),
        "spam_flagged":     int(df["is_spam"].sum()),
        "crosspost_count":  int(c["crosspost_parent"].notna().sum()),
        "avg_score":        round(float(c["score"].mean()), 1),
        "top_post": {
            "title":     top["title"],
            "score":     int(top["score"]),
            "subreddit": top["subreddit"],
        },
    }


@app.get("/api/subreddits")
def subreddits():
    r = df.groupby("subreddit").agg(
        count=("id", "count"), avg_score=("score", "mean"),
        subscribers=("subreddit_subscribers", "max"),
        bloc=("ideological_bloc", "first"),
    ).reset_index()
    r["avg_score"] = r["avg_score"].round(1)
    return r.to_dict(orient="records")


@app.get("/api/events")
def events():
    return _events


@app.get("/api/timeline")
def timeline(
    query:       str = Query(default=""),
    subreddits:  str = Query(default=""),
    granularity: str = Query(default="week"),
):
    data = df[~df["is_spam"]].copy()
    sl = [s.strip() for s in subreddits.split(",") if s.strip()]
    if sl:
        data = data[data["subreddit"].isin(sl)]
    if query.strip():
        m = (data["title"].str.contains(query, case=False, na=False)
             | data["selftext"].str.contains(query, case=False, na=False))
        data = data[m]
    if data.empty:
        return {"data": [], "summary": "No posts found.", "events": _events}
    freq = "W" if granularity == "week" else "D" if granularity == "day" else "ME"
    ts = (data.set_index("created_utc").sort_index()
          .groupby([pd.Grouper(freq=freq), "subreddit"])
          .agg(count=("id", "count"), avg_score=("score", "mean"))
          .reset_index())
    ts["created_utc"] = ts["created_utc"].astype(str)
    result = ts.fillna(0).round(2).to_dict(orient="records")
    summary = ai(
        f"Reddit political data. Query:\"{query or 'all'}\". "
        f"Weekly counts: {json.dumps(result[:12])}. "
        f"2-3 plain sentences, mention dates and numbers. "
        f"Do NOT start with 'This chart shows'.",
        200,
    )
    return {"data": result, "summary": summary, "events": _events}


@app.get("/api/network")
def network(
    type:        str           = Query(default="subreddit"),
    query:       Optional[str] = Query(default=None),
    top_n:       int           = Query(default=200),
    remove_node: Optional[str] = Query(default=None),
):
    base = {"subreddit": _net_sub, "author": _net_auth, "source": _net_src}.get(type)
    if not base:
        raise HTTPException(400, "type must be subreddit | author | source")
    if query and len(query.strip()) >= 2:
        ids, _ = sem_search(query.strip(), top_k=min(top_n, 500))
        ss     = set(meta[meta["id"].isin(set(ids))]["subreddit"].unique())
        nids   = {n["id"] for n in base["nodes"]
                  if n["id"] in ss or n.get("type") == "domain"}
        result = {
            "nodes": [n for n in base["nodes"] if n["id"] in nids],
            "edges": [e for e in base["edges"]
                      if e["source"] in nids and e["target"] in nids],
        }
    else:
        result = {"nodes": list(base["nodes"]), "edges": list(base["edges"])}
    if remove_node:
        result["nodes"] = [n for n in result["nodes"] if n["id"] != remove_node]
        result["edges"] = [e for e in result["edges"]
                           if e["source"] != remove_node
                           and e["target"] != remove_node]
    return result


@app.get("/api/search")
def search(
    q:         str = Query(default=""),
    limit:     int = Query(default=20, ge=1, le=50),
    subreddit: str = Query(default="all"),
    bloc:      str = Query(default="all"),
):
    q = q.strip()
    if not q:
        return {"results": [], "total": 0, "query": q,
                "warning": "Enter a search query.", "suggestions": []}
    if len(q) < 2:
        return {"results": [], "total": 0, "query": q,
                "warning": "Too short — enter at least 2 characters.",
                "suggestions": []}
    ids, dists = sem_search(q, top_k=limit * 4)
    r = meta[meta["id"].isin(ids)].copy()
    r["similarity"] = r["id"].map({p: float(d) for p, d in zip(ids, dists)})
    r = r[r["similarity"] < 0.8]
    if subreddit != "all": r = r[r["subreddit"] == subreddit]
    if bloc      != "all": r = r[r["ideological_bloc"] == bloc]
    r = r.nsmallest(limit, "similarity")
    r["created_utc"] = r["created_utc"].astype(str)
    return {"results": r.to_dict(orient="records"),
            "total": len(r), "query": q, "suggestions": []}


@app.get("/api/clusters")
def clusters(nr_topics: int = Query(default=10, ge=2, le=50)):
    topics = list(_clusters["topics"])
    points = list(_clusters["points"][:500])
    valid  = [t for t in topics if t["id"] >= 0]
    if nr_topics < len(valid):
        st   = sorted(valid, key=lambda x: x["count"], reverse=True)
        kept = st[:nr_topics]
        mc   = sum(t["count"] for t in st[nr_topics:])
        if mc:
            kept.append({"id": -2, "count": int(mc),
                         "label": "Other Topics", "words": []})
        topics = kept + [t for t in topics if t["id"] == -1]
    return {"topics": topics, "points": points, "nr_topics": int(nr_topics)}


@app.get("/api/narrative_divergence")
def narrative_divergence(q: str = Query(default="")):
    q = q.strip()
    if not q or len(q) < 2:
        return {"error": "Query too short", "divergence": {}, "total_relevant": 0}
    ids, dists = sem_search(q, 300)
    r = meta[meta["id"].isin(ids)].copy()
    r["similarity"] = r["id"].map({p: float(d) for p, d in zip(ids, dists)})
    r = r[r["similarity"] < 0.75]
    r["created_utc"] = r["created_utc"].astype(str)
    div = {}
    for b in ["left_radical", "center_left", "right", "mixed"]:
        bp = r[r["ideological_bloc"] == b]
        div[b] = (bp.nsmallest(3, "similarity").to_dict(orient="records")
                  if len(bp) else [])
    return {"query": q, "divergence": div, "total_relevant": len(r)}


@app.get("/api/propagation")
def propagation(q: str = Query(default="")):
    q = q.strip()
    if not q or len(q) < 2:
        return {"error": "Query too short", "sequence": [], "total": 0}
    ids, dists = sem_search(q, 500)
    r = meta[meta["id"].isin(ids)].copy()
    r["similarity"] = r["id"].map({p: float(d) for p, d in zip(ids, dists)})
    r = r[r["similarity"] < 0.75]
    if r.empty:
        return {"query": q, "sequence": [], "timeline": [], "total": 0}
    r["created_utc"] = pd.to_datetime(r["created_utc"])
    r = r.sort_values("created_utc")
    POS = {
        "Anarchism":           {"x": 0.05, "y": 0.25},
        "socialism":           {"x": 0.15, "y": 0.65},
        "Liberal":             {"x": 0.28, "y": 0.20},
        "democrats":           {"x": 0.35, "y": 0.55},
        "politics":            {"x": 0.45, "y": 0.80},
        "neoliberal":          {"x": 0.55, "y": 0.30},
        "PoliticalDiscussion": {"x": 0.50, "y": 0.65},
        "Conservative":        {"x": 0.70, "y": 0.22},
        "Republican":          {"x": 0.78, "y": 0.60},
        "worldpolitics":       {"x": 0.90, "y": 0.42},
    }
    first = (r.groupby("subreddit").first()
              .reset_index().sort_values("created_utc"))
    t0  = first.iloc[0]["created_utc"]
    seq = []
    for _, row in first.iterrows():
        p = POS.get(row["subreddit"], {"x": 0.5, "y": 0.5})
        seq.append({
            "subreddit":        row["subreddit"],
            "title":            row["title"][:100],
            "created_utc":      str(row["created_utc"]),
            "hours_after":      round((row["created_utc"] - t0).total_seconds() / 3600, 1),
            "similarity":       round(float(row["similarity"]), 3),
            "permalink":        row.get("permalink", ""),
            "ideological_bloc": row.get("ideological_bloc", "other"),
            "x": p["x"], "y": p["y"],
        })
    r["date"] = r["created_utc"].dt.date.astype(str)
    tl = (r.groupby(["date", "subreddit"]).size()
           .reset_index(name="count").to_dict(orient="records"))
    return {"query": q, "first_mover": seq[0]["subreddit"],
            "sequence": seq, "timeline": tl, "total": len(r)}


@app.get("/api/coordination")
def coordination(pattern: str = Query(default="all")):
    """
    Returns precomputed burst events. Filters by pattern if provided.
    Patterns: SINGLE_ACTOR_FLOOD | SMALL_GROUP_BURST |
              MASS_SYNCHRONIZED_BURST | ORGANIC_NEWS_RESPONSE
    """
    evs = _coord_events
    if pattern != "all":
        evs = [e for e in evs if e["pattern"] == pattern]
    return {
        "events":       evs[:20],
        "heatmap":      _coord_heatmap,
        "synchronized": _synchronized,
        "total_events": len(_coord_events),
        "window_hours": 6,
        "note":         "No events for this pattern." if not evs else "",
    }


@app.get("/api/topdomain")
def topdomain(subreddit: str = Query(default="all")):
    d = df[~df["is_self_post"] & (df["domain"] != "") & ~df["is_spam"]].copy()
    if subreddit != "all":
        d = d[d["subreddit"] == subreddit]
    c = d["domain"].value_counts().head(15).reset_index()
    c.columns = ["domain", "count"]
    L = {"theguardian.com", "nytimes.com", "huffpost.com"}
    R = {"foxnews.com", "breitbart.com", "nypost.com", "townhall.com"}
    c["bias"] = c["domain"].apply(
        lambda x: "left" if x in L else "right" if x in R else "center")
    return c.to_dict(orient="records")


@app.get("/api/findings")
def findings():
    c = df[~df["is_spam"]].copy()
    c["created_utc"] = pd.to_datetime(c["created_utc"])
    ew  = c[(c["created_utc"] >= "2024-11-04") & (c["created_utc"] <= "2024-11-10")]
    pre = c[c["created_utc"] < "2024-11-04"]
    avg = pre.groupby(pd.Grouper(key="created_utc", freq="W")).size().mean()
    spk = round(len(ew) / max(avg, 1), 1)
    im  = c[c["title"].str.contains("immigration|border|migrant", case=False, na=False)]
    ts  = im["subreddit"].value_counts().index[0] if len(im) else "politics"
    tn  = int(im["subreddit"].value_counts().iloc[0]) if len(im) else 0
    cr  = int((c.groupby("author")["subreddit"].nunique() >= 3).sum())
    return {"findings": [
        {"id": "election_spike", "stat": f"{spk}×",
         "headline": f"Post volume spiked {spk}× in Election Week",
         "detail": f"Nov 4–10, 2024 saw {len(ew)} posts vs avg {avg:.0f}/week before.",
         "link_view": "timeline", "link_query": "election"},
        {"id": "immigration", "stat": str(tn),
         "headline": f"r/{ts} led immigration discourse with {tn} posts",
         "detail": f"r/{ts} posted the most immigration/border/migrant content.",
         "link_view": "timeline", "link_query": "immigration"},
        {"id": "bridges", "stat": str(cr),
         "headline": f"{cr} authors posted across 3+ communities",
         "detail": "Bridge authors whose posts span ideologically distinct subreddits.",
         "link_view": "network", "link_query": ""},
    ]}


# ── POST endpoints ────────────────────────────────────────────────────────────
class SumReq(BaseModel):
    type: str = "timeseries"
    data: list = []
    context: str = ""

@app.post("/api/summarize")
def summarize(req: SumReq):
    if not req.data:
        return {"summary": "No data to summarize."}
    return {"summary": ai(
        f"Chart: {req.type}. Context: {req.context}. "
        f"Data: {json.dumps(req.data[:15])}. "
        f"2-3 plain sentences mentioning dates and numbers.",
        200,
    )}


class SugReq(BaseModel):
    query: str = ""
    results: list = []

@app.post("/api/suggest_queries")
def suggest_queries(req: SugReq):
    if not req.results:
        return {"suggestions": []}
    try:
        t = ai(
            f'Search: "{req.query}". '
            f'Results: {[r.get("title", "") for r in req.results[:4]]}. '
            f"Return ONLY a JSON array of 3 related query strings.",
            80,
        ).strip()
        if not t.startswith("["):
            t = t[t.find("["):t.rfind("]") + 1]
        return {"suggestions": json.loads(t)[:3]}
    except Exception:
        return {"suggestions": []}


class AnaReq(BaseModel):
    query: str = ""
    blocs: dict = {}

@app.post("/api/narrative_analysis")
def narrative_analysis(req: AnaReq):
    parts = {b: [p.get("title", "") for p in ps]
             for b, ps in req.blocs.items() if ps}
    if not parts:
        return {"analysis": "No posts to analyze."}
    return {"analysis": ai(
        f'Topic: "{req.query}". '
        f"Posts by community: {json.dumps(parts)}. "
        f"3-4 sentences on how FRAMING differs across communities.",
        300, fast=False,
    )}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)