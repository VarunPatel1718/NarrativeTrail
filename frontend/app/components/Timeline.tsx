'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL;

const SUBREDDIT_CONFIG: Record<string, { color: string, ideology: string }> = {
  Anarchism: { color: '#f43f5e', ideology: 'Far Left' },
  socialism: { color: '#fb923c', ideology: 'Left' },
  Liberal: { color: '#34d399', ideology: 'Center Left' },
  democrats: { color: '#60a5fa', ideology: 'Center Left' },
  neoliberal: { color: '#a78bfa', ideology: 'Center' },
  politics: { color: '#94a3b8', ideology: 'Center' },
  PoliticalDiscussion: { color: '#e2e8f0', ideology: 'Center' },
  worldpolitics: { color: '#fbbf24', ideology: 'Center' },
  Conservative: { color: '#f97316', ideology: 'Right' },
  Republican: { color: '#ef4444', ideology: 'Far Right' },
};

const KEY_EVENTS = [
  { date: '2024-11-04', label: 'Election Day' },
  { date: '2025-01-20', label: 'Inauguration' },
];

const QUICK_TOPICS = ['immigration', 'election', 'economy', 'gun control', 'abortion', 'climate'];

export default function Timeline() {
  const [data, setData] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({});

  const fetchData = async (q: string) => {
    setLoading(true);
    const res = await axios.get(`${API}/api/timeline`, { params: { query: q } });
    const raw: any[] = res.data.data;

    const map: Record<string, any> = {};
    raw.forEach(row => {
      if (!map[row.week]) map[row.week] = { week: row.week };
      map[row.week][row.subreddit] = row.post_count;
    });
    const pivoted = Object.values(map).sort((a, b) => a.week.localeCompare(b.week));
    setData(pivoted);
    setSummary(res.data.summary || '');
    setLoading(false);
  };

  useEffect(() => { fetchData(''); }, []);

  const subreddits = [...new Set(data.flatMap(d =>
    Object.keys(d).filter(k => k !== 'week')
  ))];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">📈 Narrative Timeline</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Weekly post volume across the ideological spectrum · Click legend to toggle
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (setQuery(input), fetchData(input))}
          placeholder="Filter by narrative topic (e.g. immigration, economy, gun control)..."
          className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm"
          style={{ background: '#0f1923', border: '1px solid #1e2d3d' }}
        />
        <button
          onClick={() => { setQuery(input); fetchData(input); }}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          {loading ? '...' : 'Trace'}
        </button>
        <button
          onClick={() => { setInput(''); setQuery(''); fetchData(''); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: '#0f1923', color: '#64748b', border: '1px solid #1e2d3d' }}>
          Reset
        </button>
      </div>

      {/* Quick topic pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {QUICK_TOPICS.map(topic => (
          <button key={topic}
            onClick={() => { setInput(topic); setQuery(topic); fetchData(topic); }}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{
              background: query === topic ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.04)',
              color: query === topic ? '#a78bfa' : '#64748b',
              border: `1px solid ${query === topic ? 'rgba(79,70,229,0.5)' : '#1e2d3d'}`
            }}>
            {topic}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5 mb-4 glow">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
            <XAxis dataKey="week" stroke="#334155"
              tick={{ fontSize: 11, fill: '#475569' }}
              tickFormatter={v => v.slice(0, 7)} />
            <YAxis stroke="#334155" tick={{ fontSize: 11, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10 }}
              labelStyle={{ color: '#94a3b8', fontSize: 12 }}
              itemStyle={{ fontSize: 12 }}
            />
            {KEY_EVENTS.map(e => (
              <ReferenceLine key={e.date} x={e.date}
                stroke="rgba(251,191,36,0.5)" strokeDasharray="4 4"
                label={{ value: e.label, fill: '#fbbf24', fontSize: 10, position: 'top' }}
              />
            ))}
            {subreddits.map(sub => (
              <Line key={sub} type="monotone" dataKey={sub}
                stroke={SUBREDDIT_CONFIG[sub]?.color || '#94a3b8'}
                dot={false} strokeWidth={2} connectNulls
                opacity={activeLines[sub] === false ? 0 : 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend with ideology labels */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {subreddits.map(sub => (
            <button key={sub}
              onClick={() => setActiveLines(prev => ({ ...prev, [sub]: !prev[sub] }))}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
              style={{
                background: activeLines[sub] === false ? 'transparent' : 'rgba(255,255,255,0.04)',
                border: '1px solid #1e2d3d',
                opacity: activeLines[sub] === false ? 0.35 : 1,
                color: SUBREDDIT_CONFIG[sub]?.color || '#94a3b8'
              }}>
              <div className="w-2 h-2 rounded-full"
                style={{ background: SUBREDDIT_CONFIG[sub]?.color || '#94a3b8' }} />
              r/{sub}
              <span style={{ color: '#334155', fontSize: 10 }}>
                ({SUBREDDIT_CONFIG[sub]?.ideology || ''})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      {summary && (
        <div className="insight-box">
          <div className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
                AI NARRATIVE ANALYSIS
              </span>
              <p className="text-sm mt-1" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                {summary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}