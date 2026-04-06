import { useState, useCallback } from "react"
import axios from "axios"
import { BLOC_COLORS } from "../App"

const BASE = import.meta.env.VITE_API_URL || ""

const EXAMPLE_QUERIES = [
  "federal workers fired",
  "nuclear weapons staff",
  "immigration crackdown",
  "DOGE government cuts",
  "democratic institutions",
]

const BLOC_LABEL = {
  left_radical: "Left Radical",
  center_left: "Center Left",
  right: "Right",
  mixed: "Mixed",
}

function getBlocColor(bloc) {
  return BLOC_COLORS[bloc] || "#6b7280"
}

function getIntensityColor(intensity) {
  if (intensity >= 3) return "#f87171"
  if (intensity >= 1.5) return "#fb923c"
  return "#fbbf24"
}

function getIntensityLabel(intensity) {
  if (intensity >= 3) return "High — strong coordination signal"
  if (intensity >= 1.5) return "Moderate — possible coordination"
  return "Low — likely organic"
}

// ── Event card ─────────────────────────────────────────────────────────────────
function EventCard({ evt, index, expanded, onToggle, windowHours }) {
  const color = getBlocColor(evt.bloc)
  const intColor = getIntensityColor(evt.intensity)
  const isOpen = expanded === index

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderLeft: "3px solid " + intColor,
      borderRadius: "10px",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <button
        onClick={function () { onToggle(isOpen ? null : index) }}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        {/* Bloc dot */}
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />

        {/* Subreddit */}
        <span style={{
          fontSize: "13px", fontWeight: "700",
          color: color, minWidth: "130px",
        }}>
          {"r/" + evt.subreddit}
        </span>

        {/* Bloc label */}
        <span style={{
          fontSize: "10px",
          color: "var(--text-dim)",
          minWidth: "80px",
        }}>
          {BLOC_LABEL[evt.bloc] || evt.bloc}
        </span>

        {/* Meta */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          flex: 1, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "11px", color: "var(--text-sec)" }}>
            {evt.post_count} posts
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            {evt.unique_authors} authors
          </span>
          <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            {evt.window_start?.slice(0, 10)}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>→</span>
          <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            {evt.window_end?.slice(0, 10)}
          </span>
        </div>

        {/* Intensity badge */}
        <span style={{
          fontSize: "10px", fontWeight: "700",
          color: intColor,
          background: intColor + "15",
          border: "1px solid " + intColor + "30",
          borderRadius: "999px",
          padding: "3px 10px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {evt.intensity} / hr
        </span>

        {/* Chevron */}
        <span style={{
          fontSize: "11px", color: "var(--text-dim)",
          flexShrink: 0,
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          display: "inline-block",
        }}>
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div style={{ borderTop: "1px solid var(--border)" }}>

          {/* Verdict */}
          <div style={{
            padding: "12px 18px",
            background: intColor + "06",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                fontSize: "9px", fontWeight: "700",
                color: intColor,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                Signal
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-sec)" }}>
                {getIntensityLabel(evt.intensity)}
              </span>
            </div>
            <p style={{
              fontSize: "12px", color: "var(--text-dim)",
              marginTop: "6px", lineHeight: "1.6",
            }}>
              {evt.post_count} posts by {evt.unique_authors} author{evt.unique_authors !== 1 ? "s" : ""} in {" "}
              <span style={{ color: color, fontWeight: "600" }}>r/{evt.subreddit}</span>{" "}
              within a {windowHours}h window.
              {evt.intensity >= 3
                ? " Post rate suggests coordinated amplification — multiple authors pushing the same narrative simultaneously."
                : evt.intensity >= 1.5
                  ? " Post rate is elevated. Could be organic news response or light-touch coordination."
                  : " Low intensity burst. Most likely organic community engagement to a news event."}
            </p>
          </div>

          {/* Post list */}
          {evt.posts.map(function (post, j) {
            return (
              <div key={j} style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                padding: "12px 18px",
                borderTop: j > 0 ? "1px solid var(--border)" : "none",
              }}>
                <span className="mono" style={{
                  fontSize: "10px", color: "var(--text-dim)",
                  marginTop: "2px", width: "16px", flexShrink: 0,
                }}>
                  {j + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "12px", color: "var(--text-primary)",
                    lineHeight: "1.5", wordBreak: "break-word",
                    marginBottom: "4px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {post.title}
                  </p>
                  <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                    {post.created_utc?.slice(0, 16)}
                  </span>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: "700",
                  color: color,
                  background: color + "15",
                  border: "1px solid " + color + "30",
                  borderRadius: "4px",
                  padding: "2px 7px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {Math.round(post.similarity * 100) + "%"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CoordinatedAmplification({ filters }) {
  const [query, setQuery] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQ, setLastQ] = useState("")
  const [windowHours, setWindowHours] = useState(6)
  const [minAuthors, setMinAuthors] = useState(3)
  const [expanded, setExpanded] = useState(null)

  const handleSearch = useCallback(async function (q) {
    const query = (q || "").trim()
    if (!query || query.length < 2) return
    setLoading(true)
    setError(null)
    setData(null)
    setExpanded(null)
    setLastQ(query)
    try {
      const res = await axios.get(BASE + "/api/coordinated", {
        params: { q: query, window_hours: windowHours, min_authors: minAuthors },
      })
      setData(res.data)
    } catch {
      setError("Request failed — check that the backend is running.")
    } finally {
      setLoading(false)
    }
  }, [windowHours, minAuthors])

  const handleExample = function (q) {
    setQuery(q)
    setTimeout(function () { handleSearch(q) }, 50)
  }

  return (
    <section style={{ width: "100%" }}>
      <style>{`
        .ca-chip {
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
        .ca-chip:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-primary, #f1f5f9);
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "22px" }}>
        <p className="sec-title">Coordinated Amplification Detector</p>
        <p className="sec-desc">
          Finds clusters where multiple authors posted semantically similar content
          within a short time window — the signature of coordinated amplification campaigns.
          High intensity bursts are flagged for manual review.
        </p>
      </div>

      {/* ── Search + params ── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <input
          value={query}
          onChange={function (e) { setQuery(e.target.value) }}
          onKeyDown={function (e) { if (e.key === "Enter") handleSearch(query) }}
          placeholder='Try "federal workers" or "immigration policy"...'
          className="input"
          style={{ flex: 1 }}
        />
        <button
          onClick={function () { handleSearch(query) }}
          disabled={loading || query.trim().length < 2}
          className="btn btn-blue"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </div>

      {/* ── Param row ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "20px",
        marginBottom: "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Time window:</span>
          <select
            value={windowHours}
            onChange={function (e) { setWindowHours(Number(e.target.value)) }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "11px",
              borderRadius: "6px",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {[1, 3, 6, 12, 24].map(function (h) {
              return <option key={h} value={h}>{h}h</option>
            })}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Min posts:</span>
          <select
            value={minAuthors}
            onChange={function (e) { setMinAuthors(Number(e.target.value)) }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "11px",
              borderRadius: "6px",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {[2, 3, 5, 8, 10].map(function (n) {
              return <option key={n} value={n}>{n}</option>
            })}
          </select>
        </div>
      </div>

      {/* ── Short query warning ── */}
      {query.length > 0 && query.trim().length < 2 && (
        <p style={{ fontSize: "11px", color: "#fbbf24", marginBottom: "12px" }}>
          Please enter at least 2 characters
        </p>
      )}

      {/* ── Example chips ── */}
      {!data && !loading && (
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
          {EXAMPLE_QUERIES.map(function (q) {
            return (
              <button key={q} onClick={function () { handleExample(q) }} className="ca-chip">
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

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="skeleton" style={{ height: "60px", borderRadius: "10px" }} />
          {[1, 2, 3].map(function (i) {
            return (
              <div key={i} className="skeleton" style={{ height: "56px", borderRadius: "10px" }} />
            )
          })}
        </div>
      )}

      {/* ── Results ── */}
      {data && !loading && (
        <div>
          {/* Stats row */}
          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: "6px", marginBottom: "20px",
          }}>
            {[
              { label: "Query", value: '"' + lastQ + '"' },
              { label: "Events found", value: String(data.events.length) },
              { label: "Posts scanned", value: String(data.total_posts) },
              { label: "Time window", value: data.window_hours + "h" },
            ].map(function (item) {
              return (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  fontSize: "11px",
                }}>
                  <span style={{ color: "var(--text-dim)" }}>{item.label + ":"}</span>
                  <span className="mono" style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                    {item.value}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: "flex", gap: "16px", flexWrap: "wrap",
            marginBottom: "16px",
          }}>
            {[
              { color: "#f87171", label: "High (≥3/hr) — strong signal" },
              { color: "#fb923c", label: "Moderate (1.5–3/hr)" },
              { color: "#fbbf24", label: "Low (<1.5/hr) — likely organic" },
            ].map(function (item) {
              return (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <div style={{
                    width: "10px", height: "10px", borderRadius: "2px",
                    background: item.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* No events */}
          {data.events.length === 0 && (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
            }}>
              <p style={{ fontSize: "13px", color: "var(--text-sec)", marginBottom: "4px" }}>
                No coordination events detected
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Try a broader topic, shorter time window, or lower min posts threshold
              </p>
            </div>
          )}

          {/* Event cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.events.map(function (evt, i) {
              return (
                <EventCard
                  key={i}
                  evt={evt}
                  index={i}
                  expanded={expanded}
                  onToggle={setExpanded}
                  windowHours={windowHours}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!data && !loading && (
        <div style={{
          padding: "48px 24px", textAlign: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-sec)", marginBottom: "4px" }}>
            Enter a topic above to scan for coordinated activity
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            Detects bursts where multiple authors post similar content in a short window
          </p>
        </div>
      )}
    </section>
  )
}