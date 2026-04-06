import { useState } from "react"
import axios from "axios"
import { BLOC_COLORS } from "../App"

const BASE = import.meta.env.VITE_API_URL || ""

const BLOCS = [
  { key: "left_radical", label: "Left Radical" },
  { key: "center_left",  label: "Center Left"  },
  { key: "right",        label: "Right"         },
  { key: "mixed",        label: "Mixed"         },
]

const EXAMPLE_QUERIES = [
  "federal workers fired",
  "nuclear weapons staff",
  "immigration policy",
  "government efficiency",
  "democratic institutions",
]

const SUBREDDIT_TO_BLOC = {
  Anarchism:           "left_radical",
  socialism:           "left_radical",
  Liberal:             "center_left",
  democrats:           "center_left",
  politics:            "center_left",
  neoliberal:          "center_left",
  PoliticalDiscussion: "center_left",
  Conservative:        "right",
  Republican:          "right",
  worldpolitics:       "mixed",
}

const BLOC_LABEL = {
  left_radical: "Left Radical",
  center_left:  "Center Left",
  right:        "Right",
  mixed:        "Mixed",
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, bloc }) {
  const color      = BLOC_COLORS[bloc] || "#6b7280"
  const similarity = Math.round((post.similarity || 0) * 100)
  const date       = post.created_utc ? post.created_utc.slice(0, 10) : ""
  const href       = "https://reddit.com" + (post.permalink || "")

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="nd-card"
      style={{ display: "block", textDecoration: "none", marginBottom: "8px" }}
    >
      <p style={{
        fontSize: "12px",
        color: "var(--text-primary)",
        lineHeight: "1.55",
        marginBottom: "10px",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
      }}>
        {post.title}
      </p>
      <div style={{
        display: "flex", flexWrap: "wrap",
        alignItems: "center", gap: "6px",
      }}>
        <span style={{
          fontSize: "10px", fontWeight: "600",
          color: color,
          background: color + "18",
          border: "1px solid " + color + "35",
          borderRadius: "4px",
          padding: "2px 7px",
          whiteSpace: "nowrap",
        }}>
          {"r/" + post.subreddit}
        </span>
        {post.score > 0 && (
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            {"↑ " + post.score.toLocaleString()}
          </span>
        )}
        {date && (
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            {date}
          </span>
        )}
        <span style={{
          fontSize: "10px", fontWeight: "700",
          color: color, marginLeft: "auto",
          whiteSpace: "nowrap",
        }}>
          {similarity + "% match"}
        </span>
      </div>
    </a>
  )
}

// ── Bloc column ───────────────────────────────────────────────────────────────
function BlocColumn({ bloc, label, posts, loading, highlighted }) {
  const color = BLOC_COLORS[bloc] || "#6b7280"

  return (
    <div style={{
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      borderRadius: "10px",
      padding: highlighted ? "12px" : "0",
      background: highlighted ? color + "08" : "transparent",
      border: highlighted
        ? "1px solid " + color + "35"
        : "1px solid transparent",
      transition: "all 0.25s",
    }}>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "7px",
        paddingBottom: "10px",
        marginBottom: "12px",
        borderBottom: (highlighted ? "3px" : "2px") + " solid " + color,
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        <p style={{
          fontSize: "12px", fontWeight: "700",
          color: "var(--text-primary)",
          letterSpacing: "0.01em",
        }}>
          {label}
        </p>
        {/* NEW: sidebar badge */}
        {highlighted && (
          <span style={{
            fontSize: "9px", fontWeight: "700",
            color: "white",
            background: color,
            borderRadius: "999px",
            padding: "2px 8px",
            marginLeft: "auto",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            boxShadow: "0 0 8px " + color + "60",
          }}>
            Sidebar
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[90, 80, 85].map(function(h, i) {
            return (
              <div key={i} className="skeleton"
                style={{ height: h + "px", borderRadius: "8px" }} />
            )
          })}
        </div>
      )}

      {/* Posts */}
      {!loading && posts && posts.length > 0 &&
        posts.map(function(p, i) {
          return <PostCard key={i} post={p} bloc={bloc} />
        })
      }

      {/* Empty */}
      {!loading && (!posts || posts.length === 0) && (
        <div style={{
          flex: 1, minHeight: "100px",
          display: "flex", alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.06)",
          borderRadius: "8px",
          padding: "20px 12px",
        }}>
          <p style={{
            fontSize: "11px", color: "var(--text-dim)",
            textAlign: "center", lineHeight: "1.5",
          }}>
            No relevant posts in this community
          </p>
        </div>
      )}
    </div>
  )
}

// ── Framing analysis ──────────────────────────────────────────────────────────
function FramingAnalysis({ analysis, loading }) {
  if (!loading && !analysis) return null

  return (
    <div style={{
      marginTop: "24px",
      padding: "20px 22px",
      background: "rgba(79,142,247,0.04)",
      border: "1px solid rgba(79,142,247,0.12)",
      borderLeft: "3px solid #4f8ef7",
      borderRadius: "10px",
    }}>
      <p style={{
        fontSize: "9px", fontWeight: "700",
        color: "#4f8ef7",
        textTransform: "uppercase", letterSpacing: "0.12em",
        marginBottom: "12px",
      }}>
        AI Framing Analysis
      </p>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[100, 88, 70].map(function(w, i) {
            return (
              <div key={i} className="skeleton"
                style={{ height: "11px", width: w + "%", borderRadius: "4px" }} />
            )
          })}
        </div>
      ) : (
        <p style={{
          fontSize: "13px",
          color: "var(--text-sec)",
          lineHeight: "1.7",
          maxWidth: "860px",
          wordBreak: "break-word",
        }}>
          {analysis}
        </p>
      )}
    </div>
  )
}

// ── Pre-search bloc preview ───────────────────────────────────────────────────
function BlocPreview({ sidebarBloc }) {
  const SUB_LABELS = {
    left_radical: "r/Anarchism · r/socialism",
    center_left:  "r/Liberal · r/politics · r/neoliberal",
    right:        "r/Conservative · r/Republican",
    mixed:        "r/worldpolitics",
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: "10px",
      marginTop: "20px",
    }}>
      {BLOCS.map(function(b) {
        const color       = BLOC_COLORS[b.key] || "#6b7280"
        const isHighlight = sidebarBloc === b.key

        return (
          <div key={b.key} style={{
            padding: "14px 12px",
            background: isHighlight ? color + "14" : color + "0c",
            border: "1px solid " + (isHighlight ? color + "40" : color + "22"),
            borderTop: "2px solid " + color,
            borderRadius: "10px",
            textAlign: "center",
            transition: "all 0.2s",
          }}>
            <p style={{
              fontSize: "11px", fontWeight: "700",
              color: color, marginBottom: "6px",
              letterSpacing: "0.02em",
            }}>
              {b.label}
              {isHighlight && (
                <span style={{
                  display: "inline-block",
                  marginLeft: "6px",
                  fontSize: "8px",
                  color: color,
                  background: color + "20",
                  borderRadius: "999px",
                  padding: "1px 5px",
                  verticalAlign: "middle",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}>
                  Sidebar
                </span>
              )}
            </p>
            <p style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              lineHeight: "1.5",
              wordBreak: "break-word",
            }}>
              {SUB_LABELS[b.key]}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NarrativeDivergence({ filters }) {
  const [query,        setQuery]        = useState("")
  const [results,      setResults]      = useState(null)
  const [analysis,     setAnalysis]     = useState("")
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingAI,    setLoadingAI]    = useState(false)
  const [error,        setError]        = useState(null)
  const [lastQuery,    setLastQuery]    = useState("")

  // Derive sidebar bloc
  const sidebarBloc = filters && filters.subreddit !== "all"
    ? (SUBREDDIT_TO_BLOC[filters.subreddit] || null)
    : null

  const sidebarBlocColor = sidebarBloc
    ? (BLOC_COLORS[sidebarBloc] || "var(--blue)")
    : null

  const handleSearch = async function() {
    const q = query.trim()
    if (!q || q.length < 2) return
    setLoadingPosts(true)
    setLoadingAI(true)
    setResults(null)
    setAnalysis("")
    setError(null)
    setLastQuery(q)
    try {
      const divRes = await axios.get(BASE + "/api/narrative_divergence", {
        params: { q },
      })
      setResults(divRes.data)
      setLoadingPosts(false)
      try {
        const anaRes = await axios.post(BASE + "/api/narrative_analysis", {
          query: q, blocs: divRes.data.divergence,
        })
        setAnalysis(anaRes.data.analysis)
      } catch {
        setAnalysis("Framing analysis temporarily unavailable.")
      } finally {
        setLoadingAI(false)
      }
    } catch (e) {
      setError("Search failed — check that the backend is running.")
      setLoadingPosts(false)
      setLoadingAI(false)
    }
  }

  const handleExampleClick = function(exQuery) {
    setQuery(exQuery)
    setTimeout(handleSearch, 50)
  }

  return (
    <section style={{ width: "100%" }}>
      <style>{`
        .nd-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 12px 14px;
          transition: background 0.15s, transform 0.15s;
        }
        .nd-card:hover {
          background: rgba(255,255,255,0.055);
          transform: translateY(-1px);
        }
        .nd-chip {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 11px;
          color: var(--text-sec, #94a3b8);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }
        .nd-chip:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-primary, #f1f5f9);
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "22px" }}>
        <p className="sec-title">Narrative Divergence Tracker</p>
        <p className="sec-desc">
          Same topic, four ideological lenses. Enter any keyword to see how
          Left Radical, Center Left, Right, and Mixed communities frame it —
          then get AI analysis of where the narratives diverge.
        </p>
      </div>

      {/* ── NEW: Sidebar context banner ── */}
      {sidebarBloc && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 14px",
          background: sidebarBlocColor + "08",
          border: "1px solid " + sidebarBlocColor + "25",
          borderLeft: "3px solid " + sidebarBlocColor,
          borderRadius: "var(--r-sm)",
          marginBottom: "16px",
          fontSize: "11px",
        }}>
          <span style={{ color: "var(--text-dim)" }}>Sidebar context:</span>
          <span style={{ color: sidebarBlocColor, fontWeight: "600" }}>
            {"r/" + filters.subreddit}
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            {"→ " + (BLOC_LABEL[sidebarBloc] || sidebarBloc) +
             " bloc column highlighted"}
          </span>
        </div>
      )}

      {/* ── Search input ── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <input
          value={query}
          onChange={function(e) { setQuery(e.target.value) }}
          onKeyDown={function(e) { if (e.key === "Enter") handleSearch() }}
          placeholder='Try "federal workers fired" or "immigration policy"...'
          className="input"
          style={{ flex: 1 }}
        />
        <button
          onClick={handleSearch}
          disabled={loadingPosts || query.trim().length < 2}
          className="btn btn-blue"
        >
          {loadingPosts ? "Searching..." : "Analyse"}
        </button>
      </div>

      {/* ── Short query warning ── */}
      {query.length > 0 && query.trim().length < 2 && (
        <p style={{ fontSize: "11px", color: "#fbbf24", marginBottom: "12px" }}>
          Please enter at least 2 characters
        </p>
      )}

      {/* ── Example chips ── */}
      {!results && !loadingPosts && (
        <div style={{
          display: "flex", flexWrap: "wrap",
          alignItems: "center", gap: "8px",
          marginBottom: "24px",
        }}>
          <span style={{
            fontSize: "10px", fontWeight: "600",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Try
          </span>
          {EXAMPLE_QUERIES.map(function(q) {
            return (
              <button key={q}
                onClick={function() { handleExampleClick(q) }}
                className="nd-chip">
                {q}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderLeft: "3px solid #f87171",
          borderRadius: "8px",
          fontSize: "13px", color: "#fca5a5",
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {(results || loadingPosts) && (
        <div>
          {results && !loadingPosts && (
            <p style={{
              fontSize: "11px", color: "var(--text-dim)",
              marginBottom: "16px",
            }}>
              <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                {results.total_relevant || 0}
              </span>
              {" relevant posts found for "}
              <span style={{ color: "var(--text-sec)" }}>
                {'"' + lastQuery + '"'}
              </span>
              {sidebarBloc && (
                <span style={{ color: sidebarBlocColor, marginLeft: "6px" }}>
                  {"· " + (BLOC_LABEL[sidebarBloc] || sidebarBloc) + " highlighted"}
                </span>
              )}
            </p>
          )}

          {/* 4-column grid — pass highlighted prop */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
          }}>
            {BLOCS.map(function(b) {
              return (
                <BlocColumn
                  key={b.key}
                  bloc={b.key}
                  label={b.label}
                  posts={results && results.divergence
                    ? results.divergence[b.key] : null}
                  loading={loadingPosts}
                  highlighted={sidebarBloc === b.key}
                />
              )
            })}
          </div>

          <FramingAnalysis analysis={analysis} loading={loadingAI} />
        </div>
      )}

      {/* ── Pre-search bloc preview — pass sidebarBloc ── */}
      {!results && !loadingPosts && (
        <BlocPreview sidebarBloc={sidebarBloc} />
      )}

    </section>
  )
}