function StatCard({ label, value, hint, accent = 'default', action }) {
  const accentMap = {
    default: 'from-[rgba(131,56,236,0.08)] to-transparent',
    success: 'from-[rgba(0,155,90,0.08)] to-transparent',
    warning: 'from-[rgba(249,115,22,0.08)] to-transparent',
    danger: 'from-[rgba(225,29,72,0.08)] to-transparent',
    info: 'from-[rgba(0,132,199,0.08)] to-transparent',
  }

  return (
    <article className={`metric-card bg-gradient-to-br ${accentMap[accent] || accentMap.default}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-[#715d9a]">{label}</p>
          {action ? <div>{action}</div> : null}
        </div>
        <p className="mt-8 text-[25px] font-semibold leading-none text-[#21192d]">{value}</p>
        <p className="mt-2 text-[13px] text-[#9b8caf]">{hint}</p>
      </div>
    </article>
  )
}

export default StatCard
