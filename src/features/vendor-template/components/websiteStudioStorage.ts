export const WEBSITE_QUERY_PARAM = 'website'

const buildActiveWebsiteStorageKey = (vendorId?: string) =>
  `vendor_template_active_website_${vendorId || 'default'}`

export const getStoredActiveWebsiteId = (vendorId?: string) => {
  if (typeof window === 'undefined') return undefined
  try {
    const value = window.sessionStorage.getItem(buildActiveWebsiteStorageKey(vendorId))
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

export const setStoredActiveWebsiteId = (
  vendorId: string | undefined,
  websiteId?: string
) => {
  if (typeof window === 'undefined') return
  const storageKey = buildActiveWebsiteStorageKey(vendorId)

  try {
    if (!websiteId || !websiteId.trim()) {
      window.sessionStorage.removeItem(storageKey)
      return
    }
    window.sessionStorage.setItem(storageKey, websiteId.trim())
  } catch {
    return
  }
}
