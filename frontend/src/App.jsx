import { useState, lazy, Suspense, memo } from "react"
import Sidebar from "./components/Sidebar"
import StatBar from "./components/StatBar"
import PropagationAnimator from "./components/PropagationAnimator"
import CoordinatedAmplification from "./components/CoordinatedAmplification"
import SearchPanel from "./components/SearchPanel"
import TimeSeriesChart from "./components/TimeSeriesChart"
import { useVisible } from "./hooks/useVisible"

const NetworkGraph = lazy(function () {
  return import("./components/NetworkGraph")
})

const ClusterView = lazy(function () {
  return import("./components/ClusterView")
})

const StableClusterView = memo(function () {
  return <ClusterView />
})

export const BLOC_COLORS = {
  left_radical: "#f87171",
  center_left: "#4f8ef7",
  right: "#fb923c",
  mixed: "#c084fc",
  other: "#4b5563",
}

const NAV_ITEMS = [
  {
    id: "propagation", label: "Propagation Animator", dot: "#818cf8",
    desc: "Animate how narratives spread across communities",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
        <line x1="19" y1="12" x2="23" y2="12" />
        <line x1="1" y1="12" x2="5" y2="12" />
      </svg>
    ),
  },
  {
    id: "coordination", label: "Coordinated Amplification", dot: "#34d399",
    desc: "Detect coordinated amplification campaigns",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    id: "search", label: "Semantic Search", dot: "#fbbf24",
    desc: "Semantic search across all posts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
        <line x1="11" y1="8" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    id: "timeseries", label: "Timeline", dot: "#fb923c",
    desc: "Post activity and event markers over time",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="8 14 10.5 16.5 16 11" />
      </svg>
    ),
  },
  {
    id: "network", label: "Network Graph", dot: "#f472b6",
    desc: "Crosspost flow and influence graph",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="19" r="2" />
        <line x1="8" y1="11" x2="16" y2="6" />
        <line x1="8" y1="13" x2="16" y2="18" />
        <line x1="6" y1="14" x2="6" y2="20" />
        <circle cx="6" cy="21" r="2" />
      </svg>
    ),
  },
  {
    id: "clusters", label: "Narrative Clusters", dot: "#a78bfa",
    desc: "Topic cluster explorer with HDBSCAN",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="8" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="5" cy="17" r="2.5" />
        <circle cx="15" cy="16" r="2.5" />
        <circle cx="20" cy="17" r="2.5" />
        <line x1="7" y1="10.5" x2="5" y2="14.5" />
        <line x1="9.5" y1="8" x2="14.5" y2="7.5" />
        <line x1="17" y1="9.5" x2="16" y2="13.5" />
        <line x1="7" y1="13.5" x2="13.5" y2="15.5" />
        <line x1="17.5" y1="16" x2="19" y2="15.5" />
      </svg>
    ),
  },
]

function SectionSkeleton({ height }) {
  return <div className="skeleton" style={{ height: height || "300px", borderRadius: "12px" }} />
}

function LazySection({ children, fallback }) {
  var result = useVisible("350px")
  var ref = result[0]
  var visible = result[1]
  return (
    <div ref={ref}>
      {visible ? children : (fallback || <SectionSkeleton height="300px" />)}
    </div>
  )
}

function ActivePlot({ activeSection, filters }) {
  switch (activeSection) {
    case "propagation": return <PropagationAnimator filters={filters} />
    case "coordination": return <CoordinatedAmplification filters={filters} />
    case "search": return <SearchPanel filters={filters} />
    case "timeseries":
      return (
        <LazySection fallback={<SectionSkeleton height="360px" />}>
          <TimeSeriesChart filters={filters} />
        </LazySection>
      )
    case "network":
      return (
        <LazySection fallback={<SectionSkeleton height="460px" />}>
          <Suspense fallback={<SectionSkeleton height="460px" />}>
            <NetworkGraph filters={filters} />
          </Suspense>
        </LazySection>
      )
    case "clusters":
      return (
        <LazySection fallback={<SectionSkeleton height="440px" />}>
          <Suspense fallback={<SectionSkeleton height="440px" />}>
            <StableClusterView />
          </Suspense>
        </LazySection>
      )
    default: return null
  }
}

export default function App() {
  const [filters, setFilters] = useState({ subreddit: "all", granularity: "week" })
  const [activeSection, setActiveSection] = useState("propagation")
  const [hoveredTab, setHoveredTab] = useState(null)

  const activeNav = NAV_ITEMS.find(function (n) { return n.id === activeSection }) || NAV_ITEMS[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-base:     #07090f;
          --bg-sidebar:  #050711;
          --bg-card:     #0c0f1a;
          --bg-card2:    #0e1220;
          --bg-elevated: #111827;
          --bg-topbar:   #06080e;
          --border:      #161c2e;
          --border-soft: #0f1422;
          --accent:      #6366f1;
          --text-primary:#e2e8f0;
          --text-sec:    #7c8db5;
          --text-dim:    #2d3a55;
          --text-hint:   #181f35;
          --r-sm: 6px; --r-md: 10px; --r-lg: 14px; --r-xl: 18px;
          --font: 'Inter', system-ui, sans-serif;
          --mono: 'JetBrains Mono', monospace;
        }

        html, body { height: 100%; }
        body {
          font-family: var(--font); background: var(--bg-base);
          color: var(--text-primary); font-size: 14px;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .mono { font-family: var(--mono) !important; }
        input, button, select { font-family: var(--font); }

        .input {
          width: 100%; background: var(--bg-elevated);
          border: 1px solid var(--border); border-radius: var(--r-md);
          padding: 9px 14px; color: var(--text-primary);
          font-size: 13px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input::placeholder { color: var(--text-dim); }
        .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }

        .btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 9px 18px; border-radius: var(--r-md); border: none;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-blue { background: var(--accent); color: white; }
        .btn-blue:hover:not(:disabled) {
          background: #4f52d3;
          box-shadow: 0 0 20px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }

        .sec-title {
          font-size: 20px !important; font-weight: 600 !important;
          color: var(--text-primary) !important; letter-spacing: -0.3px;
          margin-bottom: 6px !important;
        }
        .sec-desc { font-size: 13px !important; color: var(--text-sec) !important; line-height: 1.65 !important; }

        .skeleton {
          background: var(--bg-card2); border-radius: var(--r-md);
          position: relative; overflow: hidden;
        }
        .skeleton::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%);
          animation: shimmer 1.8s infinite;
        }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

        /* ── Topbar ── */
        .nt-topbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; gap: 12px;
          height: 46px; padding: 0 20px;
          background: var(--bg-topbar);
          border-bottom: 1px solid var(--border-soft);
        }
        .nt-dots { display: flex; gap: 5px; }
        .nt-dot  { width: 9px; height: 9px; border-radius: 50%; }
        .nt-sep  { width: 1px; height: 16px; background: var(--border); margin: 0 4px; }
        .nt-brand { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; }
        .nt-brand-acc { color: var(--accent); }
        .nt-topbar-tag { font-size: 10px; color: var(--text-dim); font-family: var(--mono); }
        .nt-live { margin-left: auto; display: flex; align-items: center; gap: 6px; }
        .nt-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.7);
          animation: pdot 2s infinite;
        }
        @keyframes pdot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .nt-live-lbl { font-size: 10px; color: #22c55e; font-family: var(--mono); }

        /* ── Shell ── */
        .nt-shell { display: flex; height: calc(100vh - 46px); overflow: hidden; }
        .nt-sidebar-wrap {
          width: 192px; flex-shrink: 0;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-soft);
          overflow-y: auto;
        }
        .nt-main { flex: 1; min-width: 0; overflow-y: auto; }
        .nt-content { padding: 32px 36px 48px; display: flex; flex-direction: column; gap: 28px; }

        /* ── Hero ── */
        .nt-hero { display: flex; flex-direction: column; gap: 0; }
        .nt-eyebrow {
          font-size: 10px; font-weight: 600; color: var(--accent);
          letter-spacing: 0.14em; text-transform: uppercase;
          font-family: var(--mono); margin-bottom: 10px;
        }
        .nt-title {
          font-size: 52px; font-weight: 800;
          color: var(--text-primary); letter-spacing: -2px; line-height: 1;
          margin-bottom: 14px;
        }
        .nt-title-acc { color: var(--accent); }
        .nt-subtitle {
          font-size: 14px; color: var(--text-sec); line-height: 1.7;
          max-width: 600px; margin-bottom: 18px;
        }
        .nt-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .nt-meta-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 11px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px; color: var(--text-sec); font-family: var(--mono);
        }
        .nt-chip-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }

        /* ── Tab grid ── */
        .nt-tabs {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
        }
        .nt-tab {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          padding: 18px 10px 16px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r-lg);
          cursor: pointer; transition: all 0.18s ease;
          text-align: center; overflow: hidden;
          border-top: 2px solid transparent;
        }
        .nt-tab:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4);
        }
        .nt-tab.active {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.45);
        }
        .nt-tab-icon-wrap {
          width: 38px; height: 38px; border-radius: var(--r-md);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s;
        }
        .nt-tab-lbl {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.01em; transition: color 0.18s;
          line-height: 1.3;
        }
        .nt-tab-pip {
          position: absolute; bottom: 7px; left: 50%;
          transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%;
        }

        /* ── Plot panel ── */
        .nt-panel {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r-xl); overflow: hidden;
          animation: fadeUp 0.2s ease both;
        }
        .nt-panel-hd {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 22px;
        }
        .nt-panel-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .nt-panel-lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
        .nt-panel-desc { font-size: 10px; color: var(--text-dim); margin-left: 2px; }
        .nt-panel-body { padding: 26px; }

        /* ── Footer ── */
        .nt-footer {
          display: flex; justify-content: space-between;
          padding: 14px 0 4px; border-top: 1px solid var(--border-soft);
          flex-wrap: wrap; gap: 8px;
        }
        .nt-footer span { font-family: var(--mono); font-size: 10px; color: var(--text-hint); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.25s ease both; }
        .section { }
      `}</style>

      <div className="nt-shell">
        <div className="nt-sidebar-wrap">
          <Sidebar filters={filters} onChange={setFilters} />
        </div>

        <main className="nt-main">
          <div className="nt-content">

            {/* ── Hero ── */}
            <div className="nt-hero">
              <span className="nt-eyebrow">SimPPL Research Engineering</span>
              <h1 className="nt-title">
                Narrative<span className="nt-title-acc">Trail</span>
              </h1>
              <p className="nt-subtitle">
                One event. Ten communities. Completely different stories. Uncover how narratives evolve, spread, and collide across the political spectrum.
              </p>
              <div className="nt-meta-row">
                {["8,799 posts", "10 communities", "Jul 2024 – Feb 2025", "4 ideological blocs"].map(function (t) {
                  return (
                    <div key={t} className="nt-meta-chip">
                      <div className="nt-chip-dot" />
                      {t}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Stats ── */}
            <StatBar filters={filters} />

            {/* ── Tab grid ── */}
            <div className="nt-tabs">
              {NAV_ITEMS.map(function (item) {
                const isActive = activeSection === item.id
                const isHovered = hoveredTab === item.id
                const highlight = isActive || isHovered

                return (
                  <button
                    key={item.id}
                    className={"nt-tab" + (isActive ? " active" : "")}
                    onClick={function () { setActiveSection(item.id) }}
                    onMouseEnter={function () { setHoveredTab(item.id) }}
                    onMouseLeave={function () { setHoveredTab(null) }}
                    style={{
                      borderTopColor: highlight ? item.dot : "transparent",
                      borderColor: isActive ? item.dot + "40" : undefined,
                      background: isActive ? item.dot + "0e" : undefined,
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="nt-tab-icon-wrap"
                      style={{
                        background: highlight ? item.dot + "1a" : "rgba(255,255,255,0.03)",
                        color: highlight ? item.dot : "var(--text-dim)",
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Label only — no sub-description */}
                    <span
                      className="nt-tab-lbl"
                      style={{ color: isActive ? item.dot : isHovered ? "var(--text-sec)" : "var(--text-dim)" }}
                    >
                      {item.label}
                    </span>

                    {/* Active pip */}
                    {isActive && (
                      <div
                        className="nt-tab-pip"
                        style={{ background: item.dot, boxShadow: "0 0 6px " + item.dot }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Plot panel ── */}
            <div className="nt-panel" key={activeSection}>
              <div
                className="nt-panel-hd"
                style={{ borderBottom: "1px solid " + activeNav.dot + "25" }}
              >
                <div
                  className="nt-panel-dot"
                  style={{ background: activeNav.dot, boxShadow: "0 0 8px " + activeNav.dot + "90" }}
                />
                <span className="nt-panel-lbl" style={{ color: activeNav.dot }}>
                  {activeNav.label}
                </span>
                <span className="nt-panel-desc">— {activeNav.desc}</span>
              </div>
              <div className="nt-panel-body">
                <ActivePlot activeSection={activeSection} filters={filters} />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="nt-footer">
              <span>NarrativeTracker</span>
              <span>Built for SimPPL · 8,799 posts · 10 communities</span>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}