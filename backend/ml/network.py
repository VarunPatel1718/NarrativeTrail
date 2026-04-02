# backend/ml/network.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import networkx as nx
import community as community_louvain
from data.database import get_connection

def build_network():
    con = get_connection()

    # Get all authors with their subreddits and scores
    authors_df = con.execute("""
        SELECT 
            author,
            subreddit,
            COUNT(*) as post_count,
            SUM(score) as total_score
        FROM posts
        WHERE author != '' 
          AND author != '[deleted]' 
          AND author != 'AutoModerator'
        GROUP BY author, subreddit
        ORDER BY post_count DESC
    """).fetchdf()

    # Find authors who post in MORE THAN ONE subreddit
    # These are the cross-spectrum bridges
    author_subs = authors_df.groupby('author')['subreddit'].apply(list).reset_index()
    author_subs.columns = ['author', 'subreddits']
    multi_sub_authors = author_subs[author_subs['subreddits'].apply(len) > 1]

    print(f"Authors posting in multiple subreddits: {len(multi_sub_authors)}")

    # Build graph
    G = nx.Graph()

    # Add nodes — top 200 authors by total posts
    top_authors = authors_df.groupby('author').agg(
        post_count=('post_count', 'sum'),
        total_score=('total_score', 'sum'),
        subreddit=('subreddit', 'first')
    ).reset_index().sort_values('post_count', ascending=False).head(200)

    for _, row in top_authors.iterrows():
        G.add_node(row['author'],
                   subreddit=row['subreddit'],
                   post_count=int(row['post_count']),
                   total_score=int(row['total_score']))

    # Add edges between authors who posted in the SAME subreddit
    # (co-participation network)
    subreddit_authors = authors_df.groupby('subreddit')['author'].apply(list).to_dict()

    edge_count = 0
    for subreddit, auth_list in subreddit_authors.items():
        # Only connect top authors per subreddit to avoid too many edges
        top_in_sub = [a for a in auth_list if G.has_node(a)][:15]
        for i in range(len(top_in_sub)):
            for j in range(i + 1, len(top_in_sub)):
                a1, a2 = top_in_sub[i], top_in_sub[j]
                if G.has_node(a1) and G.has_node(a2):
                    if G.has_edge(a1, a2):
                        G[a1][a2]['weight'] += 1
                        G[a1][a2]['shared_subreddits'] = G[a1][a2].get('shared_subreddits', []) + [subreddit]
                    else:
                        G.add_edge(a1, a2, weight=1, shared_subreddits=[subreddit])
                        edge_count += 1

    print(f"Graph: {len(G.nodes())} nodes, {len(G.edges())} edges")

    # PageRank
    pagerank = nx.pagerank(G, alpha=0.85, max_iter=100)

    # Louvain community detection
    if len(G.edges()) > 0:
        partition = community_louvain.best_partition(G)
    else:
        partition = {node: 0 for node in G.nodes()}

    # Betweenness centrality
    betweenness = nx.betweenness_centrality(G, normalized=True)

    # Assemble nodes
    nodes = []
    for node in G.nodes():
        data = G.nodes[node]
        nodes.append({
            'author': node,
            'subreddit': data.get('subreddit', ''),
            'post_count': data.get('post_count', 0),
            'total_score': data.get('total_score', 0),
            'pagerank': round(pagerank.get(node, 0), 6),
            'community': partition.get(node, 0),
            'betweenness': round(betweenness.get(node, 0), 6),
        })

    nodes.sort(key=lambda x: x['pagerank'], reverse=True)

    # Assemble edges
    edges = []
    for source, target, data in G.edges(data=True):
        edges.append({
            'source': source,
            'target': target,
            'weight': data.get('weight', 1),
            'shared_subreddits': data.get('shared_subreddits', []),
        })

    num_communities = len(set(partition.values()))
    top_nodes = nodes[:5]

    result = {
        'nodes': nodes,
        'edges': edges,
        'stats': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'num_communities': num_communities,
            'top_influencers': [
                {
                    'author': n['author'],
                    'subreddit': n['subreddit'],
                    'pagerank': n['pagerank'],
                    'post_count': n['post_count']
                }
                for n in top_nodes
            ]
        }
    }

    return result

if __name__ == '__main__':
    result = build_network()
    print(f"Nodes: {result['stats']['total_nodes']}")
    print(f"Edges: {result['stats']['total_edges']}")
    print(f"Communities: {result['stats']['num_communities']}")
    print("Top influencers by PageRank:")
    for n in result['stats']['top_influencers']:
        print(f"  {n['author']} ({n['subreddit']}) — PageRank: {n['pagerank']:.6f}")