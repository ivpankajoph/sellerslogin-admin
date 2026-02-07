const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const STOREFRONT_URL = trimTrailingSlash(
  import.meta.env.VITE_PUBLIC_STOREFRONT_URL ||
    import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND ||
    ''
)

export const getVendorTemplateBaseUrl = (vendorId?: string) => {
  if (!vendorId || !STOREFRONT_URL) return undefined
  return `${STOREFRONT_URL}/template/${vendorId}`
}
