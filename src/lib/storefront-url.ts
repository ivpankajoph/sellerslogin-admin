const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const PREVIEW_CITY_STORAGE_KEY = 'template_preview_city_slug'

const normalizeCitySlug = (value?: string) => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'all'
}

export const STOREFRONT_URL = trimTrailingSlash(
  import.meta.env.VITE_PUBLIC_STOREFRONT_URL ||
    import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND ||
    ''
)

export const getStoredTemplatePreviewCity = () => {
  if (typeof window === 'undefined') return 'all'
  try {
    return normalizeCitySlug(window.localStorage.getItem(PREVIEW_CITY_STORAGE_KEY) || 'all')
  } catch {
    return 'all'
  }
}

export const setStoredTemplatePreviewCity = (citySlug: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREVIEW_CITY_STORAGE_KEY, normalizeCitySlug(citySlug))
  } catch {
    // ignore localStorage failures
  }
}

export const getVendorTemplateBaseUrl = (vendorId?: string) => {
  if (!vendorId || !STOREFRONT_URL) return undefined
  return `${STOREFRONT_URL}/template/${vendorId}`
}

export const getVendorTemplatePreviewUrl = (
  vendorId?: string,
  templateKey?: string,
  citySlug?: string
) => {
  const base = getVendorTemplateBaseUrl(vendorId)
  if (!base || !templateKey) return base
  const finalCity = normalizeCitySlug(citySlug || getStoredTemplatePreviewCity())
  return `${base}/preview/${encodeURIComponent(templateKey)}/${encodeURIComponent(finalCity)}`
}
