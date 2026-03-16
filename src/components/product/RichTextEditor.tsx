import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline,
  Video,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { normalizeRichTextInput } from '@/lib/rich-text'

type RichTextEditorProps = {
  value: string
  onChange: (nextValue: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  allowImages?: boolean
  allowVideo?: boolean
}

type BlockType =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'blockquote'

type PopoverType = 'color' | 'link' | 'image' | 'video' | null

const BLOCK_OPTIONS: Array<{ value: BlockType; label: string; commandValue: string }> = [
  { value: 'paragraph', label: 'Paragraph', commandValue: '<p>' },
  { value: 'heading-1', label: 'Heading 1', commandValue: '<h1>' },
  { value: 'heading-2', label: 'Heading 2', commandValue: '<h2>' },
  { value: 'heading-3', label: 'Heading 3', commandValue: '<h3>' },
  { value: 'heading-4', label: 'Heading 4', commandValue: '<h4>' },
  { value: 'heading-5', label: 'Heading 5', commandValue: '<h5>' },
  { value: 'heading-6', label: 'Heading 6', commandValue: '<h6>' },
  { value: 'blockquote', label: 'Blockquote', commandValue: '<blockquote>' },
]

const FORMAT_BUTTONS: ReadonlyArray<{
  icon: typeof Bold
  label: string
  command: string
  commandValue?: string
}> = [
  { icon: Bold, label: 'Bold', command: 'bold' },
  { icon: Italic, label: 'Italic', command: 'italic' },
  { icon: Underline, label: 'Underline', command: 'underline' },
  { icon: Strikethrough, label: 'Strikethrough', command: 'strikeThrough' },
  { icon: List, label: 'Bullet List', command: 'insertUnorderedList' },
  { icon: ListOrdered, label: 'Numbered List', command: 'insertOrderedList' },
  { icon: Quote, label: 'Quote', command: 'formatBlock', commandValue: '<blockquote>' },
]

const toolbarButtonClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground'

const iconButtonClass = `${toolbarButtonClass} w-9 px-0`

const dividerClass = 'h-7 w-px bg-border/70'

const normalizeUrl = (value: string) => {
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

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const getYouTubeId = (value: string) => {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || ''
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v') || ''
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/').filter(Boolean)[1] || ''
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/').filter(Boolean)[1] || ''
      }
    }
  } catch {
    return ''
  }

  return ''
}

const getVimeoId = (value: string) => {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return ''

    const segment = url.pathname
      .split('/')
      .filter(Boolean)
      .find((part) => /^\d+$/.test(part))

    return segment || ''
  } catch {
    return ''
  }
}

const buildVideoEmbedHtml = (value: string) => {
  const safeUrl = normalizeUrl(value)
  if (!safeUrl) return ''

  const youTubeId = getYouTubeId(safeUrl)
  if (youTubeId) {
    return `<iframe src="https://www.youtube.com/embed/${escapeHtml(
      youTubeId
    )}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
  }

  const vimeoId = getVimeoId(safeUrl)
  if (vimeoId) {
    return `<iframe src="https://player.vimeo.com/video/${escapeHtml(
      vimeoId
    )}" title="Embedded video" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(safeUrl)) {
    return `<video controls preload="metadata" src="${escapeHtml(safeUrl)}"></video>`
  }

  return ''
}

const stripDisallowedMedia = (
  html: string,
  options: { allowImages: boolean; allowVideo: boolean }
) => {
  let sanitized = String(html || '')

  if (!options.allowImages) {
    sanitized = sanitized.replace(/<img\b[^>]*>/gi, '')
  }

  if (!options.allowVideo) {
    sanitized = sanitized
      .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }

  return sanitized
}

const getRichTextContentState = (html: string) => {
  if (typeof document === 'undefined') {
    const plainText = String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      plainText,
      hasImage: /<img\b/i.test(String(html || '')),
      hasVideo: /<(video|iframe)\b/i.test(String(html || '')),
    }
  }

  const container = document.createElement('div')
  container.innerHTML = String(html || '')

  return {
    plainText: String(container.textContent || '').trim(),
    hasImage: Boolean(container.querySelector('img')),
    hasVideo: Boolean(container.querySelector('video, iframe')),
  }
}

const getBlockTypeFromElement = (element: Element | null): BlockType => {
  if (!element) return 'paragraph'

  const tagName = element.tagName.toUpperCase()
  switch (tagName) {
    case 'H1':
      return 'heading-1'
    case 'H2':
      return 'heading-2'
    case 'H3':
      return 'heading-3'
    case 'H4':
      return 'heading-4'
    case 'H5':
      return 'heading-5'
    case 'H6':
      return 'heading-6'
    case 'BLOCKQUOTE':
      return 'blockquote'
    default:
      return 'paragraph'
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here...',
  minHeight = 'min-h-[180px]',
  className,
  allowImages = true,
  allowVideo = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const selectionRef = useRef<Range | null>(null)

  const [isFocused, setIsFocused] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [activePopover, setActivePopover] = useState<PopoverType>(null)

  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [textColor, setTextColor] = useState('#0f172a')
  const [highlightColor, setHighlightColor] = useState('#fef08a')

  const normalizedValue = useMemo(
    () =>
      stripDisallowedMedia(normalizeRichTextInput(value), {
        allowImages,
        allowVideo,
      }),
    [allowImages, allowVideo, value]
  )
  const contentState = useMemo(
    () => getRichTextContentState(normalizedValue),
    [normalizedValue]
  )
  const isEmpty = useMemo(
    () =>
      contentState.plainText.length === 0 &&
      (!allowImages || !contentState.hasImage) &&
      (!allowVideo || !contentState.hasVideo),
    [allowImages, allowVideo, contentState]
  )

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML !== normalizedValue) {
      editor.innerHTML = normalizedValue
    }
  }, [normalizedValue])

  const syncValueFromEditor = () => {
    const editor = editorRef.current
    if (!editor) return

    const nextValue = stripDisallowedMedia(
      editor.innerHTML
        .replace(/<(div|p)><br><\/\1>/gi, '')
        .replace(/^(<br\s*\/?>)+$/gi, '')
        .trim(),
      {
        allowImages,
        allowVideo,
      }
    )

    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue
    }

    onChange(nextValue)
  }

  const updateToolbarContext = (range?: Range | null) => {
    const editor = editorRef.current
    if (!editor || !range) return

    const baseNode = range.startContainer
    const element =
      baseNode.nodeType === Node.ELEMENT_NODE
        ? (baseNode as Element)
        : baseNode.parentElement

    if (!element || !editor.contains(element)) return

    const blockElement = element.closest('h1,h2,h3,h4,h5,h6,blockquote,p,div')
    setBlockType(getBlockTypeFromElement(blockElement))
  }

  const saveSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return

    selectionRef.current = range.cloneRange()
    updateToolbarContext(range)
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (!selection || !selectionRef.current) return false

    try {
      selection.removeAllRanges()
      selection.addRange(selectionRef.current)
      return true
    } catch {
      return false
    }
  }

  const placeCaretAtEnd = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection) return

    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
    selectionRef.current = range.cloneRange()
  }

  const focusEditorWithSelection = () => {
    const editor = editorRef.current
    if (!editor) return false

    editor.focus()
    if (!restoreSelection()) {
      placeCaretAtEnd()
    }

    return true
  }

  const insertHtmlAtSelection = (html: string) => {
    const editor = editorRef.current
    if (!editor || !html) return
    if (!focusEditorWithSelection()) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    const fragment = range.createContextualFragment(html)
    const lastNode = fragment.lastChild
    range.insertNode(fragment)

    if (lastNode) {
      range.setStartAfter(lastNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    saveSelection()
    syncValueFromEditor()
  }

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current
    if (!editor) return
    if (!focusEditorWithSelection()) return

    document.execCommand(command, false, commandValue)
    saveSelection()
    syncValueFromEditor()
  }

  const runCssCommand = (command: string, commandValue: string) => {
    if (!focusEditorWithSelection()) return

    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, commandValue)
    saveSelection()
    syncValueFromEditor()
  }

  const getStoredSelectionText = () => selectionRef.current?.toString().trim() || ''

  const getSelectedAnchorHref = () => {
    const editor = editorRef.current
    const range = selectionRef.current
    if (!editor || !range) return ''

    const baseNode = range.startContainer
    const element =
      baseNode.nodeType === Node.ELEMENT_NODE
        ? (baseNode as Element)
        : baseNode.parentElement

    const anchor = element?.closest('a')
    if (!anchor || !editor.contains(anchor)) return ''
    return anchor.getAttribute('href') || ''
  }

  const setPopoverState = (popover: Exclude<PopoverType, null>, open: boolean) => {
    if (open) {
      saveSelection()

      if (popover === 'link') {
        const selectedText = getStoredSelectionText()
        const selectedHref = getSelectedAnchorHref()
        setLinkText(selectedText)
        setLinkUrl(selectedHref)
      }

      setActivePopover(popover)
      return
    }

    setActivePopover((current) => (current === popover ? null : current))
  }

  const closePopover = () => setActivePopover(null)

  const applyBlockType = (nextValue: BlockType) => {
    const option = BLOCK_OPTIONS.find((item) => item.value === nextValue)
    setBlockType(nextValue)
    if (!option) return
    runCommand('formatBlock', option.commandValue)
  }

  const insertLink = () => {
    const safeUrl = normalizeUrl(linkUrl)
    if (!safeUrl) return

    const selectedText = getStoredSelectionText()
    const finalText = String(linkText || selectedText || safeUrl).trim()
    if (!finalText) return

    insertHtmlAtSelection(
      `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        finalText
      )}</a>`
    )

    setLinkText('')
    setLinkUrl('')
    closePopover()
  }

  const unlinkSelection = () => {
    runCommand('unlink')
    setLinkText('')
    setLinkUrl('')
    closePopover()
  }

  const insertImage = () => {
    const safeUrl = normalizeUrl(imageUrl)
    if (!safeUrl) return

    insertHtmlAtSelection(
      `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(
        imageAlt || 'Inserted image'
      )}" loading="lazy" />`
    )

    setImageUrl('')
    setImageAlt('')
    closePopover()
  }

  const insertVideo = () => {
    const videoHtml = buildVideoEmbedHtml(videoUrl)
    if (!videoHtml) return

    insertHtmlAtSelection(videoHtml)
    setVideoUrl('')
    closePopover()
  }

  return (
    <div className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
      <div className='flex flex-wrap items-center gap-2 border-b border-border px-3 py-3'>
        <select
          value={blockType}
          onMouseDown={saveSelection}
          onChange={(event) => applyBlockType(event.target.value as BlockType)}
          className='h-9 min-w-[165px] rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
          aria-label='Text style'
        >
          {BLOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className={dividerClass} />

        {FORMAT_BUTTONS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type='button'
              className={iconButtonClass}
              onMouseDown={(event) => {
                event.preventDefault()
                saveSelection()
              }}
              onClick={() => runCommand(item.command, item.commandValue)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className='h-4 w-4' />
            </button>
          )
        })}

        <div className={dividerClass} />

        <Popover
          open={activePopover === 'color'}
          onOpenChange={(open) => setPopoverState('color', open)}
        >
          <PopoverTrigger asChild>
            <button
              type='button'
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault()
                saveSelection()
              }}
            >
              <Palette className='h-4 w-4' />
              Colors
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className='w-[320px] space-y-4 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Text Styling</div>
                <p className='text-xs text-muted-foreground'>
                  Apply text color or highlight to the selected content.
                </p>
              </div>
              <button
                type='button'
                className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground'
                onClick={closePopover}
                aria-label='Close color tools'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <label className='space-y-2'>
                <span className='text-xs font-medium text-muted-foreground'>Text color</span>
                <div className='flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2'>
                  <input
                    type='color'
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    className='h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0'
                  />
                  <Input
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    className='h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0'
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => runCssCommand('foreColor', textColor)}
                >
                  Apply Text Color
                </Button>
              </label>

              <label className='space-y-2'>
                <span className='text-xs font-medium text-muted-foreground'>Highlight</span>
                <div className='flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2'>
                  <input
                    type='color'
                    value={highlightColor}
                    onChange={(event) => setHighlightColor(event.target.value)}
                    className='h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0'
                  />
                  <Input
                    value={highlightColor}
                    onChange={(event) => setHighlightColor(event.target.value)}
                    className='h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0'
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => runCssCommand('hiliteColor', highlightColor)}
                >
                  Apply Highlight
                </Button>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        <Popover
          open={activePopover === 'link'}
          onOpenChange={(open) => setPopoverState('link', open)}
        >
          <PopoverTrigger asChild>
            <button
              type='button'
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault()
                saveSelection()
              }}
            >
              <Link2 className='h-4 w-4' />
              Link
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className='w-[360px] space-y-4 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Insert Hyperlink</div>
                <p className='text-xs text-muted-foreground'>
                  Select text in the editor, then add the destination URL here.
                </p>
              </div>
              <button
                type='button'
                className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground'
                onClick={closePopover}
                aria-label='Close hyperlink tools'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='space-y-3'>
              <div className='space-y-2'>
                <label className='text-xs font-medium text-muted-foreground'>Link text</label>
                <Input
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  placeholder='Use selected text or type custom label'
                  className='h-10 rounded-lg'
                />
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-medium text-muted-foreground'>URL</label>
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder='https://example.com'
                  className='h-10 rounded-lg'
                />
              </div>
            </div>

            <div className='flex flex-wrap items-center justify-end gap-2'>
              <Button type='button' variant='outline' onClick={unlinkSelection}>
                Remove Link
              </Button>
              <Button
                type='button'
                className='bg-cyan-600 text-white hover:bg-cyan-700'
                onClick={insertLink}
                disabled={!linkUrl.trim()}
              >
                Apply Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {allowImages ? (
          <Popover
            open={activePopover === 'image'}
            onOpenChange={(open) => setPopoverState('image', open)}
          >
            <PopoverTrigger asChild>
              <button
                type='button'
                className={toolbarButtonClass}
                onMouseDown={(event) => {
                  event.preventDefault()
                  saveSelection()
                }}
              >
                <ImagePlus className='h-4 w-4' />
                Image
              </button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-[360px] space-y-4 p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Insert Image</div>
                  <p className='text-xs text-muted-foreground'>
                    Add an image by URL. It will render in the same content block.
                  </p>
                </div>
                <button
                  type='button'
                  className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground'
                  onClick={closePopover}
                  aria-label='Close image tools'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              <div className='space-y-3'>
                <div className='space-y-2'>
                  <label className='text-xs font-medium text-muted-foreground'>Image URL</label>
                  <Input
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder='https://example.com/image.jpg'
                    className='h-10 rounded-lg'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-xs font-medium text-muted-foreground'>Alt text</label>
                  <Input
                    value={imageAlt}
                    onChange={(event) => setImageAlt(event.target.value)}
                    placeholder='Describe the image'
                    className='h-10 rounded-lg'
                  />
                </div>
              </div>

              <div className='flex justify-end'>
                <Button
                  type='button'
                  className='bg-cyan-600 text-white hover:bg-cyan-700'
                  onClick={insertImage}
                  disabled={!imageUrl.trim()}
                >
                  Insert Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {allowVideo ? (
          <Popover
            open={activePopover === 'video'}
            onOpenChange={(open) => setPopoverState('video', open)}
          >
            <PopoverTrigger asChild>
              <button
                type='button'
                className={toolbarButtonClass}
                onMouseDown={(event) => {
                  event.preventDefault()
                  saveSelection()
                }}
              >
                <Video className='h-4 w-4' />
                Video
              </button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-[360px] space-y-4 p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Insert Video</div>
                  <p className='text-xs text-muted-foreground'>
                    Supports YouTube, Vimeo, or direct `.mp4`, `.webm`, `.ogg` URLs.
                  </p>
                </div>
                <button
                  type='button'
                  className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground'
                  onClick={closePopover}
                  aria-label='Close video tools'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              <div className='space-y-2'>
                <label className='text-xs font-medium text-muted-foreground'>Video URL</label>
                <Input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder='https://youtube.com/watch?v=...'
                  className='h-10 rounded-lg'
                />
              </div>

              <div className='flex justify-end'>
                <Button
                  type='button'
                  className='bg-cyan-600 text-white hover:bg-cyan-700'
                  onClick={insertVideo}
                  disabled={!videoUrl.trim()}
                >
                  Insert Video
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className='relative'>
        {!isFocused && isEmpty ? (
          <div className='pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground'>
            {placeholder}
          </div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValueFromEditor}
          onBlur={() => {
            setIsFocused(false)
            syncValueFromEditor()
          }}
          onFocus={() => setIsFocused(true)}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className={cn(
            'w-full px-4 py-4 text-sm text-foreground outline-none',
            minHeight,
            '[&_a]:font-medium [&_a]:text-cyan-700 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-500/30 [&_blockquote]:my-3 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-lg [&_h4]:font-semibold [&_h5]:mb-2 [&_h5]:mt-3 [&_h5]:text-base [&_h5]:font-semibold [&_h6]:mb-2 [&_h6]:mt-3 [&_h6]:text-sm [&_h6]:font-semibold [&_iframe]:my-4 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:my-4 [&_img]:max-h-[440px] [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-border/60 [&_li]:ml-5 [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0 [&_s]:line-through [&_ul]:mb-3 [&_ul]:list-disc [&_video]:my-4 [&_video]:w-full [&_video]:rounded-xl'
          )}
        />
      </div>
    </div>
  )
}
