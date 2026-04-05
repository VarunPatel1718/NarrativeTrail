"""
fetch_events.py
Run SIXTH. Saves curated political events to events.json.
Dates verified against Wikipedia for the Jul 2024 - Feb 2025 window.
"""
import json, os

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

EVENTS = [
    {"date": "2024-07-21", "event": "Biden withdraws from 2024 presidential race",     "type": "election"},
    {"date": "2024-08-05", "event": "Kamala Harris officially nominated",               "type": "election"},
    {"date": "2024-09-10", "event": "Harris-Trump presidential debate",                 "type": "election"},
    {"date": "2024-10-01", "event": "VP debate: Walz vs Vance",                         "type": "election"},
    {"date": "2024-11-05", "event": "US Presidential Election Day",                     "type": "election"},
    {"date": "2024-11-06", "event": "Trump wins 2024 presidential election",            "type": "election"},
    {"date": "2025-01-06", "event": "Electoral College certification",                  "type": "inauguration"},
    {"date": "2025-01-20", "event": "Trump inauguration as 47th President",             "type": "inauguration"},
    {"date": "2025-01-20", "event": "Trump signs executive orders on border/immigration","type": "policy"},
    {"date": "2025-01-28", "event": "DOGE begins federal workforce review",             "type": "policy"},
    {"date": "2025-02-05", "event": "Mass federal worker layoffs begin",                "type": "policy"},
    {"date": "2025-02-10", "event": "Trump fires nuclear weapons oversight staff",      "type": "policy"},
    {"date": "2025-02-12", "event": "FAA staffing crisis amid crash investigations",    "type": "policy"},
]

os.makedirs(DATA_DIR, exist_ok=True)
out = f"{DATA_DIR}/events.json"
with open(out, "w") as f:
    json.dump(EVENTS, f, indent=2)

print(f"✓ Saved {len(EVENTS)} events → {out}")