import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  getTemplateDisplayName,
} from './templateVariantParam'
import { useActiveWebsiteSelection } from './websiteStudioStorage'

const navItems = [
  { key: 'home', label: 'Home', to: '/vendor-template' },
  { key: 'about', label: 'About', to: '/vendor-template-about' },
  { key: 'contact', label: 'Contact', to: '/vendor-template-contact' },
  { key: 'pages', label: 'Pages', to: '/vendor-template-pages' },
  { key: 'other', label: 'Social + FAQ', to: '/vendor-template-other' },
]

const MIN_EDITOR_PANEL_WIDTH = 320
const MIN_PREVIEW_PANEL_WIDTH = 440
const DIVIDER_TRACK_WIDTH = 12
const DEFAULT_EDITOR_PANEL_WIDTH = 420
const PANEL_WIDTH_STORAGE_KEY = 'template_editor_panel_width_px'

interface TemplatePageLayoutProps {
  title: string
  description: string
  activeKey: string
  vendorId?: string
  editingTemplateKey?: string
  showNavigation?: boolean
  actions?: ReactNode
  topContent?: ReactNode
  preview?: ReactNode
  children?: ReactNode
  connectedDomainHost?: string
  connectedDomainState?: 'connected' | 'pending' | 'error'
}

export function TemplatePageLayout({
  title: _title,
  description: _description,
  activeKey,
  vendorId,
  editingTemplateKey,
  showNavigation = true,
  actions,
  topContent,
  preview,
  children,
  connectedDomainHost,
  connectedDomainState,
}: TemplatePageLayoutProps) {
  const [editorPanelWidth, setEditorPanelWidth] = useState(DEFAULT_EDITOR_PANEL_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const resizePointerIdRef = useRef<number | null>(null)
  const resizeStartRef = useRef<{ x: number; width: number }>({
    x: 0,
    width: DEFAULT_EDITOR_PANEL_WIDTH,
  })

  const hasMainContent = preview != null || children != null
  const isSplitLayout = Boolean(preview && children)
  const templateName = getTemplateDisplayName(editingTemplateKey)
  const { activeWebsite } = useActiveWebsiteSelection(vendorId)
  const domainBadgeLabel =
    connectedDomainState === 'connected'
      ? 'Domain Connected'
      : connectedDomainState === 'error'
        ? 'Domain Error'
        : connectedDomainState === 'pending'
          ? 'Domain Pending'
          : ''
  const domainBadgeClass =
    connectedDomainState === 'connected'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : connectedDomainState === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'
  const resolvedNavItems = navItems.map((item) =>
    item.key === 'home' && editingTemplateKey
      ? {
          ...item,
          to: `/vendor-template/${editingTemplateKey}`,
        }
      : item
  )
  const gridStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isSplitLayout) return undefined
    return {
      ['--template-editor-panel-width' as string]: `${editorPanelWidth}px`,
    }
  }, [editorPanelWidth, isSplitLayout])

  const resizeToClientX = useCallback(
    (clientX: number) => {
      if (!isSplitLayout) return
      const layout = layoutRef.current
      if (!layout) return

      const rect = layout.getBoundingClientRect()
      if (!rect.width) return

      const deltaX = clientX - resizeStartRef.current.x
      const targetWidth = resizeStartRef.current.width + deltaX
      const maxEditorWidth = Math.max(
        MIN_EDITOR_PANEL_WIDTH,
        rect.width - MIN_PREVIEW_PANEL_WIDTH - DIVIDER_TRACK_WIDTH
      )
      const clampedWidth = Math.min(
        maxEditorWidth,
        Math.max(MIN_EDITOR_PANEL_WIDTH, targetWidth)
      )
      setEditorPanelWidth(clampedWidth)
    },
    [isSplitLayout]
  )
  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = Number.parseInt(
        window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY) || '',
        10
      )
      if (Number.isFinite(stored) && stored >= MIN_EDITOR_PANEL_WIDTH) {
        setEditorPanelWidth(stored)
      }
    } catch {
      // ignore localStorage failures
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(Math.round(editorPanelWidth)))
    } catch {
      // ignore localStorage failures
    }
  }, [editorPanelWidth])

  useEffect(() => {
    if (!isResizing) {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopResizing()
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        stopResizing()
      }
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mouseup', stopResizing)
    window.addEventListener('pointerup', stopResizing)
    window.addEventListener('pointercancel', stopResizing)
    window.addEventListener('blur', stopResizing)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('mouseup', stopResizing)
      window.removeEventListener('pointerup', stopResizing)
      window.removeEventListener('pointercancel', stopResizing)
      window.removeEventListener('blur', stopResizing)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, stopResizing])

  useEffect(() => {
    if (!isSplitLayout) return
    const clampToViewport = () => {
      const layout = layoutRef.current
      if (!layout) return
      const rect = layout.getBoundingClientRect()
      const maxEditorWidth = Math.max(
        MIN_EDITOR_PANEL_WIDTH,
        rect.width - MIN_PREVIEW_PANEL_WIDTH - DIVIDER_TRACK_WIDTH
      )
      setEditorPanelWidth((current) =>
        Math.min(maxEditorWidth, Math.max(MIN_EDITOR_PANEL_WIDTH, current))
      )
    }
    clampToViewport()
    window.addEventListener('resize', clampToViewport)
    return () => window.removeEventListener('resize', clampToViewport)
  }, [isSplitLayout])

  const handleResizeStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isSplitLayout) return
    if (event.button !== 0) return
    event.preventDefault()
    const layout = layoutRef.current
    if (!layout) return
    resizeStartRef.current = {
      x: event.clientX,
      width: editorPanelWidth,
    }
    resizePointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsResizing(true)
  }

  const handleResizeMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isResizing) return
    if (
      resizePointerIdRef.current !== null &&
      event.pointerId !== resizePointerIdRef.current
    ) {
      return
    }
    // If mouseup gets lost (e.g. over iframe), stop resize as soon as button is not pressed.
    if ((event.buttons & 1) !== 1) {
      stopResizing()
      return
    }
    resizeToClientX(event.clientX)
  }

  const handleResizeEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      resizePointerIdRef.current !== null &&
      event.pointerId !== resizePointerIdRef.current
    ) {
      return
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resizePointerIdRef.current = null
    stopResizing()
  }

  return (
    <div className='relative min-h-screen overflow-hidden font-manrope'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(14,116,144,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(244,114,182,0.16),transparent_40%)]' />
      <div className='absolute -left-20 top-10 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/30 via-white/0 to-transparent blur-3xl' />
      <div className='absolute -right-16 bottom-16 h-72 w-72 rounded-full bg-gradient-to-br from-teal-200/40 via-white/0 to-transparent blur-3xl' />

      <div className='relative mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8'>
        <header className='rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div>
            
              <p className=' inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                Editing Template: {editingTemplateKey ? templateName : 'Default'}
                <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                  {editingTemplateKey || 'active'}
                </span>
              </p>
              {activeWebsite?.id ? (
                <p className='mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                  Website:
                  <span className='rounded-full bg-white px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-emerald-700'>
                    {activeWebsite.name || activeWebsite.websiteSlug || activeWebsite.id}
                  </span>
                </p>
              ) : null}
              {connectedDomainHost ? (
                <div className='mt-3'>
                  <a
                    href={`https://${connectedDomainHost}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition hover:shadow-sm',
                      domainBadgeClass
                    )}
                  >
                    {domainBadgeLabel}:
                    <span className='rounded-full bg-white px-2 py-0.5 text-[11px] tracking-[0.04em]'>
                      {connectedDomainHost}
                    </span>
                  </a>
                </div>
              ) : null}
            </div>
            <div className='flex flex-wrap items-center gap-3'>{actions}</div>
          </div>

          {showNavigation ? (
            <div className='mt-6 flex flex-wrap gap-2'>
              {resolvedNavItems.map((item) => (
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
          ) : null}
        </header>

        {topContent ? <div className='space-y-6'>{topContent}</div> : null}

        {hasMainContent ? (
          <div
            ref={layoutRef}
            style={gridStyle}
            className={cn(
              'grid gap-6',
              isSplitLayout
                ? 'lg:grid-cols-[var(--template-editor-panel-width)_12px_minmax(0,1fr)]'
                : ''
            )}
          >
            {children ? (
              <div
                className='space-y-6 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-3'
                data-editor-scroll-container='true'
              >
                {children}
              </div>
            ) : null}
            {isSplitLayout ? (
              <div className='hidden lg:flex lg:items-stretch'>
                <button
                  type='button'
                  onPointerDown={handleResizeStart}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                  onLostPointerCapture={() => {
                    resizePointerIdRef.current = null
                    stopResizing()
                  }}
                  className='group h-full w-full cursor-col-resize select-none'
                  aria-label='Resize editor and preview panels'
                  title='Drag to resize panels'
                >
                  <span className='flex h-full w-full items-center justify-center'>
                    <span
                      className={cn(
                        'h-24 w-[3px] rounded-full bg-slate-300 transition',
                        isResizing ? 'bg-slate-500' : 'group-hover:bg-slate-500'
                      )}
                    />
                  </span>
                </button>
              </div>
            ) : null}
            {preview ? (
              <div className='lg:sticky lg:top-6 lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2'>
                {preview}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
