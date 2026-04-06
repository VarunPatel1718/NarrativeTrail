import { useState, useEffect, useRef } from "react"
import axios from "axios"

const BASE = import.meta.env.VITE_API_URL || ""

export default function AISummary({ type, data, context }) {
  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const prevKeyRef = useRef(null)

  useEffect(function() {
    if (!data || !data.length) {
      setLoading(false)
      return
    }

    // Build a stable key from actual data content
    var key = type + "|" + JSON.stringify(data.slice(0, 3))
    if (key === prevKeyRef.current) return  // same data — skip
    prevKeyRef.current = key

    var cancelled = false
    setLoading(true)
    setSummary("")
    setError(false)

    axios.post(BASE + "/api/summarize", {
      type,
      data:    data.slice(0, 30),
      context: context || "",
    })
    .then(function(r) {
      if (cancelled) return
      setSummary(r.data.summary || "")
      setLoading(false)
    })
    .catch(function() {
      if (cancelled) return
      setError(true)
      setLoading(false)
    })

    return function() { cancelled = true }

  }, [data, type])

  if (!data || !data.length) return null

  return (
    <div style={{
      marginTop: "16px",
      padding: "14px 16px",
      background: "rgba(79,142,247,0.04)",
      border: "1px solid rgba(79,142,247,0.15)",
      borderLeft: "3px solid #4f8ef7",
      borderRadius: "8px",
    }}>
      <p style={{
        fontSize: "9px", fontWeight: "700",
        color: "#4f8ef7",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "10px",
      }}>
        AI Summary
      </p>

      {(loading || (!summary && !error)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {[100, 88, 70].map(function(w) {
            return (
              <div key={w} className="skeleton" style={{
                height: "11px",
                width: w + "%",
                borderRadius: "4px",
              }} />
            )
          })}
        </div>
      )}

      {error && !loading && (
        <p style={{
          fontSize: "12px",
          color: "var(--text-dim)",
          fontStyle: "italic",
          margin: 0,
        }}>
          AI summary temporarily unavailable
        </p>
      )}

      {!loading && !error && summary && (
        <p style={{
          fontSize: "13px",
          color: "var(--text-sec)",
          lineHeight: "1.7",
          margin: 0,
          wordBreak: "break-word",
        }}>
          {summary}
        </p>
      )}
    </div>
  )
}