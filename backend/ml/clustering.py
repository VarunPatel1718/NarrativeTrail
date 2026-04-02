# backend/ml/clustering.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import json
from bertopic import BERTopic
from umap import UMAP
from ml.embeddings import load_embeddings, embeddings_exist
from data.database import get_connection

CLUSTERS_PATH = os.path.join(os.path.dirname(__file__), '..', 'clusters.json')


def generate_label_with_groq(words: list) -> str:
    """Use Groq to generate a human-readable topic label from keywords."""
    try:
        from groq import Groq
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        word_str = ", ".join(words[:8])
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": (
                    f"These keywords describe a topic cluster in Reddit political discussions: {word_str}. "
                    f"Give a concise 3-5 word human-readable label for this topic. "
                    f"Return ONLY the label, nothing else. No quotes, no explanation."
                )
            }],
            max_tokens=20,
            temperature=0.3,
        )
        label = response.choices[0].message.content.strip().strip('"').strip("'")
        return label if label else " ".join(words[:3])
    except Exception as e:
        print(f"Groq labeling failed: {e}")
        # Fallback: clean up the raw words nicely
        return " ".join(w.capitalize() for w in words[:3])


def build_clusters(nr_topics: int = 10):
    """Run BERTopic on saved embeddings. Saves cluster results to disk."""
    if not embeddings_exist():
        raise RuntimeError("Build embeddings first.")

    print("Loading embeddings and posts...")
    embeddings, _, ids = load_embeddings()
    con = get_connection()
    df = con.execute("SELECT id, text FROM posts ORDER BY rowid").fetchdf()
    texts = df['text'].tolist()

    print(f"Running BERTopic with nr_topics={nr_topics}...")
    umap_model = UMAP(
        n_neighbors=15,
        n_components=5,
        min_dist=0.0,
        metric='cosine',
        random_state=42
    )
    from sklearn.feature_extraction.text import CountVectorizer
    vectorizer = CountVectorizer(
        stop_words="english",
        min_df=5,
        ngram_range=(1, 2)
    )
    topic_model = BERTopic(
        umap_model=umap_model,
        vectorizer_model=vectorizer,
        nr_topics=nr_topics,
        verbose=True
    )
    topics, probs = topic_model.fit_transform(texts, embeddings)
    topic_info = topic_model.get_topic_info()

    # Generate proper labels using Groq
    print("Generating topic labels with Groq...")
    topic_labels = {}
    for topic_id in topic_info['Topic'].tolist():
        if topic_id == -1:
            topic_labels[topic_id] = "Uncategorized"
            continue
        # Get top words for this topic
        topic_words = topic_model.get_topic(topic_id)
        if topic_words:
            words = [w for w, _ in topic_words[:8]]
            label = generate_label_with_groq(words)
            print(f"  Topic {topic_id}: {words[:4]} -> '{label}'")
        else:
            label = f"Topic {topic_id}"
        topic_labels[topic_id] = label

    # Build topic_info with proper labels (NOT BERTopic's raw Name)
    topic_info_clean = []
    for _, row in topic_info.iterrows():
        tid = row['Topic']
        topic_words = topic_model.get_topic(tid)
        words = [w for w, _ in topic_words[:6]] if topic_words else []
        topic_info_clean.append({
            'Topic': int(tid),
            'Count': int(row['Count']),
            'Label': topic_labels[tid],   # <-- human-readable label
            'Words': words,               # <-- top keywords for display
        })

    # Build UMAP 2D projection for visualization
    print("Building 2D UMAP projection...")
    umap_2d = UMAP(
        n_neighbors=15,
        n_components=2,
        min_dist=0.1,
        metric='cosine',
        random_state=42
    )
    coords_2d = umap_2d.fit_transform(embeddings)

    result = {
        'nr_topics': nr_topics,
        'topic_info': topic_info_clean,
        'points': [
            {
                'id': ids[i],
                'x': float(coords_2d[i][0]),
                'y': float(coords_2d[i][1]),
                'topic': int(topics[i]),
            }
            for i in range(len(ids))
        ]
    }

    with open(CLUSTERS_PATH, 'w') as f:
        json.dump(result, f)
    print(f"Saved clusters to {CLUSTERS_PATH}")
    return result


def load_clusters():
    if not os.path.exists(CLUSTERS_PATH):
        return None
    with open(CLUSTERS_PATH, 'r') as f:
        return json.load(f)


if __name__ == '__main__':
    build_clusters(nr_topics=10)