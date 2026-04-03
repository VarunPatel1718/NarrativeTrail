# backend/startup.py
import os
import sys
# Pre-built file IDs on Google Drive
FILES = {
    "clusters.json":  "156iElJ6d-1VP_DAjRHu76iyN2coYyGsP",
    "embeddings.npy":    "1_2Vb4PA2kpmUvCvOa5SsRfRxREPMTL3o",
    "faiss_index.pkl":       "1-0pMzz_LJaINn3H4YTNDj43x4sp5bp00",
    "narrativetrail.db":     "1tDTpt0cof3Kz7__A3vYN2bpNXTrexi_q",
    "post_ids.pkl":      "1HTVyGkv4JRqGTeXSWPDNYCO3PeTj921i",
}

def download_all():
    import gdown
    all_ok = True
    for filename, file_id in FILES.items():
        if os.path.exists(filename):
            print(f"{filename} already exists, skipping")
            continue
        print(f"Downloading {filename}...")
        try:
            url = f"https://drive.google.com/uc?id={file_id}"
            gdown.download(url, filename, quiet=False)
            if os.path.exists(filename):
                print(f"{filename} downloaded successfully")
            else:
                print(f"ERROR: {filename} failed to download")
                all_ok = False
        except Exception as e:
            print(f"ERROR downloading {filename}: {e}")
            all_ok = False
    return all_ok

if __name__ == "__main__":
    print("=== NarrativeTrail Startup ===")
    if not download_all():
        print("WARNING: Some files failed to download")
    print("=== Startup complete ===")