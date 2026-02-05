import { useEffect, useRef, useState } from 'react'
import {
  ExternalLink,
  RefreshCcw,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TemplatePreviewPanelProps {
  title: string
  subtitle: string
  src?: string
  fullPreviewUrl?: string
  baseSrc?: string
  previewQuery?: string
  defaultPath?: string
  pageOptions?: Array<{ label: string; path: string }>
  onSync?: () => Promise<void> | void
  isSyncing?: boolean
  syncDisabled?: boolean
  vendorId?: string
  page?: 'home' | 'about' | 'contact' | 'full'
  previewData?: unknown
  sectionOrder?: string[]
  onSelectSection?: (sectionId: string, componentId?: string) => void
  onInlineEdit?: (path: string[], value: unknown) => void
}

export function TemplatePreviewPanel({
  title,
  subtitle,
  src,
  fullPreviewUrl,
  baseSrc,
  previewQuery,
  defaultPath = '',
  pageOptions,
  onSync,
  isSyncing,
  syncDisabled,
  vendorId,
  page = 'full',
  previewData,
  sectionOrder,
  onSelectSection,
  onInlineEdit,
}: TemplatePreviewPanelProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [frameKey, setFrameKey] = useState(0)
  const [iframeHeight, setIframeHeight] = useState<number | null>(null)
  const [previewPath, setPreviewPath] = useState(defaultPath || '')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => setFrameKey((prev) => prev + 1)

  const handleSync = async () => {
    if (!onSync) {
      handleRefresh()
      return
    }
    await onSync()
    handleRefresh()
  }

  const updateIframeHeight = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentWindow?.document
      if (!doc) return
      const height = Math.max(
        doc.body?.scrollHeight || 0,
        doc.documentElement?.scrollHeight || 0
      )
      if (height) setIframeHeight(height)
    } catch {
      return
    }
  }

  useEffect(() => {
    if (!iframeRef.current || !vendorId || !previewData) return
    const timeout = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'template-preview-update',
          vendorId,
          page,
          payload: previewData,
          sectionOrder,
        },
        window.location.origin
      )
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [previewData, sectionOrder, vendorId, page])

  useEffect(() => {
    setPreviewPath(defaultPath || '')
  }, [defaultPath])

  useEffect(() => {
    const currentSrc = baseSrc
      ? `${baseSrc}${previewPath}${previewQuery || ''}`
      : src
    if (!currentSrc) return
    const timeout = window.setTimeout(() => {
      updateIframeHeight()
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [frameKey, device, previewData, sectionOrder, src, baseSrc, previewPath, previewQuery])

  useEffect(() => {
    if (!onSelectSection && !onInlineEdit) return

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as {
        type?: string
        vendorId?: string
        page?: string
        sectionId?: string
        componentId?: string
        path?: string[]
        value?: unknown
      }
      if (vendorId && data.vendorId && data.vendorId !== vendorId) return
      if (data.page && page && data.page !== page) return

      if (data?.type === 'template-editor-select') {
        if (!onSelectSection || !data.sectionId) return
        onSelectSection(data.sectionId, data.componentId)
        return
      }

      if (data?.type === 'template-inline-update') {
        if (!onInlineEdit || !Array.isArray(data.path)) return
        onInlineEdit(data.path, data.value)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelectSection, onInlineEdit, vendorId, page])

  const computedSrc = baseSrc
    ? `${baseSrc}${previewPath}${previewQuery || ''}`
    : src
  const computedFullPreviewUrl = baseSrc
    ? `${baseSrc}${previewPath}${previewQuery || ''}`
    : fullPreviewUrl

  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.4)] backdrop-blur'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
            <p className='text-xs text-slate-500'>{subtitle}</p>
          </div>
          <div className='flex items-center gap-2'>
            {pageOptions && pageOptions.length > 0 ? (
              <select
                className='h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600'
                value={previewPath}
                onChange={(event) => setPreviewPath(event.target.value)}
              >
                {pageOptions.map((option) => (
                  <option key={option.path} value={option.path}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              type='button'
              variant='outline'
              size='icon'
              className={cn(
                'rounded-full border-slate-200',
                device === 'desktop' &&
                  'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
              )}
              onClick={() => setDevice('desktop')}
            >
              <Monitor className='h-4 w-4' />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className={cn(
                'rounded-full border-slate-200',
                device === 'mobile' &&
                  'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
              )}
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className='h-4 w-4' />
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            className='border-slate-300'
            onClick={handleSync}
            disabled={syncDisabled || isSyncing}
          >
            <RefreshCcw className='h-4 w-4' />
            {isSyncing ? 'Syncing...' : 'Sync + Refresh'}
          </Button>
          {computedFullPreviewUrl ? (
            <a
              href={computedFullPreviewUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              <Button
                type='button'
                variant='outline'
                className='border-slate-300'
              >
                <ExternalLink className='h-4 w-4' /> Full Preview
              </Button>
            </a>
          ) : null}
        </div>

        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-2'>
          {computedSrc ? (
            <div
              className={cn(
                'overflow-hidden rounded-xl bg-white shadow-inner',
                device === 'mobile'
                  ? 'mx-auto w-full max-w-[360px]'
                  : 'w-full'
              )}
            >
              <iframe
                key={frameKey}
                title='Template preview'
                src={computedSrc}
                className={cn(
                  'w-full border-0',
                  device === 'mobile' ? 'rounded-[32px]' : ''
                )}
                style={{
                  minHeight: device === 'mobile' ? 620 : 720,
                  height:
                    iframeHeight && iframeHeight > 0
                      ? `${Math.max(
                          iframeHeight,
                          device === 'mobile' ? 620 : 720
                        )}px`
                      : undefined,
                }}
                ref={iframeRef}
                onLoad={updateIframeHeight}
              />
            </div>
          ) : (
            <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500'>
              <p>Preview will appear once vendor data is available.</p>
              <p>Save the template to load the live preview.</p>
            </div>
          )}
        </div>

        <p className='text-xs text-slate-500'>
          Live preview reflects the latest saved template and products.
        </p>
      </div>
    </div>
  )
}
