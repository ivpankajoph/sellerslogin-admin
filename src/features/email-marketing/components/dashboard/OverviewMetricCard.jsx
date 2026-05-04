function SentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 12.5 20 4l-4.5 16-4-6-7.5-1.5Z" />
      <path d="M11.5 14.5 20 4" />
    </svg>
  )
}

function DeliverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 12.5h4l2-5 4 10 2-5h4" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 12s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function ClickIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M5 4v6M8 7H2" />
      <path d="m11 13 7.5-7.5 1.5 1.5L12.5 14.5" />
      <path d="m11 13 2.5 8 2.5-5 5-2.5-10-0.5Z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 3v18" />
      <path d="M16.5 7.2a4 4 0 0 0-3-1.2h-2.5A3.5 3.5 0 0 0 11 13h2a3.5 3.5 0 0 1 0 7h-3a4.5 4.5 0 0 1-3.2-1.3" />
    </svg>
  )
}

function iconForMetric(icon) {
  const icons = {
    SN: SentIcon,
    DL: DeliverIcon,
    OP: OpenIcon,
    CL: ClickIcon,
    BR: AlertIcon,
    CR: AlertIcon,
    UN: AlertIcon,
    $: RevenueIcon,
  }

  return icons[icon] || SentIcon
}

function OverviewMetricCard({ title, value, hint, tone = 'default', icon = 'SN' }) {
  const toneClasses = {
    default: {
      wrapper: 'text-[#475467]',
      value: 'text-[#111827]',
      icon: 'text-[#166534]',
    },
    blue: {
      wrapper: 'text-[#475467]',
      value: 'text-[#111827]',
      icon: 'text-[#175cd3]',
    },
    emerald: {
      wrapper: 'text-[#475467]',
      value: 'text-[#111827]',
      icon: 'text-[#166534]',
    },
    amber: {
      wrapper: 'text-[#475467]',
      value: 'text-[#111827]',
      icon: 'text-[#b54708]',
    },
    rose: {
      wrapper: 'text-[#475467]',
      value: 'text-[#111827]',
      icon: 'text-[#b42318]',
    },
  }
  const palette = toneClasses[tone] || toneClasses.default
  const Icon = iconForMetric(icon)

  return (
    <article className="metric-card">
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[15px] font-medium ${palette.wrapper}`}>{title}</p>
          <span className={`flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(21,128,61,0.08)] ${palette.icon}`}>
            <Icon />
          </span>
        </div>
        <p className={`mt-8 text-[40px] font-semibold leading-none tracking-tight ${palette.value}`}>
          {value}
        </p>
        <p className="mt-3 text-sm text-[#667085]">{hint}</p>
      </div>
    </article>
  )
}

export default OverviewMetricCard
