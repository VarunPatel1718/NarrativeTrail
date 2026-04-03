# backend/startup.py
import os
import sys

FILES_TO_DOWNLOAD = {
    "data.jsonl":      "1XHtTnUpTjUIIREKGF8ETaZ_hEtxtPJWY",
    "faiss_index.pkl": "1-0pMzz_LJaINn3H4YTNDj43x4sp5bp00",
    "post_ids.pkl":    "1HTVyGkv4JRqGTeXSWPDNYCO3PeTj921i",
    "embeddings.npy":  "1tDTpt0cof3Kz7__A3vYN2bpNXTrexi_q",
    "clusters.json":   "1_2Vb4PA2kpmUvCvOa5SsRfRxREPMTL3o",
}

def download_file(filename, file_id):
    if os.path.exists(filename):
        print(f"{filename} already exists, skipping")
        return True
    try:
        import gdown
        print(f"Downloading {filename}...")
        gdown.download(f"https://drive.google.com/uc?id={file_id}", filename, quiet=False)
        return os.path.exists(filename)
    except Exception as e:
        print(f"ERROR downloading {filename}: {e}")
        return False

def download_all():
    for filename, file_id in FILES_TO_DOWNLOAD.items():
        download_file(filename, file_id)

def ensure_database():
    db_path = "narrativetrail.db"
    if os.path.exists(db_path):
        # Verify it's readable
        try:
            import duckdb
            con = duckdb.connect(db_path)
            count = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
            con.close()
            print(f"Database OK: {count} posts")
            return True
        except Exception as e:
            print(f"Database corrupted ({e}), rebuilding...")
            os.remove(db_path)

    # Rebuild from data.jsonl
    if not os.path.exists("data.jsonl"):
        download_file("data.jsonl", "1XHtTnUpTjUIIREKGF8ETaZ_hEtxtPJWY")

    print("Building database from data.jsonl...")
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from data.loader import load_data
        load_data("data.jsonl", db_path)
        print("Database built successfully")
        return True
    except Exception as e:
        print(f"ERROR building database: {e}")
        return False

if __name__ == "__main__":
    download_all()
    ensure_database()