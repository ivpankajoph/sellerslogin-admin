const TEMPLATE_PARAM_KEY = 'template'

const TEMPLATE_NAME_BY_KEY: Record<string, string> = {
  classic: 'Classic Luxe',
  studio: 'Studio Bold',
  minimal: 'Minimal Market',
  trend: 'Trend Bazaar',
  mquiq: 'StorageMax Gold',
  poupqz: 'RackFlow Blue',
  oragze: 'Organic Freshmart',
  whiterose: 'White Rose',
  pocofood: 'Oph Food',
}

export const normalizeTemplateParam = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return normalized || undefined
}

export const buildTemplateQuery = (templateKey?: string) => {
  if (!templateKey) return ''
  return `?${TEMPLATE_PARAM_KEY}=${encodeURIComponent(templateKey)}`
}

export const withTemplateQuery = (path: string, templateKey?: string) => {
  if (!templateKey) return path
  return `${path}${buildTemplateQuery(templateKey)}`
}

export const getTemplateDisplayName = (templateKey?: string) => {
  if (!templateKey) return 'Unknown template'
  return TEMPLATE_NAME_BY_KEY[templateKey] || templateKey
}

const buildEditingTemplateStorageKey = (vendorId?: string) =>
  `vendor_template_editing_key_${vendorId || 'default'}`

export const getStoredEditingTemplateKey = (vendorId?: string) => {
  if (typeof window === 'undefined') return undefined
  try {
    return normalizeTemplateParam(
      window.sessionStorage.getItem(buildEditingTemplateStorageKey(vendorId))
    )
  } catch {
    return undefined
  }
}

export const setStoredEditingTemplateKey = (
  vendorId: string | undefined,
  templateKey?: string
) => {
  if (typeof window === 'undefined') return
  const storageKey = buildEditingTemplateStorageKey(vendorId)
  try {
    if (!templateKey) {
      window.sessionStorage.removeItem(storageKey)
      return
    }
    window.sessionStorage.setItem(storageKey, templateKey)
  } catch {
    return
  }
}
