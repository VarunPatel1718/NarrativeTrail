import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react"
import { useApi } from "../hooks/useApi"
import { BLOC_COLORS } from "../App"
import ForceGraph2D from "react-force-graph-2d"

const NET_TYPES = [
  { key: "subreddit", label: "Subreddit Crosspost" },
  { key: "author", label: "Author Influence" },
  { key: "source", label: "Source Citation" },
  { key: "bias", label: "Source Bias" },
]

const NET_DESCRIPTIONS = {
  subreddit:
    "Cross-community post flow. Larger nodes hold more PageRank influence. Click a node to inspect it — remove the top node to observe how influence redistributes across the graph.",
  author:
    "Authors connected by shared posting activity. White ring = bridge author who posted across multiple ideological blocs — key vectors of cross-community influence.",
  source:
    "Which news domains each community cites. Blue = left-leaning, gray = center, orange = right-leaning. Echo chamber structure is visible in the clustering.",
  bias:
    "Citation bias by ideology. Right-bloc communities cite almost exclusively right-leaning sources, and vice versa — the echo chamber made quantitative.",
}

const BIAS_COLORS = {
  left: "#4f8ef7",
  center: "#7a8fa6",
  right: "#fb923c",
}

const BIAS_LABELS = {
  left: "Left-Leaning",
  center: "Center",
  right: "Right-Leaning",
}

const DOMAIN_BIAS_MAP = {
  "theguardian.com": "left", "nytimes.com": "left",
  "msnbc.com": "left", "huffpost.com": "left",
  "foxnews.com": "right", "breitbart.com": "right",
  "nypost.com": "right", "townhall.com": "right",
  "apnews.com": "center", "reuters.com": "center",
  "politico.com": "center", "nbcnews.com": "center",
  "thehill.com": "center", "cnn.com": "center",
  "newsweek.com": "center",
}

const SUB_BLOC_MAP = {
  Anarchism: "left_radical", socialism: "left_radical",
  Liberal: "center_left", democrats: "center_left",
  politics: "center_left", neoliberal: "center_left",
  PoliticalDiscussion: "center_left",
  Conservative: "right", Republican: "right",
  worldpolitics: "mixed",
}

function getDomainBias(domain) {
  return DOMAIN_BIAS_MAP[domain] || "center"
}

function getSubBloc(subreddit) {
  return SUB_BLOC_MAP[subreddit] || "other"
}

function ctrlBtn(isActive, activeColor) {
  return {
    padding: "4px 11px",
    borderRadius: "var(--r-sm)",
    fontSize: "11px", fontWeight: "500",
    border: "1px solid " + (isActive ? "transparent" : "var(--border)"),
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit",
    background: isActive ? (activeColor || "var(--blue)") : "rgba(255,255,255,0.04)",
    color: isActive ? "white" : "var(--text-sec)",
  }
}

// ── Bias summary cards ────────────────────────────────────────────────────────
const BiasSummaryCards = memo(function BiasSummaryCards({ edges }) {
  const byCommunity = {}
  edges.forEach(function (e) {
    const bloc = getSubBloc(e.source)
    const bias = getDomainBias(e.target)
    if (!byCommunity[bloc]) {
      byCommunity[bloc] = { left: 0, center: 0, right: 0, total: 0 }
    }
    byCommunity[bloc][bias] = (byCommunity[bloc][bias] || 0) + e.weight
    byCommunity[bloc].total += e.weight
  })

  const BLOCS = [
    { key: "left_radical", label: "Left Radical" },
    { key: "center_left", label: "Center Left" },
    { key: "right", label: "Right" },
    { key: "mixed", label: "Mixed" },
  ]

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "8px",
      marginBottom: "16px",
    }}>
      {BLOCS.map(function (b) {
        const stats = byCommunity[b.key]
        if (!stats) return null
        const total = stats.total || 1
        const leftPct = (stats.left / total * 100).toFixed(0)
        const centerPct = (stats.center / total * 100).toFixed(0)
        const rightPct = (stats.right / total * 100).toFixed(0)
        const color = BLOC_COLORS[b.key] || "#6b7280"

        return (
          <div key={b.key} style={{
            padding: "12px 14px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "2px solid " + color,
            borderRadius: "var(--r-md)",
          }}>
            {/* Bloc label */}
            <p style={{
              fontSize: "9px", fontWeight: "700",
              color: color, marginBottom: "10px",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {b.label}
            </p>

            {/* Stacked bar */}
            <div style={{
              height: "4px", borderRadius: "999px",
              overflow: "hidden", display: "flex",
              marginBottom: "10px",
              background: "rgba(255,255,255,0.04)",
            }}>
              <div style={{ width: leftPct + "%", background: BIAS_COLORS.left, transition: "width 0.4s" }} />
              <div style={{ width: centerPct + "%", background: BIAS_COLORS.center, transition: "width 0.4s" }} />
              <div style={{ width: rightPct + "%", background: BIAS_COLORS.right, transition: "width 0.4s" }} />
            </div>

            {/* Stats rows */}
            {["left", "center", "right"].map(function (bk) {
              const pct = bk === "left" ? leftPct : bk === "center" ? centerPct : rightPct
              return (
                <div key={bk} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: "4px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: BIAS_COLORS[bk], flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "10px", color: "var(--text-sec)" }}>
                      {BIAS_LABELS[bk]}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                      {pct + "%"}
                    </span>
                    <span className="mono" style={{
                      fontSize: "10px",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                    }}>
                      {(stats[bk] || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Total */}
            <div style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Total
              </span>
              <span className="mono" style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-primary)" }}>
                {stats.total.toLocaleString()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
})

// ── Bias edge row ─────────────────────────────────────────────────────────────
const BiasEdgeRow = memo(function BiasEdgeRow({ edge }) {
  const bias = getDomainBias(edge.target)
  const biasColor = BIAS_COLORS[bias]
  const subColor = BLOC_COLORS[getSubBloc(edge.source)] || "#6b7280"
  const barMax = 200
  const barWidth = Math.min(barMax, edge.weight * 2)

  return (
    <div className="trow" style={{
      display: "flex", alignItems: "center",
      gap: "12px", padding: "8px 14px",
      borderBottom: "1px solid var(--border)",
      transition: "background 0.12s",
    }}
      onMouseEnter={function (e) { e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
      onMouseLeave={function (e) { e.currentTarget.style.background = "transparent" }}
    >
      {/* Community */}
      <span className="mono" style={{
        fontSize: "12px", fontWeight: "600",
        color: subColor, minWidth: "150px",
        flexShrink: 0,
      }}>
        {"r/" + edge.source}
      </span>

      {/* Volume bar */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          height: "3px", width: barWidth + "px",
          background: biasColor + "55",
          borderRadius: "2px",
          minWidth: "4px", maxWidth: barMax + "px",
        }} />
        <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)", flexShrink: 0 }}>
          {edge.weight + "×"}
        </span>
      </div>

      {/* Domain */}
      <span style={{
        fontSize: "11px", color: "var(--text-sec)",
        minWidth: "170px", textAlign: "right",
        flexShrink: 0,
      }}>
        {edge.target}
      </span>

      {/* Bias pill */}
      <span style={{
        fontSize: "9px", fontWeight: "700",
        color: biasColor,
        background: biasColor + "12",
        border: "1px solid " + biasColor + "28",
        borderRadius: "999px",
        padding: "3px 9px",
        minWidth: "82px", textAlign: "center",
        flexShrink: 0,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {BIAS_LABELS[bias]}
      </span>
    </div>
  )
})

// ── Source Bias tab ───────────────────────────────────────────────────────────
function SourceBiasTab({ sourceData }) {
  const [minWeight, setMinWeight] = useState(3)
  const [sortBy, setSortBy] = useState("weight")
  const [filterBias, setFilterBias] = useState("all")
  const [pageSize, setPageSize] = useState(15)

  const edges = sourceData ? sourceData.edges || [] : []

  const filtered = filterBias === "all"
    ? edges
    : edges.filter(function (e) { return getDomainBias(e.target) === filterBias })

  const sorted = filtered.slice().sort(function (a, b) {
    if (sortBy === "weight") return b.weight - a.weight
    if (sortBy === "subreddit") return a.source.localeCompare(b.source)
    return a.target.localeCompare(b.target)
  })

  const minFiltered = sorted.filter(function (e) { return e.weight >= minWeight })
  const totalCitations = edges.reduce(function (s, e) { return s + e.weight }, 0)
  const visible = minFiltered.slice(0, pageSize)
  const remaining = minFiltered.length - pageSize
  const hasMore = remaining > 0

  const handleFilter = function (setter, val) {
    setter(val)
    setPageSize(15)
  }

  return (
    <div>
      {/* Summary cards */}
      <BiasSummaryCards edges={edges} />

      {/* Controls bar */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: "16px", marginBottom: "12px",
        alignItems: "center",
        padding: "10px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
      }}>
        {/* Min citations */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "9px", fontWeight: "700",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Min</span>
          <div style={{ display: "flex", gap: "3px" }}>
            {[3, 5, 10, 20].map(function (v) {
              return (
                <button key={v}
                  onClick={function () { handleFilter(setMinWeight, v) }}
                  style={ctrlBtn(minWeight === v, "var(--blue)")}>
                  {v + "+"}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />

        {/* Bias filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "9px", fontWeight: "700",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Bias</span>
          <div style={{ display: "flex", gap: "3px" }}>
            {["all", "left", "center", "right"].map(function (bk) {
              return (
                <button key={bk}
                  onClick={function () { handleFilter(setFilterBias, bk) }}
                  style={ctrlBtn(filterBias === bk,
                    bk === "all" ? "var(--blue)" : BIAS_COLORS[bk])}>
                  {bk.charAt(0).toUpperCase() + bk.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />

        {/* Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "9px", fontWeight: "700",
            color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Sort</span>
          <div style={{ display: "flex", gap: "3px" }}>
            {[
              { k: "weight", l: "Citations" },
              { k: "subreddit", l: "Community" },
              { k: "domain", l: "Domain" },
            ].map(function (s) {
              return (
                <button key={s.k}
                  onClick={function () { setSortBy(s.k) }}
                  style={ctrlBtn(sortBy === s.k, "var(--blue)")}>
                  {s.l}
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats pushed right */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-sec)" }}>
            <span className="mono" style={{ color: "var(--text-primary)", fontWeight: "600" }}>
              {minFiltered.length}
            </span>
            {" links"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-sec)" }}>
            <span className="mono" style={{ color: "var(--text-primary)", fontWeight: "600" }}>
              {totalCitations.toLocaleString()}
            </span>
            {" citations"}
          </span>
          {/* Bias legend */}
          <div style={{ display: "flex", gap: "10px" }}>
            {["left", "center", "right"].map(function (bk) {
              return (
                <div key={bk} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    width: "6px", height: "6px",
                    borderRadius: "50%", background: BIAS_COLORS[bk],
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                    {BIAS_LABELS[bk]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      {minFiltered.length === 0 ? (
        <div style={{
          padding: "48px", textAlign: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-sec)" }}>
            No citations match these filters
          </p>
        </div>
      ) : (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "flex", gap: "12px",
            padding: "8px 14px",
            background: "var(--bg-elevated)",
            borderBottom: "1px solid var(--border)",
          }}>
            {[
              { label: "Community", w: "150px" },
              { label: "Volume", flex: 1 },
              { label: "News Source", w: "170px", right: true },
              { label: "Bias", w: "82px", center: true },
            ].map(function (h) {
              return (
                <span key={h.label} style={{
                  fontSize: "9px", fontWeight: "700",
                  color: "var(--text-dim)",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  minWidth: h.w || undefined,
                  flex: h.flex || undefined,
                  textAlign: h.right ? "right" : h.center ? "center" : "left",
                  flexShrink: 0,
                }}>
                  {h.label}
                </span>
              )
            })}
          </div>

          {/* Rows */}
          {visible.map(function (e, i) {
            return <BiasEdgeRow key={i} edge={e} />
          })}

          {/* Load more */}
          {hasMore && (
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                {"Showing " + visible.length + " of " + minFiltered.length}
              </span>
              <button
                onClick={function () { setPageSize(function (p) { return p + 15 }) }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  color: "var(--text-sec)",
                  fontSize: "11px", padding: "5px 16px",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.borderColor = "var(--border-mid)"
                  e.currentTarget.style.color = "var(--text-primary)"
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.borderColor = "var(--border)"
                  e.currentTarget.style.color = "var(--text-sec)"
                }}
              >
                {"Show " + Math.min(15, remaining) + " more"}
              </button>
            </div>
          )}

          {/* All shown */}
          {!hasMore && minFiltered.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", color: "var(--text-dim)", textAlign: "center" }}>
                {"All " + minFiltered.length + " results shown"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function NetworkGraph({ filters }) {
  const [netType, setNetType] = useState("subreddit")
  const [removeNode, setRemoveNode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [dimensions, setDimensions] = useState({ w: 900, h: 420 })
  const containerRef = useRef(null)
  const autoSelectedRef = useRef(null)

  const isBiasTab = netType === "bias"

  const { data, loading, error } = useApi(
    isBiasTab ? null : "/api/network",
    isBiasTab ? {} : {
      type: netType,
      ...(removeNode ? { remove_node: removeNode } : {}),
    }
  )

  const { data: sourceData } = useApi(
    isBiasTab ? "/api/source_network" : null,
    { min_weight: 3 }
  )

  useEffect(function () {
    function measure() {
      if (!containerRef.current) return
      const w = containerRef.current.getBoundingClientRect().width
      if (w > 0) setDimensions({ w: Math.floor(w), h: 420 })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef.current) observer.observe(containerRef.current)
    const t = setTimeout(measure, 150)
    return function () { observer.disconnect(); clearTimeout(t) }
  }, [])

  useEffect(function () {
    setSelected(null)
    setRemoveNode(null)
    autoSelectedRef.current = null
  }, [netType])

  const sidebarSub = filters && filters.subreddit !== "all"
    ? filters.subreddit : null

  const sidebarBlocColor = sidebarSub
    ? (BLOC_COLORS[SUB_BLOC_MAP[sidebarSub] || "other"] || "#4f8ef7")
    : null

  const sidebarSubRef = useRef(sidebarSub)
  useEffect(function () {
    sidebarSubRef.current = sidebarSub
  }, [sidebarSub])

  useEffect(function () {
    if (netType !== "subreddit") return
    if (!sidebarSub) {
      autoSelectedRef.current = null
      return
    }
    if (autoSelectedRef.current === sidebarSub) return
    if (!data || !data.nodes) return
    var match = data.nodes.find(function (n) { return n.id === sidebarSub })
    if (match) {
      setSelected(match)
      autoSelectedRef.current = sidebarSub
    }
  }, [sidebarSub, netType, data])

  const topNode = useMemo(function () {
    if (!data || !data.nodes) return null
    return data.nodes.reduce(function (top, n) {
      return (n.pagerank || 0) > (top ? top.pagerank || 0 : 0) ? n : top
    }, null)
  }, [data])

  const nodeColor = useCallback(function (node) {
    if (netType === "source") {
      if (node.type === "subreddit") return BLOC_COLORS[node.bloc] || "#6b7280"
      return node.bias === "left" ? "#4f8ef7"
        : node.bias === "right" ? "#fb923c" : "#7a8fa6"
    }
    return BLOC_COLORS[node.bloc] || "#6b7280"
  }, [netType])

  const nodeVal = useCallback(function (node) {
    return Math.max(2, Math.min(20, (node.pagerank || 0) * 8000 + 3))
  }, [])

  const nodePainter = useCallback(function (node, ctx, globalScale) {
    const size = Math.max(2, Math.min(20, (node.pagerank || 0) * 8000 + 3))
    const color = nodeColor(node)

    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    if (node.is_bridge) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)"
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
    }

    if (sidebarSubRef.current && node.id === sidebarSubRef.current) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, size + 5 / globalScale, 0, 2 * Math.PI)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5 / globalScale
      ctx.globalAlpha = 0.9
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (globalScale > 1.5) {
      ctx.font = (10 / globalScale) + "px Inter, sans-serif"
      ctx.fillStyle = "#e2e8f0"
      ctx.textAlign = "center"
      ctx.fillText(node.id, node.x, node.y + size + 8 / globalScale)
    }
  }, [nodeColor])

  const graphData = useMemo(function () {
    if (!data) return { nodes: [], links: [] }
    return {
      nodes: data.nodes.map(function (n) { return Object.assign({}, n) }),
      links: data.edges.map(function (e) {
        return Object.assign({}, e, { source: e.source, target: e.target })
      }),
    }
  }, [data])

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
            <p className="sec-title">Influence & Citation Map</p>
            {!isBiasTab && data && (
              <p className="sec-desc" style={{ marginTop: "3px" }}>
                <span className="mono" style={{ color: "var(--text-primary)" }}>
                  {(data.nodes ? data.nodes.length : 0) + " nodes · " +
                    (data.edges ? data.edges.length : 0) + " edges"}
                </span>
                <span style={{ color: "var(--text-dim)" }}>{" · "}</span>
                {NET_DESCRIPTIONS[netType]}
              </p>
            )}
            {isBiasTab && (
              <p className="sec-desc" style={{ marginTop: "3px" }}>
                {NET_DESCRIPTIONS[netType]}
              </p>
            )}
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: "4px", alignItems: "center",
          }}>
            <div style={{
              display: "flex", gap: "3px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: "8px", padding: "3px",
            }}>
              {NET_TYPES.map(function (t) {
                const isActive = netType === t.key
                return (
                  <button key={t.key}
                    onClick={function () { setNetType(t.key) }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11px", fontWeight: "500",
                      border: "none", cursor: "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                      background: isActive ? "rgba(79,142,247,0.18)" : "transparent",
                      color: isActive ? "#93bbfd" : "var(--text-dim)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {!isBiasTab && topNode && netType !== "source" && (
              <button
                onClick={function () {
                  setRemoveNode(removeNode ? null : topNode.id)
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: "11px", fontWeight: "500",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                  background: removeNode
                    ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                  border: removeNode
                    ? "1px solid rgba(52,211,153,0.2)"
                    : "1px solid rgba(248,113,113,0.2)",
                  color: removeNode ? "#6ee7b7" : "#fca5a5",
                }}
              >
                {removeNode
                  ? "↩ Restore " + topNode.id
                  : "✕ Remove " + topNode.id
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar context banner ── */}
      {sidebarSub && netType === "subreddit" && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 14px",
          background: sidebarBlocColor + "08",
          border: "1px solid " + sidebarBlocColor + "25",
          borderLeft: "3px solid " + sidebarBlocColor,
          borderRadius: "var(--r-sm)",
          marginBottom: "16px", fontSize: "11px",
        }}>
          <span style={{ color: "var(--text-dim)" }}>Sidebar context:</span>
          <span style={{ color: sidebarBlocColor, fontWeight: "600" }}>
            {"r/" + sidebarSub}
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            · node auto-selected and highlighted
          </span>
          <button
            onClick={function () {
              setSelected(null)
              autoSelectedRef.current = null
            }}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "var(--text-dim)", cursor: "pointer",
              fontSize: "11px", fontFamily: "inherit",
              padding: "0 2px", transition: "color 0.15s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.color = "var(--text-primary)" }}
            onMouseLeave={function (e) { e.currentTarget.style.color = "var(--text-dim)" }}
          >
            clear ×
          </button>
        </div>
      )}

      {/* ── Remove node notice ── */}
      {removeNode && (
        <div style={{
          marginBottom: "16px", padding: "10px 14px",
          background: "rgba(251,191,36,0.04)",
          border: "1px solid rgba(251,191,36,0.12)",
          borderLeft: "3px solid rgba(251,191,36,0.4)",
          borderRadius: "var(--r-sm)",
          fontSize: "12px", color: "#fcd34d",
        }}>
          <strong>{removeNode}</strong>
          {" removed. PageRank redistributes across " +
            (data && data.nodes ? data.nodes.length : 0) + " remaining nodes."}
        </div>
      )}

      {/* ── Bias tab ── */}
      {isBiasTab && (
        <div>
          {sourceData
            ? <SourceBiasTab sourceData={sourceData} />
            : <div className="skeleton" style={{ height: "200px", borderRadius: "var(--r-md)" }} />
          }
        </div>
      )}

      {/* ── Graph tabs ── */}
      {!isBiasTab && (
        <div>
          {loading && (
            <div className="skeleton"
              style={{ height: "420px", borderRadius: "var(--r-md)" }} />
          )}

          {error && !loading && (
            <div style={{
              padding: "14px 16px",
              background: "rgba(248,113,113,0.05)",
              border: "1px solid rgba(248,113,113,0.15)",
              borderLeft: "3px solid #f87171",
              borderRadius: "var(--r-md)",
              color: "#fca5a5", fontSize: "13px",
            }}>
              Failed to load network data — check that the backend is running
            </div>
          )}

          {!loading && !error && data && data.nodes && data.nodes.length === 0 && (
            <div style={{
              height: "160px", display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
            }}>
              <p style={{ fontSize: "13px", color: "var(--text-sec)" }}>
                No network data available
              </p>
            </div>
          )}

          {/* ── Legend ABOVE graph ── */}
          {!loading && data && data.nodes && data.nodes.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "10px",
              padding: "10px 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
            }}>
              {[
                { txt: "Node size = PageRank", dot: "#4f8ef7" },
                { txt: "Node color = Louvain community", dot: null },
                netType === "author"
                  ? { txt: "White ring = bridge author", dot: "rgba(255,255,255,0.7)" }
                  : null,
                netType === "subreddit"
                  ? { txt: "Arrows = crosspost direction", dot: "#94a3b8" }
                  : null,
                sidebarSub && netType === "subreddit"
                  ? { txt: "Outer ring = sidebar selection", dot: sidebarBlocColor }
                  : null,
              ].filter(Boolean).map(function (item) {
                return (
                  <div key={item.txt} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    {item.dot
                      ? (
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: item.dot, flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "2px",
                          background: "linear-gradient(135deg, #4f8ef7, #f87171)",
                          flexShrink: 0,
                        }} />
                      )
                    }
                    <span style={{
                      fontSize: "11px",
                      color: "var(--text-sec)",
                    }}>
                      {item.txt}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Graph canvas ── */}
          {!loading && !error && data && data.nodes && data.nodes.length > 0 && (
            <div ref={containerRef} style={{
              background: "var(--bg-base, #02060f)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              overflow: "hidden", width: "100%",
              height: dimensions.h + "px",
            }}>
              <ForceGraph2D
                graphData={graphData}
                nodeColor={nodeColor}
                nodeVal={nodeVal}
                nodeCanvasObject={nodePainter}
                nodeCanvasObjectMode={function () { return "replace" }}
                nodeLabel={function (n) {
                  return n.id +
                    "\nPageRank: " + (n.pagerank || 0).toFixed(4) +
                    "\nPosts: " + (n.post_count || 0) +
                    (n.is_bridge ? "\n★ Bridge author" : "")
                }}
                linkWidth={function (l) { return Math.sqrt((l.weight || 1) * 0.8) }}
                linkDirectionalArrowLength={netType === "subreddit" ? 5 : 0}
                linkDirectionalArrowRelPos={0.85}
                linkColor={function () { return "rgba(148,163,184,0.15)" }}
                backgroundColor="var(--bg-base, #02060f)"
                width={dimensions.w}
                height={dimensions.h}
                onNodeClick={function (n) {
                  setSelected(function (prev) {
                    return prev && prev.id === n.id ? null : n
                  })
                }}
                cooldownTicks={120}
                d3AlphaDecay={0.025}
                d3VelocityDecay={0.4}
              />
            </div>
          )}

          {/* ── Selected node panel ── */}
          {selected && !loading && (
            <div style={{
              marginTop: "14px",
              background: "var(--bg-card)",
              border: "1px solid " + (
                sidebarSub && selected.id === sidebarSub
                  ? sidebarBlocColor + "50"
                  : "var(--border)"
              ),
              borderLeft: "3px solid " + (
                BLOC_COLORS[selected.bloc] || "var(--border-mid)"
              ),
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                background: sidebarSub && selected.id === sidebarSub
                  ? sidebarBlocColor + "12"
                  : "var(--bg-elevated)",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center",
                  gap: "10px", flexWrap: "wrap",
                }}>
                  <div style={{
                    width: "12px", height: "12px",
                    borderRadius: "50%",
                    background: BLOC_COLORS[selected.bloc] || "#6b7280",
                    boxShadow: "0 0 8px " +
                      (BLOC_COLORS[selected.bloc] || "#6b7280") + "80",
                    flexShrink: 0,
                  }} />
                  <p style={{
                    fontSize: "15px", fontWeight: "700",
                    color: "var(--text-primary)", letterSpacing: "-0.3px",
                  }}>
                    {"r/" + selected.id}
                  </p>
                  {sidebarSub && selected.id === sidebarSub && (
                    <span style={{
                      fontSize: "9px", fontWeight: "700",
                      color: "white", background: sidebarBlocColor,
                      borderRadius: "999px", padding: "2px 9px",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      boxShadow: "0 0 8px " + sidebarBlocColor + "60",
                    }}>
                      Sidebar selection
                    </span>
                  )}
                  {selected.is_bridge && (
                    <span style={{
                      fontSize: "9px", fontWeight: "700",
                      color: "#fbbf24",
                      background: "rgba(251,191,36,0.12)",
                      border: "1px solid rgba(251,191,36,0.25)",
                      borderRadius: "999px", padding: "2px 9px",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                    }}>
                      Bridge Author
                    </span>
                  )}
                </div>
                <button
                  onClick={function () { setSelected(null) }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text-dim)", cursor: "pointer",
                    fontSize: "13px", lineHeight: 1,
                    padding: "5px 9px", transition: "all 0.15s",
                  }}
                  onMouseEnter={function (e) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                    e.currentTarget.style.color = "var(--text-primary)"
                  }}
                  onMouseLeave={function (e) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                    e.currentTarget.style.color = "var(--text-dim)"
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
              }}>
                {[
                  selected.pagerank != null && {
                    label: "PageRank",
                    value: selected.pagerank.toFixed(6),
                    mono: true, color: "var(--blue, #4f8ef7)",
                  },
                  selected.post_count != null && {
                    label: "Total Posts",
                    value: selected.post_count.toLocaleString(),
                    mono: true, color: null,
                  },
                  selected.bloc && {
                    label: "Ideological Bloc",
                    value: selected.bloc.replace("_", " "),
                    mono: false, color: BLOC_COLORS[selected.bloc],
                  },
                  selected.community != null && {
                    label: "Louvain Community",
                    value: "#" + String(selected.community),
                    mono: true, color: null,
                  },
                ].filter(Boolean).map(function (item, idx, arr) {
                  return (
                    <div key={item.label} style={{
                      padding: "14px 18px",
                      background: idx % 2 === 0
                        ? "var(--bg-card)" : "rgba(255,255,255,0.015)",
                      borderRight: idx < arr.length - 1
                        ? "1px solid var(--border)" : "none",
                    }}>
                      <p style={{
                        fontSize: "9px", fontWeight: "700",
                        color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.12em",
                        marginBottom: "6px",
                      }}>
                        {item.label}
                      </p>
                      <p style={{
                        fontSize: "13px", fontWeight: "600",
                        color: item.color || "var(--text-primary)",
                        fontFamily: item.mono
                          ? "var(--text-mono, monospace)" : "inherit",
                        wordBreak: "break-word", lineHeight: 1.4,
                      }}>
                        {item.value}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default memo(NetworkGraph)