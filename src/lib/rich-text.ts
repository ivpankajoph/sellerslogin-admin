const HTML_TAG_REGEX = /<([a-z][\w-]*)\b[^>]*>/i
const MARKDOWN_LINK_REGEX = /\[([^[\]\r\n]+)\]\((https?:\/\/[^\s)]+)\)/gi

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalizeSafeUrl = (value: string) => {
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

const markdownLinksToHtml = (value: string) =>
  String(value || '').replace(MARKDOWN_LINK_REGEX, (_, text: string, url: string) => {
    const safeUrl = normalizeSafeUrl(url)
    if (!safeUrl) return escapeHtml(text)
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
      text
    )}</a>`
  })

export const isLikelyRichTextHtml = (value: string) => HTML_TAG_REGEX.test(String(value || ''))

export const normalizeRichTextInput = (value: string) => {
  const source = String(value || '').trim()
  if (!source) return ''
  if (isLikelyRichTextHtml(source)) return source

  const escapedSource = markdownLinksToHtml(escapeHtml(source))
  const paragraphs = escapedSource
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, '<br />')}</p>`)

  return paragraphs.join('')
}

export const stripRichTextToPlainText = (value: string) =>
  String(value || '')
    .replace(MARKDOWN_LINK_REGEX, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h2|h3|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
