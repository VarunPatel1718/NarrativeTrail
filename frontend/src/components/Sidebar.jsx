import { useApi } from "../hooks/useApi"
import WorldPoliticsWarning from "./WorldPoliticsWarning"
import { BLOC_COLORS } from "../App"

const BLOC_LABELS = {
  left_radical: "Left Radical",
  center_left:  "Center Left",
  right:        "Right",
  mixed:        "Mixed",
}

export default function Sidebar({ filters, onChange }) {
  const { data, loading, error } = useApi("/api/subreddits")
  const showWPWarning = filters.subreddit === "worldpolitics"

  const groups = {}
  if (data) {
    data.forEach(function(s) {
      if (!groups[s.bloc]) groups[s.bloc] = []
      groups[s.bloc].push(s)
    })
  }

  return (
    <div style={{
      width: "232px", flexShrink: 0,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      overflowY: "auto", height: "100vh",
    }}>

      {/* Logo */}
      <div style={{
        padding: "22px 20px 18px",
        borderBottom: "1px solid var(--border)",
      }}>
        <p style={{
          fontSize: "13px", fontWeight: "700",
          color: "var(--text-primary)",
          letterSpacing: "-0.3px",
          marginBottom: "2px",
        }}>
          NarrativeTracker
        </p>
        <p style={{ fontSize: "10px", color: "var(--text-dim)" }}>
          SimPPL · Reddit Political Analysis
        </p>
      </div>

      <div style={{ padding: "16px 14px", flex: 1 }}>

        <p style={{
          fontSize: "9px", fontWeight: "600",
          color: "var(--text-dim)",
          textTransform: "uppercase", letterSpacing: "0.1em",
          marginBottom: "10px", padding: "0 6px",
        }}>
          Filter by Subreddit
        </p>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {[1,2,3,4,5,6].map(function(i) {
              return (
                <div
                  key={i} className="skeleton"
                  style={{ height: "24px", width: i % 3 === 0 ? "50%" : "100%" }}
                />
              )
            })}
          </div>
        )}

        {error && !loading && (
          <p style={{ fontSize: "12px", color: "var(--red)", padding: "0 6px" }}>
            Failed to load
          </p>
        )}

        {data && !loading && (
          <div>
            {/* All */}
            <button
              onClick={function() {
                onChange(Object.assign({}, filters, { subreddit: "all" }))
              }}
              style={{
                width: "100%", textAlign: "left",
                padding: "6px 10px",
                borderRadius: "var(--r-sm)",
                fontSize: "12px", fontWeight: "500",
                border: "none", cursor: "pointer",
                marginBottom: "12px",
                background: filters.subreddit === "all"
                  ? "rgba(79,142,247,0.1)"
                  : "transparent",
                color: filters.subreddit === "all"
                  ? "#93bbfd"
                  : "var(--text-sec)",
                borderLeft: filters.subreddit === "all"
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              All subreddits
            </button>

            {/* Groups */}
            {Object.entries(groups).map(function(entry) {
              const bloc      = entry[0]
              const subs      = entry[1]
              const blocColor = BLOC_COLORS[bloc] || "#6b7280"

              return (
                <div key={bloc} style={{ marginBottom: "16px" }}>
                  <p style={{
                    fontSize: "9px", fontWeight: "700",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    color: blocColor,
                    padding: "0 10px",
                    marginBottom: "4px",
                  }}>
                    {BLOC_LABELS[bloc] || bloc}
                  </p>

                  {subs.map(function(s) {
                    const isActive = filters.subreddit === s.subreddit
                    return (
                      <button
                        key={s.subreddit}
                        onClick={function() {
                          onChange(Object.assign({}, filters, { subreddit: s.subreddit }))
                        }}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "5px 10px",
                          borderRadius: "var(--r-sm)",
                          fontSize: "12px",
                          marginBottom: "1px",
                          border: "none", cursor: "pointer",
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center",
                          borderLeft: isActive
                            ? "2px solid " + blocColor
                            : "2px solid transparent",
                          background: isActive
                            ? blocColor + "10"
                            : "transparent",
                          color: isActive
                            ? "var(--text-primary)"
                            : "var(--text-sec)",
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={function(e) {
                          if (!isActive) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)"
                            e.currentTarget.style.color = "var(--text-primary)"
                          }
                        }}
                        onMouseLeave={function(e) {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent"
                            e.currentTarget.style.color = "var(--text-sec)"
                          }
                        }}
                      >
                        <span>{"r/" + s.subreddit}</span>
                        <span className="mono" style={{
                          fontSize: "10px",
                          color: isActive ? blocColor : "var(--text-dim)",
                        }}>
                          {s.count.toLocaleString()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Granularity */}
        <div style={{ marginTop: "8px", marginBottom: "16px" }}>
          <p style={{
            fontSize: "9px", fontWeight: "600",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: "8px", padding: "0 6px",
          }}>
            Time Granularity
          </p>
          <div style={{
            display: "flex", gap: "2px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            padding: "3px",
          }}>
            {["day", "week", "month"].map(function(g) {
              const isActive = filters.granularity === g
              return (
                <button
                  key={g}
                  onClick={function() {
                    onChange(Object.assign({}, filters, { granularity: g }))
                  }}
                  style={{
                    flex: 1, padding: "5px 0",
                    borderRadius: "4px",
                    fontSize: "11px", fontWeight: "500",
                    border: "none", cursor: "pointer",
                    background: isActive ? "rgba(79,142,247,0.18)" : "transparent",
                    color: isActive ? "#93bbfd" : "var(--text-dim)",
                    transition: "all 0.15s",
                  }}
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        <WorldPoliticsWarning visible={showWPWarning} />

      </div>
    </div>
  )
}