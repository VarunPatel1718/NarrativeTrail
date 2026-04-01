'use client';
import { useState } from 'react';
import Timeline from './components/Timeline';
import Search from './components/Search';
import Network from './components/Network';
import Clusters from './components/Clusters';
import Stats from './components/Stats';

const TABS = ['Timeline', 'Search', 'Network', 'Clusters'];

export default function Home() {
  const [activeTab, setActiveTab] = useState('Timeline');

  return (
    <main className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Header */}
      <div style={{ background: '#1a1f2e', borderBottom: '1px solid #2d3748' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🧭 NarrativeTrail
              </h1>
              <p className="text-sm" style={{ color: '#718096' }}>
                Tracing political narratives across the ideological spectrum
              </p>
            </div>
            <Stats />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab ? '#4f46e5' : '#2d3748',
                  color: activeTab === tab ? 'white' : '#a0aec0',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'Timeline' && <Timeline />}
        {activeTab === 'Search' && <Search />}
        {activeTab === 'Network' && <Network />}
        {activeTab === 'Clusters' && <Clusters />}
      </div>
    </main>
  );
}