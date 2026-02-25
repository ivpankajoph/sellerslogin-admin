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

const toCityLabel = (slug: string) => {
  if (slug === 'all') return 'All Cities'
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export type PreviewCitySelection = {
  slug: string
  label: string
}

export const resolvePreviewCityFromVendorProfile = (
  vendorProfile?: Record<string, unknown> | null,
  fallbackCitySlug?: string
): PreviewCitySelection => {
  const profile = vendorProfile && typeof vendorProfile === 'object' ? vendorProfile : {}
  const rawName = String(
    (profile as Record<string, unknown>)?.default_city_name ||
      (profile as Record<string, unknown>)?.defaultCityName ||
      ''
  ).trim()
  const rawSlug = String(
    (profile as Record<string, unknown>)?.default_city_slug ||
      (profile as Record<string, unknown>)?.defaultCitySlug ||
      ''
  ).trim()

  const resolvedSlug = normalizeCitySlug(rawSlug || rawName || fallbackCitySlug || 'all')
  const resolvedLabel = rawName || toCityLabel(resolvedSlug)

  return {
    slug: resolvedSlug,
    label: resolvedLabel,
  }
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
