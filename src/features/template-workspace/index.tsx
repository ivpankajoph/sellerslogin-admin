import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  LayoutTemplate,
  Loader2,
  MapPinned,
  Package2,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getVendorTemplatePreviewUrl,
  peekStoredTemplatePreviewCity,
  setStoredTemplatePreviewCity,
} from '@/lib/storefront-url'
import { cn } from '@/lib/utils'
import { type AppDispatch } from '@/store'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import { setStoredEditingTemplateKey } from '@/features/vendor-template/components/templateVariantParam'
import {
  getStoredActiveWebsiteId,
  setStoredActiveWebsiteId,
} from '@/features/vendor-template/components/websiteStudioStorage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TemplateCatalogItem = {
  key: string
  name: string
  description?: string
  previewImage?: string
}

type WebsiteCard = {
  _id: string
  template_key: string
  template_name?: string
  name?: string
  business_name?: string
  website_slug?: string
  previewImage?: string
  createdAt?: string
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

type WorkspaceEditorPage = 'home' | 'about' | 'contact' | 'pages' | 'other'

const cardClass =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
const REQUEST_TIMEOUT_MS = 10000
const LIVE_PREVIEW_SCALE = 0.25
const LIVE_PREVIEW_DIMENSION = `${100 / LIVE_PREVIEW_SCALE}%`

const extractIdList = (values: unknown) => {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => {
      if (!value) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'object') {
        if ('_id' in value && value._id) return String(value._id)
        if (typeof (value as { toString?: () => string }).toString === 'function') {
          return String((value as { toString: () => string }).toString())
        }
      }
      return String(value)
    })
    .filter(Boolean)
}

const formatCityLabel = (slug?: string) => {
  const normalized = String(slug || '').trim().toLowerCase()
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

const DEFAULT_TEMPLATE_CATALOG: TemplateCatalogItem[] = [
  {
    key: 'mquiq',
    name: 'StorageMax Gold',
    description:
      'Industrial storage layout with bold yellow highlights and sectioned storytelling.',
    previewImage:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'poupqz',
    name: 'RackFlow Blue',
    description:
      'Industrial rack layout with clean blue-white sections and dense content blocks.',
    previewImage:
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'oragze',
    name: 'Organic Freshmart',
    description:
      'Organic storefront layout with vibrant grocery-first sections and promotional blocks.',
    previewImage:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
  },
  {
    key: 'whiterose',
    name: 'White Rose',
    description:
      'Premium furniture storefront with clean white-blue utility navigation and launch-first merchandising.',
    previewImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=1200',
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
    <div className={cn('relative aspect-[16/9] overflow-hidden bg-muted', className)}>
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
          <LayoutTemplate className='h-10 w-10 text-muted-foreground' />
        </div>
      )}

      {previewUrl ? (
        <div
          className={cn(
            'absolute inset-0 bg-background transition-opacity duration-300',
            iframeLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className='pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden'
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
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [websiteName, setWebsiteName] = useState('')
  const [selectedCitySlug, setSelectedCitySlug] = useState('')
  const [previewCityTouched, setPreviewCityTouched] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WebsiteCard | null>(null)
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<string | null>(null)

  const availableTemplates = templateCatalog.length
    ? templateCatalog
    : DEFAULT_TEMPLATE_CATALOG

  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.key === selectedTemplateKey),
    [availableTemplates, selectedTemplateKey]
  )
  const trimmedWebsiteName = websiteName.trim()
  const canCreateWebsite = Boolean(trimmedWebsiteName && selectedTemplateKey && !creating)

  const templateByKey = useMemo(
    () => new Map(availableTemplates.map((template) => [template.key, template])),
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
      cities.find((city) => String(city.slug || '').trim() === selectedCitySlug)?._id || '',
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

    return normalizeCitySlugValue(matchedCity?.slug || vendorDefaultCityName) || 'all'
  }, [cities, vendorDefaultCityName, vendorDefaultCitySlug])

  const visibleProductsCount = useMemo(() => {
    if (selectedCitySlug === 'all') return products.length
    if (!selectedCityId) return 0
    return products.filter((product) =>
      extractIdList(product.availableCities).includes(selectedCityId)
    ).length
  }, [products, selectedCityId, selectedCitySlug])

  const loadWorkspace = async () => {
    if (!vendorId) {
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

      const [catalogResponse, websitesResponse, citiesResponse, productsResponse] =
        await Promise.allSettled([
        axios.get(`${BASE_URL}/v1/templates/catalog`, requestConfig),
        axios.get(`${BASE_URL}/v1/templates/by-vendor?vendor_id=${vendorId}`, requestConfig),
        axios.get(`${BASE_URL}/v1/cities?includeInactive=true`, requestConfig),
        axios.get(`${BASE_URL}/v1/products/vendor/${vendorId}`, requestConfig),
        ])

      const fetchedCatalog =
        catalogResponse.status === 'fulfilled' &&
        Array.isArray(catalogResponse.value.data?.data)
          ? (catalogResponse.value.data.data as TemplateCatalogItem[])
          : []
      const nextCatalog = fetchedCatalog.length ? fetchedCatalog : DEFAULT_TEMPLATE_CATALOG
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

      setTemplateCatalog(nextCatalog)
      setWebsites(nextWebsites)
      setCities(nextCities)
      setProducts(nextProducts)
      setSelectedTemplateKey((current) => {
        if (current && nextCatalog.some((template) => template.key === current)) {
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
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load websites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [vendorId, token])

  useEffect(() => {
    if (!token || vendorProfile) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, token, vendorProfile])

  useEffect(() => {
    if (previewCityTouched) return

    const normalizedDefaultSlug = normalizeCitySlugValue(effectiveDefaultCitySlug)
    const normalizedStoredSlug = normalizeCitySlugValue(peekStoredTemplatePreviewCity())
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
  }, [effectiveDefaultCitySlug, previewCityTouched])

  useEffect(() => {
    if (!selectedCitySlug) return
    setStoredTemplatePreviewCity(selectedCitySlug)
  }, [selectedCitySlug])

  const openCreateDialog = () => {
    setWebsiteName('')
    setSelectedTemplateKey(
      (current) => current || availableTemplates[0]?.key || DEFAULT_TEMPLATE_CATALOG[0]?.key || ''
    )
    setDialogOpen(true)
  }

  const openWebsiteEditor = (website: WebsiteCard, page: WorkspaceEditorPage = 'home') => {
    const templateKey = String(website.template_key || '').trim()
    if (!vendorId || !templateKey) {
      toast.error('Website template could not be opened')
      return
    }

    setStoredActiveWebsiteId(vendorId, website._id)
    setStoredEditingTemplateKey(vendorId, templateKey)
    setStoredTemplatePreviewCity(
      selectedCitySlug || effectiveDefaultCitySlug || vendorDefaultCitySlug || 'all'
    )

    if (page === 'home') {
      void navigate({
        to: '/vendor-template/$templateKey',
        params: { templateKey },
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

  const getVisibleProductsForWebsite = (websiteId: string) => {
    return products.filter((product) => {
      if (product.isAvailable === false) return false

      const websiteIds = extractIdList(product.websiteIds)
      const matchesWebsite = !websiteIds.length || websiteIds.includes(websiteId)
      if (!matchesWebsite) return false

      if (selectedCitySlug === 'all') return true
      if (!selectedCityId) return false

      return extractIdList(product.availableCities).includes(selectedCityId)
    })
  }

  const handleCreateWebsite = async () => {
    if (!vendorId) {
      toast.error('Vendor profile is still loading. Please refresh and try again.')
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

      const createdWebsite = response.data?.data as Partial<WebsiteCard> | undefined
      const createdWebsiteId = String(createdWebsite?._id || '').trim()
      const createdTemplateKey = String(
        createdWebsite?.template_key || selectedTemplate.key || ''
      ).trim()

      if (!createdWebsiteId || !createdTemplateKey) {
        throw new Error('Website was created, but editor data is incomplete')
      }

      setStoredActiveWebsiteId(vendorId, createdWebsiteId)
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
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create website')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWebsite = async () => {
    if (!deleteTarget?._id) return

    setDeletingWebsiteId(deleteTarget._id)
    try {
      await axios.delete(`${BASE_URL}/v1/templates/website/${deleteTarget._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (vendorId && getStoredActiveWebsiteId(vendorId) === deleteTarget._id) {
        setStoredActiveWebsiteId(vendorId, undefined)
        setStoredEditingTemplateKey(vendorId, undefined)
      }

      toast.success('Website deleted')
      setDeleteTarget(null)
      await loadWorkspace()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete website')
    } finally {
      setDeletingWebsiteId(null)
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

  const getTemplateBlurb = (description?: string) => {
    const text = String(description || 'Use this storefront template to start your site.').trim()
    if (text.length <= 110) return text
    return `${text.slice(0, 107).trimEnd()}...`
  }

  return (
    <>
      <TablePageHeader title='My Websites'>
        <Button
          type='button'
          variant='outline'
          className='shrink-0'
          onClick={loadWorkspace}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='h-4 w-4' />
          )}
          Refresh
        </Button>
        <Button type='button' className='shrink-0' onClick={openCreateDialog}>
          <Plus className='h-4 w-4' />
          Create Website
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <section className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.6fr)_minmax(220px,0.6fr)_minmax(240px,0.8fr)]'>
          <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
              Workspace
            </p>
            <h2 className='mt-2 text-xl font-semibold tracking-tight text-foreground'>
              Manage storefront websites for {vendorName}
            </h2>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>
              Create a new website from any available template, jump straight into the builder,
              and manage every preview link from this one page.
            </p>
          </div>

          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Websites
            </p>
            <p className='mt-2 text-3xl font-semibold tracking-tight text-foreground'>
              {websites.length}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>Active website entries in your workspace.</p>
          </div>

          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Templates
            </p>
            <p className='mt-2 text-3xl font-semibold tracking-tight text-foreground'>
              {availableTemplates.length}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>Starting layouts ready for new websites.</p>
          </div>

          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              <MapPinned className='h-3.5 w-3.5' />
              Preview City
            </div>
            <Select
              value={selectedCitySlug || 'all'}
              onValueChange={(value) => {
                setPreviewCityTouched(true)
                setSelectedCitySlug(value)
              }}
            >
              <SelectTrigger className='mt-3 h-11 w-full rounded-xl'>
                <SelectValue placeholder='Select city' />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='mt-3 text-sm text-muted-foreground'>
              Preview URLs and page editors will open for {selectedCityOption.label}.
            </p>
            <div className='mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'>
              <Package2 className='h-3.5 w-3.5' />
              {visibleProductsCount} products visible
            </div>
          </div>
        </section>

        <section className='space-y-4'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight text-foreground'>Created Websites</h2>
            <p className='text-sm text-muted-foreground'>
              Preview, edit, and review city-specific product visibility from here.
            </p>
          </div>

          {loading ? (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={`${cardClass} h-[420px] animate-pulse bg-muted/30`} />
              ))}
            </div>
          ) : websites.length ? (
            <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
              {websites.map((website) => {
                const templateKey = String(website.template_key || '').trim()
                const websiteTemplate = templateByKey.get(templateKey)
                const previewUrl = getVendorTemplatePreviewUrl(
                  vendorPublicIdentifier || vendorId,
                  templateKey,
                  selectedCitySlug || effectiveDefaultCitySlug || vendorDefaultCitySlug,
                  website.website_slug || website._id
                )
                const thumbnail = website.previewImage || websiteTemplate?.previewImage || ''
                const visibleProducts = getVisibleProductsForWebsite(website._id)
                const visibleProductLabels = visibleProducts
                  .slice(0, 4)
                  .map((product) => String(product.productName || 'Untitled Product').trim())
                  .filter(Boolean)

                return (
                  <article key={website._id} className={cardClass}>
                    <div className='relative'>
                      <StorefrontThumbnail
                        title={website.name || website.template_name || 'Website preview'}
                        previewUrl={previewUrl}
                        fallbackImage={thumbnail}
                        className='transition duration-300 group-hover:scale-[1.02]'
                      />

                      <div className='absolute inset-x-0 top-0 flex items-start justify-between p-4'>
                        <div className='inline-flex rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur'>
                          {website.template_name || websiteTemplate?.name || templateKey}
                        </div>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(website)}
                          className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/90 text-destructive shadow-sm transition hover:bg-white'
                          aria-label={`Delete ${website.name || website.business_name || 'website'}`}
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </div>

                    <div className='flex flex-1 flex-col gap-4 p-5'>
                      <div>
                        <h3 className='truncate text-xl font-semibold text-foreground'>
                          {website.name || website.business_name || 'Untitled Website'}
                        </h3>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          Created {formatDate(website.createdAt)}
                        </p>
                      </div>

                      <div className='rounded-2xl border border-border bg-background/70 p-3'>
                        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                          <Globe className='h-3.5 w-3.5' />
                          Preview URL
                        </div>
                        <div className='mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground'>
                          <Building2 className='h-3 w-3' />
                          {selectedCityOption.label}
                        </div>
                        <p className='mt-2 break-all text-sm leading-6 text-foreground'>
                          {previewUrl || 'Preview not available'}
                        </p>
                      </div>

                      <div className='rounded-2xl border border-border bg-background/70 p-3'>
                        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                          <Package2 className='h-3.5 w-3.5' />
                          Visible Products
                        </div>
                        <p className='mt-2 text-sm font-medium text-foreground'>
                          {visibleProducts.length} products in {selectedCityOption.label}
                        </p>
                        {visibleProductLabels.length ? (
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {visibleProductLabels.map((label) => (
                              <span
                                key={`${website._id}-${label}`}
                                className='inline-flex max-w-full items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground'
                              >
                                <span className='truncate'>{label}</span>
                              </span>
                            ))}
                            {visibleProducts.length > visibleProductLabels.length ? (
                              <span className='inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground'>
                                +{visibleProducts.length - visibleProductLabels.length} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className='mt-2 text-sm text-muted-foreground'>
                            No products mapped to this website for {selectedCityOption.label}.
                          </p>
                        )}
                      </div>

                      <div className='mt-auto grid gap-3 sm:grid-cols-2'>
                        <Button
                          type='button'
                          onClick={() => handleEditWebsite(website)}
                          className='h-11 w-full rounded-2xl'
                        >
                          <PencilLine className='h-4 w-4' />
                          Edit Website
                        </Button>

                        {previewUrl ? (
                          <a href={previewUrl} target='_blank' rel='noreferrer' className='block'>
                            <Button type='button' variant='outline' className='h-11 w-full rounded-2xl'>
                              <ExternalLink className='h-4 w-4' />
                              Open Preview
                            </Button>
                          </a>
                        ) : (
                          <Button
                            type='button'
                            variant='outline'
                            className='h-11 w-full rounded-2xl'
                            disabled
                          >
                            <ExternalLink className='h-4 w-4' />
                            Preview Unavailable
                          </Button>
                        )}
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                            Edit Pages
                          </p>
                          <span className='text-xs text-muted-foreground'>
                            {selectedCityOption.label}
                          </span>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {[
                            ['Home', 'home'],
                            ['About', 'about'],
                            ['Contact', 'contact'],
                            ['Pages', 'pages'],
                            ['Social + FAQ', 'other'],
                          ].map(([label, page]) => (
                            <Button
                              key={`${website._id}-${page}`}
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-9 rounded-full'
                              onClick={() =>
                                openWebsiteEditor(website, page as WorkspaceEditorPage)
                              }
                            >
                              <PencilLine className='h-3.5 w-3.5' />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className='rounded-[24px] border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm'>
              <LayoutTemplate className='mx-auto h-10 w-10 text-muted-foreground' />
              <h3 className='mt-4 text-xl font-semibold text-foreground'>No websites created yet</h3>
              <p className='mt-2 text-sm text-muted-foreground'>
                Create your first website from a template and it will appear here with its preview
                link and edit access.
              </p>
              <Button type='button' onClick={openCreateDialog} className='mt-6 h-11 rounded-2xl'>
                <Plus className='h-4 w-4' />
                Create First Website
              </Button>
            </div>
          )}
        </section>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='w-[min(96vw,1120px)] max-w-[min(96vw,1120px)] gap-0 overflow-hidden rounded-2xl border-border/70 p-0 sm:max-w-[min(96vw,1120px)]'>
          <div className='flex max-h-[90vh] flex-col'>
            <DialogHeader className='border-b border-border px-6 py-5 text-left sm:px-8'>
              <DialogTitle className='text-2xl font-semibold tracking-tight text-foreground'>
                Create Website
              </DialogTitle>
              <DialogDescription className='max-w-3xl text-sm leading-6'>
                Give your website a name, choose one template, and continue directly to the builder.
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto px-6 py-6 sm:px-8'>
              <div className='space-y-6'>
                <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                  <label className='mb-3 block text-sm font-medium text-foreground'>
                    Website Name
                  </label>
                  <Input
                    value={websiteName}
                    onChange={(event) => setWebsiteName(event.target.value)}
                    placeholder='Example: Dust Filter India Storefront'
                    className='h-12 rounded-2xl'
                  />
                  <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                    This name will help you identify the website later in your dashboard.
                  </p>
                </div>

                <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <h3 className='text-lg font-semibold text-foreground'>Choose a Template</h3>
                      <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                        Pick one clean starting point. You can edit the website later, but you
                        cannot switch its template after creation.
                      </p>
                    </div>
                    <div className='inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'>
                      {availableTemplates.length} templates
                    </div>
                  </div>

                  <div className='mt-5 grid grid-cols-[repeat(auto-fit,minmax(260px,320px))] justify-center gap-4'>
                    {availableTemplates.map((template) => {
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
                          className={`group mx-auto flex h-full w-full max-w-[320px] min-h-[220px] flex-col overflow-hidden rounded-2xl border bg-background text-left shadow-sm transition ${
                            isSelected
                              ? 'border-primary ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/40 hover:shadow-md'
                          }`}
                        >
                          <div className='relative overflow-hidden bg-muted'>
                            <StorefrontThumbnail
                              title={template.name}
                              previewUrl={previewUrl}
                              fallbackImage={template.previewImage}
                              className='aspect-[16/9] transition duration-300 group-hover:scale-[1.02]'
                            />
                            {isSelected ? (
                              <div className='absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm'>
                                <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                                Selected
                              </div>
                            ) : null}
                          </div>

                          <div className='flex flex-1 flex-col p-4'>
                            <div>
                              <h4 className='text-base font-semibold leading-snug text-foreground'>
                                {template.name}
                              </h4>
                              <p className='mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                                {template.key}
                              </p>
                            </div>

                            <p className='mt-3 flex-1 text-sm leading-6 text-muted-foreground'>
                              {getTemplateBlurb(template.description)}
                            </p>

                            <div className='mt-3'>
                              <div
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 className='h-3.5 w-3.5' />
                                    Selected for this website
                                  </>
                                ) : (
                                  'Click to use this template'
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4 sm:px-8'>
              <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type='button' onClick={handleCreateWebsite} disabled={!canCreateWebsite}>
                {creating ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                Create Website
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deletingWebsiteId) {
            if (!open) setDeleteTarget(null)
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
            <p>You can create a new website again later, but this deleted website cannot be restored.</p>
          </div>
        }
        destructive
        confirmText='Delete Website'
        cancelBtnText='Cancel'
        isLoading={Boolean(deletingWebsiteId)}
        handleConfirm={handleDeleteWebsite}
      />
    </>
  )
}
