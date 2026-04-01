'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Stats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API}/api/stats`).then(r => setStats(r.data));
  }, []);

  if (!stats) return null;

  return (
    <div className="flex gap-4 text-right">
      {[
        { label: 'Posts', value: stats.total_posts?.toLocaleString() },
        { label: 'Authors', value: stats.unique_authors?.toLocaleString() },
        { label: 'Subreddits', value: stats.subreddits },
      ].map(s => (
        <div key={s.label}>
          <div className="text-lg font-bold text-white">{s.value}</div>
          <div className="text-xs" style={{ color: '#718096' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}