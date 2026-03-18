import { Link } from '@tanstack/react-router'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  Loader2,
  MapPinned,
  Package2,
  PencilLine,
  RefreshCw,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { getVendorTemplateProductUrl } from '@/lib/storefront-url'
import { cn } from '@/lib/utils'
import type { AppDispatch } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'

type CityRow = {
  _id: string
  name: string
  slug: string
  state?: string
  country?: string
  isActive?: boolean
}

type WebsiteCard = {
  _id: string
  name?: string
  business_name?: string
  template_name?: string
  website_slug?: string
}

type ProductVariant = {
  actualPrice?: number
  finalPrice?: number
  stockQuantity?: number
}

type ProductImage = {
  url?: string
}

type CityOverrideSummary = {
  city?: unknown
  citySlug?: string
  cityName?: string
  productName?: string
  brand?: string
  slug?: string
  shortDescription?: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  updatedAt?: string
}

type VendorProduct = {
  _id: string
  productName?: string
  slug?: string
  brand?: string
  shortDescription?: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  availableCities?: unknown[]
  websiteIds?: unknown[]
  cityContentOverrides?: CityOverrideSummary[]
  variants?: ProductVariant[]
  defaultImages?: ProductImage[]
  isAvailable?: boolean
  updatedAt?: string
  cityContentMeta?: {
    scope?: 'global' | 'city'
  }
}

type EditorForm = {
  productName: string
  brand: string
  slug: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
}

type EditorScope = 'global' | 'city'

type EditorFormsState = Record<EditorScope, EditorForm>

const REQUEST_TIMEOUT_MS = 10000
const EMPTY_EDITOR_FORM: EditorForm = {
  productName: '',
  brand: '',
  slug: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
}

const EMPTY_EDITOR_FORMS: EditorFormsState = {
  global: EMPTY_EDITOR_FORM,
  city: EMPTY_EDITOR_FORM,
}

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const normalizeCitySlug = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatCityLabel = (value: unknown) => {
  const slug = normalizeCitySlug(value)
  if (!slug) return 'Selected City'

  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const toIdString = (value: unknown) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const record = value as {
      _id?: unknown
      id?: unknown
      toString?: () => string
    }
    if (record._id) return String(record._id)
    if (record.id) return String(record.id)
    if (typeof record.toString === 'function') return record.toString()
  }
  return String(value)
}

const extractIdList = (values: unknown) => {
  if (!Array.isArray(values)) return []

  return values
    .map((value) => normalizeText(toIdString(value)))
    .filter(Boolean)
}

const uniqueIds = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const parseKeywordInput = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const formatDate = (value?: string) => {
  const rawValue = normalizeText(value)
  if (!rawValue) return 'Recently updated'

  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return 'Recently updated'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const getPrimaryImageUrl = (product?: VendorProduct) =>
  normalizeText(product?.defaultImages?.[0]?.url)

const getTotalStock = (variants?: ProductVariant[]) =>
  Array.isArray(variants)
    ? variants.reduce((sum, variant) => sum + Number(variant?.stockQuantity || 0), 0)
    : 0

const getPriceRangeLabel = (variants?: ProductVariant[]) => {
  const prices = (variants || [])
    .map((variant) => Number(variant?.finalPrice ?? variant?.actualPrice ?? 0))
    .filter((price) => Number.isFinite(price) && price >= 0)

  if (!prices.length) return 'Price unavailable'

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })

  return minPrice === maxPrice
    ? formatter.format(minPrice)
    : `${formatter.format(minPrice)} - ${formatter.format(maxPrice)}`
}

const getProductCityOverride = (
  product: VendorProduct,
  cityId: string,
  citySlug: string
) =>
  (Array.isArray(product.cityContentOverrides)
    ? product.cityContentOverrides
    : []
  ).find((override) => {
    const overrideCityId = normalizeText(toIdString(override?.city))
    const overrideCitySlug = normalizeCitySlug(override?.citySlug)

    return Boolean(
      (cityId && overrideCityId === cityId) ||
        (citySlug && overrideCitySlug === citySlug)
    )
  }) || null

const resolveMappedCityIds = (product: VendorProduct, activeCityIds: string[] = []) =>
  uniqueIds(
    extractIdList(product.availableCities).filter(
      (mappedCityId) =>
        !activeCityIds.length || activeCityIds.includes(mappedCityId)
    )
  )

const isProductVisibleInCity = (product: VendorProduct, cityId: string) => {
  if (!cityId) return false
  return resolveMappedCityIds(product).includes(cityId)
}

const resolveCityIdsForUpdate = (
  product: VendorProduct,
  activeCityIds: string[],
  cityId: string,
  nextVisible: boolean
) => {
  const baseCityIds = resolveMappedCityIds(product, activeCityIds)

  if (nextVisible) {
    return uniqueIds([...baseCityIds, cityId])
  }

  return uniqueIds(baseCityIds.filter((mappedCityId) => mappedCityId !== cityId))
}

const areIdListsEqual = (left: string[], right: string[]) => {
  const normalizedLeft = uniqueIds(left).sort()
  const normalizedRight = uniqueIds(right).sort()

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

const toEditorForm = (
  source?: Partial<EditorForm> | Partial<CityOverrideSummary> | Partial<VendorProduct> | null,
  fallback?: Partial<EditorForm> | Partial<CityOverrideSummary> | Partial<VendorProduct> | null
): EditorForm => ({
  productName: normalizeText(source?.productName ?? fallback?.productName),
  brand: normalizeText(source?.brand ?? fallback?.brand),
  slug: normalizeText(source?.slug ?? fallback?.slug),
  shortDescription: normalizeText(
    source?.shortDescription ?? fallback?.shortDescription
  ),
  description: normalizeText(source?.description ?? fallback?.description),
  metaTitle: normalizeText(source?.metaTitle ?? fallback?.metaTitle),
  metaDescription: normalizeText(
    source?.metaDescription ?? fallback?.metaDescription
  ),
  metaKeywords: Array.isArray(source?.metaKeywords)
    ? source.metaKeywords.join(', ')
    : Array.isArray(fallback?.metaKeywords)
      ? fallback.metaKeywords.join(', ')
      : '',
})

const buildEditorPayload = (form: EditorForm) => ({
  productName: form.productName.trim(),
  brand: form.brand.trim(),
  slug: form.slug.trim(),
  shortDescription: form.shortDescription.trim(),
  description: form.description.trim(),
  metaTitle: form.metaTitle.trim(),
  metaDescription: form.metaDescription.trim(),
  metaKeywords: parseKeywordInput(form.metaKeywords),
})

const getWebsiteLabel = (website?: WebsiteCard | null) =>
  normalizeText(website?.name || website?.business_name || website?.template_name) ||
  'Untitled Website'

function ProductThumbnail({
  product,
}: {
  product: VendorProduct
}) {
  const imageUrl = getPrimaryImageUrl(product)

  if (!imageUrl) {
    return (
      <div className='flex h-14 w-14 items-center justify-center border border-dashed border-border bg-muted/30 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
        Page
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={product.productName || 'Product page'}
      className='h-14 w-14 border border-border object-cover'
    />
  )
}

export default function LocationWorkspacePage() {
  const dispatch = useDispatch<AppDispatch>()
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const token = useSelector((state: any) => state.auth?.token || '')

  const vendorId = normalizeText(
    authUser?.id ||
      authUser?._id ||
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id
  )
  const vendorName =
    normalizeText(
      vendorProfile?.name ||
        vendorProfile?.business_name ||
        authUser?.name ||
        authUser?.business_name
    ) || 'your storefront'
  const vendorPublicIdentifier = normalizeText(
    vendorProfile?.username || authUser?.username || vendorId
  )

  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<CityRow[]>([])
  const [websites, setWebsites] = useState<WebsiteCard[]>([])
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [search, setSearch] = useState('')
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('all')
  const [selectedCitySlug, setSelectedCitySlug] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [togglingProductId, setTogglingProductId] = useState('')
  const [bulkAction, setBulkAction] = useState<'show' | 'hide' | ''>('')
  const [statsOpen, setStatsOpen] = useState(false)
  const [defaultCitySaving, setDefaultCitySaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorProductId, setEditorProductId] = useState('')
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSaving, setEditorSaving] = useState(false)
  const [editorScope, setEditorScope] = useState<EditorScope>('global')
  const [editorForms, setEditorForms] = useState<EditorFormsState>(EMPTY_EDITOR_FORMS)
  const [editorCityIds, setEditorCityIds] = useState<string[]>([])

  const activeCities = useMemo(
    () =>
      [...cities]
        .filter((city) => city?.isActive !== false)
        .sort((left, right) =>
          String(left?.name || '').localeCompare(String(right?.name || ''), undefined, {
            sensitivity: 'base',
          })
        ),
    [cities]
  )
  const activeCityIds = useMemo(
    () => activeCities.map((city) => normalizeText(city._id)).filter(Boolean),
    [activeCities]
  )
  const websiteById = useMemo(
    () => new Map(websites.map((website) => [normalizeText(website._id), website])),
    [websites]
  )

  const vendorDefaultCitySlug = normalizeCitySlug(
    vendorProfile?.default_city_slug ||
      authUser?.default_city_slug ||
      vendorProfile?.city ||
      authUser?.city
  )

  const selectedCity = useMemo(
    () =>
      activeCities.find(
        (city) => normalizeCitySlug(city.slug || city.name) === selectedCitySlug
      ) || null,
    [activeCities, selectedCitySlug]
  )
  const selectedCityId = normalizeText(selectedCity?._id)
  const selectedCityLabel = selectedCity?.name || formatCityLabel(selectedCitySlug)
  const isSelectedCityDefault =
    Boolean(selectedCitySlug) &&
    Boolean(vendorDefaultCitySlug) &&
    selectedCitySlug === vendorDefaultCitySlug

  const selectedProduct = useMemo(
    () =>
      products.find((product) => normalizeText(product._id) === editorProductId) || null,
    [editorProductId, products]
  )

  const websiteOptions = useMemo(
    () => [
      { value: 'all', label: 'All websites' },
      ...websites.map((website) => ({
        value: normalizeText(website._id),
        label: getWebsiteLabel(website),
      })),
    ],
    [websites]
  )

  const resetEditorState = useCallback(() => {
    setEditorProductId('')
    setEditorScope('global')
    setEditorForms(EMPTY_EDITOR_FORMS)
    setEditorCityIds([])
    setEditorLoading(false)
    setEditorSaving(false)
  }, [])

  const editorForm = editorForms[editorScope] || EMPTY_EDITOR_FORM

  const loadWorkspace = useCallback(async () => {
    if (!vendorId || !token) {
      setLoading(false)
      setCities([])
      setProducts([])
      setWebsites([])
      return
    }

    setLoading(true)
    try {
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT_MS,
      }

      const [citiesResult, productsResult, websitesResult] = await Promise.allSettled([
        axios.get(`${BASE_URL}/v1/cities?includeInactive=true`, requestConfig),
        axios.get(`${BASE_URL}/v1/products/vendor/${vendorId}`, requestConfig),
        axios.get(
          `${BASE_URL}/v1/templates/by-vendor?vendor_id=${encodeURIComponent(vendorId)}`,
          requestConfig
        ),
      ])

      const nextCities =
        citiesResult.status === 'fulfilled' &&
        Array.isArray(citiesResult.value.data?.data)
          ? (citiesResult.value.data.data as CityRow[])
          : []
      const nextProducts =
        productsResult.status === 'fulfilled' &&
        Array.isArray(productsResult.value.data?.products)
          ? (productsResult.value.data.products as VendorProduct[])
          : []
      const nextWebsites =
        websitesResult.status === 'fulfilled' &&
        Array.isArray(websitesResult.value.data?.data)
          ? (websitesResult.value.data.data as WebsiteCard[])
          : []

      setCities(nextCities)
      setProducts(nextProducts)
      setWebsites(nextWebsites)

      if (citiesResult.status === 'rejected') {
        toast.error(
          citiesResult.reason?.response?.data?.message ||
            citiesResult.reason?.message ||
            'City list load nahi ho payi.'
        )
      }

      if (
        productsResult.status === 'rejected' &&
        productsResult.reason?.response?.status !== 404
      ) {
        toast.error(
          productsResult.reason?.response?.data?.message ||
            productsResult.reason?.message ||
            'Product pages load nahi ho paayi.'
        )
      }

      if (
        websitesResult.status === 'rejected' &&
        websitesResult.reason?.response?.status !== 404
      ) {
        toast.error(
          websitesResult.reason?.response?.data?.message ||
            websitesResult.reason?.message ||
            'Website data load nahi ho paaya.'
        )
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Location workspace load nahi ho paya.'
      )
      setCities([])
      setProducts([])
      setWebsites([])
    } finally {
      setLoading(false)
    }
  }, [token, vendorId])

  useEffect(() => {
    if (!token || vendorProfile) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, token, vendorProfile])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    if (!activeCities.length) {
      setSelectedCitySlug('')
      return
    }

    setSelectedCitySlug((current) => {
      const normalizedCurrent = normalizeCitySlug(current)
      if (
        normalizedCurrent &&
        activeCities.some(
          (city) => normalizeCitySlug(city.slug || city.name) === normalizedCurrent
        )
      ) {
        return normalizedCurrent
      }

      const candidateSlug = normalizeCitySlug(
        vendorProfile?.default_city_slug ||
          authUser?.default_city_slug ||
          vendorProfile?.city ||
          authUser?.city ||
          activeCities[0]?.slug ||
          activeCities[0]?.name
      )

      if (
        candidateSlug &&
        activeCities.some(
          (city) => normalizeCitySlug(city.slug || city.name) === candidateSlug
        )
      ) {
        return candidateSlug
      }

      return normalizeCitySlug(activeCities[0]?.slug || activeCities[0]?.name)
    })
  }, [
    activeCities,
    authUser?.city,
    authUser?.default_city_slug,
    vendorProfile?.city,
    vendorProfile?.default_city_slug,
  ])

  useEffect(() => {
    setPage(1)
  }, [pageSize, search, selectedCitySlug, selectedWebsiteId])

  const filteredProducts = useMemo(() => {
    const query = normalizeSearchValue(search)

    return products.filter((product) => {
      const websiteIds = extractIdList(product.websiteIds)
      const matchesWebsite =
        selectedWebsiteId === 'all' ||
        !websiteIds.length ||
        websiteIds.includes(selectedWebsiteId)

      if (!matchesWebsite) return false
      if (!query) return true

      const override = getProductCityOverride(product, selectedCityId, selectedCitySlug)
      const websiteLabels = websiteIds
        .map((websiteId) => getWebsiteLabel(websiteById.get(websiteId)))
        .join(' ')

      const haystack = [
        product.productName,
        product.brand,
        product.slug,
        product.shortDescription,
        product.description,
        product.metaTitle,
        product.metaDescription,
        Array.isArray(product.metaKeywords) ? product.metaKeywords.join(' ') : '',
        override?.citySlug,
        websiteLabels,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [
    products,
    search,
    selectedCityId,
    selectedCitySlug,
    selectedWebsiteId,
    websiteById,
  ])

  const totalPages = Math.max(Math.ceil(filteredProducts.length / pageSize), 1)
  const currentPage = Math.min(page, totalPages)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredProducts.slice(startIndex, startIndex + pageSize)
  }, [currentPage, filteredProducts, pageSize])

  const visibleInCityCount = useMemo(
    () =>
      filteredProducts.filter((product) =>
        isProductVisibleInCity(product, selectedCityId)
      ).length,
    [filteredProducts, selectedCityId]
  )
  const cityOverrideCount = useMemo(
    () =>
      filteredProducts.filter((product) =>
        Boolean(getProductCityOverride(product, selectedCityId, selectedCitySlug))
      ).length,
    [filteredProducts, selectedCityId, selectedCitySlug]
  )
  const statsItems = useMemo(
    () => [
      {
        label: 'Selected Location',
        value: selectedCityLabel || 'No city selected',
        helper: isSelectedCityDefault
          ? `${vendorName} ki current default city`
          : `${vendorName} ke product pages aur template content isi city ke liye manage ho rahe hain.`,
      },
      {
        label: 'Product Pages',
        value: filteredProducts.length,
        helper: 'Current filters ke andar total product pages.',
      },
      {
        label: `Visible In ${selectedCityLabel}`,
        value: visibleInCityCount,
        helper: 'Ye product pages selected city ke template me dikhengi.',
      },
      {
        label: 'City Overrides',
        value: cityOverrideCount,
        helper: 'In product pages par city-specific content already saved hai.',
      },
    ],
    [
      cityOverrideCount,
      filteredProducts.length,
      isSelectedCityDefault,
      selectedCityLabel,
      vendorName,
      visibleInCityCount,
    ]
  )

  const updateSelectedCityVisibility = useCallback(
    async (product: VendorProduct, nextVisible: boolean) => {
      if (!token) {
        toast.error('Session expire ho gayi hai. Dobara login kijiye.')
        return
      }

      if (!selectedCityId) {
        toast.error('Pehle ek city select kijiye.')
        return
      }

      const nextCityIds = resolveCityIdsForUpdate(
        product,
        activeCityIds,
        selectedCityId,
        nextVisible
      )
      const currentCityIds = resolveCityIdsForUpdate(
        product,
        activeCityIds,
        selectedCityId,
        isProductVisibleInCity(product, selectedCityId)
      )

      if (
        currentCityIds.length === nextCityIds.length &&
        currentCityIds.every((cityId, index) => cityId === nextCityIds[index])
      ) {
        return
      }

      setTogglingProductId(normalizeText(product._id))
      try {
        const response = await fetch(
          `${BASE_URL}/v1/admin/products/${encodeURIComponent(
            normalizeText(product._id)
          )}/content`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              availableCities: nextCityIds,
            }),
          }
        )

        const body = await response.json().catch(() => null)
        if (!response.ok || body?.success === false) {
          throw new Error(
            body?.message || `Failed to update ${product.productName || 'product'}`
          )
        }

        setProducts((currentProducts) =>
          currentProducts.map((currentProduct) =>
            normalizeText(currentProduct._id) === normalizeText(product._id)
              ? {
                  ...currentProduct,
                  availableCities: nextCityIds,
                }
              : currentProduct
          )
        )

        toast.success(
          nextVisible
            ? `${product.productName || 'Product'} ab ${selectedCityLabel} me visible hai.`
            : `${product.productName || 'Product'} ko ${selectedCityLabel} se hide kar diya gaya.`
        )
      } catch (error: any) {
        toast.error(
          error?.message || 'Selected city ke liye product visibility update nahi hui.'
        )
      } finally {
        setTogglingProductId('')
      }
    },
    [activeCityIds, selectedCityId, selectedCityLabel, token]
  )

  const handleBulkVisibilityUpdate = useCallback(
    async (nextVisible: boolean) => {
      if (!token) {
        toast.error('Session expire ho gayi hai. Dobara login kijiye.')
        return
      }

      if (!selectedCityId) {
        toast.error('Bulk update se pehle ek city select kijiye.')
        return
      }

      if (!filteredProducts.length) {
        toast.error('Current filters ke andar koi product page nahi mila.')
        return
      }

      setBulkAction(nextVisible ? 'show' : 'hide')
      try {
        const tasks = filteredProducts.map(async (product) => {
          const nextCityIds = resolveCityIdsForUpdate(
            product,
            activeCityIds,
            selectedCityId,
            nextVisible
          )
          const currentCityIds = resolveCityIdsForUpdate(
            product,
            activeCityIds,
            selectedCityId,
            isProductVisibleInCity(product, selectedCityId)
          )

          if (
            currentCityIds.length === nextCityIds.length &&
            currentCityIds.every((cityId, index) => cityId === nextCityIds[index])
          ) {
            return
          }

          const response = await fetch(
            `${BASE_URL}/v1/admin/products/${encodeURIComponent(
              normalizeText(product._id)
            )}/content`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                availableCities: nextCityIds,
              }),
            }
          )

          const body = await response.json().catch(() => null)
          if (!response.ok || body?.success === false) {
            throw new Error(
              body?.message ||
                `Failed while updating ${product.productName || 'product'}`
            )
          }
        })

        await Promise.all(tasks)
        toast.success(
          nextVisible
            ? `Filtered products ko ${selectedCityLabel} me map kar diya gaya.`
            : `Filtered products ko ${selectedCityLabel} se remove kar diya gaya.`
        )
        await loadWorkspace()
      } catch (error: any) {
        toast.error(
          error?.message || 'Bulk city visibility update complete nahi ho paayi.'
        )
        await loadWorkspace()
      } finally {
        setBulkAction('')
      }
    },
    [
      activeCityIds,
      filteredProducts,
      loadWorkspace,
      selectedCityId,
      selectedCityLabel,
      token,
    ]
  )

  const updateProductByAdmin = useCallback(
    async (productId: string, payload: Record<string, unknown>) => {
      const response = await fetch(
        `${BASE_URL}/v1/admin/products/${encodeURIComponent(productId)}/content`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success === false || !body?.data?._id) {
        throw new Error(body?.message || 'Global product page save nahi ho paayi.')
      }

      return body.data as VendorProduct
    },
    [token]
  )

  const updateProductByCityScope = useCallback(
    async (productId: string, payload: Record<string, unknown>) => {
      const response = await fetch(
        `${BASE_URL}/v1/admin/products/${encodeURIComponent(
          productId
        )}/content/city?cityId=${encodeURIComponent(selectedCityId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success === false || !body?.data?._id) {
        throw new Error(body?.message || 'City page save nahi ho paayi.')
      }

      return body.data as VendorProduct
    },
    [selectedCityId, token]
  )

  const openCityEditor = useCallback(
    async (product: VendorProduct) => {
      if (!selectedCityId) {
        toast.error('Pehle ek city select kijiye.')
        return
      }

      setEditorOpen(true)
      setEditorProductId(normalizeText(product._id))
      setEditorLoading(true)

      try {
        const response = await fetch(
          `${BASE_URL}/v1/products/${encodeURIComponent(
            normalizeText(product._id)
          )}`,
          {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          }
        )

        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.product?._id) {
          throw new Error(body?.message || 'City page load nahi ho paayi.')
        }

        const detail = body.product as VendorProduct
        const cityOverride = getProductCityOverride(
          detail,
          selectedCityId,
          selectedCitySlug
        )
        const globalForm = toEditorForm(detail)
        const cityForm = toEditorForm(cityOverride, detail)

        setEditorForms({
          global: globalForm,
          city: cityForm,
        })
        setEditorCityIds(resolveMappedCityIds(detail, activeCityIds))
        setEditorScope(cityOverride ? 'city' : 'global')
      } catch (error: any) {
        toast.error(error?.message || 'City-specific product page open nahi ho paayi.')
        setEditorOpen(false)
        resetEditorState()
      } finally {
        setEditorLoading(false)
      }
    },
    [activeCityIds, resetEditorState, selectedCityId, selectedCitySlug, token]
  )

  const handleEditorFieldChange = <K extends keyof EditorForm>(
    key: K,
    value: EditorForm[K]
  ) => {
    setEditorForms((current) => ({
      ...current,
      [editorScope]: {
        ...current[editorScope],
        [key]: value,
      },
    }))
  }

  const handleSaveProductContent = useCallback(async () => {
    if (!token) {
      toast.error('Session expire ho gayi hai. Dobara login kijiye.')
      return
    }

    if (!selectedCityId || !selectedProduct) {
      toast.error('Selected city ya product page missing hai.')
      return
    }

    setEditorSaving(true)
    try {
      const productId = normalizeText(selectedProduct._id)
      const nextMappedCityIds = uniqueIds(
        editorCityIds.filter((cityId) => activeCityIds.includes(cityId))
      )
      const currentMappedCityIds = resolveMappedCityIds(selectedProduct, activeCityIds)
      const mappingChanged = !areIdListsEqual(currentMappedCityIds, nextMappedCityIds)

      if (editorScope === 'city' && !nextMappedCityIds.includes(selectedCityId)) {
        toast.error(
          `${selectedCityLabel} ko mapped cities me select kijiye ya Global Content par switch kijiye.`
        )
        return
      }

      let latestGlobalProduct =
        mappingChanged || editorScope === 'global'
          ? await updateProductByAdmin(productId, {
              ...(editorScope === 'global' ? buildEditorPayload(editorForms.global) : {}),
              availableCities: nextMappedCityIds,
            })
          : null

      if (editorScope === 'city') {
        const nextCityProduct = await updateProductByCityScope(
          productId,
          buildEditorPayload(editorForms.city)
        )
        const nextOverride = getProductCityOverride(
          nextCityProduct,
          selectedCityId,
          selectedCitySlug
        )
        const globalSource = latestGlobalProduct || selectedProduct

        setEditorForms({
          global: toEditorForm(globalSource),
          city: toEditorForm(nextOverride, nextCityProduct),
        })
        setEditorScope('city')
        toast.success(
          `${selectedProduct.productName || 'Product'} ka ${selectedCityLabel} city page update ho gaya.`
        )
      } else {
        latestGlobalProduct = latestGlobalProduct || selectedProduct
        setEditorForms((current) => ({
          ...current,
          global: toEditorForm(latestGlobalProduct),
          city: current.city,
        }))
        toast.success(
          `${selectedProduct.productName || 'Product'} ka global page update ho gaya.`
        )
      }

      setEditorCityIds(nextMappedCityIds)

      await loadWorkspace()
    } catch (error: any) {
      toast.error(
        error?.message || 'Product content save karte waqt error aayi.'
      )
    } finally {
      setEditorSaving(false)
    }
  }, [
    activeCityIds,
    editorCityIds,
    editorForms,
    editorScope,
    loadWorkspace,
    selectedCityId,
    selectedCityLabel,
    selectedCitySlug,
    selectedProduct,
    token,
    updateProductByAdmin,
    updateProductByCityScope,
  ])

  const handleSetDefaultCity = useCallback(async () => {
    if (!token) {
      toast.error('Session expire ho gayi hai. Dobara login kijiye.')
      return
    }

    if (!selectedCityId) {
      toast.error('Default set karne ke liye ek city select kijiye.')
      return
    }

    setDefaultCitySaving(true)
    try {
      const response = await fetch(`${BASE_URL}/v1/vendor/profile/default-city`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cityId: selectedCityId,
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success === false) {
        throw new Error(body?.message || 'Default city update nahi ho paayi.')
      }

      if (body?.vendor) {
        dispatch(
          setUser({
            ...(authUser || {}),
            ...body.vendor,
          })
        )
      }
      await dispatch(fetchVendorProfile())

      toast.success(`${selectedCityLabel} ab aapki default city hai.`)
    } catch (error: any) {
      toast.error(error?.message || 'Default city update nahi ho paayi.')
    } finally {
      setDefaultCitySaving(false)
    }
  }, [authUser, dispatch, selectedCityId, selectedCityLabel, token])

  const previewUrl = useMemo(() => {
    if (!selectedProduct || !vendorPublicIdentifier || !selectedCitySlug) return undefined

    const preferredWebsiteId =
      selectedWebsiteId !== 'all'
        ? selectedWebsiteId
        : extractIdList(selectedProduct.websiteIds)[0] || normalizeText(websites[0]?._id)

    const preferredWebsite = websiteById.get(preferredWebsiteId)
    const websiteIdentifier =
      normalizeText(preferredWebsite?.website_slug) || preferredWebsiteId
    const productIdentifier =
      normalizeText(selectedProduct.slug) || normalizeText(selectedProduct._id)

    return getVendorTemplateProductUrl(
      vendorPublicIdentifier,
      productIdentifier,
      selectedCitySlug,
      websiteIdentifier
    )
  }, [
    selectedCitySlug,
    selectedProduct,
    selectedWebsiteId,
    vendorPublicIdentifier,
    websiteById,
    websites,
  ])

  const editorSelectedCityVisible =
    Boolean(selectedCityId) && editorCityIds.includes(selectedCityId)
  const editorMappedCityCount = editorCityIds.filter((cityId) =>
    activeCityIds.includes(cityId)
  ).length

  return (
    <>
      <TablePageHeader
        title='Location Workspace'
        stacked
        actionsClassName='gap-2'
        showHeaderChrome={false}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search product page, slug, brand, or website'
          className='h-10 w-[340px] shrink-0'
        />
        <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
          <SelectTrigger className='h-10 w-[220px] shrink-0'>
            <SelectValue placeholder='All websites' />
          </SelectTrigger>
          <SelectContent>
            {websiteOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCitySlug} onValueChange={setSelectedCitySlug}>
          <SelectTrigger className='h-10 w-[220px] shrink-0'>
            <SelectValue placeholder='Select city' />
          </SelectTrigger>
          <SelectContent>
            {activeCities.map((city) => (
              <SelectItem
                key={normalizeText(city._id)}
                value={normalizeCitySlug(city.slug || city.name)}
              >
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type='button'
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => void handleSetDefaultCity()}
          disabled={defaultCitySaving || !selectedCityId || isSelectedCityDefault}
        >
          {defaultCitySaving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : null}
          {isSelectedCityDefault ? 'Default City' : 'Make Default'}
        </Button>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => void loadWorkspace()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => setStatsOpen(true)}
          disabled={!activeCities.length}
        >
          Statistics
        </Button>
        <Button asChild variant='outline' className='h-10 shrink-0'>
          <Link to='/cities'>Manage Cities</Link>
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {!activeCities.length ? (
          <section className='border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm'>
            <MapPinned className='mx-auto h-10 w-10 text-muted-foreground' />
            <h2 className='mt-4 text-2xl font-semibold text-foreground'>
              Location Workspace start karne ke liye city list chahiye
            </h2>
            <p className='mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground'>
              Pehle vendor ke active cities add kijiye. Uske baad aap har product page ko
              selected city ke hisaab se visible, hidden, aur customized content ke saath
              manage kar sakenge.
            </p>
            <Button asChild className='mt-6 h-11'>
              <Link to='/cities'>Open Manage Cities</Link>
            </Button>
          </section>
        ) : (
          <TableShell
              className='flex-1'
              title={`Product Pages for ${selectedCityLabel}`}
              description='Yahin se selected city ke liye product visibility aur page content manage kijiye.'
              footer={
                <ServerPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProducts.length}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 20, 30, 50]}
                  onPageChange={(nextPage) => {
                    setPage(nextPage)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  onPageSizeChange={setPageSize}
                  disabled={loading}
                />
              }
            >
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-background/60 p-4'>
                <div>
                  <p className='text-sm font-semibold text-foreground'>
                    Bulk city mapping for filtered products
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Agar ek website me 100 products hain, to un sab ko selected filters ke
                    basis par ek hi click me {selectedCityLabel} me show ya hide kar sakte
                    hain.
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void handleBulkVisibilityUpdate(false)}
                    disabled={loading || bulkAction !== '' || !filteredProducts.length}
                  >
                    {bulkAction === 'hide' ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <MapPinned className='h-4 w-4' />
                    )}
                    Hide Filtered
                  </Button>
                  <Button
                    type='button'
                    onClick={() => void handleBulkVisibilityUpdate(true)}
                    disabled={loading || bulkAction !== '' || !filteredProducts.length}
                  >
                    {bulkAction === 'show' ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Package2 className='h-4 w-4' />
                    )}
                    Show Filtered
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='min-w-[280px]'>Product Page</TableHead>
                    <TableHead className='min-w-[200px]'>Websites</TableHead>
                    <TableHead className='min-w-[180px]'>Visible In City</TableHead>
                    <TableHead className='min-w-[190px]'>Content Source</TableHead>
                    <TableHead className='min-w-[180px]'>Last Updated</TableHead>
                    <TableHead className='text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-24 text-center'>
                        <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Location workspace load ho raha hai...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
                        {products.length === 0
                          ? 'Abhi tak koi product page nahi mili.'
                          : 'Current filters ke liye koi product page match nahi hui.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => {
                      const productId = normalizeText(product._id)
                      const websiteIds = extractIdList(product.websiteIds)
                      const visibleInCity = isProductVisibleInCity(
                        product,
                        selectedCityId
                      )
                      const mappedCityCount = resolveMappedCityIds(
                        product,
                        activeCityIds
                      ).length
                      const cityOverride = getProductCityOverride(
                        product,
                        selectedCityId,
                        selectedCitySlug
                      )

                      return (
                        <TableRow key={productId}>
                          <TableCell>
                            <div className='flex items-center gap-3'>
                              <ProductThumbnail product={product} />
                              <div className='min-w-0'>
                                <div className='truncate text-sm font-semibold text-foreground'>
                                  {product.productName || 'Untitled Product'}
                                </div>
                                <p className='mt-1 truncate text-xs text-muted-foreground'>
                                  {product.brand || 'No brand'} •{' '}
                                  {product.slug || 'slug unavailable'}
                                </p>
                                <p className='mt-1 text-xs text-muted-foreground'>
                                  {getPriceRangeLabel(product.variants)} • Stock{' '}
                                  {getTotalStock(product.variants)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className='flex flex-wrap gap-1.5'>
                              {websiteIds.length ? (
                                websiteIds.map((websiteId) => (
                                  <Badge
                                    key={`${productId}-${websiteId}`}
                                    variant='secondary'
                                  >
                                    {getWebsiteLabel(websiteById.get(websiteId))}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant='outline'>
                                  All websites
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className='flex min-w-[160px] items-center gap-3'>
                              <Switch
                                checked={visibleInCity}
                                onCheckedChange={(checked) =>
                                  void updateSelectedCityVisibility(product, checked)
                                }
                                disabled={
                                  togglingProductId === productId || bulkAction !== ''
                                }
                              />
                              <div>
                                <div
                                  className={cn(
                                    'text-sm font-semibold',
                                    visibleInCity
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                  )}
                                >
                                  {togglingProductId === productId
                                    ? 'Saving...'
                                    : visibleInCity
                                      ? 'Visible'
                                      : 'Hidden'}
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                  {visibleInCity
                                    ? `Template me ${selectedCityLabel} ke liye dikh raha hai`
                                    : `Template se ${selectedCityLabel} me hidden hai`}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  {mappedCityCount
                                    ? `${mappedCityCount} cities mapped`
                                    : 'No city mapped yet'}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={cn(
                                'border px-3 py-1',
                                cityOverride
                                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                              )}
                            >
                              {cityOverride ? 'City override' : 'Global content'}
                            </Badge>
                            <p className='mt-2 text-xs text-muted-foreground'>
                              {cityOverride
                                ? `${selectedCityLabel} ke liye alag page content saved hai`
                                : 'Ye city abhi global product page content use kar rahi hai'}
                            </p>
                          </TableCell>

                          <TableCell className='text-sm text-muted-foreground'>
                            {formatDate(cityOverride?.updatedAt || product.updatedAt)}
                          </TableCell>

                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-2'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => void openCityEditor(product)}
                              >
                                <PencilLine className='h-4 w-4' />
                                Edit Page
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
          </TableShell>
        )}
      </Main>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title={`Location Statistics • ${selectedCityLabel}`}
        description='Location workspace ke summary metrics popup me yahin available rahenge.'
        items={statsItems}
      />

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            resetEditorState()
          }
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-3xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <div className='flex flex-wrap items-center gap-2'>
              <SheetTitle>
                {selectedProduct?.productName || 'Product Page'} • {selectedCityLabel}
              </SheetTitle>
              <Badge
                className={cn(
                  'border px-3 py-1',
                  editorScope === 'city'
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                )}
              >
                {editorScope === 'city' ? 'City-scoped content' : 'Global content'}
              </Badge>
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant={editorScope === 'global' ? 'default' : 'outline'}
                onClick={() => setEditorScope('global')}
              >
                Global Content
              </Button>
              <Button
                type='button'
                size='sm'
                variant={editorScope === 'city' ? 'default' : 'outline'}
                onClick={() => setEditorScope('city')}
              >
                {selectedCityLabel} Content
              </Button>
            </div>
            <SheetDescription>
              {editorScope === 'city'
                ? `Is mode me jo bhi save hoga, wo sirf ${selectedCityLabel} ke product page ke liye apply hoga.`
                : 'Is mode me jo bhi save hoga, wo global product page par apply hoga aur jahan city override nahi hoga wahan yehi content use hoga.'}
            </SheetDescription>
          </SheetHeader>

          <div className='flex-1 overflow-y-auto px-5 py-5'>
            {editorLoading ? (
              <div className='flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Product page load ho rahi hai...
              </div>
            ) : selectedProduct ? (
              <div className='space-y-6'>
                <section className='grid gap-4 border border-border bg-background/70 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center'>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>
                      {editorScope === 'city' ? 'Selected City Status' : 'City Mapping'}
                    </p>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {editorScope === 'city'
                        ? `Ab jo bhi changes save honge, wo sirf ${selectedCityLabel} ke liye apply honge.`
                        : 'Ek hi product ko multiple cities me show karne ke liye yahin city list select kijiye. Global content sab mapped cities me use hoga, aur city mode selected city ke liye override save karega.'}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge
                      className={cn(
                        'border px-3 py-1',
                        editorSelectedCityVisible
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      )}
                    >
                      {editorSelectedCityVisible
                        ? 'Visible in selected city'
                        : 'Hidden in selected city'}
                    </Badge>
                    {editorScope === 'global' ? (
                      <Badge variant='outline' className='px-3 py-1'>
                        {editorMappedCityCount} cities mapped
                      </Badge>
                    ) : null}
                    {!editorSelectedCityVisible ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() =>
                          setEditorCityIds((current) =>
                            uniqueIds([...current, selectedCityId])
                          )
                        }
                      >
                        <Package2 className='h-4 w-4' />
                        Include {selectedCityLabel}
                      </Button>
                    ) : null}
                    {previewUrl && editorSelectedCityVisible ? (
                      <a href={previewUrl} target='_blank' rel='noreferrer'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                        >
                          <ExternalLink className='h-4 w-4' />
                          Preview
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </section>

                {editorScope === 'global' ? (
                  <section className='grid gap-4 border border-border bg-card p-5'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div>
                        <h3 className='text-lg font-semibold text-foreground'>
                          Show Product In Cities
                        </h3>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          Jitni cities select hongi, product utni cities ke template pages me
                          visible hoga.
                        </p>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => setEditorCityIds(activeCityIds)}
                        >
                          All Active Cities
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setEditorCityIds(selectedCityId ? [selectedCityId] : [])
                          }
                          disabled={!selectedCityId}
                        >
                          Only {selectedCityLabel}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => setEditorCityIds([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    <div className='grid gap-2 md:grid-cols-2'>
                      {activeCities.map((city) => {
                        const cityId = normalizeText(city._id)
                        const checked = editorCityIds.includes(cityId)

                        return (
                          <label
                            key={cityId}
                            className='flex items-center gap-3 border border-border px-3 py-3'
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(checkedState) => {
                                setEditorCityIds((current) =>
                                  checkedState === true
                                    ? uniqueIds([...current, cityId])
                                    : current.filter((item) => item !== cityId)
                                )
                              }}
                            />
                            <div className='min-w-0'>
                              <div className='text-sm font-medium text-foreground'>
                                {city.name}
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {normalizeCitySlug(city.slug || city.name) === selectedCitySlug
                                  ? 'Current workspace city'
                                  : city.state || city.country || 'Active city'}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    <p className='text-xs text-muted-foreground'>
                      {editorCityIds.length
                        ? `${editorCityIds.length} cities selected.`
                        : 'Abhi koi city selected nahi hai. Save karne par product sab city templates se hidden ho jayega.'}
                    </p>
                  </section>
                ) : !editorSelectedCityVisible ? (
                  <section className='grid gap-3 border border-amber-200 bg-amber-50/50 p-4'>
                    <p className='text-sm text-amber-800'>
                      City-scoped content save karne ke liye {selectedCityLabel} ko visible
                      rakhna zaroori hai.
                    </p>
                    <div>
                      <Button
                        type='button'
                        size='sm'
                        onClick={() =>
                          setEditorCityIds((current) =>
                            uniqueIds([...current, selectedCityId])
                          )
                        }
                      >
                        <Package2 className='h-4 w-4' />
                        Show In {selectedCityLabel}
                      </Button>
                    </div>
                  </section>
                ) : null}

                <section className='grid gap-4 border border-border bg-card p-5'>
                  <div>
                    <h3 className='text-lg font-semibold text-foreground'>Page Content</h3>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {editorScope === 'city'
                        ? `Ye fields ${selectedCityLabel} ke product page content ko control karengi.`
                        : 'Ye fields global product page content ko control karengi.'}
                    </p>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      Global content me <code>{'{{city}}'}</code> use kar sakte hain. Agar
                      kisi mapped city ka naam content me likha hoga to storefront par
                      selected URL city ke hisaab se auto replace ho jayega.
                    </p>
                  </div>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='location-workspace-product-name'>Product Name</Label>
                      <Input
                        id='location-workspace-product-name'
                        value={editorForm.productName}
                        onChange={(event) =>
                          handleEditorFieldChange('productName', event.target.value)
                        }
                        placeholder={
                          editorScope === 'city'
                            ? 'City-specific product name'
                            : 'Global product name'
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='location-workspace-brand'>Brand</Label>
                      <Input
                        id='location-workspace-brand'
                        value={editorForm.brand}
                        onChange={(event) =>
                          handleEditorFieldChange('brand', event.target.value)
                        }
                        placeholder='Brand name'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-slug'>Page Slug</Label>
                    <Input
                      id='location-workspace-slug'
                      value={editorForm.slug}
                      onChange={(event) =>
                        handleEditorFieldChange('slug', event.target.value)
                      }
                      placeholder={
                        editorScope === 'city'
                          ? 'city-specific-page-slug'
                          : 'global-page-slug'
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-short-description'>
                      Short Description
                    </Label>
                    <Textarea
                      id='location-workspace-short-description'
                      value={editorForm.shortDescription}
                      onChange={(event) =>
                        handleEditorFieldChange('shortDescription', event.target.value)
                      }
                      rows={4}
                      placeholder={
                        editorScope === 'city'
                          ? 'Short summary shown for this city'
                          : 'Short summary used globally'
                      }
                      className='min-h-[120px]'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-description'>Full Description</Label>
                    <Textarea
                      id='location-workspace-description'
                      value={editorForm.description}
                      onChange={(event) =>
                        handleEditorFieldChange('description', event.target.value)
                      }
                      rows={8}
                      placeholder={
                        editorScope === 'city'
                          ? 'Detailed content for this city-specific page'
                          : 'Detailed content for the global product page'
                      }
                      className='min-h-[220px]'
                    />
                  </div>
                </section>

                <section className='grid gap-4 border border-border bg-card p-5'>
                  <div>
                    <h3 className='text-lg font-semibold text-foreground'>SEO</h3>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {editorScope === 'city'
                        ? `Meta title, description aur keywords ${selectedCityLabel} ke page ke liye alag save hongi.`
                        : 'Meta title, description aur keywords global product page ke liye save hongi.'}
                    </p>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      SEO fields me bhi <code>{'{{city}}'}</code> aur mapped city names
                      selected city ke naam se render honge.
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-meta-title'>Meta Title</Label>
                    <Input
                      id='location-workspace-meta-title'
                      value={editorForm.metaTitle}
                      onChange={(event) =>
                        handleEditorFieldChange('metaTitle', event.target.value)
                      }
                      placeholder='Meta title'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-meta-description'>
                      Meta Description
                    </Label>
                    <Textarea
                      id='location-workspace-meta-description'
                      value={editorForm.metaDescription}
                      onChange={(event) =>
                        handleEditorFieldChange('metaDescription', event.target.value)
                      }
                      rows={4}
                      placeholder='Meta description'
                      className='min-h-[120px]'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location-workspace-meta-keywords'>
                      Meta Keywords
                    </Label>
                    <Textarea
                      id='location-workspace-meta-keywords'
                      value={editorForm.metaKeywords}
                      onChange={(event) =>
                        handleEditorFieldChange('metaKeywords', event.target.value)
                      }
                      rows={3}
                      placeholder='keyword 1, keyword 2, keyword 3'
                      className='min-h-[96px]'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Keywords comma separated rakhiye.
                    </p>
                  </div>
                </section>
              </div>
            ) : (
              <div className='flex min-h-[240px] items-center justify-center text-sm text-muted-foreground'>
                Product page select kijiye.
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4'>
            <div className='text-sm text-muted-foreground'>
              {editorScope === 'city'
                ? `Save hone ke baad ${selectedCityLabel} ka city page update ho jayega.`
                : 'Save hone ke baad global product page update ho jayega.'}
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setEditorOpen(false)
                  resetEditorState()
                }}
              >
                Close
              </Button>
              <Button
                type='button'
                onClick={() => void handleSaveProductContent()}
                disabled={editorLoading || editorSaving || !selectedProduct}
              >
                {editorSaving ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <PencilLine className='h-4 w-4' />
                )}
                {editorScope === 'city' ? 'Save City Page' : 'Save Global Page'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
