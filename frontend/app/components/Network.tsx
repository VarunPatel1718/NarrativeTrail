'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const COLORS: Record<string, string> = {
  politics: '#94a3b8',
  Conservative: '#f97316',
  Liberal: '#34d399',
  socialism: '#fb923c',
  Anarchism: '#f43f5e',
  neoliberal: '#a78bfa',
  democrats: '#60a5fa',
  Republican: '#ef4444',
  worldpolitics: '#fbbf24',
  PoliticalDiscussion: '#e2e8f0',
};

const IDEOLOGY: Record<string, string> = {
  Anarchism: 'Far Left', socialism: 'Left',
  Liberal: 'Center Left', democrats: 'Center Left',
  neoliberal: 'Center', politics: 'Center',
  PoliticalDiscussion: 'Center', worldpolitics: 'Center',
  Conservative: 'Right', Republican: 'Far Right',
};

export default function Network() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/network`).then(res => {
      setNodes(res.data.nodes.slice(0, 80));
      setEdges(res.data.edges.slice(0, 300));
      setSummary(res.data.summary || '');
      setStats(res.data.stats);
      setLoading(false);
    });
  }, []);

  const WIDTH = 720, HEIGHT = 500;

  const ideologyOrder: Record<string, number> = {
    'Far Left': 0, 'Left': 1, 'Center Left': 2,
    'Center': 3, 'Right': 4, 'Far Right': 5
  };

  const positioned = nodes.map((n, i) => {
    const ideologyX = ideologyOrder[IDEOLOGY[n.subreddit] || 'Center'] ?? 3;
    const xBase = 60 + (ideologyX / 5) * (WIDTH - 120);
    const xJitter = Math.sin(i * 2.3) * 55;
    const yJitter = Math.cos(i * 1.7) * 190;
    return {
      ...n,
      x: Math.max(20, Math.min(WIDTH - 20, xBase + xJitter)),
      y: Math.max(20, Math.min(HEIGHT - 20, HEIGHT / 2 + yJitter)),
    };
  });

  const posMap: Record<string, any> = {};
  positioned.forEach(n => { posMap[n.author] = n; });

  if (loading) return (
    <div className="card p-12 text-center">
      <div className="text-4xl mb-3">🕸️</div>
      <p style={{ color: '#64748b' }}>Building influence network...</p>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">🕸️ Influence Network</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Authors arranged left→right by ideology · Edges = co-participation ·
          Node size = post count · Click any node to inspect
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Authors', value: stats.total_nodes },
            { label: 'Connections', value: stats.total_edges },
            { label: 'Communities', value: stats.num_communities },
            { label: 'Top Influencer', value: `u/${stats.top_influencers?.[0]?.author}` },
          ].map(s => (
            <div key={s.label} className="card px-4 py-2 flex-1 text-center">
              <div className="text-lg font-bold" style={{ color: '#a78bfa' }}>{s.value}</div>
              <div className="text-xs" style={{ color: '#475569' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="insight-box mb-4">
          <div className="flex items-start gap-2">
            <span>🤖</span>
            <div>
              <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
                AI NETWORK ANALYSIS
              </span>
              <p className="text-sm mt-1" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                {summary}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Graph */}
        <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Ideology axis labels */}
          <div className="flex justify-between px-4 pt-3 pb-1">
            {['Far Left', 'Left', 'Center Left', 'Center', 'Right', 'Far Right'].map(label => (
              <span key={label} className="text-xs" style={{ color: '#334155' }}>{label}</span>
            ))}
          </div>

          <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            {/* Divider lines */}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={i}
                x1={60 + (i / 5) * (WIDTH - 120)} y1={0}
                x2={60 + (i / 5) * (WIDTH - 120)} y2={HEIGHT}
                stroke="#1e2d3d" strokeWidth={1} strokeDasharray="4 4"
              />
            ))}

            {/* Edges */}
            {edges.map((e, i) => {
              const s = posMap[e.source], t = posMap[e.target];
              if (!s || !t) return null;
              return (
                <line key={i}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={COLORS[s.subreddit] || '#1e2d3d'}
                  strokeWidth={0.5} opacity={0.12}
                />
              );
            })}

            {/* Nodes */}
            {positioned.map((n, idx) => {
              const r = Math.min(3 + n.post_count / 15, 16);
              const isSelected = selected?.author === n.author;
              return (
                <g key={`${n.author}-${idx}`}
                  onClick={() => setSelected(isSelected ? null : n)}
                  style={{ cursor: 'pointer' }}>
                  <circle cx={n.x} cy={n.y} r={r + 5} fill="transparent" />
                  <circle cx={n.x} cy={n.y} r={r}
                    fill={COLORS[n.subreddit] || '#a0aec0'}
                    opacity={isSelected ? 1 : 0.75}
                    stroke={isSelected ? 'white' : 'transparent'}
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div style={{ width: 220 }}>
          <div className="card p-3 mb-3">
            <p className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>
              COMMUNITIES
            </p>
            {Object.entries(COLORS).map(([sub, color]) => (
              <div key={sub} className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs" style={{ color: '#64748b' }}>r/{sub}</span>
                </div>
                <span className="text-xs" style={{ color: '#334155', fontSize: 10 }}>
                  {IDEOLOGY[sub]}
                </span>
              </div>
            ))}
          </div>

          {selected && (
            <div className="card p-3"
              style={{ border: `1px solid ${COLORS[selected.subreddit] || '#4f46e5'}` }}>
              <p className="font-semibold text-white text-sm mb-2">
                u/{selected.author}
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Community', value: `r/${selected.subreddit}` },
                  { label: 'Ideology', value: IDEOLOGY[selected.subreddit] || 'Unknown' },
                  { label: 'Posts', value: selected.post_count },
                  { label: 'Total Score', value: selected.total_score?.toLocaleString() },
                  { label: 'PageRank', value: selected.pagerank?.toFixed(5) },
                  { label: 'Betweenness', value: selected.betweenness?.toFixed(5) },
                  { label: 'Community #', value: selected.community },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: '#475569' }}>{item.label}</span>
                    <span className="text-xs font-medium"
                      style={{ color: COLORS[selected.subreddit] || '#a78bfa' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}