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

const navItems = [
  { key: 'home', label: 'Home', to: '/vendor-template' },
  { key: 'about', label: 'About', to: '/vendor-template-about' },
  { key: 'contact', label: 'Contact', to: '/vendor-template-contact' },
  { key: 'pages', label: 'Pages', to: '/vendor-template-pages' },
  { key: 'other', label: 'Social + FAQ', to: '/vendor-template-other' },
  { key: 'blog', label: 'Blog', to: '/vendor-template-blog' },
  {
    key: 'policy',
    label: 'Privacy / Terms / Shipping Policy',
    to: '/vendor-template-policy',
  },
  {
    key: 'product-benefits',
    label: 'Product Benefits',
    to: '/vendor-template-product-benefits',
  },
]

const MIN_EDITOR_PANEL_WIDTH = 340
const MIN_PREVIEW_PANEL_WIDTH = 520
const DIVIDER_TRACK_WIDTH = 12
const DEFAULT_EDITOR_PANEL_WIDTH = 380
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
  title,
  description,
  activeKey,
  editingTemplateKey,
  showNavigation = true,
  actions,
  topContent,
  preview,
  children,
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

  if (isSplitLayout) {
    return (
      <div className='min-h-screen bg-[#f6f6f7] font-manrope text-slate-900'>
        <div className='flex min-h-screen flex-col'>
          {showNavigation || actions ? (
            <div className='border-b border-slate-200 bg-white'>
              <div className='relative flex min-h-[64px] items-center justify-center px-4 sm:px-6 lg:px-8'>
                {showNavigation ? (
                  <div className='flex flex-wrap items-center justify-center gap-2'>
                    {resolvedNavItems.map((item) => (
                      <Link
                        key={item.key}
                        to={item.to}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-sm font-medium transition',
                          item.key === activeKey
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {actions ? (
                  <div className='absolute right-4 hidden items-center gap-3 lg:flex lg:right-8'>
                    {actions}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            ref={layoutRef}
            style={gridStyle}
            className='grid flex-1 lg:grid-cols-[var(--template-editor-panel-width)_12px_minmax(0,1fr)]'
          >
            {children ? (
              <aside className='overflow-hidden border-r border-slate-200 bg-white'>
                <div
                  className='space-y-4 px-4 py-4 lg:h-[calc(100vh-65px)] lg:overflow-y-auto'
                  data-editor-scroll-container='true'
                >
                  {children}
                </div>
              </aside>
            ) : null}
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
                className='group h-full w-full cursor-col-resize select-none bg-[#f6f6f7]'
                aria-label='Resize editor and preview panels'
                title='Drag to resize panels'
              >
                <span className='flex h-full w-full items-center justify-center'>
                  <span
                    className={cn(
                      'h-32 w-[2px] rounded-full bg-slate-300 transition',
                      isResizing ? 'bg-slate-500' : 'group-hover:bg-slate-500'
                    )}
                  />
                </span>
              </button>
            </div>
            {preview ? (
              <section className='bg-[#efefef] lg:h-[calc(100vh-65px)] lg:overflow-y-auto'>
                {preview}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#f6f6f7] font-manrope text-slate-900'>
      <div className='mx-auto flex max-w-[1720px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8'>
        <header className='rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_-28px_rgba(15,23,42,0.4)]'>
          <div className='flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0 space-y-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                  Theme Editor
                </span>
                <span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700'>
                  Live
                </span>
              </div>
              <div>
                <h1 className='text-2xl font-semibold tracking-tight text-slate-950'>
                  {title}
                </h1>
                <p className='mt-1 max-w-3xl text-sm text-slate-500'>{description}</p>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-3'>{actions}</div>
          </div>
        </header>

        {topContent ? <div className='space-y-5'>{topContent}</div> : null}

        {hasMainContent ? <div>{children}{preview}</div> : null}
      </div>
    </div>
  )
}
