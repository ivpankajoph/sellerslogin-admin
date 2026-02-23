import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSelector } from 'react-redux'
import api from '@/lib/axios'
import {
  isProviderUsableFromData,
  parseVendorIntegrations,
  type IntegrationProviderId,
  type VendorIntegrationsResponse,
} from '@/lib/vendor-integrations'
import type { RootState } from '@/store'

type VendorIntegrationsContextValue = {
  loading: boolean
  isVendor: boolean
  data: VendorIntegrationsResponse | null
  refresh: () => Promise<void>
  isProviderVisible: (provider: IntegrationProviderId) => boolean
}

const noopAsync = async () => undefined

const VendorIntegrationsContext = createContext<VendorIntegrationsContextValue>({
  loading: false,
  isVendor: false,
  data: null,
  refresh: noopAsync,
  isProviderVisible: () => true,
})

export function VendorIntegrationsProvider({ children }: { children: ReactNode }) {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const effectiveRole = role === 'superadmin' ? 'admin' : role
  const isVendor = effectiveRole === 'vendor'
  const [loading, setLoading] = useState(isVendor)
  const [data, setData] = useState<VendorIntegrationsResponse | null>(null)

  const refresh = useCallback(async () => {
    if (!isVendor) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await api.get('/integrations')
      const parsed = parseVendorIntegrations(response?.data?.data)
      setData(parsed)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [isVendor])

  useEffect(() => {
    if (!isVendor) {
      setData(null)
      setLoading(false)
      return
    }
    void refresh()
  }, [isVendor, refresh])

  const isProviderVisible = useCallback(
    (provider: IntegrationProviderId) => {
      if (!isVendor) return true
      return isProviderUsableFromData(data, provider)
    },
    [data, isVendor],
  )

  const value = useMemo(
    () => ({
      loading,
      isVendor,
      data,
      refresh,
      isProviderVisible,
    }),
    [data, isProviderVisible, isVendor, loading, refresh],
  )

  return (
    <VendorIntegrationsContext.Provider value={value}>
      {children}
    </VendorIntegrationsContext.Provider>
  )
}

export function useVendorIntegrations() {
  return useContext(VendorIntegrationsContext)
}
