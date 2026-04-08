import { useState, useEffect } from "react"
import axios from "axios"
import { BLOC_COLORS } from "../App"

const BASE = import.meta.env.VITE_API_URL || ""

const SUBREDDIT_TO_BLOC = {
  Anarchism: "left_radical",
  socialism: "left_radical",
  Liberal: "center_left",
  democrats: "center_left",
  politics: "center_left",
  neoliberal: "center_left",
  PoliticalDiscussion: "center_left",
  Conservative: "right",
  Republican: "right",
  worldpolitics: "mixed",
}

// ── Single stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, loading, children }) {
  if (loading) {
    return (
      <div style={{
        flex: "1", minWidth: "150px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "18px 20px",
        borderTop: "2px solid " + (color || "transparent"),
      }}>
        <div className="skeleton" style={{ height: "9px", width: "55%", marginBottom: "12px" }} />
        <div className="skeleton" style={{ height: "26px", width: "70%", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "9px", width: "85%" }} />
      </div>
    )
  }

  return (
    <div style={{
      flex: "1", minWidth: "150px",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderTop: "2px solid " + (color || "transparent"),
      borderRadius: "var(--r-md)",
      padding: "18px 20px",
      transition: "border-color 0.2s",
      cursor: "default",
    }}
      onMouseEnter={function (e) {
        e.currentTarget.style.borderColor = color || "var(--border-mid)"
      }}
      onMouseLeave={function (e) {
        e.currentTarget.style.borderColor = color || "var(--border)"
        e.currentTarget.style.borderTopColor = color || "transparent"
      }}
    >
      <p style={{
        fontSize: "9px", fontWeight: "600",
        color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: "10px",
      }}>
        {label}
      </p>

      {children ? children : (
        <>
          <p className="mono" style={{
            fontSize: "22px", fontWeight: "600",
            color: color || "var(--text-primary)",
            letterSpacing: "-0.5px", lineHeight: 1,
            marginBottom: sub ? "8px" : 0,
          }}>
            {value}
          </p>
          {sub && (
            <p style={{
              fontSize: "11px", color: "var(--text-dim)",
              lineHeight: 1.5, wordBreak: "break-word",
            }}>
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StatBar({ filters }) {
  const sub = filters && filters.subreddit !== "all"
    ? filters.subreddit
    : "all"

  const isFiltered = sub !== "all"
  const blocColor = isFiltered
    ? (BLOC_COLORS[SUBREDDIT_TO_BLOC[sub] || "other"] || "#4f8ef7")
    : null

  // ── Direct fetch with useEffect — bypasses any useApi caching issues ──────
  // This guarantees a fresh response whenever `sub` changes.
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(function () {
    setLoading(true)
    setError(null)

    var cancelled = false

    axios.get(BASE + "/api/stats", {
      params: sub === "all" ? {} : { subreddit: sub },
    })
      .then(function (res) {
        if (cancelled) return
        setData(res.data)
        setLoading(false)
      })
      .catch(function (err) {
        if (cancelled) return
        setError(err)
        setLoading(false)
      })

    return function () { cancelled = true }

  }, [sub])  // re-fetches whenever subreddit selection changes

  const fmt = function (n) {
    return n != null ? n.toLocaleString() : "—"
  }

  const dateStart = data ? (data.date_start || "").slice(0, 10) : "—"
  const dateEnd = data ? (data.date_end || "").slice(0, 10) : "—"

  const topTitle = data && data.top_post
    ? data.top_post.title.slice(0, 50) +
    (data.top_post.title.length > 50 ? "..." : "")
    : ""

  if (error) {
    return (
      <div style={{
        padding: "14px 18px",
        background: "rgba(248,113,113,0.05)",
        border: "1px solid rgba(248,113,113,0.15)",
        borderRadius: "var(--r-md)",
        color: "#fca5a5", fontSize: "13px",
      }}>
        Failed to load statistics — check that the backend is running
      </div>
    )
  }

  return (
    <div>
      {/* ── Subreddit context banner ── */}
      {isFiltered && (
        <div style={{
          display: "flex", alignItems: "center",
          flexWrap: "wrap", gap: "6px",
          padding: "7px 14px",
          background: blocColor + "08",
          border: "1px solid " + blocColor + "25",
          borderLeft: "3px solid " + blocColor,
          borderRadius: "var(--r-sm)",
          marginBottom: "10px",
          fontSize: "11px",
        }}>
          <span style={{ color: "var(--text-dim)" }}>Showing stats for</span>
          <span style={{ color: blocColor, fontWeight: "700" }}>
            {"r/" + sub}
          </span>
          <span style={{ color: "var(--text-dim)" }}>·</span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)", fontStyle: "italic" }}>
            select "All subreddits" to reset
          </span>
          {loading && (
            <span style={{
              marginLeft: "auto",
              fontSize: "10px", color: "var(--text-dim)",
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <span style={{
                width: "5px", height: "5px",
                borderRadius: "50%", background: blocColor,
                display: "inline-block",
                animation: "blink 1.2s ease-in-out infinite",
              }} />
              loading
            </span>
          )}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

        {/* Total Posts */}
        <StatCard
          label={isFiltered ? "Posts in r/" + sub : "Total Posts"}
          value={loading ? "" : fmt(data && data.total_posts)}
          color={isFiltered ? blocColor : "var(--blue)"}
          loading={loading}
        />

        {/* Unique Authors */}
        <StatCard
          label={isFiltered ? "Authors in r/" + sub : "Unique Authors"}
          value={loading ? "" : fmt(data && data.total_authors)}
          color="var(--green)"
          loading={loading}
        />


        {/* Top Post Score */}
        <StatCard
          label={isFiltered ? "Top Post in r/" + sub : "Top Post Score"}
          color="var(--yellow)"
          loading={loading}
        >
          {!loading && (
            <>
              <p className="mono" style={{
                fontSize: "22px", fontWeight: "600",
                color: "var(--yellow)",
                letterSpacing: "-0.5px", lineHeight: 1,
                marginBottom: "8px",
              }}>
                {fmt(data && data.top_post ? data.top_post.score : null)}
              </p>
              <p style={{
                fontSize: "11px", color: "var(--text-dim)",
                lineHeight: 1.5,
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}>
                {topTitle}
              </p>
            </>
          )}
        </StatCard>

        {/* Spam Filtered (all) OR Avg Score (filtered) */}
        {!isFiltered ? (
          <StatCard
            label="Spam Filtered"
            value={loading ? "" : fmt(data && data.spam_flagged)}
            sub="r/worldpolitics off-topic posts"
            color="var(--purple)"
            loading={loading}
          />
        ) : (
          <StatCard
            label="Avg Score"
            color={blocColor}
            loading={loading}
          >
            {!loading && (
              <>
                <p className="mono" style={{
                  fontSize: "22px", fontWeight: "600",
                  color: blocColor,
                  letterSpacing: "-0.5px", lineHeight: 1,
                  marginBottom: "8px",
                }}>
                  {data && data.avg_score != null
                    ? data.avg_score.toLocaleString()
                    : "—"
                  }
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  avg upvotes per post
                </p>
              </>
            )}
          </StatCard>


        )}

        {/* Date Range */}
        <StatCard
          label="Date Range"
          color={isFiltered ? blocColor : "var(--text-sec)"}
          loading={loading}
        >
          {!loading && (
            <div>
              <p className="mono" style={{
                fontSize: "13px", fontWeight: "600",
                color: "var(--text-primary)", lineHeight: 1.6,
              }}>
                {dateStart}
              </p>
              <p style={{
                fontSize: "9px", color: "var(--text-dim)",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: "2px",
              }}>
                to
              </p>
              <p className="mono" style={{
                fontSize: "13px", fontWeight: "600",
                color: "var(--text-primary)", lineHeight: 1.6,
              }}>
                {dateEnd}
              </p>
            </div>
          )}
        </StatCard>
      </div>
    </div>
  )
}