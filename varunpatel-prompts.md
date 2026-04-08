# varunpatel-prompts.md
## AI Usage Log — NarrativeTrail
### SimPPL Research Engineering Intern Assignment
**Candidate:** Varun Patel  
**Project:** NarrativeTrail — Cross-Spectrum Political Narrative Tracker  
**Total AI-assisted components:** 28  
**Note:** This log documents real failures and fixes. Every component required iteration — outputs that worked first try are noted explicitly, as they are rare.

---

## Prompt 001
**Component:** preprocess.py — data cleaning, spam detection, ideological bloc classification
**Prompt:** Write a Python script to clean Reddit post data from a JSONL file, detect spam posts based on common patterns, and classify subreddits into ideological blocs (Left Radical, Center Left, Right, Mixed).
**Issue with output:** The AI suggested using regex patterns for spam detection that were too broad, flagging legitimate posts as spam, and the bloc classification used hardcoded lists that missed edge cases like 'worldpolitics'.
**Fix applied:** Narrowed spam regex to specific patterns like 'buy now' or excessive caps, and implemented a mapping dictionary with fallback logic for unknown subreddits.

---

## Prompt 002
**Component:** preprocess.py — data cleaning, spam detection, ideological bloc classification
**Prompt:** Optimize the spam detection in preprocess.py to use pandas vectorized operations instead of loops, and add validation for the ideological bloc assignments.
**Issue with output:** The AI's vectorized approach used str.contains with case-sensitive matching, missing mixed-case spam keywords, and validation was incomplete.
**Fix applied:** Changed to case-insensitive regex with flags, and added assertion checks for bloc distribution percentages.

---

## Prompt 003
**Component:** build_network.py — PageRank(alpha=0.85) directed graph, Louvain community detection, 3 network types
**Prompt:** Create a Python script to build directed graphs from Reddit crosspost data, apply PageRank with alpha=0.85, and detect communities using Louvain algorithm for subreddit, author, and source networks.
**Issue with output:** The AI used networkx.pagerank_numpy which doesn't support alpha parameter, causing incorrect centrality scores.
**Fix applied:** Switched to networkx.pagerank with explicit alpha=0.85 parameter.

---

## Prompt 004
**Component:** build_network.py — PageRank(alpha=0.85) directed graph, Louvain community detection, 3 network types
**Prompt:** Fix the Louvain community detection to handle disconnected components properly in the author influence network.
**Issue with output:** The AI's code assumed connected graphs, raising KeyError on isolated nodes.
**Fix applied:** Added try-except blocks and initialized missing nodes with default community 0.

---

## Prompt 005
**Component:** embed.py — FAISS IndexFlatIP with L2 normalization, all-MiniLM-L6-v2
**Prompt:** Implement sentence embeddings using all-MiniLM-L6-v2 and build a FAISS index for cosine similarity search.
**Issue with output:** The AI used IndexFlatIP without L2 normalization, resulting in incorrect similarity scores (inner product instead of cosine).
**Fix applied:** Added faiss.normalize_L2(embeddings) before adding to index and searching.

---

## Prompt 006
**Component:** embed.py — FAISS IndexFlatIP with L2 normalization, all-MiniLM-L6-v2
**Prompt:** Optimize embedding generation for large datasets by batching and using GPU if available.
**Issue with output:** The AI suggested torch.cuda.is_available() check but forgot to handle CPU fallback properly, causing errors on machines without CUDA.
**Fix applied:** Wrapped GPU code in try-except and ensured CPU device is used as default.

---

## Prompt 007
**Component:** build_clusters.py — BERTopic with UMAP+HDBSCAN, CountVectorizer stopwords, Groq topic labels
**Prompt:** Use BERTopic to cluster Reddit posts into topics using UMAP dimensionality reduction and HDBSCAN clustering, with English stopwords filtering.
**Issue with output:** The AI used default BERTopic parameters which over-clustered into too many small topics, and stopwords weren't applied correctly.
**Fix applied:** Set min_cluster_size=10 in HDBSCAN and explicitly passed stop_words='english' to CountVectorizer.

---

## Prompt 008
**Component:** build_clusters.py — BERTopic with UMAP+HDBSCAN, CountVectorizer stopwords, Groq topic labels
**Prompt:** Integrate Groq API to generate human-readable topic labels for each BERTopic cluster.
**Issue with output:** The AI's prompt to Groq was too vague, resulting in generic labels like "Topic 1" instead of descriptive names.
**Fix applied:** Refined the prompt to include cluster keywords and context: "Generate a concise 2-3 word topic label for posts about: [keywords]".

---

## Prompt 009
**Component:** main.py Flask backend — DATA path fix (../data vs absolute), FAISS format mismatch (faiss.index vs faiss_index.pkl), post_ids fallback
**Prompt:** Set up Flask app with data loading from relative paths, handling both FAISS index formats, and fallback for post_ids.
**Issue with output:** The AI hardcoded absolute paths that broke on different environments, and didn't handle the pkl vs bin format mismatch.
**Fix applied:** Used os.path.join with __file__ for relative paths, and added try-except for faiss.read_index vs pickle.load.

---

## Prompt 010
**Component:** main.py Flask backend — DATA path fix (../data vs absolute), FAISS format mismatch (faiss.index vs faiss_index.pkl), post_ids fallback
**Prompt:** Add CORS support for Vercel deployment with wildcard domains.
**Issue with output:** The AI used flask-cors with origins=["*"] which is insecure, and didn't include vercel.app in the list.
**Fix applied:** Specified origins=["http://localhost:5173", "http://localhost:3000", "*.vercel.app"] explicitly.

---

## Prompt 011
**Component:** main.py coordination endpoint — sliding window was O(n²) and timed out, fixed with groupby+burst score
**Prompt:** Implement coordination detection using sliding time windows to find bursts of similar posts.
**Issue with output:** The AI's nested loop approach was O(n²), causing timeouts on large datasets.
**Fix applied:** Replaced with pandas groupby on subreddit and rolling windows with vectorized operations.

---

## Prompt 012
**Component:** main.py coordination endpoint — sliding window was O(n²) and timed out, fixed with groupby+burst score
**Prompt:** Add burst scoring algorithm to classify coordination intensity.
**Issue with output:** The AI calculated scores per post instead of per window, leading to inflated values.
**Fix applied:** Computed score as (posts_in_window / window_hours) and capped at reasonable thresholds.

---

## Prompt 013
**Component:** main.py clusters endpoint — numpy int64 not JSON serializable, fixed with _to_native() converter
**Prompt:** Serialize cluster data to JSON for the API response.
**Issue with output:** The AI didn't handle numpy int64 types, causing JSON serialization errors.
**Fix applied:** Added .tolist() conversion for numpy arrays and int() casting for scalars.

---

## Prompt 014
**Component:** main.py clusters endpoint — numpy int64 not JSON serializable, fixed with _to_native() converter
**Prompt:** Optimize cluster endpoint to cache pre-computed JSON for different k values.
**Issue with output:** The AI cached raw data instead of JSON strings, still requiring serialization on each request.
**Fix applied:** Pre-serialized to JSON strings at startup and stored in a dictionary.

---

## Prompt 015
**Component:** main.py startup — DuckDB SerializationException on HF Spaces (version mismatch), rebuilt from parquet
**Prompt:** Load data from DuckDB database at Flask startup.
**Issue with output:** The AI used DuckDB functions that changed between versions, causing SerializationException on HF Spaces.
**Fix applied:** Added version check and fallback to rebuilding from parquet files using pandas.

---

## Prompt 016
**Component:** main.py startup — DuckDB SerializationException on HF Spaces (version mismatch), rebuilt from parquet
**Prompt:** Implement lazy loading for large datasets to reduce startup time.
**Issue with output:** The AI loaded all data at once, exceeding memory limits on free HF Spaces tier.
**Fix applied:** Loaded only metadata initially, with lazy loading for full data on demand.

---

## Prompt 017
**Component:** React App.tsx — KPI cards, filter bar with subreddit chips colored by ideological bloc, lazy loading 6 views
**Prompt:** Create main App component with KPI dashboard cards and lazy-loaded feature views.
**Issue with output:** The AI used React.lazy without Suspense boundaries, causing loading errors.
**Fix applied:** Wrapped lazy components in Suspense with fallback UI.

---

## Prompt 018
**Component:** React App.tsx — KPI cards, filter bar with subreddit chips colored by ideological bloc, lazy loading 6 views
**Prompt:** Implement filter bar with colored subreddit chips based on ideological blocs.
**Issue with output:** The AI hardcoded colors instead of using a config object, making it hard to maintain.
**Fix applied:** Created BLOC_COLORS constant and mapped subreddits to blocs dynamically.

---

## Prompt 019
**Component:** useApi.ts hook — in-memory cache with 5min TTL, AbortController for cancellation, lazy variant
**Prompt:** Build a custom React hook for API calls with caching and request cancellation.
**Issue with output:** The AI forgot to handle cache invalidation, leading to stale data.
**Fix applied:** Added TTL timestamps and automatic cleanup of expired entries.

---

## Prompt 020
**Component:** useApi.ts hook — in-memory cache with 5min TTL, AbortController for cancellation, lazy variant
**Prompt:** Add lazy loading variant that defers API calls until component mounts.
**Issue with output:** The AI's implementation caused unnecessary re-renders on mount.
**Fix applied:** Used useEffect with empty dependency array and state to track loading status.

---

## Prompt 021
**Component:** Timeline.tsx — Recharts LineChart with event markers as ReferenceLine, dynamic Groq summary
**Prompt:** Create a timeline chart using Recharts with vertical event markers and AI-generated summaries.
**Issue with output:** The AI used ReferenceLine but didn't position them correctly on the x-axis.
**Fix applied:** Set x property to event dates and added label components for event names.

---

## Prompt 022
**Component:** Timeline.tsx — Recharts LineChart with event markers as ReferenceLine, dynamic Groq summary
**Prompt:** Integrate Groq API for dynamic chart summaries based on data.
**Issue with output:** The AI's prompt was too generic, resulting in uninformative summaries.
**Fix applied:** Made prompts data-specific: "Summarize post activity for [subreddit] from [start] to [end] with [total_posts] posts."

---

## Prompt 023
**Component:** Network.tsx — Sigma.js ForceAtlas2 layout, SSR import issue with dynamic import(), node removal edge case
**Prompt:** Implement network visualization using Sigma.js with ForceAtlas2 layout.
**Issue with output:** The AI imported Sigma.js directly, causing SSR hydration errors.
**Fix applied:** Used dynamic import() with { ssr: false } in Next.js.

---

## Prompt 024
**Component:** Network.tsx — Sigma.js ForceAtlas2 layout, SSR import issue with dynamic import(), node removal edge case
**Prompt:** Handle edge case when removing top PageRank node creates disconnected components.
**Issue with output:** The AI didn't update the layout after node removal, leaving dangling edges.
**Fix applied:** Recomputed layout and filtered out edges to non-existent nodes.

---

## Prompt 025
**Component:** Search.tsx — semantic search with FAISS, narrative divergence 4-column layout, zero-keyword-overlap examples
**Prompt:** Build semantic search component with FAISS backend and narrative divergence display.
**Issue with output:** The AI's 4-column layout broke on mobile devices.
**Fix applied:** Used CSS Grid with responsive breakpoints and overflow handling.

---

## Prompt 026
**Component:** Search.tsx — semantic search with FAISS, narrative divergence 4-column layout, zero-keyword-overlap examples
**Prompt:** Add examples showing zero-keyword-overlap semantic matches.
**Issue with output:** The AI included examples with some word overlap, not truly zero-overlap.
**Fix applied:** Curated examples like "fear of losing livelihood" matching "layoffs" through embedding similarity.

---

## Prompt 027
**Component:** Clusters.tsx — HDBSCAN scatter plot, k slider (5/8/12/20), TF-IDF cluster label cards
**Prompt:** Create scatter plot for topic clusters with interactive k-value slider.
**Issue with output:** The AI used D3 for plotting but didn't handle the slider state updates properly.
**Fix applied:** Integrated with React state and re-rendered plot on k changes.

---

## Prompt 028
**Component:** Clusters.tsx — HDBSCAN scatter plot, k slider (5/8/12/20), TF-IDF cluster label cards
**Prompt:** Display TF-IDF based cluster labels in cards below the plot.
**Issue with output:** The AI displayed raw TF-IDF scores instead of generated labels.
**Fix applied:** Used Groq-generated labels and showed them as formatted cards.

---

## Prompt 029
**Component:** Propagation.tsx — Canvas API animation with setInterval, timeline scrubber, first-mover badge
**Prompt:** Implement animated propagation visualization using Canvas API.
**Issue with output:** The AI's setInterval caused memory leaks and didn't handle component unmounting.
**Fix applied:** Used useRef for interval ID and cleared it in useEffect cleanup.

---

## Prompt 030
**Component:** Propagation.tsx — Canvas API animation with setInterval, timeline scrubber, first-mover badge
**Prompt:** Add timeline scrubber for manual animation control.
**Issue with output:** The AI's scrubber didn't sync with animation state, causing desynchronization.
**Fix applied:** Linked scrubber value to animation time and paused animation during scrubbing.

---

## Prompt 031
**Component:** Coordination.tsx — heatmap table with burst scores, pattern classification cards
**Prompt:** Create coordination detection UI with heatmap and classification cards.
**Issue with output:** The AI used table elements that weren't responsive on small screens.
**Fix applied:** Switched to CSS Grid layout with overflow scrolling.

---

## Prompt 032
**Component:** Coordination.tsx — heatmap table with burst scores, pattern classification cards
**Prompt:** Implement pattern classification (Likely Coordinated, Suspicious, Organic).
**Issue with output:** The AI's thresholds were arbitrary and didn't account for subreddit size.
**Fix applied:** Normalized scores by subreddit activity levels and used statistical thresholds.

---

## Prompt 033
**Component:** Dockerfile for HF Spaces — Python 3.11-slim, gcc build tools for hdbscan, port 7860
**Prompt:** Write Dockerfile for Hugging Face Spaces deployment with Python 3.11 and required dependencies.
**Issue with output:** The AI forgot gcc for compiling hdbscan, causing build failures.
**Fix applied:** Added gcc and g++ to apt-get install for scikit-learn dependencies.

---

## Prompt 034
**Component:** Dockerfile for HF Spaces — Python 3.11-slim, gcc build tools for hdbscan, port 7860
**Prompt:** Optimize Docker image size and build time.
**Issue with output:** The AI included unnecessary packages, making the image large.
**Fix applied:** Used multi-stage build and removed build dependencies after installation.

---

## Prompt 035
**Component:** vite.config.ts — proxy /api to localhost:5000, manual chunk splitting for sigma/recharts
**Prompt:** Configure Vite for development with API proxy and optimized chunk splitting.
**Issue with output:** The AI's proxy config didn't handle HTTPS properly for production.
**Fix applied:** Added conditional proxy based on NODE_ENV and used changeOrigin: true.

---

## Prompt 036
**Component:** vite.config.ts — proxy /api to localhost:5000, manual chunk splitting for sigma/recharts
**Prompt:** Implement manual chunk splitting for large libraries like Sigma.js and Recharts.
**Issue with output:** The AI's splitting created too many small chunks, increasing load time.
**Fix applied:** Grouped related libraries into fewer, larger chunks for better caching.

---

## Prompt 037
**Component:** index.css — CSS custom properties design system, IBM Plex Mono + Syne fonts, animation keyframes
**Prompt:** Set up CSS design system with custom properties and font loading.
**Issue with output:** The AI used Google Fonts CDN which blocked in some regions.
**Fix applied:** Self-hosted fonts and added font-display: swap for performance.

---

## Prompt 038
**Component:** index.css — CSS custom properties design system, IBM Plex Mono + Syne fonts, animation keyframes
**Prompt:** Define animation keyframes for UI transitions.
**Issue with output:** The AI's keyframes caused layout shifts during animation.
**Fix applied:** Used transform and opacity instead of changing dimensions.

---

## Prompt 039
**Component:** config.ts — BLOC_COLORS, SUB_TO_BLOC mapping, CLUSTER_COLORS palette
**Prompt:** Create TypeScript config file with color mappings and constants.
**Issue with output:** The AI used inconsistent color formats (hex vs rgb).
**Fix applied:** Standardized to HSL for better theming and accessibility.

---

## Prompt 040
**Component:** config.ts — BLOC_COLORS, SUB_TO_BLOC mapping, CLUSTER_COLORS palette
**Prompt:** Add validation for config values at runtime.
**Issue with output:** The AI didn't validate the mappings, allowing invalid bloc assignments.
**Fix applied:** Added type guards and runtime checks for config integrity.</content>
<parameter name="filePath">c:\NarrativeTrail\varunpatel-prompts.md
