import duckdb, pandas as pd

df = pd.read_parquet("../data/processed.parquet")
con = duckdb.connect("../data/reddit.duckdb")
con.execute("DROP TABLE IF EXISTS posts")
con.execute("CREATE TABLE posts AS SELECT * FROM df")
con.execute("CREATE INDEX idx_sub ON posts(subreddit)")
con.execute("CREATE INDEX idx_ts ON posts(created_utc)")
con.execute("CREATE INDEX idx_bloc ON posts(ideological_bloc)")
print(con.execute("SELECT COUNT(*) FROM posts").fetchone())
print(con.execute("SELECT subreddit, COUNT(*) as n FROM posts GROUP BY subreddit ORDER BY n DESC").fetchall())
con.close()
print("DuckDB ready at ../data/reddit.duckdb")