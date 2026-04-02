'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const TOPIC_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706',
  '#65a30d', '#0891b2', '#0284c7', '#4338ca', '#be185d',
  '#059669', '#b45309', '#7c2d12', '#1e40af', '#6d28d9',
];

export default function Clusters() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nTopics, setNTopics] = useState(10);
  const [selected, setSelected] = useState<number | null>(null);
  const [hoveredPost, setHoveredPost] = useState<any>(null);

  const fetchClusters = async (n: number) => {
    setLoading(true);
    setSelected(null);
    const res = await axios.get(`${API}/api/clusters`, { params: { nr_topics: n } });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchClusters(10); }, []);

  const WIDTH = 560, HEIGHT = 460;

  const normalize = (points: any[]) => {
    if (!points.length) return [];
    const xs = points.map((p: any) => p.x);
    const ys = points.map((p: any) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return points.map((p: any) => ({
      ...p,
      sx: 20 + ((p.x - minX) / (maxX - minX)) * (WIDTH - 40),
      sy: 20 + ((p.y - minY) / (maxY - minY)) * (HEIGHT - 40),
    }));
  };

  const points = data ? normalize(data.points) : [];
  const topics = data?.topic_info?.filter((t: any) => t.Topic !== -1) || [];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">🗂️ Topic Cluster Map</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          BERTopic + UMAP — each dot is a post colored by dominant narrative theme.
          Click a topic to highlight its posts.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-5 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
          Number of Topics:
        </span>
        <input type="range" min={2} max={20} value={nTopics}
          onChange={e => setNTopics(Number(e.target.value))}
          className="w-32" style={{ accentColor: '#7c3aed' }} />
        <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>{nTopics}</span>
        <button onClick={() => fetchClusters(nTopics)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
          {loading ? 'Running...' : 'Apply'}
        </button>
        <span className="text-xs" style={{ color: '#334155' }}>
          Try extremes: 2 topics vs 20 topics
        </span>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <p style={{ color: '#64748b' }}>Running BERTopic on 8,567 posts...</p>
          <p className="text-xs mt-1" style={{ color: '#334155' }}>
            This may take 30–60 seconds
          </p>
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Scatter plot */}
          <div className="card p-2" style={{ flex: 'none' }}>
            <svg width={WIDTH} height={HEIGHT} style={{ cursor: 'crosshair' }}
              onMouseLeave={() => setHoveredPost(null)}>
              {points.map((p: any, i: number) => (
                <circle key={i}
                  cx={p.sx} cy={p.sy} r={2.5}
                  fill={p.topic === -1
                    ? '#1e2d3d'
                    : TOPIC_COLORS[p.topic % TOPIC_COLORS.length]}
                  opacity={
                    selected !== null && selected !== p.topic ? 0.08 : 0.85
                  }
                  onClick={() => setSelected(p.topic === selected ? null : p.topic)}
                  onMouseEnter={() => setHoveredPost(p)}
                  style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
                />
              ))}
            </svg>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Topic list */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>
                NARRATIVE THEMES — Click to highlight
              </p>
              <div className="flex flex-col gap-1.5">
                {topics.map((t: any) => (
                  <button key={t.Topic}
                    onClick={() => setSelected(t.Topic === selected ? null : t.Topic)}
                    className="flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: selected === t.Topic
                        ? `${TOPIC_COLORS[t.Topic % TOPIC_COLORS.length]}22`
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selected === t.Topic
                        ? TOPIC_COLORS[t.Topic % TOPIC_COLORS.length]
                        : '#1e2d3d'}`
                    }}>
                    <div className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: TOPIC_COLORS[t.Topic % TOPIC_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {t.Label || t.Name.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs" style={{ color: '#475569' }}>
                        {t.Count} posts
                      </div>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{
                      background: `${TOPIC_COLORS[t.Topic % TOPIC_COLORS.length]}22`,
                      color: TOPIC_COLORS[t.Topic % TOPIC_COLORS.length]
                    }}>
                      {((t.Count / 8567) * 100).toFixed(1)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            {data?.summary && (
              <div className="insight-box">
                <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
                  🤖 AI CLUSTER ANALYSIS
                </span>
                <p className="text-sm mt-1" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                  {data.summary}
                </p>
              </div>
            )}

            {/* Noise info */}
            {data?.topic_info?.find((t: any) => t.Topic === -1) && (
              <div className="card p-3">
                <p className="text-xs" style={{ color: '#334155' }}>
                  ⬛ <span style={{ color: '#475569' }}>Noise cluster (topic -1):</span>{' '}
                  {data.topic_info.find((t: any) => t.Topic === -1)?.Count} posts
                  that don't fit cleanly into any topic — normal for HDBSCAN.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}