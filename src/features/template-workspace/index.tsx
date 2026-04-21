import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { type AppDispatch } from '@/store'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Building2,
  ChartColumn,
  ExternalLink,
  Globe,
  LayoutTemplate,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  getVendorTemplatePreviewUrl,
  peekStoredTemplatePreviewCity,
  setStoredTemplatePreviewCity,
} from '@/lib/storefront-url'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { setStoredEditingTemplateKey } from '@/features/vendor-template/components/templateVariantParam'
import {
  setStoredActiveWebsite,
  getStoredActiveWebsiteId,
  useActiveWebsiteSelection,
} from '@/features/vendor-template/components/websiteStudioStorage'
import { DomainModal } from '@/features/vendor-template/components/DomainModel'

type TemplateAudience = 'b2b' | 'b2c'
type CreateWebsiteStep = 'audience' | 'template'

type TemplateCatalogItem = {
  key: string
  name: string
  description?: string
  previewImage?: string
  audience?: TemplateAudience | string
}

type WebsiteCard = {
  _id: string
  vendor_id?: string
  template_key: string
  template_name?: string
  name?: string
  business_name?: string
  website_slug?: string
  previewImage?: string
  createdAt?: string
  vendor_name?: string
  vendor_business_name?: string
  vendor_email?: string
  custom_domain?: {
    hostname?: string
    status?: string
    ssl_status?: string
  }
  is_default?: boolean
}

const sortWebsitesByDefault = (items: WebsiteCard[]) =>
  [...items].sort((left, right) => {
    if (Boolean(left.is_default) !== Boolean(right.is_default)) {
      return left.is_default ? -1 : 1
    }

    const leftCreatedAt = new Date(left.createdAt || 0).getTime()
    const rightCreatedAt = new Date(right.createdAt || 0).getTime()

    return rightCreatedAt - leftCreatedAt
  })

const normalizeDefaultWebsiteState = (
  items: WebsiteCard[],
  preferredDefaultWebsiteId?: string
) => {
  const normalizedPreferredId = String(preferredDefaultWebsiteId || '').trim()
  const preferredExists = normalizedPreferredId
    ? items.some((item) => String(item._id || '').trim() === normalizedPreferredId)
    : false

  if (preferredExists) {
    return items.map((item) => ({
      ...item,
      is_default: String(item._id || '').trim() === normalizedPreferredId,
    }))
  }

  const firstDefaultId =
    items.find((item) => item.is_default)?._id || items[0]?._id || ''
  const normalizedDefaultId = String(firstDefaultId || '').trim()

  return items.map((item) => ({
    ...item,
    is_default:
      Boolean(normalizedDefaultId) &&
      String(item._id || '').trim() === normalizedDefaultId,
  }))
}

type CityRow = {
  _id: string
  name: string
  slug: string
  state?: string
  country?: string
  isActive?: boolean
}

type VendorProduct = {
  _id: string
  productName?: string
  isAvailable?: boolean
  availableCities?: unknown[]
  websiteIds?: unknown[]
}

const cardClass =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
const modalSectionClass = 'border border-border bg-card p-5 shadow-sm'
const REQUEST_TIMEOUT_MS = 10000
const LIVE_PREVIEW_SCALE = 0.25
const LIVE_PREVIEW_DIMENSION = `${100 / LIVE_PREVIEW_SCALE}%`
const B2B_TEMPLATE_KEYS = new Set(['mquiq', 'poupqz'])
const TEMPLATE_AUDIENCE_COPY: Record<
  TemplateAudience,
  {
    description: string
    emptyDescription: string
    label: string
    shortLabel: string
  }
> = {
  b2b: {
    label: 'B2B Website (Bulk Orders)',
    shortLabel: 'B2B',
    description:
      'Show industrial, wholesale, and enquiry-first templates built for bulk buyers.',
    emptyDescription:
      'No B2B templates are available right now. Add a bulk-order layout to this catalog first.',
  },
  b2c: {
    label: 'B2C (Ecommerce, D2C Brands, etc.)',
    shortLabel: 'B2C',
    description:
      'Show ecommerce, D2C, and consumer-brand templates focused on storefront conversion.',
    emptyDescription:
      'No B2C templates are available right now. Add a consumer storefront layout to this catalog first.',
  },
}

const extractIdList = (values: unknown) => {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => {
      if (!value) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'object') {
        if ('_id' in value && value._id) return String(value._id)
        if (
          typeof (value as { toString?: () => string }).toString === 'function'
        ) {
          return String((value as { toString: () => string }).toString())
        }
      }
      return String(value)
    })
    .filter(Boolean)
}

const formatCityLabel = (slug?: string) => {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
  if (!normalized || normalized === 'all') return 'All Cities'
  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const normalizeCitySlugValue = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeTemplateAudience = (
  value?: string,
  templateKey?: string
): TemplateAudience => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  const normalizedKey = String(templateKey || '')
    .trim()
    .toLowerCase()

  if (normalizedValue.includes('b2b') || normalizedValue.includes('bulk')) {
    return 'b2b'
  }
  if (
    normalizedValue.includes('b2c') ||
    normalizedValue.includes('ecommerce') ||
    normalizedValue.includes('d2c') ||
    normalizedValue.includes('consumer')
  ) {
    return 'b2c'
  }

  return B2B_TEMPLATE_KEYS.has(normalizedKey) ? 'b2b' : 'b2c'
}

const normalizeTemplateCatalog = (items: TemplateCatalogItem[]) =>
  items.map((item) => ({
    ...item,
    audience: normalizeTemplateAudience(item.audience, item.key),
  }))

const DEFAULT_TEMPLATE_CATALOG: TemplateCatalogItem[] = [
  {
    key: 'mquiq',
    name: 'StorageMax Gold',
    audience: 'b2b',
    description:
      'Industrial storage layout with bold yellow highlights and sectioned storytelling.',
    previewImage:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'poupqz',
    name: 'RackFlow Blue',
    audience: 'b2b',
    description:
      'Industrial rack layout with clean blue-white sections and dense content blocks.',
    previewImage:
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'oragze',
    name: 'Organic Freshmart',
    audience: 'b2c',
    description:
      'Organic storefront layout with vibrant grocery-first sections and promotional blocks.',
    previewImage:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'whiterose',
    name: 'White Rose',
    audience: 'b2c',
    description:
      'Premium furniture storefront with clean white-blue utility navigation and launch-first merchandising.',
    previewImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'pocofood',
    name: 'Oph Food',
    audience: 'b2c',
    description:
      'Food-delivery storefront with bold hero offers, cuisine rails, recipe cards, and promo-led merchandising.',
    previewImage:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1200',
  },
]

type StorefrontThumbnailProps = {
  title: string
  previewUrl?: string
  fallbackImage?: string
  className?: string
}

function StorefrontThumbnail({
  title,
  previewUrl,
  fallbackImage,
  className,
}: StorefrontThumbnailProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  useEffect(() => {
    setIframeLoaded(false)
  }, [previewUrl])

  return (
    <div
      className={cn(
        'bg-muted relative aspect-[16/9] overflow-hidden',
        className
      )}
    >
      {fallbackImage ? (
        <img
          src={fallbackImage}
          alt={title}
          className={cn(
            'h-full w-full object-cover transition duration-300',
            iframeLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.14))] transition duration-300',
            iframeLoaded ? 'opacity-0' : 'opacity-100'
          )}
        >
          <LayoutTemplate className='text-muted-foreground h-10 w-10' />
        </div>
      )}

      {previewUrl ? (
        <div
          className={cn(
            'bg-background absolute inset-0 transition-opacity duration-300',
            iframeLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className='pointer-events-none absolute top-0 left-0 origin-top-left overflow-hidden'
            style={{
              width: LIVE_PREVIEW_DIMENSION,
              height: LIVE_PREVIEW_DIMENSION,
              transform: `scale(${LIVE_PREVIEW_SCALE})`,
            }}
          >
            <iframe
              src={previewUrl}
              title={`${title} storefront preview`}
              className='h-full w-full border-0 bg-white'
              loading='lazy'
              onLoad={() => setIframeLoaded(true)}
              tabIndex={-1}
              aria-hidden='true'
            />
          </div>
        </div>
      ) : null}

      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 via-black/[0.03] to-transparent' />
    </div>
  )
}

export default function TemplateWorkspace() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const role = String(authUser?.role || '')
    .trim()
    .toLowerCase()
  const isAdmin = role === 'admin' || role === 'superadmin'
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const vendorId = String(
    authUser?.id ||
      authUser?._id ||
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      ''
  ).trim()
  const token = useSelector((state: any) => state.auth?.token)
  const vendorPublicIdentifier = String(
    vendorProfile?.username || authUser?.username || vendorId || ''
  ).trim()
  const vendorName = String(
    vendorProfile?.name ||
      vendorProfile?.business_name ||
      authUser?.name ||
      authUser?.business_name ||
      authUser?.businessName ||
      'your brand'
  ).trim()
  const vendorDefaultCitySlug = String(
    vendorProfile?.default_city_slug || authUser?.default_city_slug || 'all'
  )
  const vendorDefaultCityName = String(
    vendorProfile?.default_city_name ||
      authUser?.default_city_name ||
      vendorProfile?.city ||
      authUser?.city ||
      ''
  ).trim()

  const [websites, setWebsites] = useState<WebsiteCard[]>([])
  const [cities, setCities] = useState<CityRow[]>([])
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createWebsiteStep, setCreateWebsiteStep] =
    useState<CreateWebsiteStep>('audience')
  const [openingCreateDialog, setOpeningCreateDialog] = useState(false)
  const [selectedTemplateAudience, setSelectedTemplateAudience] =
    useState<TemplateAudience>('b2b')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [websiteName, setWebsiteName] = useState('')
  const [selectedCitySlug, setSelectedCitySlug] = useState('')
  const [statisticsOpen, setStatisticsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WebsiteCard | null>(null)
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<string | null>(
    null
  )
  const [connectDomainListOpen, setConnectDomainListOpen] = useState(false)
  const [setupMethodModalOpen, setSetupMethodModalOpen] = useState(false)
  const [selectedWebsiteForMethod, setSelectedWebsiteForMethod] =
    useState<WebsiteCard | null>(null)
  const [setupMethod, setSetupMethod] = useState<'new' | 'existing'>('existing')
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [resolvedDefaultWebsiteId, setResolvedDefaultWebsiteId] =
    useState<string>('')
  const { activeWebsiteId, activeWebsite } = useActiveWebsiteSelection(vendorId)

  const availableTemplates = useMemo(
    () =>
      normalizeTemplateCatalog(
        templateCatalog.length ? templateCatalog : DEFAULT_TEMPLATE_CATALOG
      ),
    [templateCatalog]
  )

  const filteredTemplates = useMemo(
    () =>
      availableTemplates.filter(
        (template) => template.audience === selectedTemplateAudience
      ),
    [availableTemplates, selectedTemplateAudience]
  )

  const unconnectedWebsites = useMemo(
    () =>
      websites.filter(
        (w) =>
          !w.custom_domain?.hostname || w.custom_domain?.status !== 'active'
      ),
    [websites]
  )

  const selectedTemplate = useMemo(
    () =>
      availableTemplates.find(
        (template) => template.key === selectedTemplateKey
      ),
    [availableTemplates, selectedTemplateKey]
  )
  const selectedAudienceCopy = TEMPLATE_AUDIENCE_COPY[selectedTemplateAudience]
  const trimmedWebsiteName = websiteName.trim()
  const canCreateWebsite = Boolean(
    trimmedWebsiteName && selectedTemplateKey && !creating
  )

  const templateByKey = useMemo(
    () =>
      new Map(availableTemplates.map((template) => [template.key, template])),
    [availableTemplates]
  )

  const cityOptions = useMemo(() => {
    const activeCities = cities
      .filter((city) => city?.isActive !== false)
      .sort((a, b) =>
        String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
          sensitivity: 'base',
        })
      )
      .map((city) => ({
        value: city.slug,
        label: city.name || formatCityLabel(city.slug),
      }))

    const options = [{ value: 'all', label: 'All Cities' }, ...activeCities]
    if (
      selectedCitySlug &&
      !options.some((option) => option.value === selectedCitySlug)
    ) {
      options.push({
        value: selectedCitySlug,
        label: formatCityLabel(selectedCitySlug),
      })
    }
    return options
  }, [cities, selectedCitySlug])

  const selectedCityOption = useMemo(
    () =>
      cityOptions.find((option) => option.value === selectedCitySlug) || {
        value: 'all',
        label: 'All Cities',
      },
    [cityOptions, selectedCitySlug]
  )

  const selectedCityId = useMemo(
    () =>
      cities.find((city) => String(city.slug || '').trim() === selectedCitySlug)
        ?._id || '',
    [cities, selectedCitySlug]
  )

  const effectiveDefaultCitySlug = useMemo(() => {
    const normalizedDefaultSlug = normalizeCitySlugValue(vendorDefaultCitySlug)
    const normalizedDefaultName = normalizeCitySlugValue(vendorDefaultCityName)
    if (normalizedDefaultSlug && normalizedDefaultSlug !== 'all') {
      return normalizedDefaultSlug
    }
    if (!normalizedDefaultName) {
      return normalizedDefaultSlug || 'all'
    }

    const matchedCity = cities.find((city) => {
      return (
        normalizeCitySlugValue(city.slug) === normalizedDefaultName ||
        normalizeCitySlugValue(city.name) === normalizedDefaultName
      )
    })

    return (
      normalizeCitySlugValue(matchedCity?.slug || vendorDefaultCityName) ||
      'all'
    )
  }, [cities, vendorDefaultCityName, vendorDefaultCitySlug])

  const visibleProductsCount = useMemo(() => {
    if (selectedCitySlug === 'all') return products.length
    if (!selectedCityId) return 0
    return products.filter((product) =>
      extractIdList(product.availableCities).includes(selectedCityId)
    ).length
  }, [products, selectedCityId, selectedCitySlug])

  const statisticsItems = useMemo(
    () => [
      {
        label: 'Websites',
        value: websites.length,
        helper: 'Website entries available in this workspace.',
      },
      {
        label: 'Templates',
        value: availableTemplates.length,
        helper: 'Templates ready for new website creation.',
      },
      {
        label: 'Visible Products',
        value: visibleProductsCount,
        helper: `Products currently visible for ${selectedCityOption.label}.`,
      },
      {
        label: 'Preview Location',
        value: selectedCityOption.label,
        helper: 'Preview links and editors use this location.',
      },
    ],
    [availableTemplates.length, selectedCityOption.label, visibleProductsCount, websites.length]
  )

  const loadWorkspace = async (preferredDefaultWebsiteId?: string) => {
    if (!vendorId && !isAdmin) {
      setLoading(false)
      setWebsites([])
      setCities([])
      setProducts([])
      setTemplateCatalog([])
      setSelectedTemplateKey('')
      return
    }

    setLoading(true)
    try {
      const requestConfig = {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: REQUEST_TIMEOUT_MS,
      }
      const requestTs = Date.now()

      const [
        catalogResponse,
        websitesResponse,
        citiesResponse,
        productsResponse,
      ] = await Promise.allSettled([
        axios.get(`${BASE_URL}/v1/templates/catalog`, requestConfig),
        axios.get(
          isAdmin
            ? `${BASE_URL}/v1/templates/by-vendor?_ts=${requestTs}`
            : `${BASE_URL}/v1/templates/by-vendor?vendor_id=${vendorId}&_ts=${requestTs}`,
          requestConfig
        ),
        axios.get(`${BASE_URL}/v1/cities?includeInactive=true`, requestConfig),
        isAdmin
          ? Promise.resolve({ data: { products: [] } })
          : axios.get(`${BASE_URL}/v1/products/vendor/${vendorId}`, requestConfig),
      ])

      const fetchedCatalog =
        catalogResponse.status === 'fulfilled' &&
        Array.isArray(catalogResponse.value.data?.data)
          ? (catalogResponse.value.data.data as TemplateCatalogItem[])
          : []
      const nextCatalog = fetchedCatalog.length
        ? fetchedCatalog
        : DEFAULT_TEMPLATE_CATALOG
      const nextWebsites =
        websitesResponse.status === 'fulfilled' &&
        Array.isArray(websitesResponse.value.data?.data)
          ? (websitesResponse.value.data.data as WebsiteCard[])
          : []
      const nextCities =
        citiesResponse.status === 'fulfilled' &&
        Array.isArray(citiesResponse.value.data?.data)
          ? (citiesResponse.value.data.data as CityRow[])
          : []
      const nextProducts =
        productsResponse.status === 'fulfilled' &&
        Array.isArray(productsResponse.value.data?.products)
          ? (productsResponse.value.data.products as VendorProduct[])
          : []

      const nextResolvedDefaultWebsiteId = String(
        preferredDefaultWebsiteId ||
          nextWebsites.find((item) => item.is_default)?._id ||
          nextWebsites[0]?._id ||
          ''
      ).trim()
      const normalizedWebsites = sortWebsitesByDefault(
        normalizeDefaultWebsiteState(nextWebsites, nextResolvedDefaultWebsiteId)
      )

      setTemplateCatalog(nextCatalog)
      setWebsites(normalizedWebsites)
      setResolvedDefaultWebsiteId(nextResolvedDefaultWebsiteId)
      setCities(nextCities)
      setProducts(nextProducts)
      setSelectedTemplateKey((current) => {
        if (
          current &&
          nextCatalog.some((template) => template.key === current)
        ) {
          return current
        }
        return nextCatalog[0]?.key || ''
      })

      if (websitesResponse.status === 'rejected') {
        const failure = websitesResponse.reason
        if (failure?.response?.status !== 404) {
          toast.error(
            failure?.response?.data?.message ||
              failure?.message ||
              'Some website data could not be loaded'
          )
        }
      }
      if (citiesResponse.status === 'rejected') {
        const failure = citiesResponse.reason
        toast.error(
          failure?.response?.data?.message ||
            failure?.message ||
            'City options could not be loaded'
        )
      }
      if (productsResponse.status === 'rejected') {
        const failure = productsResponse.reason
        if (failure?.response?.status !== 404) {
          toast.error(
            failure?.response?.data?.message ||
              failure?.message ||
              'Product visibility data could not be loaded'
          )
        }
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load websites'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [vendorId, token])

  useEffect(() => {
    if (typeof window === 'undefined' || isAdmin) return

    const url = new URL(window.location.href)
    const shouldOpenConnectDomain =
      url.searchParams.get('openConnectDomain') === '1'

    if (!shouldOpenConnectDomain) return

    setConnectDomainListOpen(true)
    url.searchParams.delete('openConnectDomain')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [isAdmin])

  useEffect(() => {
    if (!filteredTemplates.length) {
      if (selectedTemplateKey) {
        setSelectedTemplateKey('')
      }
      return
    }

    if (
      filteredTemplates.some((template) => template.key === selectedTemplateKey)
    ) {
      return
    }

    setSelectedTemplateKey(filteredTemplates[0]?.key || '')
  }, [filteredTemplates, selectedTemplateKey])

  useEffect(() => {
    if (!token || vendorProfile) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, token, vendorProfile])

  useEffect(() => {
    const normalizedDefaultSlug = normalizeCitySlugValue(
      effectiveDefaultCitySlug
    )
    const normalizedStoredSlug = normalizeCitySlugValue(
      peekStoredTemplatePreviewCity()
    )
    const nextCitySlug =
      (normalizedDefaultSlug && normalizedDefaultSlug !== 'all'
        ? normalizedDefaultSlug
        : '') ||
      (normalizedStoredSlug && normalizedStoredSlug !== 'all'
        ? normalizedStoredSlug
        : '') ||
      normalizedDefaultSlug ||
      normalizedStoredSlug ||
      'all'

    setSelectedCitySlug(nextCitySlug)
  }, [effectiveDefaultCitySlug])

  useEffect(() => {
    if (!selectedCitySlug) return
    setStoredTemplatePreviewCity(selectedCitySlug)
  }, [selectedCitySlug])

  useEffect(() => {
    if (!vendorId || isAdmin || !websites.length) return

    const activeWebsiteExists = websites.some(
      (website) => website._id === activeWebsiteId
    )
    if (activeWebsiteExists) return

    const preferredWebsite =
      websites.find((website) => website.is_default) || websites[0]

    if (!preferredWebsite?._id) return

    setStoredActiveWebsite(vendorId, {
      id: preferredWebsite._id,
      name: preferredWebsite.name || preferredWebsite.business_name || '',
      templateKey: preferredWebsite.template_key || '',
      websiteSlug: preferredWebsite.website_slug || preferredWebsite._id,
    })
  }, [activeWebsiteId, isAdmin, vendorId, websites])

  const openCreateDialog = () => {
    setOpeningCreateDialog(true)

    const runOpen = () => {
      const currentTemplate = availableTemplates.find(
        (template) => template.key === selectedTemplateKey
      )
      const fallbackAudience = normalizeTemplateAudience(
        currentTemplate?.audience,
        currentTemplate?.key
      )
      const nextAudience = currentTemplate?.key
        ? fallbackAudience
        : normalizeTemplateAudience(
            availableTemplates[0]?.audience,
            availableTemplates[0]?.key
          )
      const nextTemplate =
        currentTemplate?.key && currentTemplate.audience === nextAudience
          ? currentTemplate
          : availableTemplates.find(
              (template) => template.audience === nextAudience
            ) || availableTemplates[0]

      setWebsiteName('')
      setSelectedTemplateAudience(nextAudience)
      setSelectedTemplateKey(nextTemplate?.key || '')
      setCreateWebsiteStep('audience')
      setDialogOpen(true)
      setOpeningCreateDialog(false)
    }

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(runOpen)
      return
    }

    setTimeout(runOpen, 0)
  }

  const handleCreateDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setCreateWebsiteStep('audience')
    }
  }

  const openWebsiteEditor = (
    website: WebsiteCard,
    page: 'home' | 'about' | 'contact' | 'pages' | 'other' = 'home'
  ) => {
    const templateKey = String(website.template_key || '').trim()
    if (!vendorId || !templateKey) {
      toast.error('Website template could not be opened')
      return
    }

    setStoredActiveWebsite(vendorId, {
      id: website._id,
      name: website.name || website.business_name || '',
      templateKey,
      websiteSlug: website.website_slug || website._id,
    })
    setStoredEditingTemplateKey(vendorId, templateKey)
    setStoredTemplatePreviewCity(
      selectedCitySlug ||
        effectiveDefaultCitySlug ||
        vendorDefaultCitySlug ||
        'all'
    )

    if (page === 'home') {
      void navigate({
        to: '/vendor-template/$templateKey',
        params: { templateKey },
        search: { website: website._id },
      })
      return
    }

    if (page === 'about') {
      void navigate({ to: '/vendor-template-about' })
      return
    }

    if (page === 'contact') {
      void navigate({ to: '/vendor-template-contact' })
      return
    }

    if (page === 'pages') {
      void navigate({ to: '/vendor-template-pages' })
      return
    }

    void navigate({ to: '/vendor-template-other' })
  }

  const handleEditWebsite = (website: WebsiteCard) => {
    openWebsiteEditor(website, 'home')
  }

  const handleCreateWebsite = async () => {
    if (!vendorId) {
      toast.error(
        'Vendor profile is still loading. Please refresh and try again.'
      )
      return
    }
    if (!trimmedWebsiteName) {
      toast.error('Enter a website name first')
      return
    }
    if (!selectedTemplate) {
      toast.error('Select a template first')
      return
    }

    const cleanName = trimmedWebsiteName
    setCreating(true)

    try {
      const response = await axios.post(
        `${BASE_URL}/v1/templates`,
        {
          vendor_id: vendorId,
          name: cleanName,
          template_key: selectedTemplate.key,
          previewImage: selectedTemplate.previewImage,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      const createdWebsite = response.data?.data as
        | Partial<WebsiteCard>
        | undefined
      const createdWebsiteId = String(createdWebsite?._id || '').trim()
      const createdTemplateKey = String(
        createdWebsite?.template_key || selectedTemplate.key || ''
      ).trim()

      if (!createdWebsiteId || !createdTemplateKey) {
        throw new Error('Website was created, but editor data is incomplete')
      }

      setStoredActiveWebsite(vendorId, {
        id: createdWebsiteId,
        name:
          String(
            createdWebsite?.name || createdWebsite?.business_name || cleanName
          ).trim() || cleanName,
        templateKey: createdTemplateKey,
        websiteSlug:
          String(createdWebsite?.website_slug || createdWebsiteId).trim() ||
          createdWebsiteId,
      })
      setStoredEditingTemplateKey(vendorId, createdTemplateKey)
      setDialogOpen(false)
      toast.success('Website created. Opening builder...')

      try {
        await navigate({
          to: '/vendor-template/$templateKey',
          params: { templateKey: createdTemplateKey },
        })
      } catch (navigationError: any) {
        await loadWorkspace()
        toast.error(
          navigationError?.message ||
            'Website created, but the builder could not be opened automatically'
        )
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to create website'
      )
    } finally {
      setCreating(false)
    }
  }

  const handleMakeDefaultWebsite = async (website: WebsiteCard) => {
    if (!vendorId) {
      toast.error(
        'Vendor profile is still loading. Please refresh and try again.'
      )
      return
    }

    try {
      const response = await axios.put(
        `${BASE_URL}/v1/templates/website/${website._id}/default`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      const nextDefaultWebsiteId =
        String(response?.data?.data?._id || website._id).trim() || website._id

      setResolvedDefaultWebsiteId(nextDefaultWebsiteId)
      setWebsites((current) =>
        sortWebsitesByDefault(
          normalizeDefaultWebsiteState(current, nextDefaultWebsiteId)
        )
      )

      setStoredActiveWebsite(vendorId, {
        id: nextDefaultWebsiteId,
        name:
          response?.data?.data?.name ||
          website.name ||
          website.business_name ||
          '',
        templateKey:
          response?.data?.data?.template_key || website.template_key || '',
        websiteSlug:
          response?.data?.data?.website_slug ||
          website.website_slug ||
          nextDefaultWebsiteId,
      })

      await Promise.all([
        loadWorkspace(nextDefaultWebsiteId),
        dispatch(fetchVendorProfile()),
      ])
      toast.success('Default website updated')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update default website'
      )
    }
  }

  const handleDeleteWebsite = async () => {
    if (!deleteTarget?._id) return

    setDeletingWebsiteId(deleteTarget._id)
    try {
      await axios.delete(
        `${BASE_URL}/v1/templates/website/${deleteTarget._id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      if (vendorId && getStoredActiveWebsiteId(vendorId) === deleteTarget._id) {
        setStoredActiveWebsite(vendorId, undefined)
        setStoredEditingTemplateKey(vendorId, undefined)
      }

      toast.success('Website deleted')
      setDeleteTarget(null)
      await loadWorkspace()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete website'
      )
    } finally {
      setDeletingWebsiteId(null)
    }
  }

  const handleSelectWebsiteForDomain = (website: WebsiteCard) => {
    if (!vendorId) {
      toast.error(
        'Vendor profile is still loading. Please refresh and try again.'
      )
      return
    }
    setSelectedWebsiteForMethod(website)
    setSetupMethodModalOpen(true)
    setConnectDomainListOpen(false)
  }

  const handleContinueSetupMethod = () => {
    if (setupMethod === 'new') {
      window.open('https://www.godaddy.com/', '_blank')
    } else {
      if (!selectedWebsiteForMethod || !vendorId) return
      const templateKey = String(
        selectedWebsiteForMethod.template_key || ''
      ).trim()
      setStoredActiveWebsite(vendorId, {
        id: selectedWebsiteForMethod._id,
        name:
          selectedWebsiteForMethod.name ||
          selectedWebsiteForMethod.business_name ||
          '',
        templateKey,
        websiteSlug:
          selectedWebsiteForMethod.website_slug || selectedWebsiteForMethod._id,
      })
      setSetupMethodModalOpen(false)
      setDomainModalOpen(true)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return 'Recently created'
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    } catch {
      return 'Recently created'
    }
  }

  const defaultWebsite = useMemo(
    () =>
      websites.find((website) => website._id === resolvedDefaultWebsiteId) ||
      websites.find((website) => website.is_default) ||
      null,
    [resolvedDefaultWebsiteId, websites]
  )
  const defaultWebsiteName = String(
    defaultWebsite?.name ||
      defaultWebsite?.business_name ||
      defaultWebsite?.template_name ||
      ''
  ).trim()

  return (
    <>
      <TablePageHeader
        title={isAdmin ? 'Show Websites' : 'My Websites'}
        stackOnMobile
      >
        {!isAdmin && (
          <Button
            type='button'
            className='h-11 shrink-0 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700 hover:text-white'
            onClick={() => setConnectDomainListOpen(true)}
          >
            <Globe className='mr-2 h-4 w-4' />
            Connect Your Domain
          </Button>
        )}

        <Button
          type='button'
          variant='outline'
          className='h-11 shrink-0 rounded-xl'
          onClick={() => setStatisticsOpen(true)}
        >
          <ChartColumn className='h-4 w-4' />
          Statistics
        </Button>

        <Button
          type='button'
          variant='outline'
          className='h-11 shrink-0 rounded-xl'
          onClick={() => {
            void loadWorkspace()
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='h-4 w-4' />
          )}
          Refresh
        </Button>

        {!isAdmin ? (
          <Button
            type='button'
            className='h-11 shrink-0 rounded-xl'
            onClick={openCreateDialog}
            disabled={openingCreateDialog}
          >
            {openingCreateDialog ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Plus className='h-4 w-4' />
            )}
            Create Website
          </Button>
        ) : null}
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>

        <section className='space-y-4'>
          <div>
            <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
              {isAdmin ? 'All Websites' : 'Created Websites'}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {isAdmin
                ? `Browse every vendor website from one place. Preview links currently use ${selectedCityOption.label}.`
                : `Preview, edit, and manage storefront websites for ${selectedCityOption.label} from here.`}
            </p>
            {!isAdmin && defaultWebsiteName ? (
              <p className='mt-2 text-sm font-medium text-blue-700'>
                Default website: {defaultWebsiteName}
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className={`${cardClass} bg-muted/30 h-[420px] animate-pulse`}
                />
              ))}
            </div>
          ) : websites.length ? (
            <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
              {websites.map((website) => {
                const isActiveWebsite = activeWebsiteId === website._id
                const isDefaultWebsite =
                  resolvedDefaultWebsiteId === website._id ||
                  (!resolvedDefaultWebsiteId && Boolean(website.is_default))
                const templateKey = String(website.template_key || '').trim()
                const websiteTemplate = templateByKey.get(templateKey)
                const previewUrl = getVendorTemplatePreviewUrl(
                  String(
                    website.vendor_id ||
                      vendorPublicIdentifier ||
                      vendorId
                  ).trim(),
                  templateKey,
                  selectedCitySlug ||
                    effectiveDefaultCitySlug ||
                    vendorDefaultCitySlug,
                  website._id
                )
                const thumbnail =
                  website.previewImage || websiteTemplate?.previewImage || ''
                return (
                  <article
                    key={website._id}
                    className={cn(
                      cardClass,
                      isActiveWebsite &&
                        'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background'
                    )}
                  >
                    <div className='relative'>
                      <StorefrontThumbnail
                        title={
                          website.name ||
                          website.template_name ||
                          'Website preview'
                        }
                        previewUrl={previewUrl}
                        fallbackImage={thumbnail}
                        className='transition duration-300 group-hover:scale-[1.02]'
                      />

                      <div className='absolute inset-x-0 top-0 flex items-start justify-between p-4'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='inline-flex rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur'>
                            {website.template_name ||
                              websiteTemplate?.name ||
                              templateKey}
                          </div>
                          {isDefaultWebsite ? (
                            <div className='inline-flex rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                              Default Website
                            </div>
                          ) : null}
                        </div>
                        {!isAdmin ? (
                          <button
                            type='button'
                            onClick={() => setDeleteTarget(website)}
                            className='text-destructive inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/90 shadow-sm transition hover:bg-white'
                            aria-label={`Delete ${website.name || website.business_name || 'website'}`}
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className='flex flex-1 flex-col gap-4 p-5'>
                      <div>
                        <h3 className='text-foreground truncate text-xl font-semibold'>
                          {website.name ||
                            website.business_name ||
                            'Untitled Website'}
                        </h3>
                        <p className='text-muted-foreground mt-1 text-sm'>
                          Created {formatDate(website.createdAt)}
                        </p>
                        {isAdmin ? (
                          <p className='text-muted-foreground mt-2 text-sm'>
                            Vendor:{' '}
                            <span className='text-foreground font-medium'>
                              {website.vendor_business_name ||
                                website.vendor_name ||
                                website.business_name ||
                                website.vendor_email ||
                                'Unknown vendor'}
                            </span>
                          </p>
                        ) : null}
                      </div>

                      <div className='mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='text-[10px] font-semibold tracking-wider text-slate-500 uppercase'>
                            Domain Status
                          </span>
                          {website.custom_domain?.hostname && website.custom_domain?.status === 'active' ? (
                            <span className='rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-green-700'>
                              Connected
                            </span>
                          ) : (
                            <span className='rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-700'>
                              Not Connected
                            </span>
                          )}
                        </div>
                        {website.custom_domain?.hostname && website.custom_domain?.status === 'active' ? (
                          <div className='mt-2'>
                            <a
                              href={`https://${website.custom_domain.hostname}`}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:text-blue-800 hover:underline'
                            >
                              {website.custom_domain.hostname} <ExternalLink className='h-3 w-3' />
                            </a>
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={cn(
                          'mt-auto grid gap-3',
                          !isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                        )}
                      >
                        {!isAdmin ? (
                          <>
                            <Button
                              type='button'
                              onClick={() => handleEditWebsite(website)}
                              className='h-11 w-full rounded-2xl px-4 text-center'
                            >
                              Edit Website
                            </Button>
                            {isDefaultWebsite ? (
                              <Button
                                type='button'
                                variant='outline'
                                className='h-11 w-full rounded-2xl border-blue-200 bg-blue-50 px-4 text-center text-blue-700 hover:bg-blue-100'
                                disabled
                              >
                                Default
                              </Button>
                            ) : (
                              <Button
                                type='button'
                                variant='outline'
                                className='h-11 w-full rounded-2xl px-4 text-center'
                                onClick={() => handleMakeDefaultWebsite(website)}
                              >
                                Set Default
                              </Button>
                            )}
                          </>
                        ) : null}

                        {previewUrl ? (
                          <a
                            href={previewUrl}
                            target='_blank'
                            rel='noreferrer'
                            className={cn('block', !isAdmin && 'sm:col-span-2')}
                          >
                            <Button
                              type='button'
                              variant='outline'
                              className='h-11 w-full rounded-2xl px-4 text-center'
                            >
                              <ExternalLink className='h-4 w-4 shrink-0' />
                              Open Preview
                            </Button>
                          </a>
                        ) : (
                          <Button
                            type='button'
                            variant='outline'
                            className={cn(
                              'h-11 w-full rounded-2xl px-4 text-center',
                              !isAdmin && 'sm:col-span-2'
                            )}
                            disabled
                          >
                            <ExternalLink className='h-4 w-4 shrink-0' />
                            Preview Unavailable
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className='border-border bg-card rounded-[24px] border border-dashed px-6 py-12 text-center shadow-sm'>
              <LayoutTemplate className='text-muted-foreground mx-auto h-10 w-10' />
              <h3 className='text-foreground mt-4 text-xl font-semibold'>
                {isAdmin ? 'No websites found yet' : 'No websites created yet'}
              </h3>
              <p className='text-muted-foreground mt-2 text-sm'>
                {isAdmin
                  ? 'When vendors create websites, they will appear here with preview access.'
                  : 'Create your first website from a template and it will appear here with its preview link and edit access.'}
              </p>
              {!isAdmin ? (
                <Button
                  type='button'
                  onClick={openCreateDialog}
                  className='mt-6 h-11 rounded-2xl'
                >
                  <Plus className='h-4 w-4' />
                  Create First Website
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </Main>

      <Dialog open={!isAdmin && dialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className='border-border bg-background w-[min(96vw,920px)] max-w-[min(96vw,920px)] gap-0 overflow-hidden rounded-none border p-0 sm:max-w-[min(96vw,920px)] [&>button]:rounded-none'>
          <div className='flex max-h-[90vh] flex-col'>
            <DialogHeader className='border-border border-b px-6 py-4 text-left sm:px-8'>
              <DialogTitle className='text-foreground text-2xl font-semibold tracking-tight'>
                {createWebsiteStep === 'audience'
                  ? 'Choose Website Type'
                  : 'Choose Template'}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground mt-1 text-sm'>
                {createWebsiteStep === 'audience'
                  ? 'Step 1 of 2'
                  : `Step 2 of 2 • ${selectedAudienceCopy.shortLabel}`}
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto px-6 py-6 sm:px-8'>
              {createWebsiteStep === 'audience' ? (
                <div className='grid gap-4 md:grid-cols-2'>
                  {(
                    Object.entries(TEMPLATE_AUDIENCE_COPY) as Array<
                      [
                        TemplateAudience,
                        (typeof TEMPLATE_AUDIENCE_COPY)[TemplateAudience],
                      ]
                    >
                  ).map(([audienceKey, audience]) => {
                    const isSelected = selectedTemplateAudience === audienceKey
                    const Icon = audienceKey === 'b2b' ? Building2 : Globe

                    return (
                      <button
                        key={audienceKey}
                        type='button'
                        onClick={() => {
                          setSelectedTemplateAudience(audienceKey)
                          setCreateWebsiteStep('template')
                        }}
                        className={cn(
                          'flex min-h-[180px] flex-col justify-between border p-5 text-left transition',
                          isSelected
                            ? 'border-primary bg-primary/[0.04]'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/20'
                        )}
                      >
                        <div
                          className={cn(
                            'inline-flex h-12 w-12 items-center justify-center border',
                            isSelected
                              ? 'border-primary text-primary'
                              : 'border-border text-muted-foreground'
                          )}
                        >
                          <Icon className='h-5 w-5' />
                        </div>

                        <div className='mt-8'>
                          <div className='text-foreground text-xl font-semibold'>
                            {audience.shortLabel}
                          </div>
                          <div className='text-muted-foreground mt-2 text-sm'>
                            {audienceKey === 'b2b'
                              ? 'Bulk orders'
                              : 'Online store'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className='space-y-5'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='text-foreground text-sm font-medium'>
                      {selectedAudienceCopy.shortLabel}
                    </div>
                    <div className='text-muted-foreground text-sm'>
                      {filteredTemplates.length} templates
                    </div>
                  </div>

                  {filteredTemplates.length ? (
                    <div className='grid gap-4 md:grid-cols-2'>
                      {filteredTemplates.map((template) => {
                        const isSelected = selectedTemplateKey === template.key
                        const previewUrl = getVendorTemplatePreviewUrl(
                          vendorPublicIdentifier || vendorId,
                          template.key,
                          effectiveDefaultCitySlug || vendorDefaultCitySlug
                        )

                        return (
                          <button
                            key={template.key}
                            type='button'
                            onClick={() => setSelectedTemplateKey(template.key)}
                            className={cn(
                              'border-border bg-background flex h-full flex-col border p-3 text-left transition',
                              isSelected
                                ? 'border-primary bg-primary/[0.04]'
                                : 'hover:border-primary/40 hover:bg-muted/20'
                            )}
                          >
                            <div className='border-border overflow-hidden border'>
                              <StorefrontThumbnail
                                title={template.name}
                                previewUrl={previewUrl}
                                fallbackImage={template.previewImage}
                                className='aspect-[16/10]'
                              />
                            </div>

                            <div className='mt-3 flex items-start justify-between gap-3'>
                              <div>
                                <div className='text-foreground text-base font-semibold'>
                                  {template.name}
                                </div>
                                <div className='text-muted-foreground mt-1 text-xs uppercase'>
                                  {template.key}
                                </div>
                              </div>

                              {isSelected ? (
                                <span className='border border-emerald-500 px-2 py-1 text-[11px] font-semibold text-emerald-700'>
                                  Selected
                                </span>
                              ) : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className='border-border bg-background border px-5 py-10 text-center'>
                      <LayoutTemplate className='text-muted-foreground mx-auto h-8 w-8' />
                      <p className='text-muted-foreground mt-3 text-sm'>
                        No {selectedAudienceCopy.shortLabel} templates
                      </p>
                    </div>
                  )}

                  <div className={modalSectionClass}>
                    <label className='text-foreground text-sm font-medium'>
                      Website Name
                    </label>
                    <Input
                      value={websiteName}
                      onChange={(event) => setWebsiteName(event.target.value)}
                      placeholder='Website name'
                      className='border-border bg-background mt-3 h-11 rounded-none shadow-none'
                    />
                  </div>
                </div>
              )}
            </div>

            <div className='border-border bg-background flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 sm:px-8'>
              {createWebsiteStep === 'audience' ? (
                <>
                  <div />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setDialogOpen(false)}
                    className='h-11 rounded-none'
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <div className='flex flex-wrap items-center gap-3'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setCreateWebsiteStep('audience')}
                      className='h-11 rounded-none'
                    >
                      Back
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setDialogOpen(false)}
                      className='h-11 rounded-none'
                    >
                      Cancel
                    </Button>
                  </div>

                  <Button
                    type='button'
                    onClick={handleCreateWebsite}
                    disabled={!canCreateWebsite}
                    className='h-11 rounded-none'
                  >
                    {creating ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Plus className='h-4 w-4' />
                    )}
                    Create Website
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StatisticsDialog
        open={statisticsOpen}
        onOpenChange={setStatisticsOpen}
        title='Workspace Statistics'
        description={
          isAdmin
            ? `Overview for all websites in ${selectedCityOption.label}.`
            : `Overview for ${vendorName} in ${selectedCityOption.label}.`
        }
        items={statisticsItems}
      />

      <ConfirmDialog
        open={!isAdmin && Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deletingWebsiteId && !open) {
            setDeleteTarget(null)
          }
        }}
        title={
          deleteTarget
            ? `Delete website "${deleteTarget.name || deleteTarget.business_name || 'Untitled Website'}"?`
            : 'Delete website?'
        }
        desc={
          <div className='space-y-2 text-sm'>
            <p>This will permanently remove the website from your workspace.</p>
            <p>
              You can create a new website again later, but this deleted website
              cannot be restored.
            </p>
          </div>
        }
        destructive
        confirmText='Delete Website'
        cancelBtnText='Cancel'
        isLoading={Boolean(deletingWebsiteId)}
        handleConfirm={handleDeleteWebsite}
      />

      <Dialog
        open={connectDomainListOpen}
        onOpenChange={setConnectDomainListOpen}
      >
        <DialogContent className='max-h-[90vh] w-[90vw] max-w-md overflow-y-auto rounded-md p-6'>
          <DialogHeader className='text-left'>
            <DialogTitle className='text-xl font-semibold'>
              Select Website to Connect
            </DialogTitle>
            <DialogDescription className='mt-2 text-sm'>
              Choose a website to connect a custom domain.
            </DialogDescription>
          </DialogHeader>

          <div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3'>
            {unconnectedWebsites.length === 0 ? (
              <div className='col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-slate-500'>
                All your websites already have active domains connected.
              </div>
            ) : (
              unconnectedWebsites.map((website) => (
                <div
                  key={website._id}
                  role='button'
                  tabIndex={0}
                  onClick={() => handleSelectWebsiteForDomain(website)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectWebsiteForDomain(website)
                    }
                  }}
                  className='flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md'
                >
                  <Globe className='mb-3 h-8 w-8 text-slate-300' />
                  <span className='line-clamp-2 px-1 text-sm font-semibold text-slate-900'>
                    {website.name ||
                      website.business_name ||
                      'Untitled Website'}
                  </span>
                  <span className='mt-3 inline-block rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase'>
                    {website.template_name || website.template_key}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className='mt-4 flex justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConnectDomainListOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={setupMethodModalOpen}
        onOpenChange={setSetupMethodModalOpen}
      >
        <DialogContent className='w-[95vw] sm:max-w-[700px] overflow-hidden rounded-md p-6 sm:p-10'>
          <DialogHeader className='text-left'>
            <DialogTitle className='text-3xl font-semibold'>
              Choose a way to set up your domain
            </DialogTitle>
            <DialogDescription className='mt-3 text-base text-slate-600'>
              You'll need a custom domain, like example.com, to elevate your
              brand and build trust with customers online.
            </DialogDescription>
          </DialogHeader>

          <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <div
              role='button'
              tabIndex={0}
              onClick={() => setSetupMethod('new')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSetupMethod('new')
              }}
              className={cn(
                'flex cursor-pointer flex-col rounded-md border-2 bg-slate-50/50 p-6 transition-all hover:bg-slate-50',
                setupMethod === 'new'
                  ? 'border-blue-600 bg-blue-50/30'
                  : 'border-slate-200'
              )}
            >
              <div className='mb-6.5 inline-flex h-14 w-14 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200'>
                <Search className='h-7 w-7 text-blue-500' />
              </div>
              <h3 className='text-xl font-medium text-slate-900'>
                Get a new custom domain
              </h3>
              <p className='mt-1.5 text-sm text-slate-600'>
                Buy a new domain and build your brand online
              </p>
            </div>

            <div
              role='button'
              tabIndex={0}
              onClick={() => setSetupMethod('existing')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  setSetupMethod('existing')
              }}
              className={cn(
                'flex cursor-pointer flex-col rounded-md border-2 bg-slate-50/50 p-6 transition-all hover:bg-slate-50',
                setupMethod === 'existing'
                  ? 'border-blue-600 bg-blue-50/30'
                  : 'border-slate-200'
              )}
            >
              <div className='mb-6.5 inline-flex h-14 w-14 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200'>
                <Store className='h-7 w-7 text-emerald-500' />
              </div>
              <h3 className='text-xl font-medium text-slate-900'>
                Set up using your existing domain
              </h3>
              <p className='mt-1.5 text-sm text-slate-600'>
                Use the domain you already own
              </p>
            </div>
          </div>

          <div className='mt-8 flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full px-6'
              onClick={() => {
                setSetupMethodModalOpen(false)
                setConnectDomainListOpen(true)
              }}
            >
              Back
            </Button>
            <Button
              type='button'
              className='h-11 rounded-full bg-blue-600 px-8 font-semibold text-white transition hover:bg-blue-700 hover:text-white'
              onClick={handleContinueSetupMethod}
            >
              Continue with this method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DomainModal
        open={domainModalOpen}
        setOpen={setDomainModalOpen}
        activeWebsiteName={activeWebsite?.name || 'Selected Website'}
      />
    </>
  )
}
