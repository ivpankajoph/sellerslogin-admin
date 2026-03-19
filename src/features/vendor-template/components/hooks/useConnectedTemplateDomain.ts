import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '@/store/slices/vendor/productSlice'

export type ConnectedTemplateDomain = {
  hostname?: string
  status?: string
  ssl_status?: string
}

type UseConnectedTemplateDomainOptions = {
  vendorId?: string
  token?: string
  activeWebsiteId?: string
  skip?: boolean
}

export function useConnectedTemplateDomain({
  vendorId,
  token,
  activeWebsiteId,
  skip = false,
}: UseConnectedTemplateDomainOptions) {
  const [connectedDomain, setConnectedDomain] =
    useState<ConnectedTemplateDomain | null>(null)

  const refreshConnectedDomain = useCallback(async () => {
    if (!vendorId || !token || !activeWebsiteId) {
      setConnectedDomain(null)
      return null
    }

    try {
      const response = await axios.get(`${BASE_URL}/v1/templates/domains`, {
        params: { website_id: activeWebsiteId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const domain = response?.data?.domain || null
      const nextValue = domain?.hostname
        ? {
            hostname: String(domain.hostname || '').trim(),
            status: String(domain.status || '').trim(),
            ssl_status: String(domain.ssl_status || '').trim(),
          }
        : null

      setConnectedDomain(nextValue)
      return nextValue
    } catch {
      return connectedDomain
    }
  }, [activeWebsiteId, connectedDomain, token, vendorId])

  useEffect(() => {
    if (!vendorId || !token || !activeWebsiteId) {
      setConnectedDomain(null)
      return
    }

    if (skip) return

    void refreshConnectedDomain()
  }, [activeWebsiteId, refreshConnectedDomain, skip, token, vendorId])

  const connectedDomainState = useMemo<
    'connected' | 'pending' | 'error' | undefined
  >(() => {
    if (connectedDomain?.status === 'active') return 'connected'
    if (connectedDomain?.status === 'error') return 'error'
    if (connectedDomain?.hostname) return 'pending'
    return undefined
  }, [connectedDomain])

  return {
    connectedDomain,
    connectedDomainState,
    refreshConnectedDomain,
  }
}
