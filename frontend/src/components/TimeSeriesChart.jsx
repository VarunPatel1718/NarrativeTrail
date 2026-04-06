import { useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts"
import { useApi } from "../hooks/useApi"
import AISummary from "./AISummary"
import { BLOC_COLORS } from "../App"

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      background: "var(--bg-elevated, #0e1628)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "10px 14px",
    }}>
      <p className="mono" style={{
        fontSize: "10px", color: "var(--text-dim)",
        marginBottom: "6px", letterSpacing: "0.04em",
      }}>
        {label ? label.slice(0, 10) : ""}
      </p>
      {payload.map(function (p, i) {
        return (
          <p key={i} style={{
            fontSize: "12px", color: p.color,
            margin: "2px 0", fontWeight: "500",
          }}>
            {p.name.replace("_", " ") + ": "}
            <span className="mono" style={{ fontWeight: "700" }}>
              {p.value != null ? p.value.toLocaleString() : 0}
            </span>
          </p>
        )
      })}
    </div>
  )
}

// ── Event reference label ─────────────────────────────────────────────────────
function EventLabel({ viewBox, event }) {
  if (!viewBox) return null
  return (
    <g>
      <text
        x={viewBox.x + 3}
        y={18}
        fill="#fbbf24"
        fontSize={8}
        fontWeight="600"
        style={{ pointerEvents: "none", letterSpacing: "0.02em" }}
      >
        {event ? event.slice(0, 20) : ""}
      </text>
    </g>
  )
}

// ── Event type colors ─────────────────────────────────────────────────────────
function getEventColor(type) {
  const map = {
    election: "#f87171",
    inauguration: "#c084fc",
    policy: "#4f8ef7",
  }
  return map[type] || "#fbbf24"
}

function getEventLabel(type) {
  const map = {
    election: "Election",
    inauguration: "Inauguration",
    policy: "Policy",
  }
  return map[type] || "Event"
}

// ── Events grid ───────────────────────────────────────────────────────────────
function EventsGrid({ events }) {
  if (!events || events.length === 0) return null

  return (
    <div style={{
      padding: "14px 16px",
      borderTop: "1px solid var(--border)",
    }}>
      {/* Grid header */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: "8px", marginBottom: "10px",
      }}>
        <span style={{
          fontSize: "9px", fontWeight: "700",
          color: "var(--text-dim)",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Political Events
        </span>
        <div style={{ height: "1px", flex: 1, background: "var(--border)" }} />

        {/* Legend */}
        <div style={{ display: "flex", gap: "10px" }}>
          {["election", "inauguration", "policy"].map(function (t) {
            return (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                <div style={{
                  width: "6px", height: "6px",
                  borderRadius: "50%",
                  background: getEventColor(t),
                }} />
                <span style={{
                  fontSize: "9px", color: "var(--text-dim)",
                  textTransform: "capitalize",
                }}>
                  {getEventLabel(t)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "6px",
      }}>
        {events.map(function (ev, i) {
          const color = getEventColor(ev.type)
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 12px",
              background: color + "08",
              border: "1px solid " + color + "20",
              borderLeft: "3px solid " + color,
              borderRadius: "6px",
            }}>
              {/* Date */}
              <span className="mono" style={{
                fontSize: "10px", fontWeight: "700",
                color: color, flexShrink: 0,
                letterSpacing: "0.03em",
              }}>
                {ev.date ? ev.date.slice(5) : ""}
              </span>

              {/* Divider */}
              <div style={{
                width: "1px", height: "14px",
                background: color + "30", flexShrink: 0,
              }} />

              {/* Event name */}
              <span style={{
                fontSize: "11px",
                color: "var(--text-primary)",
                lineHeight: "1.3",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
              }}>
                {ev.event}
              </span>

              {/* Type badge */}
              <span style={{
                marginLeft: "auto",
                fontSize: "9px", fontWeight: "600",
                color: color,
                background: color + "15",
                borderRadius: "999px",
                padding: "2px 7px",
                flexShrink: 0,
                textTransform: "capitalize",
              }}>
                {getEventLabel(ev.type)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimeSeriesChart({ filters }) {
  const [mode, setMode] = useState("all")

  const { data: tsData, loading: tsLoading, error: tsError } =
    useApi("/api/timeseries", {
      subreddit: filters.subreddit,
      granularity: filters.granularity,
    })

  const { data: blocsData, loading: blocsLoading, error: blocsError } =
    useApi("/api/timeseries/blocs", { granularity: filters.granularity })

  const { data: events } = useApi("/api/events")

  const loading = mode === "all" ? tsLoading : blocsLoading
  const error = mode === "all" ? tsError : blocsError
  const aiData = mode === "all"
    ? tsData
    : (blocsData ? Object.values(blocsData).flat() : null)
  const context = mode === "all"
    ? "subreddit: " + filters.subreddit + ", granularity: " + filters.granularity
    : "ideological blocs comparison, granularity: " + filters.granularity
  const hasData = mode === "all"
    ? tsData && tsData.length > 0
    : blocsData && Object.keys(blocsData).length > 0

  const axisStyle = { fontSize: 10, fill: "var(--text-dim, #334155)" }

  return (
    <section style={{ width: "100%" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "22px" }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div>
            <p className="sec-title">Post Activity Over Time</p>
            <p className="sec-desc">
              Post volume Jul 2024 – Feb 2025, with key political events marked.
              Switch to "By Bloc" to compare ideological communities side by side.
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: "flex", gap: "3px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            flexShrink: 0,
          }}>
            {[
              { key: "all", label: "All Posts" },
              { key: "blocs", label: "By Bloc" },
            ].map(function (m) {
              const isActive = mode === m.key
              return (
                <button
                  key={m.key}
                  onClick={function () { setMode(m.key) }}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "6px",
                    fontSize: "12px", fontWeight: "500",
                    border: "none", cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    background: isActive
                      ? "rgba(79,142,247,0.18)"
                      : "transparent",
                    color: isActive
                      ? "#93bbfd"
                      : "var(--text-dim)",
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          className="skeleton"
          style={{ height: "320px", borderRadius: "var(--r-md, 10px)" }}
        />
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div style={{
          padding: "14px 16px",
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderLeft: "3px solid #f87171",
          borderRadius: "var(--r-sm, 8px)",
          color: "#fca5a5", fontSize: "13px",
        }}>
          Failed to load time series data — check that the backend is running
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && !hasData && (
        <div style={{
          height: "240px",
          display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column",
          gap: "8px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md, 10px)",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-sec)" }}>
            No data available for this filter
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            Try a different subreddit or granularity
          </p>
        </div>
      )}

      {/* ── All Posts chart ── */}
      {mode === "all" && tsData && tsData.length > 0 && !loading && (
        <div style={{
          background: "var(--bg-base, #02060f)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md, 10px)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 16px 8px" }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={tsData}
                margin={{ top: 28, right: 16, left: 0, bottom: 4 }}
              >
                <XAxis
                  dataKey="created_utc"
                  tick={axisStyle}
                  tickFormatter={function (v) { return v ? v.slice(0, 10) : "" }}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  width={38}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f8ef7"
                  strokeWidth={2}
                  dot={false}
                  name="Posts"
                  activeDot={{ r: 4, fill: "#4f8ef7" }}
                />
                {events && events.map(function (ev, i) {
                  const color = getEventColor(ev.type)
                  return (
                    <ReferenceLine
                      key={i}
                      x={ev.date}
                      stroke={color}
                      strokeDasharray="3 3"
                      strokeWidth={1.2}
                      strokeOpacity={0.7}
                      label={<EventLabel event={ev.event} />}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Events grid */}
          <EventsGrid events={events} />
        </div>
      )}

      {/* ── By Bloc chart ── */}
      {mode === "blocs" && blocsData && !loading && (
        <div style={{
          background: "var(--bg-base, #02060f)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md, 10px)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 16px 8px" }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
                <XAxis
                  dataKey="created_utc"
                  tick={axisStyle}
                  tickFormatter={function (v) { return v ? v.slice(0, 10) : "" }}
                  allowDuplicatedCategory={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  width={38}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px",
                    color: "var(--text-sec)",
                  }}
                  formatter={function (value) {
                    return value.replace("_", " ")
                  }}
                />
                {Object.entries(blocsData).map(function (entry) {
                  const bloc = entry[0]
                  const bdata = entry[1]
                  return (
                    <Line
                      key={bloc}
                      data={bdata}
                      type="monotone"
                      dataKey="count"
                      stroke={BLOC_COLORS[bloc] || "#6b7280"}
                      strokeWidth={2}
                      dot={false}
                      name={bloc}
                      activeDot={{ r: 4 }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
          }}>
            <p style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              lineHeight: "1.5",
            }}>
              Note: subreddits were collected in separate batches —
              cross-bloc temporal comparisons reflect collection timing, not silence.
            </p>
          </div>
        </div>
      )}

      {/* ── AI Summary ── */}
      <AISummary type="timeseries" data={aiData} context={context} />

    </section>
  )
}