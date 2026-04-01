'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const TOPIC_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706',
  '#65a30d', '#0891b2', '#0284c7', '#4338ca', '#be185d',
];

export default function Clusters() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nTopics, setNTopics] = useState(10);
  const [selected, setSelected] = useState<any>(null);

  const fetchClusters = async (n: number) => {
    setLoading(true);
    const res = await axios.get(`${API}/api/clusters`, { params: { nr_topics: n } });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchClusters(10); }, []);

  const WIDTH = 600, HEIGHT = 500;

  // Normalize UMAP coords to SVG space
  const normalize = (points: any[]) => {
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">🗂️ Topic Clusters</h2>
      <p className="text-sm mb-4" style={{ color: '#718096' }}>
        BERTopic + UMAP — each dot is a post, colored by topic cluster.
      </p>

      {/* Slider */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm" style={{ color: '#a0aec0' }}>Topics:</span>
        <input type="range" min={2} max={20} value={nTopics}
          onChange={e => setNTopics(Number(e.target.value))}
          className="w-32" />
        <span className="text-sm font-medium text-white">{nTopics}</span>
        <button onClick={() => fetchClusters(nTopics)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#4f46e5' }}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
      </div>

      {loading && <p style={{ color: '#718096' }}>Running BERTopic clustering...</p>}

      {!loading && data && (
        <div className="flex gap-6">
          {/* Scatter plot */}
          <div style={{ background: '#1a1f2e', borderRadius: 12 }}>
            <svg width={WIDTH} height={HEIGHT}>
              {points.map((p: any, i: number) => (
                <circle key={i} cx={p.sx} cy={p.sy} r={2.5}
                  fill={p.topic === -1 ? '#2d3748' : TOPIC_COLORS[p.topic % TOPIC_COLORS.length]}
                  opacity={0.7}
                  onClick={() => setSelected(p)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </svg>
          </div>

          {/* Topic list */}
          <div style={{ width: 220 }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#718096' }}>TOPICS</p>
            {data.topic_info
              .filter((t: any) => t.Topic !== -1)
              .map((t: any) => (
                <div key={t.Topic} className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: TOPIC_COLORS[t.Topic % TOPIC_COLORS.length] }} />
                  <div>
                    <span className="text-xs text-white">{t.Name.replace(/_/g, ' ')}</span>
                    <span className="text-xs ml-1" style={{ color: '#4a5568' }}>({t.Count})</span>
                  </div>
                </div>
              ))}

            {selected && (
              <div className="mt-4 p-3 rounded-lg"
                style={{ background: '#0f1117', border: '1px solid #4f46e5' }}>
                <p className="text-xs font-medium text-white">Selected Post</p>
                <p className="text-xs mt-1" style={{ color: '#a0aec0' }}>
                  Topic: {selected.topic === -1 ? 'Noise' : selected.topic}
                </p>
                <p className="text-xs" style={{ color: '#4a5568' }}>ID: {selected.id}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}