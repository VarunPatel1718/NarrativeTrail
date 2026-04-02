'use client';
import { useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const SUBREDDIT_COLORS: Record<string, string> = {
  Conservative: '#f97316', Republican: '#ef4444',
  Liberal: '#34d399', democrats: '#60a5fa',
  socialism: '#fb923c', Anarchism: '#f43f5e',
  neoliberal: '#a78bfa', politics: '#94a3b8',
  worldpolitics: '#fbbf24', PoliticalDiscussion: '#e2e8f0',
};

const IDEOLOGY: Record<string, string> = {
  Anarchism: 'Far Left', socialism: 'Left',
  Liberal: 'Center Left', democrats: 'Center Left',
  neoliberal: 'Center', politics: 'Center',
  PoliticalDiscussion: 'Center', worldpolitics: 'Center',
  Conservative: 'Right', Republican: 'Far Right',
};

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await axios.get(`${API}/api/search`, { params: { q } });
    setResults(res.data.results || []);
    setSuggestions(res.data.suggestions || []);
    setSummary(res.data.summary || '');
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">🔍 Semantic Search</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Finds posts by <strong style={{ color: '#a78bfa' }}>meaning</strong> — not keywords.
          Works across languages. Try concepts with zero word overlap.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="e.g. economic inequality, border security, voting rights, climate crisis..."
          className="flex-1 px-4 py-3 rounded-xl text-white text-sm"
          style={{ background: '#0f1923', border: '1px solid #1e2d3d', color: '#e2e8f0' }}
        />
        <button onClick={() => search(query)}
          className="px-6 py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="insight-box mb-4">
          <div className="flex items-start gap-2">
            <span>🤖</span>
            <div>
              <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
                AI SEARCH ANALYSIS
              </span>
              <p className="text-sm mt-1" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                {summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs" style={{ color: '#475569' }}>Follow-up:</span>
          {suggestions.map(s => (
            <button key={s}
              onClick={() => { setQuery(s); search(s); }}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{
                background: 'rgba(79,70,229,0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(79,70,229,0.3)'
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center">
          <p style={{ color: '#64748b' }}>Searching 8,567 post embeddings...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card p-8 text-center">
          <p style={{ color: '#64748b' }}>No results found. Try a different query.</p>
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-3">
        {results.map((post, idx) => (
          <div key={post.id} className="card p-4 transition-all"
            style={{ borderLeft: `3px solid ${SUBREDDIT_COLORS[post.subreddit] || '#4f46e5'}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Rank + title */}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold shrink-0 mt-0.5"
                    style={{ color: '#334155' }}>#{idx + 1}</span>
                  <a href={`https://reddit.com${post.permalink}`} target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:underline leading-snug">
                    {post.title}
                  </a>
                </div>

                {/* Meta */}
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                    background: (SUBREDDIT_COLORS[post.subreddit] || '#a78bfa') + '22',
                    color: SUBREDDIT_COLORS[post.subreddit] || '#a78bfa'
                  }}>
                    r/{post.subreddit}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#475569'
                  }}>
                    {IDEOLOGY[post.subreddit] || 'Unknown'}
                  </span>
                  <span className="text-xs" style={{ color: '#334155' }}>
                    ↑ {post.score?.toLocaleString()} · u/{post.author}
                  </span>
                </div>
              </div>

              {/* Similarity score */}
              <div className="text-center shrink-0">
                <div className="text-xs" style={{ color: '#334155' }}>similarity</div>
                <div className="text-lg font-bold" style={{ color: '#4f46e5' }}>
                  {post.similarity_score?.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}