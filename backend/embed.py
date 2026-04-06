import numpy as np, pandas as pd, faiss, os
from sentence_transformers import SentenceTransformer

df = pd.read_parquet("../data/processed.parquet")
df_clean = df[~df["is_spam"]].reset_index(drop=True)
texts = df_clean["text"].fillna("").tolist()

print(f"Embedding {len(texts)} posts (spam excluded)...")
print("This takes ~10-15 minutes on CPU. Start build_clusters.py review while waiting.")

model = SentenceTransformer("all-MiniLM-L6-v2")
emb = model.encode(
    texts,
    batch_size=64,
    show_progress_bar=True,
    convert_to_numpy=True
).astype("float32")

# Normalize for cosine similarity via inner product
faiss.normalize_L2(emb)

# Build index
index = faiss.IndexFlatIP(emb.shape[1])
index.add(emb)

# Save
faiss.write_index(index, "../data/faiss.index")
np.save("../data/embeddings.npy", emb)
df_clean[["id","title","subreddit","author","created_utc","score",
          "num_comments","permalink","domain","ideological_bloc"]]\
    .to_parquet("../data/search_meta.parquet", index=False)

print(f"FAISS index: {index.ntotal} vectors, shape: {emb.shape}")
print("Saved: faiss.index, embeddings.npy, search_meta.parquet")