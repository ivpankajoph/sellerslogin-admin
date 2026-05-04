function StatCard({ label, value, hint, accent = 'default', action }) {
  const accentMap = {
    default: 'from-[rgba(99,91,255,0.12)] to-transparent',
    success: 'from-[rgba(16,185,129,0.14)] to-transparent',
    warning: 'from-[rgba(245,158,11,0.14)] to-transparent',
    danger: 'from-[rgba(248,113,113,0.14)] to-transparent',
    info: 'from-[rgba(14,165,233,0.14)] to-transparent',
  }

  return (
    <article className={`metric-card bg-gradient-to-br ${accentMap[accent] || accentMap.default}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-ui-body">{label}</p>
          {action ? <div>{action}</div> : null}
        </div>
        <p className="mt-4 text-3xl font-semibold text-ui-strong">{value}</p>
        <p className="mt-2 text-sm text-ui-muted">{hint}</p>
      </div>
    </article>
  )
}

export default StatCard
