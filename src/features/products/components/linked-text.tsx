import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type LinkedTextProps = {
  text?: string
  className?: string
  as?: 'div' | 'p' | 'span'
  preserveWhitespace?: boolean
}

const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi
const urlPattern = /https?:\/\/[^\s]+/gi
const linkClassName =
  'font-medium text-blue-600 underline decoration-blue-400 underline-offset-4 transition-colors hover:text-blue-700'

const stripTrailingPunctuation = (value: string) => {
  const match = value.match(/[.,!?;:]+$/)
  if (!match) {
    return { cleanValue: value, trailing: '' }
  }

  return {
    cleanValue: value.slice(0, -match[0].length),
    trailing: match[0],
  }
}

const renderPlainUrls = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  urlPattern.lastIndex = 0

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const { cleanValue, trailing } = stripTrailingPunctuation(match[0])
    nodes.push(
      <a
        key={`${keyPrefix}-${match.index}`}
        href={cleanValue}
        target='_blank'
        rel='noreferrer'
        className={linkClassName}
      >
        {cleanValue}
      </a>
    )

    if (trailing) {
      nodes.push(trailing)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

const renderLinkedContent = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  markdownLinkPattern.lastIndex = 0

  while ((match = markdownLinkPattern.exec(text)) !== null) {
    const [fullMatch, label, url] = match

    nodes.push(
      ...renderPlainUrls(text.slice(lastIndex, match.index), `plain-${match.index}`)
    )

    nodes.push(
      <a
        key={`markdown-${match.index}`}
        href={url}
        target='_blank'
        rel='noreferrer'
        className={linkClassName}
      >
        {label}
      </a>
    )

    lastIndex = match.index + fullMatch.length
  }

  nodes.push(...renderPlainUrls(text.slice(lastIndex), `tail-${lastIndex}`))

  return nodes
}

export function LinkedText({
  text = '',
  className,
  as = 'div',
  preserveWhitespace = true,
}: LinkedTextProps) {
  const Comp = as

  return (
    <Comp
      className={cn(
        preserveWhitespace && 'whitespace-pre-wrap break-words',
        className
      )}
    >
      {renderLinkedContent(text)}
    </Comp>
  )
}
