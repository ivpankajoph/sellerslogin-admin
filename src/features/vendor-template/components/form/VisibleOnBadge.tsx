type VisibleOnBadgeProps = {
  label: string
}

export function VisibleOnBadge({ label }: VisibleOnBadgeProps) {
  return (
    <div
      className='flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600'
    >
      <span className='uppercase tracking-[0.18em] opacity-70'>Visible on</span>
      <span className='font-semibold text-slate-800'>{label}</span>
    </div>
  )
}
