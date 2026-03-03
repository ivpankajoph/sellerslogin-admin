import React, { useMemo, useState } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appendMarkdownHyperlink } from '@/lib/markdown-hyperlink'

type HyperlinkInsertProps = {
  fieldLabel: string
  value: string
  onValueChange: (nextValue: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

const normalizeHyperlinkUrl = (value: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

const toMarkdownHyperlink = (text: string, url: string) =>
  `[${String(text || '').trim()}](${String(url || '').trim()})`

const getSelectionRange = (
  textarea: HTMLTextAreaElement | null | undefined
): { start: number; end: number; selectedText: string } | null => {
  if (!textarea) return null
  const start = Number(textarea.selectionStart)
  const end = Number(textarea.selectionEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  const selectedText = textarea.value.slice(start, end)
  if (!selectedText.trim()) return null

  return { start, end, selectedText }
}

export default function HyperlinkInsert({
  fieldLabel,
  value,
  onValueChange,
  textareaRef,
}: HyperlinkInsertProps) {
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [error, setError] = useState('')

  const canInsert = useMemo(
    () => Boolean(linkUrl.trim()),
    [linkUrl]
  )

  const handleInsert = () => {
    const selection = getSelectionRange(textareaRef?.current)
    const safeText = selection?.selectedText || linkText.trim()
    const safeUrl = normalizeHyperlinkUrl(linkUrl)

    if (!safeText) {
      setError('Select text in description or enter clickable text.')
      return
    }

    if (!safeUrl) {
      setError('Enter a valid URL (http/https).')
      return
    }

    const markdownLink = toMarkdownHyperlink(safeText, safeUrl)

    if (selection) {
      const nextValue = `${value.slice(0, selection.start)}${markdownLink}${value.slice(
        selection.end
      )}`
      onValueChange(nextValue)
      requestAnimationFrame(() => {
        const target = textareaRef?.current
        if (!target) return
        const cursorPosition = selection.start + markdownLink.length
        target.focus()
        target.setSelectionRange(cursorPosition, cursorPosition)
      })
    } else {
      onValueChange(appendMarkdownHyperlink(value, markdownLink))
    }

    setLinkText('')
    setLinkUrl('')
    setError('')
  }

  return (
    <div className='mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3'>
      <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600'>
        <LinkIcon className='h-3.5 w-3.5' />
        Insert Hyperlink ({fieldLabel})
      </div>
      <div className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
        <Input
          value={linkText}
          onChange={(event) => setLinkText(event.target.value)}
          placeholder='Clickable text'
          className='h-9 rounded-md border-slate-300 bg-white'
        />
        <Input
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder='https://example.com'
          className='h-9 rounded-md border-slate-300 bg-white'
        />
        <Button
          type='button'
          variant='outline'
          className='h-9 rounded-md border-slate-300'
          disabled={!canInsert}
          onClick={handleInsert}
        >
          Add Link
        </Button>
      </div>
      <p className='mt-2 text-xs text-slate-500'>
        Select text in the textarea to link that exact text. If nothing is selected,
        clickable text input will be used.
      </p>
      {error ? <p className='mt-1 text-xs text-rose-600'>{error}</p> : null}
    </div>
  )
}
