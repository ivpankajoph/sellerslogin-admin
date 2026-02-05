import { useEffect, useMemo, useRef, useState } from 'react'
import type { ElementType, FocusEvent, FormEvent, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

type InlineEditableTextProps = {
  value?: string | number
  fallback?: string
  path: string[]
  vendorId: string
  page: 'home' | 'about' | 'contact' | 'full'
  colorPath?: string[]
  sizePath?: string[]
  color?: string
  fontSize?: number
  className?: string
  as?: ElementType
}

export function InlineEditableText({
  value,
  fallback,
  path,
  vendorId,
  page,
  colorPath,
  sizePath,
  color,
  fontSize,
  className,
  as = 'span',
}: InlineEditableTextProps) {
  const Component = as as ElementType
  const ref = useRef<HTMLElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(
    value !== undefined && value !== null ? String(value) : fallback || ''
  )
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const draftRef = useRef(draft)

  const hasToolbar = Boolean(colorPath || sizePath)

  useEffect(() => {
    const next =
      value !== undefined && value !== null ? String(value) : fallback || ''
    setDraft(next)
    draftRef.current = next
  }, [value, fallback])

  const sendUpdate = (updatePath: string[], updateValue: string | number) => {
    if (typeof window === 'undefined') return
    window.parent?.postMessage(
      {
        type: 'template-inline-update',
        vendorId,
        page,
        path: updatePath,
        value: updateValue,
      },
      window.location.origin
    )
  }

  const commit = () => {
    const trimmed = draftRef.current.trim()
    sendUpdate(path, trimmed)
    setDraft(trimmed)
    setIsEditing(false)
  }

  const cancel = () => {
    const next =
      value !== undefined && value !== null ? String(value) : fallback || ''
    setDraft(next)
    draftRef.current = next
    setIsEditing(false)
  }

  const toolbarPosition = useMemo(() => {
    if (typeof window === 'undefined') return { top: 0, left: 0 }
    if (!ref.current) return { top: 0, left: 0 }
    const rect = ref.current.getBoundingClientRect()
    return {
      top: Math.max(rect.top - 48, 16),
      left: Math.min(rect.left, window.innerWidth - 240),
    }
  }, [toolbarOpen, draft])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      ref.current?.blur()
      commit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  return (
    <>
      <Component
        ref={ref as any}
        data-inline-edit='true'
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          'outline-none outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300',
          className
        )}
        onClick={(event: MouseEvent<HTMLElement>) => {
          event.stopPropagation()
          setIsEditing(true)
          setToolbarOpen(true)
          setTimeout(() => ref.current?.focus(), 0)
        }}
        onBlur={(event: FocusEvent<HTMLElement>) => {
          const nextTarget = event.relatedTarget as Node | null
          if (nextTarget && toolbarRef.current?.contains(nextTarget)) {
            return
          }
          commit()
          setToolbarOpen(false)
        }}
        onInput={(event: FormEvent<HTMLElement>) => {
          draftRef.current = (event.currentTarget as HTMLElement).innerText
        }}
        onKeyDown={handleKeyDown}
        style={{ color, fontSize: fontSize ? `${fontSize}px` : undefined }}
      >
        {draft || fallback || ''}
      </Component>
      {hasToolbar && toolbarOpen ? (
        <div
          ref={toolbarRef}
          tabIndex={-1}
          className='fixed z-[9999] flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs shadow-lg'
          style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
        >
          {colorPath ? (
            <label className='flex items-center gap-2 text-slate-600'>
              Color
              <input
                type='color'
                value={color || '#111827'}
                onChange={(event) => {
                  sendUpdate(colorPath, event.target.value)
                }}
                className='h-6 w-8 cursor-pointer border-0 bg-transparent p-0'
              />
            </label>
          ) : null}
          {sizePath ? (
            <label className='flex items-center gap-2 text-slate-600'>
              Size
              <input
                type='range'
                min={12}
                max={64}
                value={clamp(fontSize || 16, 12, 64)}
                onChange={(event) => {
                  sendUpdate(sizePath, Number(event.target.value))
                }}
                className='h-1 w-24 cursor-pointer accent-orange-500'
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
