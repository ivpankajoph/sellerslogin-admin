interface ColorPreviewChipProps {
  color: string
  label: string
  variant?: 'button' | 'surface' | 'text' | 'accent'
}

const VARIANT_STYLES = {
  button: 'rounded-full px-3 py-1.5',
  surface: 'rounded-xl px-3 py-2',
  text: 'rounded-lg px-3 py-2',
  accent: 'rounded-lg px-3 py-2',
} as const

const textColorForBackground = (color: string) => {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#0f172a'

  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000

  return brightness > 150 ? '#0f172a' : '#ffffff'
}

export function ColorPreviewChip({
  color,
  label,
  variant = 'surface',
}: ColorPreviewChipProps) {
  const textColor =
    variant === 'text' ? color : textColorForBackground(color || '#ffffff')

  return (
    <div className='flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm'>
      <div className='flex min-w-0 items-center gap-2'>
        <span
          className='h-4 w-4 shrink-0 rounded-full border border-slate-200'
          style={{ backgroundColor: color }}
          aria-hidden='true'
        />
        <span className='truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
          {label}
        </span>
      </div>
      <span
        className={`shrink-0 border border-black/5 text-xs font-semibold ${VARIANT_STYLES[variant]}`}
        style={{
          backgroundColor: variant === 'text' ? '#f8fafc' : color,
          color: textColor,
        }}
      >
        {variant === 'text'
          ? 'Aa'
          : variant === 'button'
            ? 'Button'
            : variant === 'accent'
              ? 'Accent'
              : 'Section'}
      </span>
    </div>
  )
}
