# backend/data/database.py

import duckdb
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'narrativetrail.db')

def get_connection():
    return duckdb.connect(DB_PATH)

def get_timeline(query: str = '', subreddits: list = None):
    con = get_connection()
    where_clauses = []
    params = []

    if query:
        where_clauses.append("(title ILIKE ? OR selftext ILIKE ?)")
        params.extend([f'%{query}%', f'%{query}%'])

    if subreddits:
        placeholders = ','.join(['?' for _ in subreddits])
        where_clauses.append(f"subreddit IN ({placeholders})")
        params.extend(subreddits)

    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    sql = f"""
        SELECT 
            DATE_TRUNC('week', to_timestamp(created_utc))::DATE as week,
            subreddit,
            COUNT(*) as post_count,
            AVG(score) as avg_score
        FROM posts
        {where}
        GROUP BY week, subreddit
        ORDER BY week ASC
    """
    df = con.execute(sql, params).fetchdf()
    df['week'] = df['week'].astype(str)
    return df.to_dict(orient='records')

def get_network_data():
    con = get_connection()

    # Nodes = authors with post count and subreddit
    nodes_df = con.execute("""
        SELECT 
            author,
            subreddit,
            COUNT(*) as post_count,
            SUM(score) as total_score
        FROM posts
        WHERE author != '' AND author != '[deleted]' AND author != 'AutoModerator'
        GROUP BY author, subreddit
        ORDER BY post_count DESC
        LIMIT 500
    """).fetchdf()

    # Edges = crosspost relationships
    edges_df = con.execute("""
        SELECT 
            p1.author as source,
            p2.author as target,
            p1.subreddit as source_subreddit,
            p2.subreddit as target_subreddit
        FROM posts p1
        JOIN posts p2 ON p1.crosspost_parent = 't3_' || p2.id
        WHERE p1.crosspost_parent != '' 
          AND p1.author != '' 
          AND p2.author != ''
    """).fetchdf()

    return nodes_df.to_dict(orient='records'), edges_df.to_dict(orient='records')

def get_posts_by_ids(ids: list):
    con = get_connection()
    placeholders = ','.join(['?' for _ in ids])
    df = con.execute(f"""
        SELECT id, title, selftext, author, subreddit, score, 
               created_utc, url, permalink, domain
        FROM posts 
        WHERE id IN ({placeholders})
    """, ids).fetchdf()
    return df.to_dict(orient='records')

def get_subreddits():
    con = get_connection()
    result = con.execute("""
        SELECT subreddit, COUNT(*) as count 
        FROM posts 
        GROUP BY subreddit 
        ORDER BY count DESC
    """).fetchdf()
    return result.to_dict(orient='records')

def get_stats():
    con = get_connection()
    stats = con.execute("""
        SELECT 
            COUNT(*) as total_posts,
            COUNT(DISTINCT author) as unique_authors,
            COUNT(DISTINCT subreddit) as subreddits,
            MIN(to_timestamp(created_utc))::DATE as date_start,
            MAX(to_timestamp(created_utc))::DATE as date_end,
            AVG(score) as avg_score,
            MAX(score) as max_score
        FROM posts
    """).fetchdf()
    row = stats.iloc[0]
    return {
        'total_posts': int(row['total_posts']),
        'unique_authors': int(row['unique_authors']),
        'subreddits': int(row['subreddits']),
        'date_start': str(row['date_start']),
        'date_end': str(row['date_end']),
        'avg_score': round(float(row['avg_score']), 2),
        'max_score': int(row['max_score'])
    }