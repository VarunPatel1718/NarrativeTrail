"""
startup.py
Called by main.py on server boot (HF Spaces / Render).
Downloads large files from Google Drive if not present,
then rebuilds DuckDB from data.jsonl (DuckDB DB is version-specific,
never safe to commit across machines).
"""
import os, subprocess, sys, shutil

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Google Drive file IDs ─────────────────────────────────────────────────────
# Update these after re-uploading to Drive
DRIVE_FILES = {
    "data.jsonl":        "1XHtTnUpTjUIIREKGF8ETaZ_hEtxtPJWY",
    "faiss_index.pkl":   "1-0pMzz_LJaINn3H4YTNDj43x4sp5bp00",
    "post_ids.pkl":      "1HTVyGkv4JRqGTeXSWPDNYCO3PeTj921i",
    "embeddings.npy":    "1tDTpt0cof3Kz7__A3vYN2bpNXTrexi_q",
    "clusters.json":     "1_2Vb4PA2kpmUvCvOa5SsRfRxREPMTL3o",
}

# These are small enough to commit to git — no download needed
GIT_FILES = [
    "network_subreddit.json",
    "network_author.json",
    "network_source.json",
    "events.json",
    "search_meta.parquet",
    "meta.parquet",
]

def download_from_drive(file_id: str, dest: str) -> None:
    """Download a Google Drive file using gdown."""
    print(f"  Downloading → {dest}")
    try:
        import gdown
        gdown.download(
            f"https://drive.google.com/uc?id={file_id}",
            dest,
            quiet=False,
        )
    except Exception as e:
        print(f"  WARNING: gdown failed for {dest}: {e}")
        print("  Trying wget fallback...")
        subprocess.run([
            "wget", "-q",
            f"https://drive.google.com/uc?export=download&id={file_id}",
            "-O", dest,
        ], check=False)

def rebuild_duckdb() -> None:
    """
    Rebuild DuckDB from data.jsonl.
    DuckDB .db files are version-specific and cannot be shared safely.
    This runs preprocess.py then build_duckdb.py.
    """
    print("Rebuilding DuckDB from data.jsonl...")
    backend_dir = os.path.dirname(__file__)
    for script in ["preprocess.py", "build_duckdb.py"]:
        path = os.path.join(backend_dir, script)
        result = subprocess.run(
            [sys.executable, path],
            capture_output=False,
        )
        if result.returncode != 0:
            print(f"WARNING: {script} exited with code {result.returncode}")

def run() -> None:
    print("=" * 60)
    print("NarrativeTrail startup.py")
    print("=" * 60)

    # 1. Download large files from Drive if missing
    for filename, file_id in DRIVE_FILES.items():
        dest = f"{DATA_DIR}/{filename}"
        if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
            print(f"Missing: {filename}")
            download_from_drive(file_id, dest)
        else:
            size_mb = os.path.getsize(dest) / 1_000_000
            print(f"✓ {filename} ({size_mb:.1f} MB)")

    # 2. Always rebuild DuckDB (safe across all environments)
    db_path = f"{DATA_DIR}/narrativetrail.db"
    if os.path.exists(db_path):
        try:
            import duckdb
            con = duckdb.connect(db_path)
            n   = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
            con.close()
            print(f"✓ narrativetrail.db OK ({n} rows)")
        except Exception as e:
            print(f"DuckDB corrupted ({e}) — rebuilding...")
            os.remove(db_path)
            rebuild_duckdb()
    else:
        print("narrativetrail.db missing — building from data.jsonl...")
        rebuild_duckdb()

    print("=" * 60)
    print("startup.py complete")
    print("=" * 60)

if __name__ == "__main__":
    run()