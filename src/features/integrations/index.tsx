import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  CircleOff,
  CreditCard,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Mail,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import api from '@/lib/axios'
import {
  applyBrevoStatus,
  getInstalledProviderIds,
  INTEGRATION_PROVIDER_IDS,
  INTEGRATION_PROVIDER_META,
  parseVendorIntegrations,
  type IntegrationCategory,
  type IntegrationProviderId,
  type VendorIntegrationsResponse,
} from '@/lib/vendor-integrations'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'

type ProviderId = IntegrationProviderId
type ProviderCategory = IntegrationCategory
type IntegrationsResponse = VendorIntegrationsResponse

const providerMeta = INTEGRATION_PROVIDER_META
const providerOrder = INTEGRATION_PROVIDER_IDS

const providerAccentClass: Record<ProviderId, string> = {
  razorpay: 'border-violet-200 bg-violet-50',
  cashfree: 'border-indigo-200 bg-indigo-50',
  cod: 'border-amber-200 bg-amber-50',
  borzo: 'border-emerald-200 bg-emerald-50',
  delhivery: 'border-cyan-200 bg-cyan-50',
  nimbuspost: 'border-blue-200 bg-blue-50',
  google_merchant: 'border-blue-200 bg-blue-50',
  brevo: 'border-emerald-200 bg-emerald-50',
}

const toReadableTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'Never'

const isSecretField = (key: string) =>
  key.includes('secret') || key.includes('token') || key.includes('auth')

const statusBadgeClass = (connected?: boolean) =>
  connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-700'

const categoryBadgeClass = (category: ProviderCategory) =>
  category === 'payment'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : category === 'delivery'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-sky-200 bg-sky-50 text-sky-700'

function ProviderArtwork({
  providerId,
  className,
  imageClassName,
}: {
  providerId: ProviderId
  className?: string
  imageClassName?: string
}) {
  const meta = providerMeta[providerId]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden border shadow-sm',
        providerAccentClass[providerId],
        className,
      )}
    >
      <img
        src={meta.imageSrc}
        alt={`${meta.title} logo`}
        className={cn('h-full w-full object-contain', imageClassName)}
        loading='lazy'
      />
    </span>
  )
}

function getConnectPath(role: string | undefined, vendorId: string | null) {
  if (role === 'admin') {
    return vendorId ? `/integrations/${vendorId}` : null
  }
  return '/integrations'
}

function getActionPath(role: string | undefined, vendorId: string | null, suffix = '') {
  if (role === 'admin') {
    if (!vendorId) return null
    return `/integrations/${vendorId}${suffix}`
  }
  return `/integrations${suffix}`
}

type GoogleMerchantAccount = {
  account_id: string
  name: string
  account_name: string
  homepage: string
  adult_content: boolean
}

const parseGoogleMerchantAccounts = (value?: string) => {
  if (!value) return [] as GoogleMerchantAccount[]

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return [] as GoogleMerchantAccount[]
    return parsed
      .map((account) => ({
        account_id: String(account?.account_id || '').trim(),
        name: String(account?.name || '').trim(),
        account_name: String(account?.account_name || '').trim(),
        homepage: String(account?.homepage || '').trim(),
        adult_content: Boolean(account?.adult_content),
      }))
      .filter((account) => account.account_id)
  } catch {
    return [] as GoogleMerchantAccount[]
  }
}

export default function IntegrationsPage({
  focusProvider,
}: {
  focusProvider?: ProviderId
}) {
  const { refresh: refreshVendorIntegrations } = useVendorIntegrations()
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const effectiveRole = role === 'superadmin' ? 'admin' : role
  const [loading, setLoading] = useState(true)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null)
  const [data, setData] = useState<IntegrationsResponse | null>(null)
  const [drafts, setDrafts] = useState<Record<ProviderId, Record<string, string>>>({
    razorpay: {},
    cashfree: {},
    cod: {},
    borzo: {},
    delhivery: {},
    nimbuspost: {},
    google_merchant: {},
    brevo: {},
  })
  const [providerEnabled, setProviderEnabled] = useState<Record<ProviderId, boolean>>({
    razorpay: false,
    cashfree: false,
    cod: true,
    borzo: false,
    delhivery: false,
    nimbuspost: false,
    google_merchant: false,
    brevo: false,
  })
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({})
  const [defaultPayment, setDefaultPayment] = useState<'cod' | 'razorpay' | 'cashfree'>('cod')
  const [defaultDelivery, setDefaultDelivery] = useState<
    'none' | 'borzo' | 'delhivery' | 'nimbuspost'
  >('none')
  const [filter, setFilter] = useState<'all' | ProviderCategory>(
    focusProvider ? providerMeta[focusProvider].category : 'all',
  )

  const installedProviderIds = useMemo(() => getInstalledProviderIds(data), [data])
  const visibleProviderOrder = useMemo(
    () =>
      effectiveRole === 'vendor'
        ? providerOrder
        : providerOrder.filter((providerId) => providerId !== 'brevo'),
    [effectiveRole],
  )

  const targetProviderIds = useMemo(() => {
    if (focusProvider) {
      return providerMeta[focusProvider] ? [focusProvider] : []
    }

    return visibleProviderOrder.filter((providerId) => {
      if (filter === 'all') return true
      return providerMeta[providerId].category === filter
    })
  }, [filter, focusProvider, visibleProviderOrder])

  const focusedCategory = focusProvider ? providerMeta[focusProvider].category : null

  useEffect(() => {
    setFilter(focusProvider ? providerMeta[focusProvider].category : 'all')
  }, [focusProvider])

  const loadIntegrations = async (vendorIdOverride?: string | null) => {
    const vendorId = vendorIdOverride ?? resolvedVendorId
    const path = getConnectPath(effectiveRole, vendorId)
    if (!path) {
      setLoading(false)
      return null
    }
    try {
      setLoading(true)
      const [response, brevoResponse] = await Promise.all([
        api.get(path),
        effectiveRole === 'vendor' ? api.get('/vendor/brevo/status').catch(() => null) : Promise.resolve(null),
      ])
      const parsed = parseVendorIntegrations(response?.data?.data)
      const payload = applyBrevoStatus(parsed, brevoResponse?.data?.data)
      if (!payload) {
        throw new Error('No integration data received')
      }
      setData(payload)
      setDefaultPayment(payload.defaults.payment)
      setDefaultDelivery(payload.defaults.delivery)
      setProviderEnabled({
        razorpay: payload.providers.razorpay.enabled,
        cashfree: payload.providers.cashfree.enabled,
        cod: payload.providers.cod.enabled,
        borzo: payload.providers.borzo.enabled,
        delhivery: payload.providers.delhivery.enabled,
        nimbuspost: payload.providers.nimbuspost.enabled,
        google_merchant: payload.providers.google_merchant.enabled,
        brevo: payload.providers.brevo.enabled,
      })

      const nextDrafts: Record<ProviderId, Record<string, string>> = {
        razorpay: {},
        cashfree: {},
        cod: {},
        borzo: {},
        delhivery: {},
        nimbuspost: {},
        google_merchant: {},
        brevo: {},
      }

      providerOrder.forEach((providerId) => {
        const provider = payload.providers[providerId]
        const fields = providerMeta[providerId].fields
        fields.forEach((field) => {
          if (isSecretField(field.key)) {
            nextDrafts[providerId][field.key] = ''
          } else {
            nextDrafts[providerId][field.key] = provider.config?.[field.key] || ''
          }
        })
      })
      nextDrafts.google_merchant.selected_account_id =
        payload.providers.google_merchant.config?.selected_account_id || ''
      setDrafts(nextDrafts)
      return payload
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load toolkit apps')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (effectiveRole === 'admin') {
      setLoading(false)
      return
    }
    void loadIntegrations(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const oauthState = url.searchParams.get('google_merchant_oauth')
    const oauthMessage = url.searchParams.get('google_merchant_message')

    if (!oauthState) return

    if (oauthState === 'success') {
      toast.success('Google Merchant connected. Select the Merchant Center account you want to use.')
      void loadIntegrations()
      void syncVendorToolkitContext()
    } else {
      toast.error(oauthMessage || 'Google Merchant OAuth failed')
      void loadIntegrations()
    }

    url.searchParams.delete('google_merchant_oauth')
    url.searchParams.delete('google_merchant_message')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setBusy = (key: string, value: boolean) =>
    setBusyMap((prev) => ({ ...prev, [key]: value }))

  const syncVendorToolkitContext = async () => {
    if (effectiveRole !== 'vendor') return
    await refreshVendorIntegrations()
  }

  const saveDefaults = async (overrides?: {
    payment?: 'cod' | 'razorpay' | 'cashfree'
    delivery?: 'none' | 'borzo' | 'delhivery' | 'nimbuspost'
  }) => {
    const path = getActionPath(effectiveRole, resolvedVendorId, '/defaults')
    if (!path) {
      toast.error('Select a vendor first')
      return
    }
    const paymentProvider = overrides?.payment || defaultPayment
    const deliveryProvider = overrides?.delivery || defaultDelivery
    try {
      setSavingDefaults(true)
      await api.put(path, {
        payment_default_provider: paymentProvider,
        delivery_default_provider: deliveryProvider,
      })
      toast.success('Toolkit defaults updated')
      await loadIntegrations()
      await syncVendorToolkitContext()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to save defaults. Connect and enable the selected app first.',
      )
    } finally {
      setSavingDefaults(false)
    }
  }

  const handleProviderDraftChange = (provider: ProviderId, key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [key]: value,
      },
    }))
  }

  const validateProviderBeforeSubmit = (provider: ProviderId) => {
    if (provider !== 'google_merchant') return true

    const providerState = data?.providers?.google_merchant
    const oauthConnected = providerState?.config?.oauth_connected === 'true'
    const connectedAccounts = parseGoogleMerchantAccounts(
      providerState?.config?.connected_accounts_json,
    )
    const selectedAccountId = String(drafts.google_merchant?.selected_account_id || '').trim()

    if (!oauthConnected) {
      toast.error('Connect Google Merchant with OAuth first.')
      return false
    }

    if (!connectedAccounts.length) {
      toast.error('This Google login does not have access to any Merchant Center accounts.')
      return false
    }

    if (connectedAccounts.length > 1 && !selectedAccountId) {
      toast.error('Select which Merchant Center account this vendor should use.')
      return false
    }

    return true
  }

  const startGoogleMerchantOauth = async () => {
    if (effectiveRole !== 'vendor') {
      toast.error('Google Merchant OAuth connect is only available for the vendor owner.')
      return
    }

    const busyKey = 'oauth-google_merchant'

    try {
      setBusy(busyKey, true)
      const returnTo =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}${window.location.pathname}`
      const response = await api.get('/integrations/google-merchant/oauth/start', {
        params: returnTo ? { return_to: returnTo } : undefined,
      })
      const authUrl = response?.data?.data?.auth_url

      if (!authUrl) {
        throw new Error('Missing Google OAuth redirect URL')
      }

      window.location.href = authUrl
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to start Google Merchant OAuth')
    } finally {
      setBusy(busyKey, false)
    }
  }

  const saveProvider = async (provider: ProviderId) => {
    const path = getActionPath(effectiveRole, resolvedVendorId, `/${provider}`)
    if (!path) {
      toast.error('Select a vendor first')
      return
    }
    if (provider === 'google_merchant' && data?.providers?.google_merchant?.config?.oauth_connected !== 'true') {
      await startGoogleMerchantOauth()
      return
    }
    if (!validateProviderBeforeSubmit(provider)) {
      return
    }
    const busyKey = `save-${provider}`
    try {
      setBusy(busyKey, true)
      const providerFields = providerMeta[provider].fields
      const config: Record<string, string> = {}
      providerFields.forEach((field) => {
        const value = drafts[provider]?.[field.key]
        if (value && String(value).trim().length) {
          config[field.key] = value.trim()
        }
      })
      if (provider === 'google_merchant') {
        const selectedAccountId = String(drafts.google_merchant?.selected_account_id || '').trim()
        if (selectedAccountId) {
          config.selected_account_id = selectedAccountId
        }
      }

      const hasCredentialInput = Object.keys(config).length > 0
      const shouldEnable =
        provider === 'cod'
          ? providerEnabled[provider]
          : providerEnabled[provider] || hasCredentialInput

      await api.put(path, {
        enabled: shouldEnable,
        config,
      })
      const refreshed = await loadIntegrations()
      await syncVendorToolkitContext()
      const latest = refreshed?.providers?.[provider]
      if (latest?.connected) {
        toast.success(`${providerMeta[provider].title} connected and saved`)
      } else {
        toast.success(`${providerMeta[provider].title} settings saved`)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to update ${provider}`)
    } finally {
      setBusy(busyKey, false)
    }
  }

  const testProvider = async (provider: ProviderId) => {
    const path = getActionPath(effectiveRole, resolvedVendorId, `/${provider}/test`)
    if (!path) {
      toast.error('Select a vendor first')
      return
    }
    if (provider === 'google_merchant' && data?.providers?.google_merchant?.config?.oauth_connected !== 'true') {
      toast.error('Connect Google Merchant with OAuth first.')
      return
    }
    if (!validateProviderBeforeSubmit(provider)) {
      return
    }
    const busyKey = `test-${provider}`
    try {
      setBusy(busyKey, true)
      const providerFields = providerMeta[provider].fields
      const config: Record<string, string> = {}
      providerFields.forEach((field) => {
        const value = drafts[provider]?.[field.key]
        if (value && String(value).trim().length) {
          config[field.key] = value.trim()
        }
      })
      const response = await api.post(path, { config })
      toast.success(
        `${response?.data?.message || `${providerMeta[provider].title} connection test passed`}. Click save to persist.`,
      )
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Connection test failed for ${provider}`)
    } finally {
      setBusy(busyKey, false)
    }
  }

  const disconnectProvider = async (provider: ProviderId) => {
    const path = getActionPath(effectiveRole, resolvedVendorId, `/${provider}`)
    if (!path) {
      toast.error('Select a vendor first')
      return
    }
    const busyKey = `disconnect-${provider}`
    try {
      setBusy(busyKey, true)
      await api.delete(path)
      toast.success(`${providerMeta[provider].title} removed from your toolkit`)
      await loadIntegrations()
      await syncVendorToolkitContext()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to disconnect ${provider}`)
    } finally {
      setBusy(busyKey, false)
    }
  }

  const setAsDefault = async (provider: ProviderId) => {
    const providerState = data?.providers?.[provider]
    if (!providerState?.connected) {
      toast.error(
        `${providerMeta[provider].title} is not connected yet. Save credentials and enable it first.`,
      )
      return
    }

    let nextPayment = defaultPayment
    let nextDelivery = defaultDelivery
    if (providerMeta[provider].category === 'payment') {
      nextPayment = provider as 'cod' | 'razorpay' | 'cashfree'
      setDefaultPayment(nextPayment)
    } else {
      nextDelivery = provider as 'borzo' | 'delhivery' | 'nimbuspost'
      setDefaultDelivery(nextDelivery)
    }
    await saveDefaults({
      payment: nextPayment,
      delivery: nextDelivery,
    })
  }

  if (!focusProvider) {
    return (
      <div className='space-y-6 rounded-3xl bg-gradient-to-b from-slate-50 via-white to-slate-100/80 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 bg-[linear-gradient(125deg,rgba(237,246,255,0.95)_0%,rgba(248,250,252,0.96)_44%,rgba(245,243,255,0.95)_100%)] p-6 md:p-7'>
            <div className='flex flex-wrap items-start justify-between gap-6'>
              <div className='max-w-3xl space-y-3'>
                <Badge className='rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700'>
                  Sellerslogin Toolkit
                </Badge>
                <div className='space-y-2'>
                  <h1 className='flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-950'>
                    <Sparkles className='h-7 w-7 text-indigo-600' />
                    Toolkit Store
                  </h1>
                  <p className='max-w-2xl text-sm leading-6 text-slate-600 sm:text-base'>
                    Browse apps, pick one, and open its dedicated setup page when you want to connect it.
                  </p>
                </div>
              </div>

              <Button
                variant='outline'
                size='sm'
                className='border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                onClick={() => loadIntegrations()}
              >
                <RefreshCcw className='h-4 w-4' />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {effectiveRole === 'admin' && (
          <Card className='border-slate-200 bg-white shadow-sm'>
            <CardHeader>
              <CardTitle className='text-base'>Toolkit vendor scope</CardTitle>
              <CardDescription>Enter a vendor ID to manage that vendor&apos;s toolkit apps.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap items-end gap-3'>
              <div className='w-full max-w-xl space-y-2'>
                <Label>Vendor ID</Label>
                <Input
                  value={selectedVendorId}
                  onChange={(event) => setSelectedVendorId(event.target.value)}
                  placeholder='MongoDB vendor id'
                />
              </div>
              <Button
                className='bg-slate-950 text-white hover:bg-slate-800'
                onClick={async () => {
                  const id = selectedVendorId.trim()
                  if (!id) {
                    toast.error('Vendor ID is required')
                    return
                  }
                  setResolvedVendorId(id)
                  await loadIntegrations(id)
                }}
              >
                Load Vendor Toolkit
              </Button>
            </CardContent>
          </Card>
        )}

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'rounded-full border-slate-200',
              filter === 'all'
                ? 'bg-slate-950 text-white hover:bg-slate-900'
                : 'bg-white text-slate-700 hover:bg-slate-50',
            )}
            onClick={() => setFilter('all')}
          >
            <LayoutGrid className='h-4 w-4' />
            All Apps
          </Button>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'rounded-full border-amber-200',
              filter === 'payment'
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-white text-amber-700 hover:bg-amber-50',
            )}
            onClick={() => setFilter('payment')}
          >
            <CreditCard className='h-4 w-4' />
            Payment Apps
          </Button>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'rounded-full border-emerald-200',
              filter === 'delivery'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white text-emerald-700 hover:bg-emerald-50',
            )}
            onClick={() => setFilter('delivery')}
          >
            <Truck className='h-4 w-4' />
            Delivery Apps
          </Button>
          {effectiveRole === 'vendor' && (
            <Button
              variant='outline'
              size='sm'
              className={cn(
                'rounded-full border-sky-200',
                filter === 'marketing'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-white text-sky-700 hover:bg-sky-50',
              )}
              onClick={() => setFilter('marketing')}
            >
              <Mail className='h-4 w-4' />
              Marketing Apps
            </Button>
          )}
        </div>

        {loading ? (
          <Card className='border-slate-200 bg-white shadow-sm'>
            <CardContent className='flex items-center gap-2 py-10 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading toolkit apps...
            </CardContent>
          </Card>
        ) : targetProviderIds.length === 0 ? (
          <Card className='border-slate-200 bg-white shadow-sm'>
            <CardContent className='py-10 text-sm text-slate-600'>
              No apps match this view yet. Try a different filter.
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
            {targetProviderIds.map((providerId) => {
              const meta = providerMeta[providerId]
              const installed = installedProviderIds.includes(providerId)

              return (
                <Card key={providerId} className='overflow-hidden border-slate-200 bg-white shadow-sm'>
                  <CardContent className='space-y-5 p-5'>
                    <ProviderArtwork
                      providerId={providerId}
                      className='h-24 w-24 rounded-3xl p-4'
                      imageClassName='max-h-16 max-w-16'
                    />
                    <div className='space-y-2'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='text-xl font-semibold text-slate-950'>{meta.title}</h3>
                        <span className='text-xs font-medium uppercase tracking-[0.14em] text-slate-400'>
                          {meta.category}
                        </span>
                      </div>
                      <p className='text-sm leading-6 text-slate-600'>{meta.description}</p>
                    </div>

                    <Button
                      className='rounded-xl bg-slate-950 text-white hover:bg-slate-800'
                      asChild
                    >
                      <Link to='/integrations/$provider' params={{ provider: providerId }}>
                        {installed ? 'Open app page' : 'Connect app'}
                        <ArrowUpRight className='h-4 w-4' />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-6 rounded-3xl bg-gradient-to-b from-slate-50 via-white to-slate-100/80 p-4 md:p-6'>
      <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 bg-[linear-gradient(125deg,rgba(237,246,255,0.95)_0%,rgba(248,250,252,0.96)_44%,rgba(245,243,255,0.95)_100%)] p-6 md:p-7'>
          <div className='flex flex-wrap items-start justify-between gap-6'>
            <div className='max-w-3xl space-y-3'>
              <Badge className='rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700'>
                Sellerslogin Toolkit
              </Badge>
              <div className='space-y-2'>
                <h1 className='flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-950'>
                  <Sparkles className='h-7 w-7 text-indigo-600' />
                  {providerMeta[focusProvider].title}
                </h1>
                <p className='max-w-2xl text-sm leading-6 text-slate-600 sm:text-base'>
                  Manage API keys, toggle access, set defaults, and remove this app from your toolkit from one
                  place.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge className={categoryBadgeClass(providerMeta[focusProvider].category)}>
                  {providerMeta[focusProvider].category}
                </Badge>
                <Badge
                  className={statusBadgeClass(data?.providers?.[focusProvider]?.connected)}
                >
                  {data?.providers?.[focusProvider]?.connected ? 'Connected' : 'Not connected'}
                </Badge>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              {focusProvider && (
                <Button
                  variant='outline'
                  size='sm'
                  className='border-slate-200 bg-white hover:bg-slate-50'
                  asChild
                >
                  <Link to='/integrations'>
                    <Store className='h-4 w-4' />
                    Toolkit Store
                  </Link>
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                className='border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                onClick={() => loadIntegrations()}
              >
                <RefreshCcw className='h-4 w-4' />
                Refresh
              </Button>
            </div>
          </div>
        </div>

      </div>

      {effectiveRole === 'admin' && (
        <Card className='border-slate-200 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Toolkit vendor scope</CardTitle>
            <CardDescription>Enter a vendor ID to manage that vendor&apos;s toolkit apps.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap items-end gap-3'>
            <div className='w-full max-w-xl space-y-2'>
              <Label>Vendor ID</Label>
              <Input
                value={selectedVendorId}
                onChange={(event) => setSelectedVendorId(event.target.value)}
                placeholder='MongoDB vendor id'
              />
            </div>
            <Button
              className='bg-slate-950 text-white hover:bg-slate-800'
              onClick={async () => {
                const id = selectedVendorId.trim()
                if (!id) {
                  toast.error('Vendor ID is required')
                  return
                }
                setResolvedVendorId(id)
                await loadIntegrations(id)
              }}
            >
              Load Vendor Toolkit
            </Button>
          </CardContent>
        </Card>
      )}

      {focusedCategory !== 'marketing' && (
        <Card className='border-slate-200 bg-white shadow-sm'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-base text-slate-950'>App settings</CardTitle>
            <CardDescription>
              Add credentials, enable or disable access, test the connection, and remove the app when needed.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end'>
            <div className='space-y-2'>
              <Label>Default payment app</Label>
              <select
                value={defaultPayment}
                onChange={(event) =>
                  setDefaultPayment(event.target.value as 'cod' | 'razorpay' | 'cashfree')
                }
                className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900'
              >
                <option value='cod'>Cash on Delivery</option>
                <option value='razorpay'>Razorpay</option>
                <option value='cashfree'>Cashfree</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label>Default delivery app</Label>
              <select
                value={defaultDelivery}
                onChange={(event) =>
                  setDefaultDelivery(
                    event.target.value as 'none' | 'borzo' | 'delhivery' | 'nimbuspost'
                  )
                }
                className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900'
              >
                <option value='none'>No auto-delivery</option>
                <option value='borzo'>Borzo</option>
                <option value='delhivery'>Delhivery</option>
                <option value='nimbuspost'>NimbusPost</option>
              </select>
            </div>
            <Button
              onClick={() => saveDefaults()}
              disabled={savingDefaults}
              className='h-11 rounded-xl bg-slate-950 text-white hover:bg-slate-800'
            >
              {savingDefaults ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Saving
                </>
              ) : (
                <>
                  <ShieldCheck className='h-4 w-4' />
                  Save Defaults
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className='border-slate-200 bg-white shadow-sm'>
          <CardContent className='flex items-center gap-2 py-10 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Loading toolkit apps...
          </CardContent>
        </Card>
      ) : targetProviderIds.length === 0 ? (
        <Card className='border-slate-200 bg-white shadow-sm'>
          <CardContent className='py-10 text-sm text-slate-600'>
            No apps match this view yet. Try a different filter or connect a new app from the store.
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {targetProviderIds.map((providerId) => {
            const provider = data?.providers?.[providerId]
            const meta = providerMeta[providerId]
            const isDefault =
              meta.category === 'payment'
                ? data?.defaults.payment === providerId
                : meta.category === 'delivery'
                  ? data?.defaults.delivery === providerId
                  : false
            const saveBusy = Boolean(busyMap[`save-${providerId}`])
            const testBusy = Boolean(busyMap[`test-${providerId}`])
            const disconnectBusy = Boolean(busyMap[`disconnect-${providerId}`])
            const oauthBusy = Boolean(busyMap['oauth-google_merchant'])
            const googleMerchantAccounts =
              providerId === 'google_merchant'
                ? parseGoogleMerchantAccounts(provider?.config?.connected_accounts_json)
                : []
            const googleMerchantConnected =
              providerId === 'google_merchant' &&
              provider?.config?.oauth_connected === 'true'
            const primaryLabel =
              providerId === 'google_merchant'
                ? googleMerchantConnected
                  ? 'Save account selection'
                  : 'Connect Google Merchant'
                : provider?.connected
                  ? 'Save changes'
                  : meta.fields.length
                    ? 'Connect app'
                    : 'Enable app'

            return (
              <Card key={providerId} className='overflow-hidden border-slate-200 bg-white shadow-sm'>
                <CardHeader className='space-y-4 border-b border-slate-100 bg-slate-50/60'>
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='flex min-w-0 items-start gap-4'>
                      <ProviderArtwork
                        providerId={providerId}
                        className='h-14 w-14 shrink-0 rounded-2xl p-2.5'
                        imageClassName='max-h-8 max-w-8'
                      />
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <CardTitle className='text-lg text-slate-950'>{meta.title}</CardTitle>
                          <Badge className={categoryBadgeClass(meta.category)}>
                            {meta.category}
                          </Badge>
                          {isDefault && (
                            <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                              Default
                            </Badge>
                          )}
                        </div>
                        <CardDescription className='mt-1 text-sm text-slate-600'>
                          {meta.description}
                        </CardDescription>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge className={statusBadgeClass(provider?.connected)}>
                        {provider?.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                      {!focusProvider && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='border-slate-200 bg-white hover:bg-slate-50'
                          asChild
                        >
                          <Link to='/integrations/$provider' params={{ provider: providerId }}>
                            Open app
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className='grid gap-3 md:grid-cols-3'>
                    <div className='rounded-2xl border border-slate-200 bg-white p-3'>
                      <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                        Connected at
                      </div>
                      <div className='mt-1 text-sm font-medium text-slate-900'>
                        {toReadableTime(provider?.connected_at)}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-slate-200 bg-white p-3'>
                      <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                        Last checked
                      </div>
                      <div className='mt-1 text-sm font-medium text-slate-900'>
                        {toReadableTime(provider?.last_checked_at)}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-slate-200 bg-white p-3'>
                      <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                        Toolkit mode
                      </div>
                      <div className='mt-1 text-sm font-medium text-slate-900'>
                        {providerEnabled[providerId] ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-5 p-5'>
                  <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                    <div className='space-y-0.5'>
                      <p className='text-sm font-medium text-slate-950'>Enable {meta.title}</p>
                      <p className='text-xs text-slate-500'>
                        Turn it on to expose this app across checkout and dashboard tools.
                      </p>
                    </div>
                    <Switch
                      checked={providerEnabled[providerId]}
                      onCheckedChange={(value) =>
                        setProviderEnabled((prev) => ({ ...prev, [providerId]: value }))
                      }
                    />
                  </div>

                  {provider?.last_error ? (
                    <div className='rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>
                      {provider.last_error}
                    </div>
                  ) : null}

                  {meta.fields.length > 0 && (
                    <div className='grid gap-3 md:grid-cols-2'>
                      {meta.fields.map((field) => (
                        <div key={field.key} className='space-y-1.5'>
                          <Label>{field.label}</Label>
                          <Input
                            type={field.type || 'text'}
                            value={drafts[providerId]?.[field.key] || ''}
                            placeholder={
                              field.placeholder ||
                              (provider?.config?.[field.key]
                                ? `Saved: ${provider.config[field.key]}`
                                : '')
                            }
                            onChange={(event) =>
                              handleProviderDraftChange(providerId, field.key, event.target.value)
                            }
                            className='h-11 rounded-xl border-slate-200 bg-slate-50'
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {providerId === 'google_merchant' && (
                    <>
                      <div className='grid gap-3 md:grid-cols-3'>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                            Connected Google login
                          </div>
                          <div className='mt-1 text-sm font-medium text-slate-900'>
                            {provider?.config?.oauth_email || 'Not connected'}
                          </div>
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                            Accessible accounts
                          </div>
                          <div className='mt-1 text-sm font-medium text-slate-900'>
                            {googleMerchantAccounts.length || 0}
                          </div>
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                            Selected account
                          </div>
                          <div className='mt-1 text-sm font-medium text-slate-900'>
                            {provider?.config?.selected_account_name ||
                              provider?.config?.selected_account_id ||
                              'Not selected'}
                          </div>
                        </div>
                      </div>

                      <div className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                        <div className='space-y-1'>
                          <p className='text-sm font-medium text-slate-950'>
                            OAuth-based Merchant Center access
                          </p>
                          <p className='text-xs leading-5 text-slate-500'>
                            The vendor connects their own Google account. Sellerslogin stores the
                            OAuth tokens, lists Merchant Center accounts that Google grants access
                            to, and lets the vendor choose one account for future sync work.
                          </p>
                        </div>
                      </div>

                      {googleMerchantConnected && googleMerchantAccounts.length > 0 && (
                        <div className='space-y-1.5'>
                          <Label>Merchant Center account</Label>
                          <select
                            value={drafts.google_merchant?.selected_account_id || ''}
                            onChange={(event) =>
                              handleProviderDraftChange(
                                'google_merchant',
                                'selected_account_id',
                                event.target.value,
                              )
                            }
                            className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900'
                          >
                            {googleMerchantAccounts.length > 1 && (
                              <option value=''>Select a Merchant Center account</option>
                            )}
                            {googleMerchantAccounts.map((account) => (
                              <option key={account.account_id} value={account.account_id}>
                                {account.account_name || account.account_id}
                                {account.homepage ? ` - ${account.homepage}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      size='sm'
                      className='rounded-xl bg-slate-950 text-white hover:bg-slate-800'
                      onClick={() => saveProvider(providerId)}
                      disabled={saveBusy || oauthBusy}
                    >
                      {saveBusy || oauthBusy ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          {providerId === 'google_merchant' && !googleMerchantConnected
                            ? 'Redirecting'
                            : 'Saving'}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className='h-4 w-4' />
                          {primaryLabel}
                        </>
                      )}
                    </Button>

                    {providerId !== 'cod' && (providerId !== 'google_merchant' || googleMerchantConnected) && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='rounded-xl border-sky-200 bg-white text-sky-700 hover:bg-sky-50'
                        onClick={() => testProvider(providerId)}
                        disabled={testBusy}
                      >
                        {testBusy ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Testing
                          </>
                        ) : (
                          <>
                            <Settings2 className='h-4 w-4' />
                            Test only
                          </>
                        )}
                      </Button>
                    )}

                    {providerId === 'google_merchant' && googleMerchantConnected && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='rounded-xl border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                        onClick={() => startGoogleMerchantOauth()}
                        disabled={oauthBusy}
                      >
                        {oauthBusy ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Redirecting
                          </>
                        ) : (
                          <>
                            <RefreshCcw className='h-4 w-4' />
                            Reconnect Google
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size='sm'
                      variant='outline'
                      className='rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                      onClick={() => disconnectProvider(providerId)}
                      disabled={disconnectBusy}
                    >
                      {disconnectBusy ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Removing
                        </>
                      ) : (
                        <>
                          <CircleOff className='h-4 w-4' />
                          Remove app
                        </>
                      )}
                    </Button>

                    {meta.category !== 'marketing' && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='rounded-xl text-indigo-700 hover:bg-indigo-50'
                        onClick={() => setAsDefault(providerId)}
                      >
                        Set as default
                      </Button>
                    )}
                  </div>

                  {meta.docs && (
                    <a
                      href={meta.docs}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline'
                    >
                      Open API docs
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
