import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleOff,
  CreditCard,
  ExternalLink,
  Loader2,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import api from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'

type ProviderId = 'razorpay' | 'cashfree' | 'cod' | 'borzo' | 'delhivery'
type ProviderCategory = 'payment' | 'delivery'

type ProviderState = {
  provider: ProviderId
  category: ProviderCategory
  enabled: boolean
  connected: boolean
  connected_at: string | null
  last_checked_at: string | null
  last_error: string
  config: Record<string, string>
}

type IntegrationsResponse = {
  defaults: {
    payment: 'cod' | 'razorpay' | 'cashfree'
    delivery: 'none' | 'borzo' | 'delhivery'
  }
  providers: Record<ProviderId, ProviderState>
}

type FieldConfig = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password'
}

const providerMeta: Record<
  ProviderId,
  {
    title: string
    category: ProviderCategory
    description: string
    docs?: string
    fields: FieldConfig[]
  }
> = {
  razorpay: {
    title: 'Razorpay',
    category: 'payment',
    description: 'Accept UPI, cards and netbanking payments.',
    docs: 'https://razorpay.com/docs',
    fields: [
      { key: 'key_id', label: 'Key ID', placeholder: 'rzp_live_xxxx' },
      { key: 'key_secret', label: 'Key Secret', type: 'password' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' },
    ],
  },
  cashfree: {
    title: 'Cashfree',
    category: 'payment',
    description: 'Alternative payment gateway for checkout.',
    docs: 'https://docs.cashfree.com',
    fields: [
      { key: 'app_id', label: 'App ID' },
      { key: 'secret_key', label: 'Secret Key', type: 'password' },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox / production' },
    ],
  },
  cod: {
    title: 'Cash on Delivery',
    category: 'payment',
    description: 'Allow customers to pay at delivery time.',
    fields: [],
  },
  borzo: {
    title: 'Borzo',
    category: 'delivery',
    description: 'On-demand local delivery provider.',
    docs: 'https://borzodelivery.com/in/business-api/doc',
    fields: [
      { key: 'auth_token', label: 'Auth Token', type: 'password' },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://robotapitest-in.borzodelivery.com' },
      { key: 'api_version', label: 'API Version', placeholder: '1.6' },
    ],
  },
  delhivery: {
    title: 'Delhivery',
    category: 'delivery',
    description: 'Delhivery shipping API integration.',
    docs: 'https://delhivery-express-api-doc.readme.io',
    fields: [
      { key: 'token', label: 'API Token', type: 'password' },
      {
        key: 'base_url',
        label: 'Base URL (domain only)',
        placeholder: 'https://track.delhivery.com',
      },
    ],
  },
}

const providerOrder: ProviderId[] = ['razorpay', 'cashfree', 'cod', 'borzo', 'delhivery']

const toReadableTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'Never'

const isSecretField = (key: string) =>
  key.includes('secret') || key.includes('token') || key.includes('auth')

const providerCardTheme = (category: ProviderCategory) =>
  category === 'payment'
    ? 'from-amber-50/70 via-rose-50/50 to-white'
    : 'from-cyan-50/70 via-emerald-50/40 to-white'

const statusBadgeClass = (connected?: boolean) =>
  connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-700'

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

export default function IntegrationsPage({
  focusProvider,
}: {
  focusProvider?: ProviderId
}) {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
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
  })
  const [providerEnabled, setProviderEnabled] = useState<Record<ProviderId, boolean>>({
    razorpay: false,
    cashfree: false,
    cod: true,
    borzo: false,
    delhivery: false,
  })
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({})
  const [defaultPayment, setDefaultPayment] = useState<'cod' | 'razorpay' | 'cashfree'>('cod')
  const [defaultDelivery, setDefaultDelivery] = useState<'none' | 'borzo' | 'delhivery'>('none')
  const [filter, setFilter] = useState<'all' | ProviderCategory>(
    focusProvider ? providerMeta[focusProvider].category : 'all',
  )

  const targetProviderIds = useMemo(() => {
    if (focusProvider) {
      return providerMeta[focusProvider] ? [focusProvider] : []
    }
    return providerOrder.filter((providerId) =>
      filter === 'all' ? true : providerMeta[providerId].category === filter,
    )
  }, [filter, focusProvider])

  useEffect(() => {
    setFilter(focusProvider ? providerMeta[focusProvider].category : 'all')
  }, [focusProvider])

  const connectedCount = useMemo(() => {
    if (!data) return 0
    return providerOrder.filter((providerId) => Boolean(data.providers?.[providerId]?.connected)).length
  }, [data])

  const loadIntegrations = async (vendorIdOverride?: string | null) => {
    const vendorId = vendorIdOverride ?? resolvedVendorId
    const path = getConnectPath(role, vendorId)
    if (!path) {
      setLoading(false)
      return null
    }
    try {
      setLoading(true)
      const response = await api.get(path)
      const payload: IntegrationsResponse | undefined = response?.data?.data
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
      })

      const nextDrafts: Record<ProviderId, Record<string, string>> = {
        razorpay: {},
        cashfree: {},
        cod: {},
        borzo: {},
        delhivery: {},
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
      setDrafts(nextDrafts)
      return payload
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load integrations')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'admin') {
      setLoading(false)
      return
    }
    loadIntegrations(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const setBusy = (key: string, value: boolean) =>
    setBusyMap((prev) => ({ ...prev, [key]: value }))

  const saveDefaults = async (overrides?: {
    payment?: 'cod' | 'razorpay' | 'cashfree'
    delivery?: 'none' | 'borzo' | 'delhivery'
  }) => {
    const path = getActionPath(role, resolvedVendorId, '/defaults')
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
      toast.success('Default apps updated')
      await loadIntegrations()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to save defaults. Connect and enable the selected provider first.',
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

  const saveProvider = async (provider: ProviderId) => {
    const path = getActionPath(role, resolvedVendorId, `/${provider}`)
    if (!path) {
      toast.error('Select a vendor first')
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

      // If credentials are provided, treat save as intent to connect the provider.
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
    const path = getActionPath(role, resolvedVendorId, `/${provider}/test`)
    if (!path) {
      toast.error('Select a vendor first')
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
        `${response?.data?.message || `${providerMeta[provider].title} connection test passed`}. Click Save to persist.`,
      )
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Connection test failed for ${provider}`)
    } finally {
      setBusy(busyKey, false)
    }
  }

  const disconnectProvider = async (provider: ProviderId) => {
    const path = getActionPath(role, resolvedVendorId, `/${provider}`)
    if (!path) {
      toast.error('Select a vendor first')
      return
    }
    const busyKey = `disconnect-${provider}`
    try {
      setBusy(busyKey, true)
      await api.delete(path)
      toast.success(`${providerMeta[provider].title} disconnected`)
      await loadIntegrations()
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
      nextDelivery = provider as 'borzo' | 'delhivery'
      setDefaultDelivery(nextDelivery)
    }
    await saveDefaults({
      payment: nextPayment,
      delivery: nextDelivery,
    })
  }

  return (
    <div className='space-y-6 rounded-2xl bg-gradient-to-b from-sky-50/45 via-white to-violet-50/35 p-4 md:p-6'>
      <div className='rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-100/70 via-indigo-50 to-pink-100/50 p-5 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='space-y-2'>
            <h1 className='flex items-center gap-2 text-2xl font-semibold text-slate-900'>
              <Sparkles className='h-5 w-5 text-indigo-600' />
              App Integrations
            </h1>
            <p className='text-sm text-slate-600'>
              Connect payment and delivery apps, then set your default providers for template checkout.
            </p>
            <div className='flex flex-wrap gap-2'>
              <Badge className='border-sky-200 bg-white/80 text-slate-700'>
                {connectedCount}/{providerOrder.length} Connected
              </Badge>
              <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                Default Payment: {defaultPayment.toUpperCase()}
              </Badge>
              <Badge className='border-emerald-200 bg-emerald-50 text-emerald-700'>
                Default Delivery: {defaultDelivery.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='border-indigo-200 bg-white/80 text-indigo-700 hover:bg-indigo-50'
              onClick={() => loadIntegrations()}
            >
              <RefreshCcw className='h-4 w-4' />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {role === 'admin' && (
        <Card className='border-indigo-100 bg-white/90 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Admin vendor scope</CardTitle>
            <CardDescription>Enter vendor ID to manage integrations for that vendor.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap items-end gap-3'>
            <div className='w-full max-w-xl space-y-2'>
              <Label>Vendor ID</Label>
              <Input
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                placeholder='MongoDB vendor id'
              />
            </div>
            <Button
              className='bg-indigo-600 text-white hover:bg-indigo-700'
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
              Load Vendor
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className='border-indigo-100 bg-white/90 shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-900'>Default apps</CardTitle>
          <CardDescription>
            These defaults are used for vendor template checkout experience by default.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end'>
          <div className='space-y-2'>
            <Label>Default payment app</Label>
            <select
              value={defaultPayment}
              onChange={(e) => setDefaultPayment(e.target.value as 'cod' | 'razorpay' | 'cashfree')}
              className='h-10 w-full rounded-md border border-indigo-200 bg-indigo-50/40 px-3 text-sm text-slate-900'
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
              onChange={(e) =>
                setDefaultDelivery(e.target.value as 'none' | 'borzo' | 'delhivery')
              }
              className='h-10 w-full rounded-md border border-emerald-200 bg-emerald-50/40 px-3 text-sm text-slate-900'
            >
              <option value='none'>No auto-delivery</option>
              <option value='borzo'>Borzo</option>
              <option value='delhivery'>Delhivery</option>
            </select>
          </div>
          <Button
            onClick={() => saveDefaults()}
            disabled={savingDefaults}
            className='bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
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

      {!focusProvider && (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'border-indigo-200',
              filter === 'all'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-white text-indigo-700 hover:bg-indigo-50',
            )}
            onClick={() => setFilter('all')}
          >
            All Apps
          </Button>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'border-amber-200',
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
              'border-emerald-200',
              filter === 'delivery'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white text-emerald-700 hover:bg-emerald-50',
            )}
            onClick={() => setFilter('delivery')}
          >
            <Truck className='h-4 w-4' />
            Delivery Apps
          </Button>
        </div>
      )}

      {loading ? (
        <Card className='border-indigo-100 bg-white/90 shadow-sm'>
          <CardContent className='flex items-center gap-2 py-10 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Loading integrations...
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
                : data?.defaults.delivery === providerId
            const saveBusy = Boolean(busyMap[`save-${providerId}`])
            const testBusy = Boolean(busyMap[`test-${providerId}`])
            const disconnectBusy = Boolean(busyMap[`disconnect-${providerId}`])

            return (
              <Card
                key={providerId}
                className={cn(
                  'border-0 bg-gradient-to-br shadow-sm ring-1 ring-slate-200/70',
                  providerCardTheme(meta.category),
                  provider?.connected ? 'ring-emerald-300/60' : 'ring-slate-200/70',
                )}
              >
                <CardHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <PlugZap className='h-4 w-4 text-indigo-600' />
                        {meta.title}
                      </CardTitle>
                      <CardDescription>{meta.description}</CardDescription>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge className={statusBadgeClass(provider?.connected)}>
                        {provider?.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                      {isDefault && (
                        <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>Default</Badge>
                      )}
                    </div>
                  </div>

                  {meta.docs && (
                    <a
                      href={meta.docs}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex w-fit items-center gap-1 text-xs font-medium text-indigo-600 hover:underline'
                    >
                      API docs <ExternalLink className='h-3 w-3' />
                    </a>
                  )}
                </CardHeader>

                <CardContent className='space-y-4'>
                  <div className='rounded-lg border border-slate-200/80 bg-white/80 p-3 text-xs text-slate-600 backdrop-blur'>
                    <div className='flex items-center justify-between gap-2'>
                      <span>Connected at</span>
                      <span>{toReadableTime(provider?.connected_at)}</span>
                    </div>
                    <div className='mt-2 flex items-center justify-between gap-2'>
                      <span>Last checked</span>
                      <span>{toReadableTime(provider?.last_checked_at)}</span>
                    </div>
                    {provider?.last_error ? (
                      <div className='mt-2 rounded-md border border-rose-100 bg-rose-50 p-2 text-rose-700'>
                        {provider.last_error}
                      </div>
                    ) : null}
                  </div>

                  <div className='flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/80 p-3'>
                    <div className='space-y-0.5'>
                      <p className='text-sm font-medium'>Enable {meta.title}</p>
                      <p className='text-xs text-muted-foreground'>Turn off to disable this app for checkout</p>
                    </div>
                    <Switch
                      checked={providerEnabled[providerId]}
                      onCheckedChange={(value) =>
                        setProviderEnabled((prev) => ({ ...prev, [providerId]: value }))
                      }
                    />
                  </div>

                  {meta.fields.length > 0 && (
                    <div className='grid gap-3'>
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
                            onChange={(e) =>
                              handleProviderDraftChange(providerId, field.key, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      size='sm'
                      className='bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
                      onClick={() => saveProvider(providerId)}
                      disabled={saveBusy}
                    >
                      {saveBusy ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Saving
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className='h-4 w-4' />
                          Save
                        </>
                      )}
                    </Button>

                    {providerId !== 'cod' && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50'
                        onClick={() => testProvider(providerId)}
                        disabled={testBusy}
                      >
                        {testBusy ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Testing
                          </>
                        ) : (
                          'Test Only'
                        )}
                      </Button>
                    )}

                    {providerId !== 'cod' && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                        onClick={() => disconnectProvider(providerId)}
                        disabled={disconnectBusy}
                      >
                        {disconnectBusy ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Disconnecting
                          </>
                        ) : (
                          <>
                            <CircleOff className='h-4 w-4' />
                            Disconnect
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-indigo-700 hover:bg-indigo-50'
                      onClick={() => setAsDefault(providerId)}
                    >
                      Set As Default
                    </Button>

                    {!focusProvider && (
                      <Button variant='ghost' size='sm' className='text-slate-700 hover:bg-slate-100' asChild>
                        <Link to='/integrations/$provider' params={{ provider: providerId }}>
                          Open Page
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
