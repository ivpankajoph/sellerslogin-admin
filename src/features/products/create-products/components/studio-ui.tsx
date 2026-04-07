import type { ReactNode } from 'react'
import { Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type StudioTone = 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose'

const toneStyles: Record<
  StudioTone,
  {
    section: string
    iconWrap: string
    icon: string
    eyebrow: string
  }
> = {
  cyan: {
    section: 'border-border bg-card',
    iconWrap: 'border-cyan-500/20 bg-cyan-500/10',
    icon: 'text-cyan-600',
    eyebrow: 'text-cyan-700 dark:text-cyan-300',
  },
  emerald: {
    section: 'border-border bg-card',
    iconWrap: 'border-emerald-500/20 bg-emerald-500/10',
    icon: 'text-emerald-600',
    eyebrow: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    section: 'border-border bg-card',
    iconWrap: 'border-amber-500/20 bg-amber-500/10',
    icon: 'text-amber-600',
    eyebrow: 'text-amber-700 dark:text-amber-300',
  },
  indigo: {
    section: 'border-border bg-card',
    iconWrap: 'border-indigo-500/20 bg-indigo-500/10',
    icon: 'text-indigo-600',
    eyebrow: 'text-indigo-700 dark:text-indigo-300',
  },
  rose: {
    section: 'border-border bg-card',
    iconWrap: 'border-rose-500/20 bg-rose-500/10',
    icon: 'text-rose-600',
    eyebrow: 'text-rose-700 dark:text-rose-300',
  },
}

export const studioCardClass = 'rounded-3xl border border-border/60 bg-card p-5'

export const studioSubtleCardClass = 'rounded-2xl bg-transparent p-4'

export const studioInputClass =
  'h-11 w-full rounded-xl border border-input bg-white px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'

export const studioTextareaClass =
  'w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'

export function StudioInfo({
  content,
  className,
}: {
  content: ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className={cn(
            'border-border bg-background text-muted-foreground inline-flex h-6 w-6 items-center justify-center rounded-full border transition hover:border-cyan-500/40 hover:text-cyan-600',
            className
          )}
          aria-label='Field information'
        >
          <Info className='h-3.5 w-3.5' />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side='top'
        sideOffset={8}
        className='max-w-64 rounded-xl px-3 py-2'
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export function StudioFieldLabel({
  label,
  help,
  required,
  action,
  className,
}: {
  label: string
  help?: ReactNode
  required?: boolean
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('mb-2 flex items-center justify-between gap-3', className)}
    >
      <div className='flex items-center gap-2'>
        <span className='text-foreground text-sm font-semibold'>
          {label}
          {required ? ' *' : ''}
        </span>
        {help ? <StudioInfo content={help} /> : null}
      </div>
      {action}
    </div>
  )
}

export function StudioSection({
  icon: Icon,
  title,
  description,
  help,
  action,
  eyebrow,
  tone = 'cyan',
  className,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  help?: ReactNode
  action?: ReactNode
  eyebrow?: string
  tone?: StudioTone
  className?: string
  children: ReactNode
}) {
  const toneStyle = toneStyles[tone]

  return (
    <section
      className={cn(
        'rounded-3xl border p-5 shadow-sm sm:p-6',
        toneStyle.section,
        className
      )}
    >
      <div className='border-border/60 mb-6 flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='flex items-start gap-4'>
          <div
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              toneStyle.iconWrap
            )}
          >
            <Icon className={cn('h-4.5 w-4.5', toneStyle.icon)} />
          </div>
          <div className='space-y-1.5'>
            {eyebrow ? (
              <div
                className={cn(
                  'text-[11px] font-semibold tracking-[0.22em] uppercase',
                  toneStyle.eyebrow
                )}
              >
                {eyebrow}
              </div>
            ) : null}
            <div className='flex items-center gap-2'>
              <h2 className='text-foreground text-xl font-semibold tracking-tight'>
                {title}
              </h2>
              {help ? <StudioInfo content={help} /> : null}
            </div>
            {description ? (
              <p className='text-muted-foreground max-w-3xl text-sm leading-6'>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? (
          <div className='flex shrink-0 items-center gap-2'>{action}</div>
        ) : null}
      </div>

      {children}
    </section>
  )
}
