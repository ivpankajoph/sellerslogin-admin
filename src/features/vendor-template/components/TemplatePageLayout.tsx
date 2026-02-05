import { type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'home', label: 'Home', to: '/vendor-template' },
  { key: 'about', label: 'About', to: '/vendor-template-about' },
  { key: 'contact', label: 'Contact', to: '/vendor-template-contact' },
  { key: 'pages', label: 'Pages', to: '/vendor-template-pages' },
  { key: 'other', label: 'Social + FAQ', to: '/vendor-template-other' },
]

interface TemplatePageLayoutProps {
  title: string
  description: string
  activeKey: string
  actions?: ReactNode
  preview?: ReactNode
  children: ReactNode
}

export function TemplatePageLayout({
  title,
  description,
  activeKey,
  actions,
  preview,
  children,
}: TemplatePageLayoutProps) {
  return (
    <div className='relative min-h-screen overflow-hidden font-manrope'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(14,116,144,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(244,114,182,0.16),transparent_40%)]' />
      <div className='absolute -left-20 top-10 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/30 via-white/0 to-transparent blur-3xl' />
      <div className='absolute -right-16 bottom-16 h-72 w-72 rounded-full bg-gradient-to-br from-teal-200/40 via-white/0 to-transparent blur-3xl' />

      <div className='relative mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8'>
        <header className='rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
                Template Studio
              </p>
              <h1 className='mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl'>
                {title}
              </h1>
              <p className='mt-2 max-w-2xl text-sm text-slate-600 sm:text-base'>
                {description}
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-3'>{actions}</div>
          </div>

          <div className='mt-6 flex flex-wrap gap-2'>
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                  item.key === activeKey
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-400 hover:text-slate-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <div className='grid gap-6 lg:grid-cols-[520px_minmax(0,1fr)] xl:grid-cols-[600px_minmax(0,1fr)]'>
          {preview ? (
            <div className='lg:sticky lg:top-6 lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2'>
              {preview}
            </div>
          ) : null}
          <div
            className='space-y-6 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-3'
            data-editor-scroll-container='true'
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
