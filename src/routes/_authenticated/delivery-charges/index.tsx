import { createFileRoute } from '@tanstack/react-router'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const APP_SOURCES: AppSource[] = ['ophmate_frontend', 'vendor_template_frontend']
const PROVIDERS: DeliveryProvider[] = ['none', 'borzo', 'delhivery']

const APP_LABELS: Record<AppSource, string> = {
  ophmate_frontend: 'Ophmate Frontend',
  vendor_template_frontend: 'Vendor Template Frontend',
}

const APP_META: Record<
  AppSource,
  {
    icon: LucideIcon
    subtitle: string
    accentClass: string
    iconClass: string
  }
> = {
  ophmate_frontend: {
    icon: Store,
    subtitle: 'Main storefront checkout delivery pricing',
    accentClass:
      'border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-sky-50 to-white',
    iconClass: 'bg-cyan-600 text-white',
  },
  vendor_template_frontend: {
    icon: LayoutTemplate,
    subtitle: 'Template storefront delivery pricing',
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
    hint: 'No courier service, manual/self handling',
  },
  borzo: {
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    hint: 'Fast hyperlocal delivery support',
  },
  delhivery: {
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    hint: 'National delivery and logistics support',
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
      const providerInput = providersInput?.[provider] || appInput?.[provider] || {}
      appConfig.providers[provider] = {
        enabled:
          typeof providerInput.enabled === 'boolean'
            ? providerInput.enabled
            : appDefault.providers[provider].enabled,
        amount:
          providerInput.amount !== undefined
            ? normalizeNumber(providerInput.amount, appDefault.providers[provider].amount)
            : appDefault.providers[provider].amount,
      }
    })

    config.apps[appSource] = appConfig
  })

  return config
}

export const Route = createFileRoute('/_authenticated/delivery-charges/')({
  component: DeliveryChargesPage,
})

function DeliveryChargesPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isAdmin = role === 'admin'
  const [config, setConfig] = useState<DeliveryChargeConfig>(createDefaultConfig())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError('')
      const publicBaseUrl = (
        import.meta.env.VITE_PUBLIC_API_URL ||
        import.meta.env.VITE_API_URL ||
        ''
      ).replace(/\/+$/, '')
      const res = await fetch(`${publicBaseUrl}/v1/delivery-charges`)
      if (!res.ok) {
        throw new Error('Failed to load delivery charges')
      }
      const data = await res.json()
      setConfig(normalizeConfig(data?.data))
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'Failed to load delivery charges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const setProviderState = (
    appSource: AppSource,
    provider: DeliveryProvider,
    patch: Partial<ProviderConfig>,
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
    if (!isAdmin) {
      toast.error('Only admin can update delivery charges')
      return
    }
    try {
      setSaving(true)
      setError('')
      const payload = normalizeConfig(config)
      const res = await api.put('/delivery-charges', payload)
      setConfig(normalizeConfig(res?.data?.data || payload))
      setLastUpdated(new Date())
      toast.success('Delivery charges updated')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save delivery charges'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    return APP_SOURCES.map((appSource) => {
      const app = config.apps[appSource]
      const provider = app.default_provider
      const providerConfig = app.providers[provider]
      return {
        appSource,
        provider,
        amount: providerConfig.enabled ? providerConfig.amount : null,
      }
    })
  }, [config])

  const totalFixedProviders = useMemo(() => {
    return APP_SOURCES.reduce((acc, appSource) => {
      const providers = config.apps[appSource].providers
      return acc + PROVIDERS.filter((provider) => providers[provider].enabled).length
    }, 0)
  }, [config])

  return (
    <div className='space-y-6 pb-4'>
      <Card className='relative overflow-hidden border-0 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-xl shadow-cyan-200/70'>
        <div className='pointer-events-none absolute -left-12 -top-14 h-48 w-48 rounded-full bg-white/20 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-white/15 blur-3xl' />
        <CardHeader className='relative flex flex-wrap items-start justify-between gap-4 pb-3'>
          <div>
            <div className='mb-2 flex items-center gap-2'>
              <Sparkles className='h-4 w-4 text-cyan-100' />
              <Badge className='border-white/40 bg-white/20 text-white'>
                Smart Delivery Controls
              </Badge>
            </div>
            <CardTitle className='text-2xl font-bold tracking-tight'>Delivery Charges</CardTitle>
            <p className='mt-1 max-w-2xl text-sm text-cyan-50'>
              Configure app-wise shipping pricing with clear provider controls for Borzo,
              Delhivery, and fallback mode.
            </p>
            <p className='mt-1 text-xs text-cyan-100/90'>
              Last synced: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              onClick={fetchConfig}
              variant='secondary'
              disabled={loading || saving}
              className='border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25'
            >
              <RefreshCcw className='mr-2 h-4 w-4' />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={saveConfig}
              disabled={loading || saving || !isAdmin}
              className='bg-slate-900 text-white shadow-lg hover:bg-slate-800'
            >
              <Save className='mr-2 h-4 w-4' />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className='relative grid gap-3 pt-0 md:grid-cols-3'>
          <div className='rounded-xl border border-white/25 bg-white/15 p-3 backdrop-blur'>
            <p className='text-xs uppercase tracking-wide text-cyan-50/90'>Currency</p>
            <p className='mt-1 text-xl font-bold'>{config.currency}</p>
          </div>
          <div className='rounded-xl border border-white/25 bg-white/15 p-3 backdrop-blur'>
            <p className='text-xs uppercase tracking-wide text-cyan-50/90'>Apps Configured</p>
            <p className='mt-1 text-xl font-bold'>{APP_SOURCES.length}</p>
          </div>
          <div className='rounded-xl border border-white/25 bg-white/15 p-3 backdrop-blur'>
            <p className='text-xs uppercase tracking-wide text-cyan-50/90'>Fixed Providers</p>
            <p className='mt-1 text-xl font-bold'>{totalFixedProviders}</p>
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <div className='rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-800 shadow-sm'>
          Read-only mode for vendor accounts. Login as admin to update charges.
        </div>
      )}

      {error && (
        <div className='rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm text-rose-700 shadow-sm'>
          {error}
        </div>
      )}

      <Card className='border-slate-200/70 bg-white/90 shadow-md'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm text-slate-600'>
            <CircleDollarSign className='h-4 w-4 text-emerald-600' />
            Currency
          </CardTitle>
        </CardHeader>
        <CardContent className='max-w-xs'>
          <Input
            value={config.currency}
            disabled={!isAdmin}
            className='border-emerald-200 bg-emerald-50/40 font-semibold text-slate-700 focus-visible:ring-emerald-400'
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
            }
            placeholder='INR'
          />
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-2'>
        {APP_SOURCES.map((appSource) => {
          const appConfig = config.apps[appSource]
          const appMeta = APP_META[appSource]
          const AppIcon = appMeta.icon
          return (
            <Card
              key={appSource}
              className={`border shadow-lg shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${appMeta.accentClass}`}
            >
              <CardHeader className='space-y-3 pb-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <CardTitle className='flex items-center gap-2 text-base text-slate-900'>
                      <span className={`rounded-lg p-2 ${appMeta.iconClass}`}>
                        <AppIcon className='h-4 w-4' />
                      </span>
                      {APP_LABELS[appSource]}
                    </CardTitle>
                    <p className='mt-1 text-xs text-slate-600'>{appMeta.subtitle}</p>
                  </div>
                  <Badge className='bg-white/90 text-slate-700'>
                    Default: {PROVIDER_LABELS[appConfig.default_provider]}
                  </Badge>
                </div>

                <div className='max-w-sm'>
                  <label className='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Default provider
                  </label>
                  <select
                    className='h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm outline-none ring-0 transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200'
                    value={appConfig.default_provider}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setAppDefaultProvider(appSource, event.target.value as DeliveryProvider)
                    }
                  >
                    {PROVIDERS.map((provider) => (
                      <option key={provider} value={provider}>
                        {PROVIDER_LABELS[provider]}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className='space-y-3 pt-0'>
                {PROVIDERS.map((provider) => {
                  const providerConfig = appConfig.providers[provider]
                  const providerMeta = PROVIDER_META[provider]
                  return (
                    <div
                      key={provider}
                      className='grid gap-3 rounded-xl border border-white/80 bg-white/85 p-3 shadow-sm transition-all duration-200 hover:bg-white sm:grid-cols-[1fr_130px_100px]'
                    >
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm font-semibold text-slate-900'>
                            {PROVIDER_LABELS[provider]}
                          </p>
                          <Badge
                            variant='outline'
                            className={providerConfig.enabled ? providerMeta.badgeClass : ''}
                          >
                            {providerConfig.enabled ? 'Fixed' : 'Live'}
                          </Badge>
                        </div>
                        <p className='text-xs text-slate-500'>{providerMeta.hint}</p>
                        <p className='mt-1 text-xs text-slate-500'>
                          {providerConfig.enabled
                            ? `Fixed charge enabled (${config.currency})`
                            : 'Uses live rate / fallback'}
                        </p>
                      </div>
                      <Input
                        type='number'
                        min='0'
                        step='0.01'
                        disabled={!providerConfig.enabled || !isAdmin}
                        className='border-slate-200 bg-slate-50/80 text-slate-700 focus-visible:ring-cyan-300'
                        value={String(providerConfig.amount)}
                        onChange={(event) =>
                          setProviderState(appSource, provider, {
                            amount: normalizeNumber(event.target.value, 0),
                          })
                        }
                      />
                      <div className='flex items-center justify-end gap-2'>
                        <span className='text-xs text-slate-500'>Fixed</span>
                        <Switch
                          checked={providerConfig.enabled}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) =>
                            setProviderState(appSource, provider, { enabled: checked })
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className='border-slate-200/70 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 shadow-md'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm text-slate-600'>
            <Truck className='h-4 w-4 text-cyan-600' />
            Current Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2'>
          {summary.map((item) => (
            <div
              key={item.appSource}
              className='rounded-xl border border-white/80 bg-white/90 p-4 text-sm shadow-sm'
            >
              <p className='font-semibold text-slate-900'>{APP_LABELS[item.appSource]}</p>
              <p className='mt-1 text-slate-600'>
                Provider: <span className='font-semibold'>{PROVIDER_LABELS[item.provider]}</span>
              </p>
              <p className='text-slate-600'>
                Charge:{' '}
                <span className='font-semibold text-slate-900'>
                  {item.amount === null
                    ? 'Live / Not fixed'
                    : `${config.currency} ${item.amount.toFixed(2)}`}
                </span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
