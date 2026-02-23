/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import {
  BadgeCheck,
  Building2,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  Landmark,
  Layers3,
  MapPin,
  Phone,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

type FlatField = {
  path: string
  value: unknown
}

type SectionMeta = {
  title: string
  description: string
  icon: LucideIcon
  order: number
  bar: string
  badge: string
  pill: string
  surface: string
}

const apiBaseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)
const uploadsHost = apiBaseUrl.replace(/\/api$/, '')

const SECTION_META: Record<string, SectionMeta> = {
  overview: {
    title: 'Overview',
    description: 'Core identity and account-level information.',
    icon: UserRound,
    order: 1,
    bar: 'from-cyan-500 to-sky-500',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    pill: 'border-cyan-200/80 bg-cyan-100/70 text-cyan-700',
    surface: 'from-cyan-50/70 via-white to-sky-50/40',
  },
  contact: {
    title: 'Contact',
    description: 'Primary and alternate communication channels.',
    icon: Phone,
    order: 2,
    bar: 'from-blue-500 to-indigo-500',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    pill: 'border-blue-200/80 bg-blue-100/70 text-blue-700',
    surface: 'from-blue-50/70 via-white to-indigo-50/40',
  },
  address: {
    title: 'Address',
    description: 'Location and address details for day-to-day operations.',
    icon: MapPin,
    order: 3,
    bar: 'from-teal-500 to-emerald-500',
    badge: 'border-teal-200 bg-teal-50 text-teal-700',
    pill: 'border-teal-200/80 bg-teal-100/70 text-teal-700',
    surface: 'from-teal-50/70 via-white to-emerald-50/40',
  },
  business: {
    title: 'Business',
    description: 'Business profile and operating characteristics.',
    icon: Building2,
    order: 4,
    bar: 'from-violet-500 to-fuchsia-500',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    pill: 'border-violet-200/80 bg-violet-100/70 text-violet-700',
    surface: 'from-violet-50/70 via-white to-fuchsia-50/40',
  },
  banking: {
    title: 'Banking',
    description: 'Payout and settlement-related account information.',
    icon: Landmark,
    order: 5,
    bar: 'from-amber-500 to-orange-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    pill: 'border-amber-200/80 bg-amber-100/70 text-amber-700',
    surface: 'from-amber-50/70 via-white to-orange-50/40',
  },
  compliance: {
    title: 'Compliance',
    description: 'Tax and certification data required for operations.',
    icon: FileText,
    order: 6,
    bar: 'from-rose-500 to-pink-500',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    pill: 'border-rose-200/80 bg-rose-100/70 text-rose-700',
    surface: 'from-rose-50/70 via-white to-pink-50/40',
  },
  operations: {
    title: 'Operations',
    description: 'Operational flags and lifecycle status details.',
    icon: BadgeCheck,
    order: 7,
    bar: 'from-lime-500 to-green-500',
    badge: 'border-lime-200 bg-lime-50 text-lime-700',
    pill: 'border-lime-200/80 bg-lime-100/70 text-lime-700',
    surface: 'from-lime-50/70 via-white to-green-50/40',
  },
  integrations: {
    title: 'Integrations',
    description: 'Connected services and integration-specific settings.',
    icon: Layers3,
    order: 8,
    bar: 'from-indigo-500 to-blue-500',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    pill: 'border-indigo-200/80 bg-indigo-100/70 text-indigo-700',
    surface: 'from-indigo-50/70 via-white to-blue-50/40',
  },
  security: {
    title: 'Security',
    description: 'Password policies and security lifecycle timestamps.',
    icon: ShieldCheck,
    order: 9,
    bar: 'from-slate-500 to-zinc-500',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    pill: 'border-slate-200/80 bg-slate-100/70 text-slate-700',
    surface: 'from-slate-50/70 via-white to-zinc-50/40',
  },
  additional: {
    title: 'Additional',
    description: 'Extra values stored for this vendor account.',
    icon: WalletCards,
    order: 10,
    bar: 'from-gray-500 to-zinc-500',
    badge: 'border-gray-200 bg-gray-50 text-gray-700',
    pill: 'border-gray-200/80 bg-gray-100/70 text-gray-700',
    surface: 'from-gray-50/70 via-white to-zinc-50/40',
  },
}

const OVERVIEW_KEYS = new Set([
  '_id',
  'id',
  'name',
  'registrar_name',
  'role',
  'avatar',
  'createdAt',
  'updatedAt',
  'bound_url',
])
const CONTACT_KEYS = new Set([
  'email',
  'phone',
  'alternate_contact_name',
  'alternate_contact_phone',
])
const ADDRESS_KEYS = new Set([
  'address',
  'street',
  'city',
  'state',
  'pincode',
  'country',
])
const BUSINESS_KEYS = new Set([
  'business_type',
  'business_nature',
  'established_year',
  'annual_turnover',
  'dealing_area',
  'office_employees',
  'categories',
])
const BANKING_KEYS = new Set([
  'bank_name',
  'bank_account',
  'ifsc_code',
  'branch',
  'upi_id',
])
const COMPLIANCE_KEYS = new Set([
  'gst_number',
  'pan_number',
  'gst_cert',
  'pan_card',
  'certificates',
])
const OPERATIONS_KEYS = new Set([
  'is_verified',
  'is_active',
  'is_email_verified',
  'is_profile_completed',
  'profile_complete_level',
  'return_policy',
  'operating_hours',
])
const SECURITY_KEYS = new Set([
  'must_change_password',
  'temp_password_issued_at',
  'temp_password_expires_at',
  'password_changed_at',
])

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

const toBool = (value: unknown) =>
  value === true ||
  value === 1 ||
  String(value || '')
    .trim()
    .toLowerCase() === 'true'

const getRootKey = (path: string) => path.split(/[.[\]]/).find(Boolean) || 'general'

const resolveSectionKey = (rootKey: string) => {
  if (rootKey === 'app_integrations') return 'integrations'
  if (OVERVIEW_KEYS.has(rootKey)) return 'overview'
  if (CONTACT_KEYS.has(rootKey)) return 'contact'
  if (ADDRESS_KEYS.has(rootKey)) return 'address'
  if (BUSINESS_KEYS.has(rootKey)) return 'business'
  if (BANKING_KEYS.has(rootKey)) return 'banking'
  if (COMPLIANCE_KEYS.has(rootKey)) return 'compliance'
  if (OPERATIONS_KEYS.has(rootKey)) return 'operations'
  if (SECURITY_KEYS.has(rootKey)) return 'security'
  return 'additional'
}

const flattenObject = (value: unknown, prefix = ''): FlatField[] => {
  if (Array.isArray(value)) {
    if (!prefix) return []
    if (value.length === 0) return [{ path: prefix, value: '[]' }]
    return value.flatMap((item, index) =>
      flattenObject(item, `${prefix}[${index}]`)
    )
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== 'password' && key !== '__v'
    )

    if (!entries.length) {
      return prefix ? [{ path: prefix, value: '{}' }] : []
    }

    return entries.flatMap(([key, nestedValue]) =>
      flattenObject(nestedValue, prefix ? `${prefix}.${key}` : key)
    )
  }

  return prefix ? [{ path: prefix, value }] : []
}

const toLabel = (value: string) =>
  value
    .replace(/\[(\d+)\]/g, ' $1 ')
    .replace(/[_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatValue = (path: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '-'

    const looksLikeDate = /(at|date|issued|expiry|expires|created|updated)$/i.test(
      path
    )
    const parsed = Date.parse(trimmed)
    if (looksLikeDate && Number.isFinite(parsed)) {
      return new Date(parsed).toLocaleString()
    }

    return trimmed
  }

  return JSON.stringify(value)
}

const buildDisplayLink = (rawValue: string) => {
  if (!rawValue) return rawValue
  if (rawValue.startsWith('/uploads/') && uploadsHost) {
    return `${uploadsHost}${rawValue}`
  }
  return rawValue
}

export default function VendorAboutPage() {
  const user = useSelector((state: any) => state.auth?.user)
  const [vendorProfile, setVendorProfile] = useState<Record<string, unknown> | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')

  useEffect(() => {
    let mounted = true

    const loadVendorProfile = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await api.get('/profile')
        const profile =
          res.data?.vendor || res.data?.data || res.data?.user || res.data || null

        if (mounted) {
          setVendorProfile(profile && typeof profile === 'object' ? profile : null)
        }
      } catch (err: any) {
        if (!mounted) return
        setVendorProfile(null)
        setError(
          err?.response?.data?.message ||
            'Failed to load vendor details. Please try again.'
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadVendorProfile()
    return () => {
      mounted = false
    }
  }, [])

  const groupedFields = useMemo(() => {
    if (!vendorProfile) return []

    const query = fieldSearch.trim().toLowerCase()
    const allFields = flattenObject(vendorProfile)
    const sections = new Map<string, FlatField[]>()

    allFields.forEach((field) => {
      const rootKey = getRootKey(field.path)
      const sectionKey = resolveSectionKey(rootKey)
      const normalizedLabel = toLabel(field.path).toLowerCase()
      const normalizedValue = String(formatValue(field.path, field.value)).toLowerCase()

      if (
        query &&
        !normalizedLabel.includes(query) &&
        !normalizedValue.includes(query)
      ) {
        return
      }

      const current = sections.get(sectionKey) || []
      current.push(field)
      sections.set(sectionKey, current)
    })

    return Array.from(sections.entries())
      .map(([key, fields]) => ({
        key,
        meta: SECTION_META[key] || SECTION_META.additional,
        fields,
      }))
      .sort((a, b) => a.meta.order - b.meta.order)
  }, [fieldSearch, vendorProfile])

  const totalRawFields = useMemo(
    () => (vendorProfile ? flattenObject(vendorProfile).length : 0),
    [vendorProfile]
  )
  const totalVisibleFields = useMemo(
    () => groupedFields.reduce((sum, section) => sum + section.fields.length, 0),
    [groupedFields]
  )

  const isVendor = user?.role === 'vendor'
  const vendorName = String(vendorProfile?.name || user?.name || 'Vendor')
  const vendorEmail = String(vendorProfile?.email || user?.email || '-')
  const vendorAvatar = String(vendorProfile?.avatar || user?.avatar || '')
  const profileCompletion = Number(vendorProfile?.profile_complete_level || 0)
  const completionPercent = Number.isFinite(profileCompletion)
    ? clampPercent(profileCompletion)
    : 0
  const createdOn = formatValue('createdAt', vendorProfile?.createdAt)
  const updatedOn = formatValue('updatedAt', vendorProfile?.updatedAt)
  const isVerified = toBool(vendorProfile?.is_verified)
  const isActive = toBool(vendorProfile?.is_active)

  const summaryMetrics = [
    {
      key: 'completion',
      label: 'Profile Completion',
      value: `${completionPercent}%`,
      hint: 'Completeness score',
      icon: Gauge,
    },
    {
      key: 'sections',
      label: 'Sections',
      value: groupedFields.length.toString(),
      hint: 'Data groups',
      icon: Layers3,
    },
    {
      key: 'fields',
      label: 'Stored Fields',
      value: totalRawFields.toLocaleString(),
      hint: 'Database entries',
      icon: Database,
    },
    {
      key: 'updated',
      label: 'Last Updated',
      value: String(updatedOn),
      hint: 'Latest sync',
      icon: Clock3,
    },
  ]

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='relative flex flex-1 flex-col gap-5 overflow-x-clip pb-10 font-manrope sm:gap-6'>
        <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
          <div className='absolute -left-28 -top-36 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl' />
          <div className='absolute -right-24 top-6 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl' />
          <div className='absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-amber-200/20 blur-3xl' />
          <div className='absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.78)_0%,rgba(240,253,250,0.55)_45%,rgba(239,246,255,0.58)_100%)] dark:bg-[linear-gradient(125deg,rgba(2,6,23,0.82)_0%,rgba(6,78,59,0.2)_45%,rgba(30,58,138,0.16)_100%)]' />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'
        >
          <div>
            <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700'>
              <Sparkles className='h-3.5 w-3.5' />
              Vendor Profile Hub
            </div>
            <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
              About Vendor
            </h1>
            <p className='mt-1 text-sm text-slate-600 sm:text-base'>
              A complete, searchable view of your vendor record from the
              database.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='border border-emerald-200 bg-emerald-50 text-emerald-700'>
              Sync: Live
            </Badge>
            <Badge className='border border-slate-200 bg-white text-slate-700'>
              Role: Vendor
            </Badge>
          </div>
        </motion.section>

        {!isVendor ? (
          <Card className='border border-amber-200/80 bg-amber-50/80 shadow-sm'>
            <CardContent className='pt-6 text-sm text-amber-800'>
              This page is only available for vendor accounts.
            </CardContent>
          </Card>
        ) : null}

        {isVendor && loading ? (
          <Card className='border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm'>
            <CardContent className='pt-6 text-sm text-slate-700'>
              Loading vendor details...
            </CardContent>
          </Card>
        ) : null}

        {isVendor && !loading && error ? (
          <Card className='border border-red-200 bg-red-50/90 shadow-sm'>
            <CardContent className='pt-6 text-sm text-red-700'>{error}</CardContent>
          </Card>
        ) : null}

        {isVendor && !loading && !error && vendorProfile ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 }}
              className='relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.55)] backdrop-blur-sm'
            >
              <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.2),transparent_48%)]' />
              <div className='relative grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr] lg:p-8'>
                <div className='rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm'>
                  <div className='flex items-start gap-4'>
                    <Avatar className='h-20 w-20 border-4 border-white shadow-lg ring-1 ring-slate-200/80'>
                      <AvatarImage src={vendorAvatar || undefined} alt={vendorName} />
                      <AvatarFallback className='bg-slate-900 text-xl font-bold text-white'>
                        {vendorName?.charAt(0) || 'V'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                        Vendor Profile
                      </p>
                      <h2 className='truncate text-2xl font-extrabold text-slate-900 sm:text-3xl'>
                        {vendorName}
                      </h2>
                      <p className='truncate text-sm font-medium text-slate-600 sm:text-base'>
                        {vendorEmail}
                      </p>
                      <div className='mt-3 flex flex-wrap gap-2'>
                        <Badge className='border border-emerald-200 bg-emerald-50 text-emerald-700'>
                          Verified: {isVerified ? 'Yes' : 'No'}
                        </Badge>
                        <Badge className='border border-blue-200 bg-blue-50 text-blue-700'>
                          Active: {isActive ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className='mt-5 rounded-xl border border-slate-200/80 bg-slate-50/75 p-4'>
                    <div className='mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-500'>
                      <span>Completion Meter</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-slate-200/90'>
                      <div
                        className='h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 transition-all duration-500'
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <p className='mt-2 text-xs text-slate-500'>
                      Account created {String(createdOn)}
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2'>
                  {summaryMetrics.map((metric) => (
                    <div
                      key={metric.key}
                      className='rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>
                            {metric.label}
                          </div>
                          <div className='mt-1 break-all text-base font-bold text-slate-900 sm:text-lg'>
                            {metric.value}
                          </div>
                          <div className='mt-1 text-xs text-slate-500'>
                            {metric.hint}
                          </div>
                        </div>
                        <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700'>
                          <metric.icon className='h-4 w-4' />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              <Card className='border border-white/70 bg-white/80 shadow-sm backdrop-blur-sm'>
                <CardContent className='flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='relative w-full sm:max-w-md'>
                    <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                    <Input
                      value={fieldSearch}
                      onChange={(event) => setFieldSearch(event.target.value)}
                      placeholder='Search field name or value...'
                      className='h-11 rounded-xl border-slate-200 bg-white pl-9 text-sm'
                    />
                  </div>
                  <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>
                    <Badge className='border border-slate-200 bg-white text-slate-700'>
                      {groupedFields.length} sections
                    </Badge>
                    <Badge className='border border-slate-200 bg-white text-slate-700'>
                      {totalVisibleFields} visible
                    </Badge>
                    <Badge className='border border-slate-200 bg-white text-slate-700'>
                      {totalRawFields} total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {groupedFields.length ? (
              <div className='grid gap-5 xl:grid-cols-2'>
                {groupedFields.map((section, index) => (
                  <motion.section
                    key={section.key}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.03 }}
                  >
                    <Card
                      className={cn(
                        'relative overflow-hidden border border-white/70 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.7)] backdrop-blur-sm',
                        'bg-gradient-to-br',
                        section.meta.surface
                      )}
                    >
                      <span
                        className={cn(
                          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
                          section.meta.bar
                        )}
                      />

                      <CardHeader className='pb-4 pt-6'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex items-start gap-3'>
                            <span
                              className={cn(
                                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                                section.meta.pill
                              )}
                            >
                              <section.meta.icon className='h-4 w-4' />
                            </span>
                            <div>
                              <CardTitle className='text-xl font-bold text-slate-900'>
                                {section.meta.title}
                              </CardTitle>
                              <p className='mt-1 text-sm text-slate-600'>
                                {section.meta.description}
                              </p>
                            </div>
                          </div>
                          <Badge className={cn('border', section.meta.badge)}>
                            {section.fields.length} fields
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className='grid grid-cols-1 gap-3 pb-5 md:grid-cols-2'>
                        {section.fields.map((field) => {
                          const rootKey = getRootKey(field.path)
                          const fieldLabel = toLabel(
                            field.path.startsWith(`${rootKey}.`)
                              ? field.path.slice(rootKey.length + 1)
                              : field.path
                          )
                          const renderedValue = formatValue(field.path, field.value)
                          const linkValue =
                            typeof renderedValue === 'string'
                              ? buildDisplayLink(renderedValue)
                              : renderedValue
                          const isLink =
                            typeof linkValue === 'string' &&
                            (linkValue.startsWith('http://') ||
                              linkValue.startsWith('https://'))

                          return (
                            <div
                              key={field.path}
                              className='rounded-xl border border-slate-200/80 bg-white/80 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white'
                            >
                              <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>
                                {fieldLabel}
                              </div>
                              {isLink ? (
                                <a
                                  href={linkValue}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='mt-1 inline-flex items-center gap-1 break-all text-sm font-semibold text-cyan-700 transition hover:text-cyan-800'
                                >
                                  {String(linkValue)}
                                  <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                                </a>
                              ) : (
                                <div className='mt-1 break-all text-sm font-semibold text-slate-900'>
                                  {String(renderedValue)}
                                </div>
                              )}
                              <div className='mt-2 break-all text-[10px] font-medium uppercase tracking-[0.11em] text-slate-400'>
                                {field.path}
                              </div>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </motion.section>
                ))}
              </div>
            ) : (
              <Card className='border border-slate-200 bg-white/90 shadow-sm'>
                <CardContent className='pt-6 text-sm text-slate-600'>
                  No fields match your search query.
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </Main>
    </>
  )
}
