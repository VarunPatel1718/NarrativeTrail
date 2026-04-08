# NarrativeTrail

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-blue)](https://research-engineering-intern-assignment-a7rnsvzpr.vercel.app)
[![API Status](https://img.shields.io/badge/API%20Status-Online-green)](https://varunpatel-narrativetrail-api.hf.space/api/health)
[![Built With](https://img.shields.io/badge/Built%20With-React%20%2B%20Flask-orange)](https://github.com/VarunPatel1718/research-engineering-intern-assignment)

A comprehensive Reddit political narrative analysis dashboard that visualizes how political stories spread across ideological communities during the 2024 US Election period.

## What It Does

NarrativeTrail analyzes political discourse on Reddit by tracking how narratives emerge, spread, and diverge across different ideological communities. It provides researchers and analysts with tools to understand information flow, coordinated messaging, and community dynamics in real-time political conversations.

## Features

### 1. Timeline (Post Activity Over Time)
Visualizes post volume trends across subreddits and ideological blocs (Left Radical, Center Left, Right, Mixed). Includes toggle between "All Posts" and "By Bloc" views, with key political events marked as vertical reference lines. Features an events grid below the chart showing dates, event names, and types with color coding. Generates dynamic AI summaries from actual data via Groq.

[Screenshot: Timeline Feature]

### 2. Network Graph (Influence & Citation Map)
Interactive network visualization with four types: Subreddit Crosspost, Author Influence, Source Citation, and Source Bias. Uses PageRank (alpha=0.85) for node sizing and Louvain community detection for coloring. Includes "Remove Top Node" functionality to show influence redistribution. Detects bridge authors (white ring) who post across multiple blocs. Source Bias tab provides citation breakdown by ideology with stacked bar visualization. Click any node to inspect PageRank score, post count, bloc, and Louvain community.

[Screenshot: Network Graph Feature]

### 3. Semantic Search
Performs semantic similarity search using FAISS IndexFlatL2 on normalized vectors (cosine similarity). Uses sentence-transformers all-MiniLM-L6-v2 model (384-dim, multilingual). Returns results ranked by semantic similarity, not keyword matching. Handles empty/short queries, non-English input (Hindi tested), and falls back to keyword search on OOM. Generates 2-3 related follow-up queries via Groq after results. Includes sidebar bloc filtering.

### 4. Narrative Clusters (Topic Clustering)
Implements BERTopic 0.16.4 with HDBSCAN clustering, UMAP dimensionality reduction, and c-TF-IDF topic labeling. Features tunable cluster count (2-50 topics) with UI that handles extremes. Renders noise points (cluster -1) separately in scatter plot. Generates topic labels using Groq llama-3.3-70b-versatile per cluster. Filters stopwords using CountVectorizer(stop_words=english). Interactive UMAP scatter plot — click points to open original Reddit posts. Includes dynamic AI summary beneath visualization.

[Screenshot: Narrative Clusters Feature]

### 5. Propagation Animator
Animated visualization showing how narratives spread across communities over time. Uses fixed SVG layout with ideological bloc zones. Nodes light up sequentially as subreddits first engage with topics. Shows cascade vs independent emergence patterns. Includes playback controls (play/pause, timeline scrubber, 0.5x/1x/2x/5x speed), First Mover badges, propagation order table with post counts/dates. Query any topic (e.g., "federal workers fired", "nuclear weapons staff").

[Screenshot: Propagation Animator Feature]

### 6. Coordination Detector
Identifies clusters of posts where multiple authors posted semantically similar content within short time windows — indicating coordinated amplification. Configurable time windows (1h/3h/6h/12h/24h) and minimum post thresholds (2/3/5/8). Provides verdict system (Likely Coordinated / Suspicious / Organic Response). Includes bar chart of events by subreddit and expandable event cards linking to Reddit posts. Features dynamic AI summary of detected patterns.

[Screenshot: Coordination Detector Feature]

## Zero-Overlap Semantic Search Examples

| Query | Result | Why Correct |
|-------|--------|-------------|
| "fear of losing livelihood under new policy" | Posts about federal employee layoffs, DOGE budget cuts, government workforce reductions | The embedding model clusters economic threat concepts — "livelihood" and "layoffs" share semantic space even with zero word overlap |
| "distrust of institutions and surveillance state" | Posts about FBI, FISA courts, government overreach, civil liberties | Transformer embeddings map political distrust concepts together regardless of specific agency names used |
| "राजनीतिक ध्रुवीकरण और मीडिया पक्षपात" (Hindi: political polarization and media bias) | Posts about partisan media coverage, echo chambers, biased reporting | all-MiniLM-L6-v2 is multilingual — Hindi concepts map to the same embedding space as equivalent English posts |

## ML/AI Components

| Component | Model/Algorithm | Key Parameters | Library |
|-----------|----------------|----------------|---------|
| Embeddings | all-MiniLM-L6-v2 | 384-dim vectors, multilingual, contrastive learning | sentence-transformers |
| Vector Search | FAISS IndexFlatL2 | Cosine similarity via L2 on normalized vectors | faiss-cpu |
| Topic Modeling | BERTopic 0.16.4 | HDBSCAN min_cluster_size=10, UMAP n_components=2, nr_topics tunable 2-50 | bertopic |
| Network Centrality | PageRank | alpha=0.85 | networkx.pagerank() |
| Community Detection | Louvain modularity optimization | - | python-louvain |
| AI Summaries | Groq llama-3.1-8b-instant | Dynamic per-query generation, not hardcoded | groq |
| Topic Labels | Groq llama-3.3-70b-versatile | Called per cluster during build_clusters() | groq |

## Tech Stack

| Component | Technology | Details |
|-----------|------------|---------|
| Frontend | React + Vite | Deployed on Vercel |
| Backend | FastAPI (Python 3.11) | Deployed on Hugging Face Spaces (Docker) |
| Database | DuckDB 0.10.0 | Rebuilt from data.jsonl on startup |
| Embeddings | sentence-transformers | all-MiniLM-L6-v2 (384-dim, multilingual) |
| Vector Search | FAISS | IndexFlatL2 (cosine via normalized L2) |
| Topic Modeling | BERTopic 0.16.4 | HDBSCAN + UMAP + CountVectorizer(stop_words=english) |
| Network | NetworkX + python-louvain | PageRank(alpha=0.85) + Louvain community detection |
| AI | Groq | llama-3.3-70b-versatile (labels), llama-3.1-8b-instant (summaries) |

## How to Run Locally

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
The backend will start on http://localhost:5000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on http://localhost:5173

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint returning basic stats |
| `/api/stats` | GET | Statistics for posts, authors, subreddits |
| `/api/subreddits` | GET | List of subreddits with counts and metadata |
| `/api/timeseries` | GET | Time series data for post activity |
| `/api/timeseries/blocs` | GET | Time series data grouped by ideological blocs |
| `/api/events` | GET | List of key political events |
| `/api/topdomain` | GET | Top domains cited in posts |
| `/api/network` | GET | Network data for visualization |
| `/api/search` | GET | Semantic search results |
| `/api/clusters` | GET | Topic clustering data |
| `/api/narrative_divergence` | GET | Narrative framing differences across blocs |
| `/api/velocity` | GET | Information propagation velocity |
| `/api/summarize` | POST | AI-generated summaries |
| `/api/suggest_queries` | POST | Suggested follow-up search queries |
| `/api/narrative_analysis` | POST | Cross-community narrative analysis |
| `/api/source_network` | GET | Source citation network |
| `/api/propagation` | GET | Narrative propagation data |
| `/api/coordinated` | GET | Coordinated amplification detection |
| `/api/findings` | GET | Key research findings |

## Dataset

- **Total Posts**: 8,567
- **Subreddits**: 10 (politics, Conservative, Liberal, socialism, neoliberal, democrats, Republican, Anarchism, worldpolitics, PoliticalDiscussion)
- **Date Range**: July 2024 – February 2025 (2024 US Election period)
- **Source**: Reddit API data collection

## Architecture Overview

The application consists of a React frontend deployed on Vercel and a Python FastAPI backend deployed on Hugging Face Spaces. Data is stored in DuckDB and vectorized using FAISS for efficient semantic search. Topic modeling is performed with BERTopic, and network analysis uses NetworkX with Louvain community detection.

## Acknowledgements

This project was built as part of the SimPPL Research Engineering Intern Assignment.</content>
<parameter name="filePath">c:\NarrativeTrail\README.md
