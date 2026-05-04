const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const PREVIEW_CITY_STORAGE_KEY = 'template_preview_city_slug'
const normalizePathIdentifier = (value?: string) => String(value || '').trim().replace(/^\/+|\/+$/g, '')
const isLocalhostOrigin = (value: string) =>
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value)

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

const readStoredTemplatePreviewCity = () => {
  if (typeof window === 'undefined') return ''
  try {
    const rawValue = window.localStorage.getItem(PREVIEW_CITY_STORAGE_KEY)
    return rawValue ? normalizeCitySlug(rawValue) : ''
  } catch {
    return ''
  }
}

export const peekStoredTemplatePreviewCity = () =>
  readStoredTemplatePreviewCity()

export const resolvePreviewCityFromVendorProfile = (
  vendorProfile?: Record<string, unknown> | null,
  fallbackCitySlug?: string
): PreviewCitySelection => {
  const profile =
    vendorProfile && typeof vendorProfile === 'object' ? vendorProfile : {}
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
  const storedSlug = readStoredTemplatePreviewCity()

  const resolvedSlug = normalizeCitySlug(
    rawSlug || rawName || fallbackCitySlug || storedSlug || 'all'
  )
  const resolvedLabel =
    rawName ||
    (storedSlug === resolvedSlug
      ? toCityLabel(storedSlug)
      : toCityLabel(resolvedSlug))

  return {
    slug: resolvedSlug,
    label: resolvedLabel,
  }
}

const resolveStorefrontBaseUrl = () => {
  const explicitUrl = trimTrailingSlash(
    String(import.meta.env.VITE_PUBLIC_STOREFRONT_URL || '').trim()
  )
  const legacyUrl = trimTrailingSlash(
    String(import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND || '').trim()
  )
  const candidateUrl = explicitUrl || legacyUrl

  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    candidateUrl
  ) {
    try {
      const candidateOrigin = new URL(candidateUrl).origin
      if (candidateOrigin === window.location.origin && isLocalhostOrigin(candidateOrigin)) {
        return 'http://localhost:3001'
      }
    } catch {
      // Fall through to the configured value below.
    }
  }

  return candidateUrl
}

export const STOREFRONT_URL = resolveStorefrontBaseUrl()

export const getStoredTemplatePreviewCity = () => {
  return readStoredTemplatePreviewCity() || 'all'
}

export const setStoredTemplatePreviewCity = (citySlug: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PREVIEW_CITY_STORAGE_KEY,
      normalizeCitySlug(citySlug)
    )
  } catch {
    // ignore localStorage failures
  }
}

export const getVendorTemplateBaseUrl = (vendorId?: string) => {
  const normalizedVendorId = normalizePathIdentifier(vendorId)
  if (!normalizedVendorId || !STOREFRONT_URL) return undefined
  return `${STOREFRONT_URL}/template/${encodeURIComponent(normalizedVendorId)}`
}

export const getVendorTemplatePageUrl = (
  vendorId?: string,
  citySlug?: string,
  templateKey?: string,
  websiteId?: string
) => {
  const base = getVendorTemplateBaseUrl(vendorId)
  if (!base) return undefined

  const finalCity = normalizeCitySlug(
    citySlug || getStoredTemplatePreviewCity()
  )
  const cityPath =
    finalCity && finalCity !== 'all' ? `/${encodeURIComponent(finalCity)}` : ''
  const normalizedWebsiteId = normalizePathIdentifier(websiteId)
  const websitePath = normalizedWebsiteId
    ? `/website/${encodeURIComponent(normalizedWebsiteId)}`
    : ''

  if (templateKey) {
    return `${base}/preview/${encodeURIComponent(templateKey)}${cityPath}${websitePath}`
  }

  return `${base}${cityPath}${websitePath}`
}

export const getVendorTemplatePreviewUrl = (
  vendorId?: string,
  templateKey?: string,
  citySlug?: string,
  websiteId?: string
) => {
  return getVendorTemplatePageUrl(vendorId, citySlug, templateKey, websiteId)
}

export const getVendorTemplateProductUrl = (
  vendorId?: string,
  productId?: string,
  citySlug?: string,
  websiteId?: string,
  templateKey?: string
) => {
  const base = getVendorTemplatePageUrl(
    vendorId,
    citySlug,
    templateKey,
    websiteId
  )
  const normalizedProductId = normalizePathIdentifier(productId)
  if (!base || !normalizedProductId) return undefined
  return `${base}/product/${encodeURIComponent(normalizedProductId)}`
}
