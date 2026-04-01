# backend/main.py

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NarrativeTrail API", version="1.0.0")

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ──────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "message": "NarrativeTrail backend running"}

# ── Stats ─────────────────────────────────────────────────
@app.get("/api/stats")
def stats():
    from data.database import get_stats
    return get_stats()

# ── Subreddits list ───────────────────────────────────────
@app.get("/api/subreddits")
def subreddits():
    from data.database import get_subreddits
    return get_subreddits()

# ── Timeline ──────────────────────────────────────────────
@app.get("/api/timeline")
def timeline(
    query: Optional[str] = Query(default=''),
    subreddits: Optional[str] = Query(default='')
):
    from data.database import get_timeline
    subreddit_list = [s.strip() for s in subreddits.split(',') if s.strip()] if subreddits else []
    data = get_timeline(query=query, subreddits=subreddit_list)
    return {"data": data, "query": query}

# ── Network ───────────────────────────────────────────────
@app.get("/api/network")
def network():
    from data.database import get_network_data
    nodes, edges = get_network_data()
    return {"nodes": nodes, "edges": edges}

# ── Search (placeholder — FAISS added Day 3) ──────────────
@app.get("/api/search")
def search(q: Optional[str] = Query(default='')):
    if not q:
        return {"results": [], "query": q, "message": "Semantic search not yet built"}
    from data.database import get_connection
    con = get_connection()
    df = con.execute("""
        SELECT id, title, author, subreddit, score, created_utc, permalink
        FROM posts
        WHERE title ILIKE ? OR selftext ILIKE ?
        ORDER BY score DESC
        LIMIT 20
    """, [f'%{q}%', f'%{q}%']).fetchdf()
    return {"results": df.to_dict(orient='records'), "query": q}

# ── Clusters (placeholder — BERTopic added Day 3) ─────────
@app.get("/api/clusters")
def clusters():
    return {"message": "BERTopic clustering coming in Day 3"}

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("DuckDB connected")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)