import sys, os
sys.path.insert(0, os.getcwd())
from data.database import get_connection

con = get_connection()

print("=== Sample crosspost_parent values ===")
result = con.execute("""
    SELECT crosspost_parent, id
    FROM posts 
    WHERE crosspost_parent IS NOT NULL 
      AND crosspost_parent != ''
    LIMIT 10
""").fetchdf()
print(result)

print("\n=== Total posts with crosspost_parent ===")
count = con.execute("""
    SELECT COUNT(*) 
    FROM posts 
    WHERE crosspost_parent IS NOT NULL 
      AND crosspost_parent != ''
""").fetchone()[0]
print(f"Total: {count}")