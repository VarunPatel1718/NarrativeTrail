from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import pandas as pd, numpy as np, faiss, json, os
from dotenv import load_dotenv
from flask_compress import Compress

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.vercel.app",        # all Vercel preview URLs
    "https://narrativetracker.vercel.app",  # your final URL — update after deploy
])
Compress(app)

DATA = os.path.join(os.path.dirname(__file__), "data")

# ── LOAD ALL DATA AT STARTUP ──────────────────────────────────────────────────
print("Loading data files...")
df    = pd.read_parquet(f"{DATA}/processed.parquet")
meta  = pd.read_parquet(f"{DATA}/search_meta.parquet")
index = faiss.read_index(f"{DATA}/faiss.index")

with open(f"{DATA}/network_subreddit.json") as f: net_sub    = json.load(f)
with open(f"{DATA}/network_author.json")    as f: net_auth   = json.load(f)
with open(f"{DATA}/network_source.json")    as f: net_src    = json.load(f)
with open(f"{DATA}/events.json")            as f: evts       = json.load(f)
with open(f"{DATA}/clusters.json")          as f: clust_data = json.load(f)

from sentence_transformers import SentenceTransformer
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# ── GROQ SETUP ────────────────────────────────────────────────────────────────
try:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    AI_OK = True
    print("Groq AI loaded successfully")
except Exception as e:
    AI_OK = False
    print(f"Groq AI not available: {e}")

# ═════════════════════════════════════════════════════════════════════════════
# PRE-COMPUTE EVERYTHING AT STARTUP
# Every endpoint below that uses a _*_json variable returns in microseconds.
# ═════════════════════════════════════════════════════════════════════════════

print("Pre-computing caches...")

# 1. Network JSON — pre-serialized
_net_json = {
    "subreddit": json.dumps(net_sub),
    "author":    json.dumps(net_auth),
    "source":    json.dumps(net_src),
}

# 2. Stats — never changes
_clean_df = df[~df["is_spam"]]
_top_post = _clean_df.nlargest(1, "score").iloc[0]
_stats_json = json.dumps({
    "total_posts":      len(_clean_df),
    "total_authors":    int(_clean_df["author"].nunique()),
    "total_subreddits": int(_clean_df["subreddit"].nunique()),
    "date_start":       str(_clean_df["created_utc"].min()),
    "date_end":         str(_clean_df["created_utc"].max()),
    "spam_flagged":     int(df["is_spam"].sum()),
    "crosspost_count":  int(_clean_df["crosspost_parent"].notna().sum()),
    "avg_score":        round(float(_clean_df["score"].mean()), 1),
    "top_post": {
        "title":     _top_post["title"],
        "score":     int(_top_post["score"]),
        "subreddit": _top_post["subreddit"],
    }
})

# 3. Subreddits list — never changes
_sub_counts = df.groupby("subreddit").agg(
    count=("id", "count"),
    avg_score=("score", "mean"),
    subscribers=("subreddit_subscribers", "max"),
    bloc=("ideological_bloc", "first")
).reset_index()
_sub_counts["avg_score"] = _sub_counts["avg_score"].round(1)
_subreddits_json = json.dumps(_sub_counts.to_dict(orient="records"))

# 4. Events — static
_events_json = json.dumps(evts)

# 5. Clusters — all 4 k values
_clusters_cache = {}
for _k_str in ["5", "8", "12", "20"]:
    _d     = clust_data[_k_str]
    _k_int = int(_k_str)
    _points = [
        {
            "x":         _d["coords"][i][0],
            "y":         _d["coords"][i][1],
            "cluster":   _d["labels"][i],
            "subreddit": _d["subreddits"][i],
            "title":     _d["titles"][i][:80],
        }
        for i in range(len(_d["labels"]))
    ]
    _clusters_cache[_k_str] = json.dumps({
        "k_requested":    _k_int,
        "k_actual":       _k_int,
        "cluster_count":  _d["cluster_count"],
        "noise_count":    _d["noise_count"],
        "cluster_labels": _d["cluster_labels"],
        "points":         _points,
    })

# 6. Source network — pre-filtered at default weight
_source_net_json = json.dumps({
    "nodes": net_src["nodes"],
    "edges": [e for e in net_src["edges"] if e.get("weight", 0) >= 3],
})

# 7. Timeseries — pre-computed for every subreddit × granularity combination
#    This is the biggest win: pandas resample runs once at startup, not per request
print("Pre-computing timeseries cache (all subreddits × granularities)...")
_timeseries_cache = {}

def _build_timeseries(sub, gran):
    data = df[~df["is_spam"]].copy()
    if sub != "all":
        data = data[data["subreddit"] == sub]
    if not len(data):
        return "[]"
    freq = "W" if gran == "week" else "D" if gran == "day" else "ME"
    ts = (
        data.set_index("created_utc").sort_index()
        .resample(freq)
        .agg(
            count=("id", "count"),
            avg_score=("score", "mean"),
            avg_comments=("num_comments", "mean"),
        )
        .reset_index()
    )
    ts["created_utc"] = ts["created_utc"].astype(str)
    return json.dumps(ts.fillna(0).round(2).to_dict(orient="records"))

# Build for every subreddit + "all" × all 3 granularities
_all_subreddits = list(df["subreddit"].unique()) + ["all"]
for _sub in _all_subreddits:
    for _gran in ["week", "day", "month"]:
        _key = _sub + "|" + _gran
        _timeseries_cache[_key] = _build_timeseries(_sub, _gran)

print(f"Timeseries cache: {len(_timeseries_cache)} entries built")

# 8. Timeseries by bloc — pre-computed for week and day
print("Pre-computing timeseries blocs cache...")
_blocs_cache = {}

for _gran, _freq in [("week", "W"), ("day", "D"), ("month", "ME")]:
    _data   = df[~df["is_spam"]].set_index("created_utc").sort_index()
    _result = {}
    for _bloc in _data["ideological_bloc"].unique():
        _ts = (
            _data[_data["ideological_bloc"] == _bloc]
            .resample(_freq)
            .agg(count=("id", "count"))
            .reset_index()
        )
        _ts["created_utc"] = _ts["created_utc"].astype(str)
        _result[_bloc] = _ts.to_dict(orient="records")
    _blocs_cache[_gran] = json.dumps(_result)

print("Blocs cache: 3 granularities built")

# 9. Embedding cache — same query never re-embeds
_embed_cache = {}

def get_embedding(q):
    if q not in _embed_cache:
        emb = embed_model.encode([q]).astype("float32")
        faiss.normalize_L2(emb)
        _embed_cache[q] = emb
    return _embed_cache[q]

print(f"Ready. {len(df)} posts loaded. AI={AI_OK}")


# ── GROQ HELPER ───────────────────────────────────────────────────────────────
def claude(prompt, max_tokens=200):
    if not AI_OK:
        return "AI summary unavailable — Groq API key not configured."
    try:
        r = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return r.choices[0].message.content
    except Exception as e:
        return f"AI summary temporarily unavailable: {str(e)[:100]}"


# ── ENDPOINT 1: HEALTH ────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({
        "status":      "ok",
        "total_posts": len(df),
        "date_start":  str(df["created_utc"].min()),
        "date_end":    str(df["created_utc"].max()),
    })

# ── ENDPOINT 2: STATS ─────────────────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    sub = request.args.get("subreddit", "all")

    # "all" → return pre-cached instantly, zero computation
    if sub == "all":
        return Response(_stats_json, mimetype="application/json")

    # Specific subreddit → filter _clean_df (fast, ~2ms on 8k rows)
    data = _clean_df[_clean_df["subreddit"] == sub]
    if not len(data):
        return Response(_stats_json, mimetype="application/json")

    top = data.nlargest(1, "score").iloc[0]
    return jsonify({
        "total_posts":      len(data),
        "total_authors":    int(data["author"].nunique()),
        "total_subreddits": 1,
        "date_start":       str(data["created_utc"].min()),
        "date_end":         str(data["created_utc"].max()),
        "spam_flagged":     int(df[df["subreddit"] == sub]["is_spam"].sum()),
        "crosspost_count":  int(data["crosspost_parent"].notna().sum()),
        "avg_score":        round(float(data["score"].mean()), 1),
        "top_post": {
            "title":     top["title"],
            "score":     int(top["score"]),
            "subreddit": top["subreddit"],
        }
    })

# ── ENDPOINT 3: SUBREDDITS ────────────────────────────────────────────────────
@app.route("/api/subreddits")
def subreddits():
    return Response(_subreddits_json, mimetype="application/json")

# ── ENDPOINT 4: TIMESERIES — fully cached ────────────────────────────────────
@app.route("/api/timeseries")
def timeseries():
    sub      = request.args.get("subreddit", "all")
    gran     = request.args.get("granularity", "week")
    inc_spam = request.args.get("include_spam", "false") == "true"

    # inc_spam=true is rare — compute on the fly, don't pollute cache
    if inc_spam:
        data = df.copy()
        if sub != "all": data = data[data["subreddit"] == sub]
        if not len(data): return jsonify([])
        freq = "W" if gran == "week" else "D" if gran == "day" else "ME"
        ts = (
            data.set_index("created_utc").sort_index()
            .resample(freq)
            .agg(count=("id","count"), avg_score=("score","mean"),
                 avg_comments=("num_comments","mean"))
            .reset_index()
        )
        ts["created_utc"] = ts["created_utc"].astype(str)
        return jsonify(ts.fillna(0).round(2).to_dict(orient="records"))

    # Normal path — return pre-computed instantly
    key = sub + "|" + gran
    if key in _timeseries_cache:
        return Response(_timeseries_cache[key], mimetype="application/json")

    # Fallback for unknown subreddit (shouldn't happen but safe)
    return Response(_timeseries_cache.get("all|" + gran, "[]"),
                    mimetype="application/json")

# ── ENDPOINT 5: TIMESERIES BY BLOC — fully cached ────────────────────────────
@app.route("/api/timeseries/blocs")
def timeseries_blocs():
    gran = request.args.get("granularity", "week")
    key  = gran if gran in _blocs_cache else "week"
    return Response(_blocs_cache[key], mimetype="application/json")

# ── ENDPOINT 6: EVENTS ────────────────────────────────────────────────────────
@app.route("/api/events")
def events():
    return Response(_events_json, mimetype="application/json")

# ── ENDPOINT 7: TOP DOMAINS ───────────────────────────────────────────────────
@app.route("/api/topdomain")
def topdomain():
    sub  = request.args.get("subreddit", "all")
    data = df[~df["is_self_post"] & (df["domain"] != "") & ~df["is_spam"]].copy()
    if sub != "all": data = data[data["subreddit"] == sub]
    counts = data["domain"].value_counts().head(15).reset_index()
    counts.columns = ["domain", "count"]
    L = {"theguardian.com", "nytimes.com", "huffpost.com"}
    R = {"foxnews.com", "breitbart.com", "nypost.com", "townhall.com"}
    counts["bias"] = counts["domain"].apply(
        lambda d: "left" if d in L else "right" if d in R else "center"
    )
    return jsonify(counts.to_dict(orient="records"))

# ── ENDPOINT 8: NETWORK ───────────────────────────────────────────────────────
@app.route("/api/network")
def network():
    ntype  = request.args.get("type", "subreddit")
    remove = request.args.get("remove_node", None)

    if ntype == "subreddit": base = net_sub
    elif ntype == "author":  base = net_auth
    else:                    base = net_src

    if remove:
        data = {
            "nodes": [n for n in base["nodes"] if n["id"] != remove],
            "edges": [e for e in base["edges"]
                      if e["source"] != remove and e["target"] != remove],
        }
        return jsonify(data)

    return Response(_net_json[ntype], mimetype="application/json")

# ── ENDPOINT 9: SEMANTIC SEARCH ───────────────────────────────────────────────
@app.route("/api/search")
def search():
    q    = request.args.get("q", "").strip()
    lim  = min(int(request.args.get("limit", 20)), 50)
    sub  = request.args.get("subreddit", "all")
    bloc = request.args.get("bloc", "all")

    if not q or len(q) < 2:
        return jsonify({
            "results": [], "total": 0, "query": q,
            "suggested_queries": [],
            "warning": "Query too short — enter at least 2 characters",
        })

    q_emb = get_embedding(q)
    D, I  = index.search(q_emb, lim * 4)

    results = meta.iloc[I[0]].copy()
    results["similarity"] = D[0]
    results = results[results["similarity"] > 0.2]
    if sub  != "all": results = results[results["subreddit"] == sub]
    if bloc != "all": results = results[results["ideological_bloc"] == bloc]
    results = results.head(lim)
    results["created_utc"] = results["created_utc"].astype(str)

    return jsonify({
        "results": results.to_dict(orient="records"),
        "total":   len(results),
        "query":   q,
        "suggested_queries": [],
    })

# ── ENDPOINT 10: CLUSTERS ─────────────────────────────────────────────────────
@app.route("/api/clusters")
def clusters():
    k        = int(request.args.get("k", 8))
    available = [5, 8, 12, 20]
    k_actual  = min(available, key=lambda x: abs(x - k))
    k_str     = str(k_actual)

    cached = json.loads(_clusters_cache[k_str])
    cached["k_requested"] = k
    return jsonify(cached)

# ── ENDPOINT 11: NARRATIVE DIVERGENCE ────────────────────────────────────────
@app.route("/api/narrative_divergence")
def narrative_divergence():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({
            "error": "Query too short", "divergence": {}, "total_relevant": 0
        })

    q_emb   = get_embedding(q)
    D, I    = index.search(q_emb, 300)
    results = meta.iloc[I[0]].copy()
    results["similarity"] = D[0]
    results = results[results["similarity"] > 0.25]
    results["created_utc"] = results["created_utc"].astype(str)

    divergence = {}
    for bloc in ["left_radical", "center_left", "right", "mixed"]:
        bp = results[results["ideological_bloc"] == bloc]
        divergence[bloc] = (
            bp.nlargest(3, "similarity").to_dict(orient="records")
            if len(bp) > 0 else []
        )

    return jsonify({
        "query":          q,
        "divergence":     divergence,
        "total_relevant": len(results),
    })

# ── ENDPOINT 12: INFORMATION VELOCITY ────────────────────────────────────────
@app.route("/api/velocity")
def velocity():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({
            "error":        "Query too short",
            "first_mover":  None,
            "first_posts":  [],
            "timeline":     [],
        })

    q_emb   = get_embedding(q)
    D, I    = index.search(q_emb, 300)
    results = meta.iloc[I[0]].copy()
    results["similarity"] = D[0]
    results = results[results["similarity"] > 0.3]

    if not len(results):
        return jsonify({
            "query": q, "first_mover": None,
            "first_posts": [], "timeline": [], "total": 0,
        })

    results["created_utc"] = pd.to_datetime(results["created_utc"])
    results = results.sort_values("created_utc")

    first_per_sub = (
        results.groupby("subreddit").first()
        .reset_index()
        .sort_values("created_utc")
    )
    first_per_sub["created_utc"] = first_per_sub["created_utc"].astype(str)

    results["date"] = results["created_utc"].dt.date.astype(str)
    timeline = (
        results.groupby(["date", "subreddit"])
        .size().reset_index(name="count")
    )

    return jsonify({
        "query":       q,
        "first_mover": first_per_sub.iloc[0]["subreddit"],
        "first_posts": first_per_sub[
            ["subreddit", "title", "created_utc", "similarity"]
        ].to_dict(orient="records"),
        "timeline":    timeline.to_dict(orient="records"),
        "total":       len(results),
    })

# ── ENDPOINT 13: SUMMARIZE ────────────────────────────────────────────────────
@app.route("/api/summarize", methods=["POST"])
def summarize():
    d     = request.json
    ctype = d.get("type", "timeseries")
    data  = d.get("data", [])
    ctx   = d.get("context", "")
    if not data:
        return jsonify({"summary": "No data available to summarize."})
    prompt = (
        f"You are analyzing NarrativeTracker Reddit political data.\n"
        f"Chart type: {ctype}. Context: {ctx}.\n"
        f"Data (up to 30 points): {json.dumps(data[:30])}\n"
        f"Write 2-3 sentences in plain English for a non-technical audience.\n"
        f"Be specific: mention actual dates, subreddits, and numbers.\n"
        f"Do not start with 'This chart shows'."
    )
    return jsonify({"summary": claude(prompt, 200)})

# ── ENDPOINT 14: SUGGEST QUERIES ─────────────────────────────────────────────
@app.route("/api/suggest_queries", methods=["POST"])
def suggest_queries():
    d      = request.json
    query  = d.get("query", "")
    titles = [r.get("title", "") for r in d.get("results", [])[:5]]
    if not titles:
        return jsonify({"suggestions": []})
    prompt = (
        f'User searched NarrativeTracker for: "{query}"\n'
        f"Top results were about: {titles}\n"
        f"Suggest exactly 3 related search queries they might explore next.\n"
        f"Return ONLY a JSON array of 3 short strings. No other text.\n"
        f'Example: ["query one", "query two", "query three"]'
    )
    try:
        text = claude(prompt, 100).strip()
        if not text.startswith("["):
            text = text[text.find("["):text.rfind("]") + 1]
        suggestions = json.loads(text)
        return jsonify({"suggestions": suggestions[:3]})
    except Exception:
        return jsonify({"suggestions": []})

# ── ENDPOINT 15: NARRATIVE ANALYSIS ──────────────────────────────────────────
@app.route("/api/narrative_analysis", methods=["POST"])
def narrative_analysis():
    blocs = request.json.get("blocs", {})
    query = request.json.get("query", "")
    parts = {
        b: [p.get("title", "") for p in posts]
        for b, posts in blocs.items() if posts
    }
    if not parts:
        return jsonify({"analysis": "No posts found to analyze."})
    prompt = (
        f"You are a political narrative analyst for NarrativeTracker.\n"
        f'Topic: "{query}"\n'
        f"Posts by community:\n{json.dumps(parts, indent=2)}\n"
        f"In 3-4 sentences, explain how the FRAMING of this topic differs\n"
        f"across these communities. Be specific about language, emphasis, and\n"
        f"implied blame or causation. Write for a research audience."
    )
    return jsonify({"analysis": claude(prompt, 300)})

# ── ENDPOINT 16: SOURCE BIAS NETWORK ─────────────────────────────────────────
@app.route("/api/source_network")
def source_network():
    min_w = int(request.args.get("min_weight", 3))
    if min_w == 3:
        return Response(_source_net_json, mimetype="application/json")
    data = {
        "nodes": net_src["nodes"],
        "edges": [e for e in net_src["edges"] if e.get("weight", 0) >= min_w],
    }
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)