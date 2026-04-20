import { useEffect, useState } from 'react'

export const WEBSITE_QUERY_PARAM = 'website'
export const ACTIVE_WEBSITE_STORAGE_EVENT =
  'vendor-template:active-website-changed'

export type StoredActiveWebsite = {
  id: string
  name?: string
  templateKey?: string
  websiteSlug?: string
}

const buildActiveWebsiteStorageKey = (vendorId?: string) =>
  `vendor_template_active_website_${vendorId || 'default'}`

const buildActiveWebsiteMetaStorageKey = (vendorId?: string) =>
  `${buildActiveWebsiteStorageKey(vendorId)}_meta`

const normalizeActiveWebsite = (
  value: Partial<StoredActiveWebsite> | null | undefined
): StoredActiveWebsite | undefined => {
  const id = String(value?.id || '').trim()
  if (!id) return undefined

  return {
    id,
    name: String(value?.name || '').trim() || undefined,
    templateKey: String(value?.templateKey || '').trim() || undefined,
    websiteSlug: String(value?.websiteSlug || '').trim() || undefined,
  }
}

const dispatchActiveWebsiteChange = (vendorId?: string) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(ACTIVE_WEBSITE_STORAGE_EVENT, {
      detail: { vendorId: vendorId || '' },
    })
  )
}

export const getStoredActiveWebsite = (vendorId?: string) => {
  if (typeof window === 'undefined') return undefined

  try {
    const raw = window.sessionStorage.getItem(
      buildActiveWebsiteMetaStorageKey(vendorId)
    )
    if (!raw) return undefined
    return normalizeActiveWebsite(JSON.parse(raw))
  } catch {
    return undefined
  }
}

const getWebsiteIdFromUrl = () => {
  if (typeof window === 'undefined') return undefined

  try {
    const value = new URL(window.location.href).searchParams.get(
      WEBSITE_QUERY_PARAM
    )
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

export const getStoredActiveWebsiteId = (vendorId?: string) => {
  if (typeof window === 'undefined') return undefined

  const urlWebsiteId = getWebsiteIdFromUrl()
  if (urlWebsiteId) return urlWebsiteId

  const website = getStoredActiveWebsite(vendorId)
  if (website?.id) return website.id

  try {
    const value = window.sessionStorage.getItem(
      buildActiveWebsiteStorageKey(vendorId)
    )
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

export const setStoredActiveWebsite = (
  vendorId: string | undefined,
  website?: Partial<StoredActiveWebsite>
) => {
  if (typeof window === 'undefined') return

  const storageKey = buildActiveWebsiteStorageKey(vendorId)
  const metaStorageKey = buildActiveWebsiteMetaStorageKey(vendorId)
  const normalizedWebsite = normalizeActiveWebsite(website)

  try {
    if (!normalizedWebsite) {
      window.sessionStorage.removeItem(storageKey)
      window.sessionStorage.removeItem(metaStorageKey)
      dispatchActiveWebsiteChange(vendorId)
      return
    }

    window.sessionStorage.setItem(storageKey, normalizedWebsite.id)
    window.sessionStorage.setItem(
      metaStorageKey,
      JSON.stringify(normalizedWebsite)
    )
    dispatchActiveWebsiteChange(vendorId)
  } catch {
    return
  }
}

export const setStoredActiveWebsiteId = (
  vendorId: string | undefined,
  websiteId?: string
) => {
  const existing = getStoredActiveWebsite(vendorId)
  const normalizedId = String(websiteId || '').trim()

  if (!normalizedId) {
    setStoredActiveWebsite(vendorId, undefined)
    return
  }

  setStoredActiveWebsite(vendorId, {
    ...existing,
    id: normalizedId,
  })
}

export const useActiveWebsiteSelection = (vendorId?: string) => {
  const [activeWebsite, setActiveWebsite] = useState<
    StoredActiveWebsite | undefined
  >(() => getStoredActiveWebsite(vendorId))
  const [activeWebsiteId, setActiveWebsiteId] = useState<string | undefined>(
    () => getStoredActiveWebsiteId(vendorId)
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sync = () => {
      setActiveWebsite(getStoredActiveWebsite(vendorId))
      setActiveWebsiteId(getStoredActiveWebsiteId(vendorId))
    }

    sync()

    window.addEventListener(ACTIVE_WEBSITE_STORAGE_EVENT, sync)
    window.addEventListener('storage', sync)
    window.addEventListener('popstate', sync)

    return () => {
      window.removeEventListener(ACTIVE_WEBSITE_STORAGE_EVENT, sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [vendorId])

  return {
    activeWebsite,
    activeWebsiteId: activeWebsiteId || '',
  }
}
