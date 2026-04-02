import sys, os
sys.path.insert(0, os.getcwd())
from data.database import get_connection

con = get_connection()

print("=== Sample IDs from posts table ===")
ids = con.execute("SELECT id FROM posts LIMIT 10").fetchdf()
print(ids)

print("\n=== crosspost_parent vs what t3_+id would look like ===")
result = con.execute("""
    SELECT 
        p1.crosspost_parent,
        't3_' || p2.id as constructed,
        p2.id as raw_id
    FROM posts p1
    CROSS JOIN posts p2
    WHERE p1.crosspost_parent != ''
      AND p1.crosspost_parent IS NOT NULL
    LIMIT 5
""").fetchdf()
print(result)

print("\n=== Check if crosspost_parent stripped of t3_ matches any id ===")
result2 = con.execute("""
    SELECT 
        p1.crosspost_parent,
        SUBSTRING(p1.crosspost_parent, 4) as stripped,
        p2.id
    FROM posts p1
    JOIN posts p2 ON SUBSTRING(p1.crosspost_parent, 4) = p2.id
    LIMIT 10
""").fetchdf()
print(result2)
print(f"Matches found: {len(result2)}")