import { useState, useMemo } from "react"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { BLOC_COLORS } from "../App"
import AISummary from "./AISummary"


const BASE = import.meta.env.VITE_API_URL || ""

const EXAMPLE_QUERIES = [
  "nuclear weapons staff fired",
  "federal worker layoffs",
  "inauguration executive orders",
  "DOGE government efficiency",
  "FAA staffing crisis",
]

function getBlocForSub(subreddit) {
  const map = {
    Anarchism: "left_radical", socialism: "left_radical",
    Liberal: "center_left", democrats: "center_left",
    politics: "center_left", neoliberal: "center_left",
    PoliticalDiscussion: "center_left",
    Conservative: "right", Republican: "right",
    worldpolitics: "mixed",
  }
  return map[subreddit] || "other"
}

function getSubColor(subreddit) {
  return BLOC_COLORS[getBlocForSub(subreddit)] || "#6b7280"
}

// ── First mover badge ─────────────────────────────────────────────────────────
function FirstMoverBadge({ firstMover, firstPosts }) {
  if (!firstMover) return null
  const fp    = firstPosts[0] || {}
  const color = getSubColor(firstMover)
  const date  = fp.created_utc ? fp.created_utc.slice(0, 10) : ""

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "16px",
      padding: "20px 22px",
      background: color + "08",
      border: "1px solid " + color + "25",
      borderLeft: "3px solid " + color,
      borderRadius: "10px",
      marginBottom: "20px",
    }}>
      {/* Circle */}
      <div style={{
        width: "52px", height: "52px", borderRadius: "50%",
        background: color + "20",
        border: "2px solid " + color + "50",
        display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
        flexDirection: "column", gap: "1px",
      }}>
        <span className="mono" style={{
          color: color, fontSize: "9px", fontWeight: "700",
          letterSpacing: "0.06em", lineHeight: 1,
        }}>
          1ST
        </span>
        <span style={{
          color: color, fontSize: "7px", opacity: 0.7,
          letterSpacing: "0.06em", lineHeight: 1,
        }}>
          MOVER
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "9px", fontWeight: "600",
          color: "var(--text-dim)",
          textTransform: "uppercase", letterSpacing: "0.1em",
          marginBottom: "5px",
        }}>
          First Community to Post
        </p>
        <p style={{
          fontSize: "20px", fontWeight: "700",
          color: color, letterSpacing: "-0.3px",
          marginBottom: "5px", lineHeight: 1,
        }}>
          {"r/" + firstMover}
        </p>
        {date && (
          <p className="mono" style={{
            fontSize: "11px", color: "var(--text-sec)",
            marginBottom: "6px",
          }}>
            {date}
          </p>
        )}
        {fp.title && (
          <p style={{
            fontSize: "12px", color: "var(--text-dim)",
            lineHeight: "1.5",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}>
            {fp.title}
          </p>
        )}
      </div>

      {fp.similarity != null && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{
            fontSize: "9px", color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: "4px",
          }}>
            Relevance
          </p>
          <p className="mono" style={{
            fontSize: "22px", fontWeight: "700", color: color,
          }}>
            {Math.round(fp.similarity * 100) + "%"}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Propagation order ─────────────────────────────────────────────────────────
function PropagationOrder({ firstPosts }) {
  if (!firstPosts || firstPosts.length < 2) return null

  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{
        fontSize: "9px", fontWeight: "600",
        color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: "12px",
      }}>
        Propagation Order
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {firstPosts.map(function(fp, idx) {
          const color = getSubColor(fp.subreddit)
          const date  = fp.created_utc ? fp.created_utc.slice(0, 10) : ""
          const isFirst = idx === 0

          return (
            <div key={fp.subreddit} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 14px",
              background: isFirst ? color + "08" : "var(--bg-card)",
              border: "1px solid " + (isFirst ? color + "25" : "var(--border)"),
              borderLeft: "3px solid " + color,
              borderRadius: "8px",
            }}>
              {/* Number badge */}
              <span className="mono" style={{
                width: "24px", height: "24px",
                borderRadius: "50%",
                background: color + "20",
                border: "1px solid " + color + "40",
                color: color,
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: "11px", fontWeight: "700",
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>

              <span style={{
                fontSize: "13px", fontWeight: "600",
                color: color, minWidth: "120px",
              }}>
                {"r/" + fp.subreddit}
              </span>

              <span className="mono" style={{
                fontSize: "11px", color: "var(--text-sec)",
              }}>
                {date}
              </span>

              <span style={{ marginLeft: "auto", fontSize: "10px",
                fontWeight: "600",
                color: isFirst ? "#fbbf24" : "var(--text-dim)",
              }}>
                {isFirst
                  ? "★ First"
                  : "+" + idx + (idx === 1 ? " community" : " communities") + " later"
                }
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mini timeline ─────────────────────────────────────────────────────────────
function MiniTimeline({ subreddit, timelineData }) {
  const color = getSubColor(subreddit)

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderTop: "2px solid " + color,
      borderRadius: "10px",
      padding: "12px 14px",
    }}>
      <p style={{
        fontSize: "12px", fontWeight: "600",
        color: color, marginBottom: "10px",
      }}>
        {"r/" + subreddit}
      </p>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={timelineData}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated, #0e1628)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "11px",
              padding: "4px 10px",
            }}
            labelStyle={{ color: "var(--text-sec)" }}
            formatter={function(v) { return [v, "posts"] }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VelocityChart() {
  const [query,   setQuery]   = useState("")
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [lastQ,   setLastQ]   = useState("")

  const handleSearch = async () => {
    const q = query.trim()
    if (!q || q.length < 2) return
    setLoading(true)
    setData(null)
    setError(null)
    setLastQ(q)
    try {
      const res = await axios.get(BASE + "/api/velocity", { params: { q } })
      setData(res.data)
    } catch (e) {
      setError("Request failed — check that the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const handleExample = function(q) {
    setQuery(q)
    setTimeout(function() {
      document.getElementById("velocity-btn").click()
    }, 50)
  }

  const timelinesBySub = {}
  if (data && data.timeline) {
    data.timeline.forEach(function(row) {
      if (!timelinesBySub[row.subreddit]) timelinesBySub[row.subreddit] = []
      timelinesBySub[row.subreddit].push({ date: row.date, count: row.count })
    })
  }

  const orderedSubs = data && data.first_posts
    ? data.first_posts
        .map(function(fp) { return fp.subreddit })
        .filter(function(sub) {
          return timelinesBySub[sub] && timelinesBySub[sub].length > 0
        })
    : []

  // ── Stable reference for AISummary — only rebuilds when timeline changes ──
  const aiData = useMemo(function() {
    if (!data || !data.timeline) return []
    return data.timeline.map(function(row) {
      return {
        created_utc: row.date,
        subreddit:   row.subreddit,
        count:       row.count,
      }
    })
  }, [data && data.timeline])

  return (
    <section style={{ width: "100%" }}>
      <style>{`
        .vc-chip {
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
        .vc-chip:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-primary, #f1f5f9);
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "22px" }}>
        <p className="sec-title">Information Velocity</p>
        <p className="sec-desc">
          Who breaks the story first? Enter any topic to trace which community
          posted earliest — and map how the narrative propagated across the
          ideological spectrum over time.
        </p>
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <input
          value={query}
          onChange={function(e) { setQuery(e.target.value) }}
          onKeyDown={function(e) { if (e.key === "Enter") handleSearch() }}
          placeholder="Search for a topic or event..."
          className="input"
          style={{ flex: 1 }}
        />
        <button
          id="velocity-btn"
          onClick={handleSearch}
          disabled={loading || query.trim().length < 2}
          className="btn btn-blue"
        >
          {loading ? "Tracing..." : "Trace"}
        </button>
      </div>

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
          {EXAMPLE_QUERIES.map(function(q) {
            return (
              <button
                key={q}
                onClick={function() { handleExample(q) }}
                className="vc-chip"
              >
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="skeleton" style={{ height: "100px", borderRadius: "10px" }} />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
          }}>
            {[1,2,3,4,5,6].map(function(i) {
              return (
                <div key={i} className="skeleton"
                  style={{ height: "108px", borderRadius: "10px" }} />
              )
            })}
          </div>
        </div>
      )}

      {/* ── No results ── */}
      {data && !loading && !data.first_mover && (
        <div style={{
          padding: "48px 24px", textAlign: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-sec)", marginBottom: "4px" }}>
            No posts found for this query
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            Try a broader term or check the spelling
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {data && data.first_mover && !loading && (
        <div>
          {/* Stats badges */}
          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: "6px", marginBottom: "16px",
          }}>
            {[
              { label: "Query", value: '"' + lastQ + '"' },
              { label: "Posts", value: String(data.total) },
              { label: "Communities", value: String(orderedSubs.length) },
            ].map(function(item) {
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
                  <span className="mono" style={{
                    color: "var(--text-primary)", fontWeight: "600",
                  }}>
                    {item.value}
                  </span>
                </div>
              )
            })}
          </div>

          <FirstMoverBadge
            firstMover={data.first_mover}
            firstPosts={data.first_posts || []}
          />

          <PropagationOrder firstPosts={data.first_posts || []} />

          {/* Timeline section label */}
          <p style={{
            fontSize: "9px", fontWeight: "600",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: "12px",
          }}>
            Daily Post Volume — Ordered by First Appearance
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
          }}>
            {orderedSubs.map(function(sub) {
              return (
                <MiniTimeline
                  key={sub}
                  subreddit={sub}
                  timelineData={timelinesBySub[sub]}
                />
              )
            })}
          </div>

          {/* AI Summary — outside the grid */}
          {/* AI Summary — stable memoized data */}
        {(function() {
          if (!data.timeline || !data.timeline.length) return null
          var aiData = data.timeline.map(function(row) {
            return {
              created_utc: row.date,
              subreddit:   row.subreddit,
              count:       row.count,
            }
          })
          return (
            <AISummary
              type="velocity"
              data={aiData}
              context={
                "Information velocity for query: " + lastQ +
                ". First mover: r/" + data.first_mover +
                ". Total posts: " + data.total +
                ". Propagation: " + orderedSubs.map(function(s) { return "r/" + s }).join(" → ")
              }
            />
          )
        })()}
        </div>
      )}
    </section>
  )
}