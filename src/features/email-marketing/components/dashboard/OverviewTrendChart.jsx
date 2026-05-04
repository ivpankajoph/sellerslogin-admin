const buildPath = (points, width, height, maxValue) =>
  points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - (point.value / Math.max(maxValue, 1)) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ')

function OverviewTrendChart({ data = [] }) {
  const chartWidth = 680
  const chartHeight = 260
  const points = data.map((item) => ({
    label: item.date,
    value: item.sent || 0,
    secondary: item.opens || 0,
  }))

  const maxValue = Math.max(...points.map((point) => Math.max(point.value, point.secondary)), 1)
  const sentPath = buildPath(
    points.map((point) => ({ value: point.value })),
    chartWidth,
    chartHeight,
    maxValue,
  )
  const openPath = buildPath(
    points.map((point) => ({ value: point.secondary })),
    chartWidth,
    chartHeight,
    maxValue,
  )

  return (
    <div className="rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,251,255,0.9),rgba(255,255,255,0.95))] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Performance trend</p>
          <p className="text-sm text-slate-500">Sent volume and opens over time.</p>
        </div>
        <div className="flex gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Sent
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Opens
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 32}`} className="h-[300px] min-w-[620px] w-full">
          {[0.25, 0.5, 0.75, 1].map((step) => {
            const y = chartHeight - chartHeight * step
            return (
              <line
                key={step}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="rgba(148,163,184,0.18)"
                strokeDasharray="6 8"
              />
            )
          })}

          <path
            d={`${sentPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
            fill="url(#sentFill)"
            opacity="0.85"
          />
          <path d={sentPath} fill="none" stroke="#2f6fed" strokeWidth="4" strokeLinecap="round" />
          <path d={openPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

          <defs>
            <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(47,111,237,0.22)" />
              <stop offset="100%" stopColor="rgba(47,111,237,0.02)" />
            </linearGradient>
          </defs>

          {points.map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * chartWidth
            return (
              <text
                key={point.label}
                x={x}
                y={chartHeight + 24}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                fill="#64748b"
                fontSize="12"
                fontWeight="600"
              >
                {new Date(point.label).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default OverviewTrendChart
