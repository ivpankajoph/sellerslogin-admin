export const appendMarkdownHyperlink = (currentValue: string, markdownLink: string) => {
  const current = String(currentValue || '')
  const nextLink = String(markdownLink || '').trim()
  if (!nextLink) return current

  if (!current.trim()) return nextLink
  const separator = /[\s\n]$/.test(current) ? '' : ' '
  return `${current}${separator}${nextLink}`
}
