import sys, os
sys.path.insert(0, os.getcwd())
from data.database import get_connection

con = get_connection()

print("=== Direct join test ===")
result = con.execute("""
    SELECT 
        p1.author as source,
        p2.author as target,
        p1.subreddit as source_sub,
        p2.subreddit as target_sub,
        p1.crosspost_parent,
        p2.id
    FROM posts p1
    JOIN posts p2 ON p1.crosspost_parent = 't3_' || p2.id
    LIMIT 10
""").fetchdf()
print(result)
print(f"Total raw edges: {len(result)}")

print("\n=== After author filter ===")
result2 = con.execute("""
    SELECT 
        p1.author as source,
        p2.author as target
    FROM posts p1
    JOIN posts p2 ON p1.crosspost_parent = 't3_' || p2.id
    WHERE p1.author != '' 
      AND p2.author != ''
      AND p1.author != '[deleted]'
      AND p2.author != '[deleted]'
    LIMIT 10
""").fetchdf()
print(result2)
print(f"Total filtered edges: {len(result2)}")