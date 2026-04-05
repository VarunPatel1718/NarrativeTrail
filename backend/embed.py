"""
embed.py
Run FOURTH (~15 min on CPU). Embeds all posts with all-MiniLM-L6-v2,
builds FAISS IndexFlatL2, saves faiss_index.pkl + post_ids.pkl + embeddings.npy.

NOTE: Bug fix applied — np.load uses allow_pickle=True (required for numpy >= 1.17)
"""
import numpy as np, pandas as pd, faiss, os, pickle
from sentence_transformers import SentenceTransformer

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
df_clean = pd.read_parquet(f"{DATA_DIR}/processed.parquet")
df_clean = df_clean[~df_clean["is_spam"]].reset_index(drop=True)
texts    = df_clean["text"].fillna("").tolist()
post_ids = df_clean["id"].tolist()

print(f"Embedding {len(texts)} posts (spam excluded)...")
print("Expected time: ~12-15 minutes on CPU. Go get coffee.")

# Global model cache — prevents OOM on repeated calls in main.py
model = SentenceTransformer("all-MiniLM-L6-v2")
emb   = model.encode(
    texts,
    batch_size=64,
    show_progress_bar=True,
    convert_to_numpy=True,
).astype("float32")

# Normalize for cosine similarity via L2 (IndexFlatL2 on normalized = cosine)
faiss.normalize_L2(emb)

# Build FAISS index
index = faiss.IndexFlatL2(emb.shape[1])   # dim=384
index.add(emb)

# Save
with open(f"{DATA_DIR}/faiss_index.pkl", "wb") as f:
    pickle.dump(index, f)

with open(f"{DATA_DIR}/post_ids.pkl", "wb") as f:
    pickle.dump(post_ids, f)

np.save(f"{DATA_DIR}/embeddings.npy", emb)

# Lightweight search metadata for API responses
df_clean[[
    "id","title","subreddit","author","created_utc",
    "score","num_comments","permalink","domain","ideological_bloc",
]].to_parquet(f"{DATA_DIR}/search_meta.parquet", index=False)

print(f"✓ FAISS index   : {index.ntotal} vectors, dim={emb.shape[1]}")
print(f"✓ Saved         : faiss_index.pkl, post_ids.pkl, embeddings.npy, search_meta.parquet")
print(f"✓ Output dir    : {DATA_DIR}/")