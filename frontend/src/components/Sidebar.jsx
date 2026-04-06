import { useApi } from "../hooks/useApi"
import WorldPoliticsWarning from "./WorldPoliticsWarning"
import { BLOC_COLORS } from "../App"

const BLOC_LABELS = {
  left_radical: "Left Radical",
  center_left: "Center Left",
  right: "Right",
  mixed: "Mixed",
}

export default function Sidebar({ filters, onChange }) {
  const { data, loading, error } = useApi("/api/subreddits")
  const showWPWarning = filters.subreddit === "worldpolitics"

  const groups = {}
  if (data) {
    data.forEach(function (s) {
      if (!groups[s.bloc]) groups[s.bloc] = []
      groups[s.bloc].push(s)
    })
  }

  return (
    <div style={{
      width: "192px",
      flexShrink: 0,
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border-soft)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      height: "100%",
      boxSizing: "border-box",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid var(--border-soft)",
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: "9px", fontWeight: "700",
          color: "var(--text-dim)",
          textTransform: "uppercase", letterSpacing: "0.14em",
          fontFamily: "var(--mono)", margin: 0,
        }}>
          Communities
        </p>
      </div>

      <div style={{ padding: "10px 10px 24px", flex: 1, boxSizing: "border-box" }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {[80, 100, 70, 100, 60, 100, 100, 75].map(function (w, i) {
              return (
                <div key={i} className="skeleton"
                  style={{ height: "22px", width: w + "%", borderRadius: "5px" }}
                />
              )
            })}
          </div>
        )}

        {error && !loading && (
          <p style={{ fontSize: "11px", color: "#f87171", padding: "6px" }}>Failed to load</p>
        )}

        {data && !loading && (
          <div>

            {/* ── All Communities ── */}
            <button
              onClick={function () { onChange(Object.assign({}, filters, { subreddit: "all" })) }}
              style={{
                width: "100%", textAlign: "left",
                padding: "8px 10px", borderRadius: "7px",
                fontSize: "12px", fontWeight: "600",
                border: "1px solid", cursor: "pointer",
                marginBottom: "14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxSizing: "border-box",
                borderColor: filters.subreddit === "all" ? "rgba(99,102,241,0.55)" : "var(--border)",
                background: filters.subreddit === "all" ? "rgba(99,102,241,0.13)" : "rgba(255,255,255,0.02)",
                color: filters.subreddit === "all" ? "#a5b4fc" : "var(--text-sec)",
                boxShadow: filters.subreddit === "all" ? "0 0 12px rgba(99,102,241,0.18)" : "none",
                transition: "all 0.15s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                  background: filters.subreddit === "all" ? "#818cf8" : "var(--text-dim)",
                  boxShadow: filters.subreddit === "all" ? "0 0 6px #818cf8" : "none",
                  transition: "all 0.15s",
                }} />
                All Communities
              </span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "10px",
                color: filters.subreddit === "all" ? "#818cf8" : "var(--text-dim)",
              }}>
                {data.reduce(function (acc, s) { return acc + (s.count || 0) }, 0).toLocaleString()}
              </span>
            </button>

            {/* ── Bloc groups ── */}
            {Object.entries(groups).map(function (entry) {
              const bloc = entry[0]
              const subs = entry[1]
              const color = BLOC_COLORS[bloc] || "#6b7280"
              const label = BLOC_LABELS[bloc] || bloc

              return (
                <div key={bloc} style={{ marginBottom: "10px" }}>

                  {/* Bloc header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "3px 6px 5px",
                  }}>
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                      background: color,
                      boxShadow: "0 0 5px " + color + "90",
                    }} />
                    <span style={{
                      fontSize: "8px", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.13em",
                      color: color, fontFamily: "var(--mono)",
                    }}>
                      {label}
                    </span>
                  </div>

                  {/* Subreddits — indented with bloc-colored left border */}
                  <div style={{
                    borderLeft: "1.5px solid " + color + "35",
                    marginLeft: "7px",
                    paddingLeft: "8px",
                  }}>
                    {subs.map(function (s) {
                      const active = filters.subreddit === s.subreddit
                      return (
                        <button
                          key={s.subreddit}
                          onClick={function () {
                            onChange(Object.assign({}, filters, { subreddit: s.subreddit }))
                          }}
                          style={{
                            width: "100%", textAlign: "left",
                            padding: "5px 8px", borderRadius: "5px",
                            fontSize: "12px", fontWeight: active ? "600" : "400",
                            marginBottom: "1px",
                            border: "1px solid",
                            borderColor: active ? color + "55" : "transparent",
                            cursor: "pointer",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            boxSizing: "border-box",
                            background: active ? color + "14" : "transparent",
                            color: active ? "var(--text-primary)" : "var(--text-sec)",
                            boxShadow: active ? "0 0 8px " + color + "18" : "none",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={function (e) {
                            if (!active) {
                              e.currentTarget.style.background = color + "0c"
                              e.currentTarget.style.color = "var(--text-primary)"
                              e.currentTarget.style.borderColor = color + "28"
                            }
                          }}
                          onMouseLeave={function (e) {
                            if (!active) {
                              e.currentTarget.style.background = "transparent"
                              e.currentTarget.style.color = "var(--text-sec)"
                              e.currentTarget.style.borderColor = "transparent"
                            }
                          }}
                        >
                          <span>{s.subreddit}</span>
                          <span style={{
                            fontFamily: "var(--mono)", fontSize: "10px",
                            color: active ? color : "var(--text-dim)",
                          }}>
                            {(s.count || 0).toLocaleString()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <WorldPoliticsWarning visible={showWPWarning} />
      </div>
    </div>
  )
}