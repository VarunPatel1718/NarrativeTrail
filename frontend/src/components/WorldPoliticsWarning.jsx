export default function WorldPoliticsWarning({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      padding: "10px 12px",
      background: "rgba(251,191,36,0.05)",
      border: "1px solid rgba(251,191,36,0.15)",
      borderLeft: "3px solid rgba(251,191,36,0.4)",
      borderRadius: "var(--r-sm)",
    }}>
      <p style={{
        fontSize: "10px", fontWeight: "600",
        color: "#fbbf24", marginBottom: "4px",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        Data quality notice
      </p>
      <p style={{
        fontSize: "11px", color: "#78716c", lineHeight: "1.5",
      }}>
        r/worldpolitics contains ~40% off-topic content.
        Spam posts filtered by default.
      </p>
    </div>
  )
}