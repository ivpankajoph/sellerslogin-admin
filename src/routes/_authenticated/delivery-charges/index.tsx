import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { LucideIcon } from 'lucide-react'
import {
  CircleDollarSign,
  LayoutTemplate,
  RefreshCcw,
  Save,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { RootState } from '@/store'

type DeliveryProvider = 'none' | 'borzo' | 'delhivery'
type AppSource = 'ophmate_frontend' | 'vendor_template_frontend'

type ProviderConfig = {
  enabled: boolean
  amount: number
}

type AppConfig = {
  default_provider: DeliveryProvider
  providers: Record<DeliveryProvider, ProviderConfig>
}

type DeliveryChargeConfig = {
  currency: string
  apps: Record<AppSource, AppConfig>
}

type DeliveryScope = {
  key?: string
  scope_type?: 'global' | 'website'
  website_id?: string
  website_name?: string
  vendor_id?: string
  is_fallback?: boolean
  fallback_label?: string
}

type WebsiteOption = {
  id: string
  label: string
}

const MAIN_WEBSITE_OPTION_ID = 'main-website'
const MAIN_WEBSITE_LABEL = 'Main Website'
const APP_SOURCES: AppSource[] = ['ophmate_frontend', 'vendor_template_frontend']
const PROVIDERS: DeliveryProvider[] = ['none', 'borzo', 'delhivery']

const APP_LABELS: Record<AppSource, string> = {
  ophmate_frontend: 'Main Website Checkout',
  vendor_template_frontend: 'Website Checkout',
}

const APP_META: Record<
  AppSource,
  {
    icon: LucideIcon
    accentClass: string
    iconClass: string
  }
> = {
  ophmate_frontend: {
    icon: Store,
    accentClass:
      'border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-sky-50 to-white',
    iconClass: 'bg-cyan-600 text-white',
  },
  vendor_template_frontend: {
    icon: LayoutTemplate,
    accentClass:
      'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-lime-50 to-white',
    iconClass: 'bg-emerald-600 text-white',
  },
}

const PROVIDER_LABELS: Record<DeliveryProvider, string> = {
  none: 'None',
  borzo: 'Borzo',
  delhivery: 'Delhivery',
}

const PROVIDER_META: Record<
  DeliveryProvider,
  {
    badgeClass: string
    hint: string
  }
> = {
  none: {
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    hint: 'No courier service, manual or self handling.',
  },
  borzo: {
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    hint: 'Fast hyperlocal delivery support.',
  },
  delhivery: {
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    hint: 'National delivery and logistics support.',
  },
}

const createDefaultProvider = (provider: DeliveryProvider): ProviderConfig => ({
  enabled: provider === 'none',
  amount: 0,
})

const createDefaultApp = (): AppConfig => ({
  default_provider: 'borzo',
  providers: {
    none: createDefaultProvider('none'),
    borzo: createDefaultProvider('borzo'),
    delhivery: createDefaultProvider('delhivery'),
  },
})

const createDefaultConfig = (): DeliveryChargeConfig => ({
  currency: 'INR',
  apps: {
    ophmate_frontend: createDefaultApp(),
    vendor_template_frontend: createDefaultApp(),
  },
})

const normalizeNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  if (!Number.isFinite(next) || next < 0) return fallback
  return Number(next.toFixed(2))
}

const isProvider = (value: unknown): value is DeliveryProvider =>
  typeof value === 'string' && PROVIDERS.includes(value as DeliveryProvider)

const normalizeConfig = (input: any): DeliveryChargeConfig => {
  const defaults = createDefaultConfig()
  const source = input || {}
  const appsSource = source.apps || {}
  const config: DeliveryChargeConfig = {
    currency: String(source.currency || defaults.currency).toUpperCase(),
    apps: {
      ophmate_frontend: createDefaultApp(),
      vendor_template_frontend: createDefaultApp(),
    },
  }

  APP_SOURCES.forEach((appSource) => {
    const appInput = appsSource?.[appSource] || source?.[appSource] || {}
    const providersInput = appInput.providers || {}
    const appDefault = defaults.apps[appSource]
    const appConfig: AppConfig = {
      default_provider: isProvider(appInput.default_provider)
        ? appInput.default_provider
        : appDefault.default_provider,
      providers: {
        none: appDefault.providers.none,
        borzo: appDefault.providers.borzo,
        delhivery: appDefault.providers.delhivery,
      },
    }

    PROVIDERS.forEach((provider) => {
      const providerInput =
        providersInput?.[provider] || appInput?.[provider] || {}
      appConfig.providers[provider] = {
        enabled:
          typeof providerInput.enabled === 'boolean'
            ? providerInput.enabled
            : appDefault.providers[provider].enabled,
        amount:
          providerInput.amount !== undefined
            ? normalizeNumber(
                providerInput.amount,
                appDefault.providers[provider].amount
              )
            : appDefault.providers[provider].amount,
      }
    })

    config.apps[appSource] = appConfig
  })

  return config
}

const getWebsiteLabel = (option?: WebsiteOption | null) =>
  String(option?.label || '').trim() || 'Website'

const getAppTitle = (
  appSource: AppSource,
  isMainWebsiteScope: boolean,
  scopeLabel: string
) => {
  if (appSource === 'ophmate_frontend') {
    return APP_LABELS[appSource]
  }
  if (isMainWebsiteScope) {
    return `${APP_LABELS[appSource]} (Default)`
  }
  return `${APP_LABELS[appSource]} - ${scopeLabel}`
}

const getAppSubtitle = (
  appSource: AppSource,
  isMainWebsiteScope: boolean,
  scopeLabel: string
) => {
  if (appSource === 'ophmate_frontend') {
    return 'Main storefront checkout delivery pricing.'
  }
  if (isMainWebsiteScope) {
    return 'Default website checkout pricing used when a website has no custom delivery charge.'
  }
  return `Selected website checkout delivery pricing for ${scopeLabel}.`
}

export const Route = createFileRoute('/_authenticated/delivery-charges/')({
  component: DeliveryChargesPage,
})

function DeliveryChargesPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const token = useSelector((state: RootState) => state.auth?.token)
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isVendor = role === 'vendor'
  const vendorId = String(user?.vendor_id || user?._id || user?.id || '')

  const [config, setConfig] = useState<DeliveryChargeConfig>(createDefaultConfig())
  const [scope, setScope] = useState<DeliveryScope | null>(null)
  const [websiteOptions, setWebsiteOptions] = useState<WebsiteOption[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('')
  const [websitesLoading, setWebsitesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false)

  const selectedWebsite = useMemo(
    () => websiteOptions.find((option) => option.id === selectedWebsiteId) || null,
    [selectedWebsiteId, websiteOptions]
  )
  const isMainWebsiteScope = selectedWebsiteId === MAIN_WEBSITE_OPTION_ID
  const visibleAppSources = useMemo(() => {
    if (isAdmin && isMainWebsiteScope) {
      return APP_SOURCES
    }
    return ['vendor_template_frontend'] as AppSource[]
  }, [isAdmin, isMainWebsiteScope])
  const hasWebsiteScopeSelected = Boolean(selectedWebsiteId)

  useEffect(() => {
    if (!isAdmin && !isVendor) {
      setWebsiteOptions([])
      setSelectedWebsiteId('')
      setWebsitesLoading(false)
      return
    }

    if (!token) {
      setWebsiteOptions([])
      setSelectedWebsiteId('')
      setWebsitesLoading(false)
      return
    }

    if (isVendor && !vendorId) {
      setWebsiteOptions([])
      setSelectedWebsiteId('')
      setWebsitesLoading(false)
      return
    }

    const fetchWebsiteOptions = async () => {
      try {
        setWebsitesLoading(true)
        const response = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
          {
            params: {
              ...(isVendor ? { vendor_id: vendorId } : {}),
              ...(isAdmin ? { include_main_website: 'true' } : {}),
            },
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          }
        )

        const nextOptions: WebsiteOption[] = Array.isArray(response.data?.data)
          ? response.data.data
              .map((website: any) => {
                const isMainWebsite = Boolean(website?.is_main_website)
                const websiteName = String(
                  (isMainWebsite ? website?.name || MAIN_WEBSITE_LABEL : '') ||
                    website?.name ||
                    website?.business_name ||
                    website?.website_slug ||
                    website?.template_name ||
                    website?.template_key ||
                    'Website'
                ).trim()
                const vendorName = String(
                  website?.vendor_name ||
                    website?.vendor_business_name ||
                    website?.vendor_email ||
                    ''
                ).trim()

                return {
                  id: String(website?._id || website?.id || '').trim(),
                  label:
                    !isMainWebsite && isAdmin && vendorName
                      ? `${websiteName} - ${vendorName}`
                      : websiteName,
                }
              })
              .filter((website: WebsiteOption) => website.id)
          : []

        const normalizedOptions =
          isAdmin && !nextOptions.some((option) => option.id === MAIN_WEBSITE_OPTION_ID)
            ? [
                { id: MAIN_WEBSITE_OPTION_ID, label: MAIN_WEBSITE_LABEL },
                ...nextOptions,
              ]
            : nextOptions

        setWebsiteOptions(normalizedOptions)
        setSelectedWebsiteId((current) => {
          if (current && normalizedOptions.some((option) => option.id === current)) {
            return current
          }

          if (isAdmin) {
            return (
              normalizedOptions.find(
                (option) => option.id === MAIN_WEBSITE_OPTION_ID
              )?.id ||
              normalizedOptions[0]?.id ||
              ''
            )
          }

          return normalizedOptions[0]?.id || ''
        })
      } catch {
        setWebsiteOptions(isAdmin ? [{ id: MAIN_WEBSITE_OPTION_ID, label: MAIN_WEBSITE_LABEL }] : [])
        setSelectedWebsiteId(isAdmin ? MAIN_WEBSITE_OPTION_ID : '')
      } finally {
        setWebsitesLoading(false)
      }
    }

    void fetchWebsiteOptions()
  }, [isAdmin, isVendor, token, vendorId])

  const fetchConfig = async () => {
    if (!hasWebsiteScopeSelected) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const params =
        selectedWebsiteId && selectedWebsiteId !== MAIN_WEBSITE_OPTION_ID
          ? { website_id: selectedWebsiteId }
          : undefined
      const res = await api.get('/delivery-charges', { params })
      setConfig(normalizeConfig(res?.data?.data))
      setScope(res?.data?.scope || null)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load delivery charges'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWebsiteId])

  const setProviderState = (
    appSource: AppSource,
    provider: DeliveryProvider,
    patch: Partial<ProviderConfig>
  ) => {
    setConfig((prev) => ({
      ...prev,
      apps: {
        ...prev.apps,
        [appSource]: {
          ...prev.apps[appSource],
          providers: {
            ...prev.apps[appSource].providers,
            [provider]: {
              ...prev.apps[appSource].providers[provider],
              ...patch,
            },
          },
        },
      },
    }))
  }

  const setAppDefaultProvider = (appSource: AppSource, provider: DeliveryProvider) => {
    setConfig((prev) => ({
      ...prev,
      apps: {
        ...prev.apps,
        [appSource]: {
          ...prev.apps[appSource],
          default_provider: provider,
        },
      },
    }))
  }

  const saveConfig = async () => {
    if (!hasWebsiteScopeSelected) {
      toast.error('Select a website first')
      return
    }

    if (isVendor && isMainWebsiteScope) {
      toast.error('Vendors can only update their website delivery charges')
      return
    }

    try {
      setSaving(true)
      setError('')
      const payload = normalizeConfig(config)
      const params =
        selectedWebsiteId && selectedWebsiteId !== MAIN_WEBSITE_OPTION_ID
          ? { website_id: selectedWebsiteId }
          : undefined
      const res = await api.put('/delivery-charges', payload, { params })
      setConfig(normalizeConfig(res?.data?.data || payload))
      setScope(res?.data?.scope || null)
      setLastUpdated(new Date())
      toast.success('Delivery charges updated')
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Failed to save delivery charges'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const totalFixedProviders = useMemo(() => {
    return visibleAppSources.reduce((acc, appSource) => {
      const providers = config.apps[appSource].providers
      return acc + PROVIDERS.filter((provider) => providers[provider].enabled).length
    }, 0)
  }, [config, visibleAppSources])

  const scopeLabel = getWebsiteLabel(selectedWebsite)
  const summaryItems = useMemo(
    () =>
      visibleAppSources.map((appSource) => {
        const app = config.apps[appSource]
        const provider = app.default_provider
        const providerConfig = app.providers[provider]
        return {
          appSource,
          title: getAppTitle(appSource, isMainWebsiteScope, scopeLabel),
          provider,
          amount: providerConfig.enabled ? providerConfig.amount : null,
        }
      }),
    [config, isMainWebsiteScope, scopeLabel, visibleAppSources]
  )

  if (!isAdmin && !isVendor) {
    return (
      <Card className='border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50'>
        <CardHeader>
          <CardTitle className='text-lg text-amber-900'>
            Delivery charges not available
          </CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-amber-800'>
          Only admin and vendor accounts can access delivery charge controls.
        </CardContent>
      </Card>
    )
  }

  if (!websitesLoading && !websiteOptions.length) {
    return (
      <Card className='border-slate-200 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-lg text-slate-900'>
            No website available
          </CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-slate-600'>
          {isVendor
            ? 'No website is linked to this vendor account yet.'
            : 'No website scope is available right now.'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6 pb-4'>
      <Card className='relative overflow-hidden border-slate-200 bg-white shadow-md'>
        <CardHeader className='relative flex flex-wrap items-start justify-between gap-4 pb-3'>
          <div>
            <div className='mb-2 flex items-center gap-2'>
              <Sparkles className='h-4 w-4 text-sky-600' />
              <Badge className='border-sky-200 bg-sky-50 text-sky-700'>
                Website Scoped Delivery Controls
              </Badge>
            </div>
            <CardTitle className='text-2xl font-bold tracking-tight text-slate-900'>
              Delivery Charges
            </CardTitle>
            <p className='mt-1 max-w-2xl text-sm text-slate-600'>
              Select a website and manage Borzo, Delhivery, or manual delivery
              pricing for its checkout flow.
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              Active scope: {scope?.website_name || scopeLabel} | Last synced:{' '}
              {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Select
              value={selectedWebsiteId}
              onValueChange={setSelectedWebsiteId}
              disabled={websitesLoading || saving}
            >
              <SelectTrigger className='h-10 min-w-[230px] border-slate-300 bg-white text-left text-slate-900'>
                <SelectValue placeholder='Select website' />
              </SelectTrigger>
              <SelectContent>
                {websiteOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void fetchConfig()}
              variant='outline'
              disabled={loading || saving || !hasWebsiteScopeSelected}
              className='border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            >
              <RefreshCcw className='mr-2 h-4 w-4' />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={saveConfig}
              disabled={loading || saving || !hasWebsiteScopeSelected}
              className='bg-slate-900 text-white shadow-lg hover:bg-slate-800'
            >
              <Save className='mr-2 h-4 w-4' />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsSummaryDialogOpen(true)}
              disabled={!hasWebsiteScopeSelected}
              className='border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            >
              Scope Summary
            </Button>
          </div>
        </CardHeader>
      </Card>

      {scope?.is_fallback && !isMainWebsiteScope && (
        <div className='rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-800 shadow-sm'>
          This website is currently using fallback charges from{' '}
          {scope.fallback_label || MAIN_WEBSITE_LABEL}. Save once to create a
          dedicated website-level configuration.
        </div>
      )}

      {error && (
        <div className='rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm text-rose-700 shadow-sm'>
          {error}
        </div>
      )}

      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Scope summary</DialogTitle>
            <DialogDescription>
              Current delivery charge summary for {scope?.website_name || scopeLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-3 md:grid-cols-3'>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>
                Currency
              </p>
              <p className='mt-1 text-xl font-bold text-slate-900'>{config.currency}</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>
                Apps Configured
              </p>
              <p className='mt-1 text-xl font-bold text-slate-900'>{visibleAppSources.length}</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>
                Fixed Providers
              </p>
              <p className='mt-1 text-xl font-bold text-slate-900'>{totalFixedProviders}</p>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-2'>
            {summaryItems.map((item) => (
              <div
                key={item.appSource}
                className='rounded-xl border border-slate-200 bg-slate-50/80 p-4'
              >
                <p className='text-xs uppercase tracking-wide text-slate-500'>
                  {item.title}
                </p>
                <p className='mt-1 text-lg font-semibold text-slate-900'>
                  {PROVIDER_LABELS[item.provider]}
                </p>
                <p className='text-sm text-slate-600'>
                  {item.amount == null
                    ? 'Dynamic provider pricing'
                    : `${config.currency} ${Number(item.amount).toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {visibleAppSources.map((appSource) => {
        const app = config.apps[appSource]
        const meta = APP_META[appSource]
        const Icon = meta.icon

        return (
          <Card
            key={appSource}
            className={`overflow-hidden border shadow-sm ${meta.accentClass}`}
          >
            <CardHeader className='flex flex-wrap items-start justify-between gap-3 border-b border-white/70 bg-white/60 backdrop-blur-sm'>
              <div className='flex items-start gap-3'>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${meta.iconClass}`}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <div>
                  <CardTitle className='text-xl text-slate-900'>
                    {getAppTitle(appSource, isMainWebsiteScope, scopeLabel)}
                  </CardTitle>
                  <p className='mt-1 text-sm text-slate-600'>
                    {getAppSubtitle(appSource, isMainWebsiteScope, scopeLabel)}
                  </p>
                </div>
              </div>

              <div className='rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm'>
                <p className='text-xs uppercase tracking-wide text-slate-500'>
                  Default Provider
                </p>
                <Select
                  value={app.default_provider}
                  onValueChange={(value) =>
                    setAppDefaultProvider(appSource, value as DeliveryProvider)
                  }
                  disabled={loading || saving}
                >
                  <SelectTrigger className='mt-2 h-9 w-[180px] bg-white'>
                    <SelectValue placeholder='Select provider' />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {PROVIDER_LABELS[provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className='grid gap-4 p-5 lg:grid-cols-3'>
              {PROVIDERS.map((provider) => {
                const providerConfig = app.providers[provider]
                const isDefault = app.default_provider === provider
                const providerMeta = PROVIDER_META[provider]

                return (
                  <div
                    key={provider}
                    className={`rounded-2xl border bg-white/85 p-4 shadow-sm ${
                      isDefault
                        ? 'border-slate-900/10 ring-2 ring-slate-900/5'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='text-base font-semibold text-slate-900'>
                            {PROVIDER_LABELS[provider]}
                          </p>
                          {isDefault && (
                            <Badge className='border-slate-200 bg-slate-900 text-white'>
                              Default
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant='outline'
                          className={`mt-2 ${providerMeta.badgeClass}`}
                        >
                          {providerConfig.enabled ? 'Fixed charge' : 'Dynamic'}
                        </Badge>
                        <p className='mt-2 text-sm text-slate-600'>
                          {providerMeta.hint}
                        </p>
                      </div>

                      <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5'>
                        <Truck className='h-4 w-4 text-slate-500' />
                        <Switch
                          checked={providerConfig.enabled}
                          onCheckedChange={(checked) =>
                            setProviderState(appSource, provider, {
                              enabled: checked,
                            })
                          }
                          disabled={loading || saving}
                        />
                      </div>
                    </div>

                    <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3'>
                      <label className='text-xs font-medium tracking-wide text-slate-500 uppercase'>
                        Fixed Amount
                      </label>
                      <div className='mt-2 flex items-center gap-2'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm'>
                          <CircleDollarSign className='h-4 w-4' />
                        </div>
                        <Input
                          type='number'
                          min='0'
                          step='0.01'
                          value={String(providerConfig.amount ?? 0)}
                          onChange={(event) =>
                            setProviderState(appSource, provider, {
                              amount: normalizeNumber(event.target.value),
                            })
                          }
                          className='h-10 bg-white'
                          disabled={loading || saving}
                        />
                      </div>
                      <p className='mt-2 text-xs text-slate-500'>
                        Applied only when fixed charge is enabled for this provider.
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
