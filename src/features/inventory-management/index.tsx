import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { RootState } from '@/store'
import {
  ImageIcon,
  Loader2,
  PencilLine,
  Search,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
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
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'
import { toast } from 'sonner'

type ProductCategoryRef =
  | string
  | {
      _id?: string
      id?: string
      name?: string
      slug?: string
    }

type ProductSubcategoryRef =
  | string
  | {
      _id?: string
      id?: string
      name?: string
      slug?: string
      category_id?: string | { _id?: string; id?: string; name?: string }
    }

type ProductWebsiteRef =
  | string
  | {
      _id?: string
      id?: string
      name?: string
      website_slug?: string
      template_name?: string
    }

type ProductVariant = {
  _id?: string
  variantSku?: string
  variantAttributes?: Record<string, unknown>
  finalPrice?: number
  actualPrice?: number
  stockQuantity?: number
  variantsImageUrls?: Array<{ url?: string }>
  isActive?: boolean
}

type VendorProduct = {
  _id: string
  productName?: string
  brand?: string
  status?: string
  isAvailable?: boolean
  createdAt?: string
  updatedAt?: string
  baseSku?: string
  defaultImages?: Array<{ url?: string }>
  mainCategory?: ProductCategoryRef
  productCategory?: ProductCategoryRef
  productCategories?: ProductCategoryRef[]
  productSubCategories?: ProductSubcategoryRef[]
  websiteIds?: ProductWebsiteRef[]
  variants?: ProductVariant[]
}

type CategoryCatalogItem = {
  _id?: string
  id?: string
  name?: string
  slug?: string
  mainCategory?: ProductCategoryRef
  subcategories?: Array<{
    _id?: string
    id?: string
    name?: string
    slug?: string
    category_id?: string | { _id?: string; id?: string; name?: string }
  }>
}

type WebsiteOption = {
  value: string
  label: string
}

type VendorOption = {
  value: string
  label: string
}

type InventoryAdjustment = {
  _id?: string
  productId?: string
  variantId?: string
  productName?: string
  variantSku?: string
  previousQuantity?: number
  nextQuantity?: number
  delta?: number
  reason?: string
  note?: string
  actorName?: string
  actorRole?: string
  createdAt?: string
}

type NormalizedRef = {
  id: string
  name: string
  slug: string
}

type NormalizedSubcategory = NormalizedRef & {
  categoryId: string
}

type CatalogLookups = {
  categoryById: Map<string, CategoryCatalogItem>
  categoryByName: Map<string, CategoryCatalogItem>
  subcategoryById: Map<string, NormalizedSubcategory>
  subcategoryByName: Map<string, NormalizedSubcategory>
  mainCategoryById: Map<string, string>
}

type InventoryVariantRow = {
  key: string
  productId: string
  variantId: string
  productName: string
  brand: string
  statusKey: string
  statusLabel: string
  productVisible: boolean
  variantActive: boolean
  isSellable: boolean
  createdAt: string
  updatedAt: string
  baseSku: string
  variantSku: string
  attributeSummary: string
  mainCategoryName: string
  categoryName: string
  subcategoryNames: string[]
  configuredWebsiteIds: string[]
  usesAllWebsites: boolean
  websiteIds: string[]
  websiteNames: string[]
  imageUrl: string
  onHand: number
  available: number
  unavailable: number
  unitPrice: number
  compareAtPrice: number
  inventoryValue: number
}

type InventoryBadgeState = {
  key: string
  label: string
  className: string
}

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)
const FETCH_LIMIT = 100

const adjustmentReasonOptions = [
  { value: 'manual_adjustment', label: 'Manual adjustment' },
  { value: 'restock', label: 'Restock received' },
  { value: 'correction', label: 'Count correction' },
  { value: 'damage', label: 'Damaged stock' },
]

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const isLikelyObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value)

const toRef = (
  value: ProductCategoryRef | ProductSubcategoryRef | ProductWebsiteRef | undefined
): NormalizedRef => {
  if (!value) return { id: '', name: '', slug: '' }

  if (typeof value === 'string') {
    const trimmed = normalizeText(value)
    return {
      id: isLikelyObjectId(trimmed) ? trimmed : '',
      name: isLikelyObjectId(trimmed) ? '' : trimmed,
      slug: '',
    }
  }

  return {
    id: normalizeText(value._id || value.id),
    name: normalizeText(
      value.name || ('template_name' in value ? value.template_name : '')
    ),
    slug: normalizeText(
      ('slug' in value ? value.slug : '') ||
        ('website_slug' in value ? value.website_slug : '')
    ),
  }
}

const uniqueRefs = <
  T extends ProductCategoryRef | ProductSubcategoryRef | ProductWebsiteRef
>(
  items: T[] = []
) => {
  const seen = new Set<string>()

  return items.filter((item) => {
    const ref = toRef(item)
    const key =
      ref.id || ref.slug || normalizeSearchValue(ref.name) || JSON.stringify(item)

    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const getAuthHeaders = (token: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const getReadHeaders = (token: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined

const getVariantImageUrl = (variant?: ProductVariant) =>
  String(variant?.variantsImageUrls?.[0]?.url || '').trim()

const getPrimaryProductImageUrl = (product?: VendorProduct) => {
  const defaultImage = String(product?.defaultImages?.[0]?.url || '').trim()
  if (defaultImage) return defaultImage

  return Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => getVariantImageUrl(variant))
        .find((imageUrl) => Boolean(imageUrl)) || ''
    : ''
}

const formatVariantAttributes = (attributes?: Record<string, unknown>) => {
  const entries = Object.entries(attributes || {}).filter(([, value]) =>
    normalizeText(value)
  )

  if (!entries.length) return 'Default variant'

  return entries
    .map(([key, value]) => `${key}: ${normalizeText(value)}`)
    .join(' | ')
}

const formatStatusLabel = (status: string, isVisible: boolean) => {
  if (!isVisible) return 'Hidden'
  switch (status) {
    case 'approved':
      return 'Verified'
    case 'pending':
      return 'Pending'
    case 'rejected':
      return 'Rejected'
    case 'draft':
      return 'Draft'
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active'
  }
}

const getProductWebsiteIds = (product?: VendorProduct | null) =>
  uniqueRefs(product?.websiteIds || [])
    .map((item) => toRef(item).id)
    .filter(Boolean)

const resolveProductWebsiteVisibility = (
  product: VendorProduct | null | undefined,
  websiteOptions: WebsiteOption[],
  websiteLabelById: Map<string, string>
) => {
  const configuredWebsiteIds = getProductWebsiteIds(product)
  const allWebsiteIds = Array.from(
    new Set(websiteOptions.map((website) => normalizeText(website.value)).filter(Boolean))
  )
  const usesAllWebsites = configuredWebsiteIds.length === 0
  const websiteIds = usesAllWebsites ? allWebsiteIds : configuredWebsiteIds
  const websiteNames = websiteIds.length
    ? websiteIds.map(
        (websiteId) => websiteLabelById.get(websiteId) || 'Unknown website'
      )
    : ['All websites']

  return {
    configuredWebsiteIds,
    usesAllWebsites,
    websiteIds,
    websiteNames,
  }
}

const formatDate = (value?: string) => {
  const raw = normalizeText(value)
  if (!raw) return 'N/A'
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return raw
  return new Date(parsed).toLocaleDateString()
}

const formatDateTime = (value?: string) => {
  const raw = normalizeText(value)
  if (!raw) return 'N/A'
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return raw
  return new Date(parsed).toLocaleString()
}

const formatReasonLabel = (value?: string) => {
  const normalized = normalizeText(value).replace(/_/g, ' ')
  if (!normalized) return 'Manual adjustment'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const resolveVendorLabel = (vendor: any) => {
  const primary = normalizeText(
    vendor?.registrar_name ||
      vendor?.business_name ||
      vendor?.name ||
      vendor?.username
  )
  const secondary = normalizeText(vendor?.email)
  if (primary && secondary) return `${primary} - ${secondary}`
  return primary || secondary || 'Unnamed vendor'
}

const buildCatalogLookups = (
  categoryCatalog: CategoryCatalogItem[]
): CatalogLookups => {
  const categoryById = new Map<string, CategoryCatalogItem>()
  const categoryByName = new Map<string, CategoryCatalogItem>()
  const subcategoryById = new Map<string, NormalizedSubcategory>()
  const subcategoryByName = new Map<string, NormalizedSubcategory>()
  const mainCategoryById = new Map<string, string>()

  categoryCatalog.forEach((category) => {
    const categoryRef = toRef(category)
    if (categoryRef.id) categoryById.set(categoryRef.id, category)
    if (categoryRef.name) {
      categoryByName.set(normalizeSearchValue(categoryRef.name), category)
    }

    const mainRef = toRef(category.mainCategory)
    if (mainRef.id && mainRef.name) {
      mainCategoryById.set(mainRef.id, mainRef.name)
    }

    ;(Array.isArray(category.subcategories) ? category.subcategories : []).forEach(
      (subcategory) => {
        const normalized: NormalizedSubcategory = {
          ...toRef(subcategory),
          categoryId: normalizeText(
            typeof subcategory.category_id === 'string'
              ? subcategory.category_id
              : subcategory.category_id?._id || subcategory.category_id?.id
          ),
        }

        if (normalized.id) subcategoryById.set(normalized.id, normalized)
        if (normalized.name) {
          subcategoryByName.set(normalizeSearchValue(normalized.name), normalized)
        }
      }
    )
  })

  return {
    categoryById,
    categoryByName,
    subcategoryById,
    subcategoryByName,
    mainCategoryById,
  }
}

const resolveProductTaxonomy = (
  product: VendorProduct,
  lookups: CatalogLookups
) => {
  const categoryRefs = uniqueRefs([
    ...(Array.isArray(product.productCategories) ? product.productCategories : []),
    ...(product.productCategory ? [product.productCategory] : []),
  ])
  const primaryCategoryRef = toRef(categoryRefs[0])
  const matchedCategory =
    (primaryCategoryRef.id && lookups.categoryById.get(primaryCategoryRef.id)) ||
    (primaryCategoryRef.name &&
      lookups.categoryByName.get(normalizeSearchValue(primaryCategoryRef.name))) ||
    null

  const matchedCategoryRef = matchedCategory ? toRef(matchedCategory) : null
  const mainCategoryRef = toRef(product.mainCategory)
  const matchedMainCategoryRef = matchedCategory
    ? toRef(matchedCategory.mainCategory)
    : null

  const subcategoryNames = uniqueRefs(product.productSubCategories || [])
    .map((subcategory) => {
      const ref = toRef(subcategory)
      const matched =
        (ref.id && lookups.subcategoryById.get(ref.id)) ||
        (ref.name && lookups.subcategoryByName.get(normalizeSearchValue(ref.name))) ||
        null

      return matched?.name || ref.name
    })
    .filter(Boolean)

  return {
    categoryName:
      matchedCategoryRef?.name || primaryCategoryRef.name || 'Unassigned category',
    mainCategoryName:
      lookups.mainCategoryById.get(mainCategoryRef.id) ||
      mainCategoryRef.name ||
      matchedMainCategoryRef?.name ||
      'Unassigned',
    subcategoryNames,
  }
}

const getCatalogState = (row: InventoryVariantRow): InventoryBadgeState => {
  if (row.statusKey && row.statusKey !== 'approved') {
    return {
      key: 'draft',
      label: row.statusLabel,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  if (!row.productVisible) {
    return {
      key: 'hidden',
      label: 'Hidden',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    }
  }

  if (!row.variantActive) {
    return {
      key: 'inactive',
      label: 'Inactive variant',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    }
  }

  return {
    key: 'sellable',
    label: 'Sellable',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

const getHealthState = (row: InventoryVariantRow): InventoryBadgeState => {
  if (row.onHand <= 0) {
    return {
      key: 'out',
      label: 'Out of stock',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (row.available <= 0) {
    return {
      key: 'unavailable',
      label: 'Not sellable',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    }
  }

  if (row.available < 10) {
    return {
      key: 'low',
      label: 'Low stock',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    key: 'healthy',
    label: 'Healthy',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

const buildInventoryVariantRows = (
  products: VendorProduct[],
  lookups: CatalogLookups,
  websiteOptions: WebsiteOption[],
  websiteLabelById: Map<string, string>
) => {
  const rows: InventoryVariantRow[] = []

  products.forEach((product) => {
    const {
      categoryName,
      mainCategoryName,
      subcategoryNames,
    } = resolveProductTaxonomy(product, lookups)
    const {
      configuredWebsiteIds,
      usesAllWebsites,
      websiteIds,
      websiteNames,
    } = resolveProductWebsiteVisibility(product, websiteOptions, websiteLabelById)
    const imageUrl = getPrimaryProductImageUrl(product)
    const statusKey = normalizeText(product.status).toLowerCase()
    const productVisible = product.isAvailable !== false
    const statusLabel = formatStatusLabel(statusKey, productVisible)

    ;(Array.isArray(product.variants) ? product.variants : []).forEach(
      (variant, index) => {
        const variantId = normalizeText(variant?._id || `${index}`)
        const variantActive = variant?.isActive !== false
        const onHand = Math.max(0, Number(variant?.stockQuantity || 0))
        const isSellable =
          productVisible && statusKey === 'approved' && variantActive
        const available = isSellable ? onHand : 0
        const unavailable = Math.max(onHand - available, 0)
        const unitPrice = Number(variant?.finalPrice ?? variant?.actualPrice ?? 0)
        const compareAtPrice = Number(
          variant?.actualPrice ?? variant?.finalPrice ?? 0
        )

        rows.push({
          key: `${product._id}:${variantId}`,
          productId: product._id,
          variantId,
          productName: normalizeText(product.productName) || 'Unnamed product',
          brand: normalizeText(product.brand),
          statusKey,
          statusLabel,
          productVisible,
          variantActive,
          isSellable,
          createdAt: normalizeText(product.createdAt),
          updatedAt: normalizeText(product.updatedAt || product.createdAt),
          baseSku: normalizeText(product.baseSku),
          variantSku: normalizeText(variant?.variantSku) || 'SKU missing',
          attributeSummary: formatVariantAttributes(variant?.variantAttributes),
          mainCategoryName,
          categoryName,
          subcategoryNames,
          configuredWebsiteIds,
          usesAllWebsites,
          websiteIds,
          websiteNames,
          imageUrl: imageUrl || getVariantImageUrl(variant),
          onHand,
          available,
          unavailable,
          unitPrice,
          compareAtPrice,
          inventoryValue: onHand * unitPrice,
        })
      }
    )
  })

  return rows.sort((a, b) => {
    const productCompare = a.productName.localeCompare(b.productName)
    if (productCompare !== 0) return productCompare
    return a.variantSku.localeCompare(b.variantSku)
  })
}

async function fetchVendorProducts(vendorId: string, token: string) {
  const products: VendorProduct[] = []
  let page = 1
  let totalPages = 1

  do {
    const url =
      vendorId === 'all'
        ? `${API_BASE}/v1/products/all?page=${page}&limit=${FETCH_LIMIT}&includeUnavailable=true`
        : `${API_BASE}/v1/products/vendor/${vendorId}?page=${page}&limit=${FETCH_LIMIT}&includeUnavailable=true`

    const response = await fetch(url, {
        headers: getReadHeaders(token),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor inventory (${response.status})`)
    }

    const body = await response.json()
    const rows = Array.isArray(body?.products) ? body.products : []
    products.push(...rows)
    totalPages = Number(body?.pagination?.totalPages || 1)
    page += 1
  } while (page <= totalPages)

  return products
}

async function fetchCategoryCatalog(token: string) {
  const categories: CategoryCatalogItem[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(
      `${API_BASE}/v1/categories/getall?page=${page}&limit=${FETCH_LIMIT}`,
      {
        headers: getReadHeaders(token),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch categories (${response.status})`)
    }

    const body = await response.json()
    const rows = Array.isArray(body?.data) ? body.data : []
    categories.push(...rows)
    totalPages = Number(body?.pagination?.totalPages || 1)
    page += 1
  } while (page <= totalPages)

  return categories
}

async function fetchVendorOptions() {
  const response = await fetch(`${API_BASE}/v1/vendors/getall`)
  if (!response.ok) {
    throw new Error(`Failed to fetch vendors (${response.status})`)
  }

  const body = await response.json()
  const vendors = Array.isArray(body?.vendors) ? body.vendors : []
  const options = vendors.map((vendor: any) => ({
    value: normalizeText(vendor?._id || vendor?.id),
    label: resolveVendorLabel(vendor),
  }))

  return options
    .filter((item: VendorOption) => item.value)
    .sort((a: VendorOption, b: VendorOption) => a.label.localeCompare(b.label))
}

async function fetchVendorWebsites(vendorId: string, token: string) {
  if (vendorId === 'all') return []

  const response = await fetch(
    `${API_BASE}/v1/templates/by-vendor?vendor_id=${encodeURIComponent(vendorId)}`,
    {
      headers: getReadHeaders(token),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch websites (${response.status})`)
  }

  const body = await response.json()
  const rows = Array.isArray(body?.data) ? body.data : []

  return rows
    .map((website: any) => ({
      value: normalizeText(website?._id || website?.id),
      label:
        normalizeText(website?.name) ||
        normalizeText(website?.business_name) ||
        normalizeText(website?.website_slug) ||
        normalizeText(website?.template_name) ||
        'Website',
    }))
    .filter((item: WebsiteOption) => item.value)
}

async function fetchInventoryAdjustments(vendorId: string, token: string) {
  const url =
    vendorId === 'all'
      ? `${API_BASE}/v1/products/inventory/adjustments?limit=80`
      : `${API_BASE}/v1/products/inventory/adjustments?vendor_id=${encodeURIComponent(vendorId)}&limit=80`

  const response = await fetch(url, {
      headers: getReadHeaders(token),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch inventory history (${response.status})`)
  }

  const body = await response.json()
  return Array.isArray(body?.adjustments) ? body.adjustments : []
}

export default function InventoryDashboard() {
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const authVendorId = normalizeText(
    authUser?.vendor_id || authUser?.id || authUser?._id
  )
  const role = normalizeText(authUser?.role).toLowerCase()
  const isAdmin = role === 'admin' || role === 'superadmin'

  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState(
    isAdmin ? 'all' : authVendorId
  )
  const [websiteOptions, setWebsiteOptions] = useState<WebsiteOption[]>([])
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogItem[]>([])
  const [recentAdjustments, setRecentAdjustments] = useState<
    InventoryAdjustment[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [websiteFilter, setWebsiteFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [catalogFilter, setCatalogFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statsOpen, setStatsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)
  const [stockInput, setStockInput] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('manual_adjustment')
  const [adjustmentNote, setAdjustmentNote] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustmentError, setAdjustmentError] = useState('')
  const [adjustmentSuccess, setAdjustmentSuccess] = useState('')
  const [visibilityUpdatingProductId, setVisibilityUpdatingProductId] =
    useState('')
  const [visibilityError, setVisibilityError] = useState('')
  const [visibilitySuccess, setVisibilitySuccess] = useState('')
  const deferredSearch = useDeferredValue(search)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (search.trim()) {
      setSearchOpen(true)
    }
  }, [search])

  useEffect(() => {
    if (!searchOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (searchContainerRef.current?.contains(target)) return
      setSearchOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [searchOpen])

  useEffect(() => {
    if (!isAdmin) {
      setSelectedVendorId(authVendorId)
    }
  }, [authVendorId, isAdmin])

  const fetchVendorCatalog = useCallback(async () => {
    if (!isAdmin) {
      setVendorOptions([])
      return
    }

    try {
      const options = await fetchVendorOptions()
      const finalOptions = isAdmin
        ? [{ value: 'all', label: 'All Vendors (Master)' }, ...options]
        : options
      setVendorOptions(finalOptions)
    } catch (vendorError: any) {
      setVendorOptions([])
      setError(vendorError?.message || 'Failed to load vendors.')
    }
  }, [isAdmin])

  useEffect(() => {
    fetchVendorCatalog()
  }, [fetchVendorCatalog])

  useEffect(() => {
    if (isAdmin && !selectedVendorId && vendorOptions.length) {
      const defaultValue = vendorOptions.find(o => o.value === 'all') ? 'all' : vendorOptions[0].value
      setSelectedVendorId(defaultValue)
    }
  }, [isAdmin, selectedVendorId, vendorOptions])

  const fetchData = useCallback(async () => {
    if (!selectedVendorId || !token) {
      setProducts([])
      setCategoryCatalog([])
      setWebsiteOptions([])
      setRecentAdjustments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const [productsResult, categoriesResult, websitesResult, adjustmentsResult] =
        await Promise.allSettled([
          fetchVendorProducts(selectedVendorId, token),
          fetchCategoryCatalog(token),
          fetchVendorWebsites(selectedVendorId, token),
          fetchInventoryAdjustments(selectedVendorId, token),
        ])

      if (productsResult.status === 'rejected') {
        throw productsResult.reason
      }

      setProducts(productsResult.value)
      setCategoryCatalog(
        categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
      )
      setWebsiteOptions(
        websitesResult.status === 'fulfilled' ? websitesResult.value : []
      )
      setRecentAdjustments(
        adjustmentsResult.status === 'fulfilled' ? adjustmentsResult.value : []
      )
    } catch (fetchError: any) {
      setProducts([])
      setCategoryCatalog([])
      setWebsiteOptions([])
      setRecentAdjustments([])
      setError(fetchError?.message || 'Failed to load inventory workspace.')
    } finally {
      setLoading(false)
    }
  }, [selectedVendorId, token])

  useEffect(() => {
    setWebsiteFilter('all')
    setPage(1)
  }, [selectedVendorId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const websiteLabelById = useMemo(
    () =>
      new Map(
        websiteOptions.map((website) => [website.value, website.label] as const)
      ),
    [websiteOptions]
  )

  const catalogLookups = useMemo(
    () => buildCatalogLookups(categoryCatalog),
    [categoryCatalog]
  )

  const inventoryRows = useMemo(
    () =>
      buildInventoryVariantRows(
        products,
        catalogLookups,
        websiteOptions,
        websiteLabelById
      ),
    [catalogLookups, products, websiteLabelById, websiteOptions]
  )

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(inventoryRows.map((row) => row.categoryName).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b))
  }, [inventoryRows])

  const filteredRows = useMemo(() => {
    const query = normalizeSearchValue(deferredSearch)

    return inventoryRows.filter((row) => {
      const catalogState = getCatalogState(row)
      const healthState = getHealthState(row)

      const matchesWebsite =
        websiteFilter === 'all'
          ? true
          : websiteFilter === 'all_visible'
            ? row.usesAllWebsites
            : row.websiteIds.includes(websiteFilter)

      if (!matchesWebsite) return false

      const matchesCategory =
        categoryFilter === 'all' || row.categoryName === categoryFilter
      if (!matchesCategory) return false

      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'attention'
            ? healthState.key !== 'healthy' || catalogState.key !== 'sellable'
            : healthState.key === stockFilter

      if (!matchesStock) return false

      const matchesCatalog =
        catalogFilter === 'all'
          ? true
          : catalogFilter === 'not_sellable'
            ? catalogState.key !== 'sellable'
            : catalogState.key === catalogFilter

      if (!matchesCatalog) return false

      if (!query) return true

      const haystack = [
        row.productName,
        row.brand,
        row.variantSku,
        row.baseSku,
        row.attributeSummary,
        row.categoryName,
        row.mainCategoryName,
        ...row.subcategoryNames,
        ...row.websiteNames,
      ]
        .map((value) => normalizeSearchValue(value))
        .join(' ')

      return haystack.includes(query)
    })
  }, [
    inventoryRows,
    deferredSearch,
    websiteFilter,
    categoryFilter,
    stockFilter,
    catalogFilter,
  ])

  useEffect(() => {
    setPage(1)
  }, [categoryFilter, catalogFilter, pageSize, search, stockFilter, websiteFilter])

  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1)
  const currentPage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [currentPage, filteredRows, pageSize])

  const selectedRow = useMemo(
    () => inventoryRows.find((row) => row.key === selectedRowKey) || null,
    [inventoryRows, selectedRowKey]
  )
  const selectedProduct = useMemo(
    () =>
      products.find((product) => product._id === selectedRow?.productId) || null,
    [products, selectedRow?.productId]
  )
  const selectedProductWebsiteVisibility = useMemo(
    () =>
      resolveProductWebsiteVisibility(
        selectedProduct,
        websiteOptions,
        websiteLabelById
      ),
    [selectedProduct, websiteLabelById, websiteOptions]
  )

  useEffect(() => {
    if (selectedRowKey && !selectedRow) {
      setSelectedRowKey(null)
    }
  }, [selectedRow, selectedRowKey])

  useEffect(() => {
    if (!selectedRow) return
    setStockInput(String(selectedRow.onHand))
    setAdjustmentReason('manual_adjustment')
    setAdjustmentNote('')
    setAdjustmentError('')
    setAdjustmentSuccess('')
    setVisibilityError('')
    setVisibilitySuccess('')
  }, [selectedRow])

  const selectedRowAdjustments = useMemo(() => {
    if (!selectedRow) return []
    return recentAdjustments.filter(
      (adjustment) => normalizeText(adjustment.variantId) === selectedRow.variantId
    )
  }, [recentAdjustments, selectedRow])

  const visibleStats = useMemo(() => {
    const totalOnHand = filteredRows.reduce((sum, row) => sum + row.onHand, 0)
    const totalAvailable = filteredRows.reduce(
      (sum, row) => sum + row.available,
      0
    )
    const totalValue = filteredRows.reduce(
      (sum, row) => sum + row.inventoryValue,
      0
    )
    const lowStockCount = filteredRows.filter(
      (row) => getHealthState(row).key === 'low'
    ).length
    const outOfStockCount = filteredRows.filter(
      (row) => getHealthState(row).key === 'out'
    ).length
    const notSellableCount = filteredRows.filter(
      (row) => getCatalogState(row).key !== 'sellable'
    ).length
    const uniqueProducts = new Set(filteredRows.map((row) => row.productId)).size

    return {
      totalSkus: filteredRows.length,
      totalOnHand,
      totalAvailable,
      totalValue,
      lowStockCount,
      outOfStockCount,
      notSellableCount,
      uniqueProducts,
    }
  }, [filteredRows])

  const statsItems = useMemo(
    () => [
      {
        label: 'Tracked SKUs',
        value: visibleStats.totalSkus,
        helper: 'Variant rows currently in this inventory view.',
      },
      {
        label: 'Products',
        value: visibleStats.uniqueProducts,
        helper: 'Unique products represented by the filtered SKUs.',
      },
      {
        label: 'On hand units',
        value: visibleStats.totalOnHand,
        helper: 'Current physical stock recorded in the catalog.',
      },
      {
        label: 'Available units',
        value: visibleStats.totalAvailable,
        helper: 'Stock that is immediately sellable on the storefront.',
      },
      {
        label: 'Not sellable SKUs',
        value: visibleStats.notSellableCount,
        helper: 'Draft, hidden, or inactive variants holding inventory.',
      },
      {
        label: 'Low stock SKUs',
        value: visibleStats.lowStockCount,
        helper: 'Sellable variants below the low stock threshold.',
      },
      {
        label: 'Out of stock SKUs',
        value: visibleStats.outOfStockCount,
        helper: 'Variants with zero on-hand inventory.',
      },
      {
        label: 'Estimated retail value',
        value: formatINR(visibleStats.totalValue, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
        helper: 'Inventory value based on current selling price.',
      },
    ],
    [visibleStats]
  )

  const updateProductCatalogVisibility = useCallback(
    async (
      productId: string,
      payload: { isAvailable?: boolean; websiteIds?: string[] },
      successMessage: string
    ) => {
      if (!token) return

      try {
        setVisibilityUpdatingProductId(productId)
        setVisibilityError('')
        setVisibilitySuccess('')

        const response = await fetch(
          `${API_BASE}/v1/admin/products/${productId}/content`,
          {
            method: 'PUT',
            headers: getAuthHeaders(token),
            body: JSON.stringify(payload),
          }
        )

        const body = await response.json().catch(() => ({}))
        if (!response.ok || body?.success === false) {
          throw new Error(body?.message || 'Failed to update product visibility.')
        }

        setProducts((prev) =>
          prev.map((product) =>
            product._id === productId
              ? {
                  ...product,
                  ...(payload.isAvailable !== undefined
                    ? { isAvailable: payload.isAvailable }
                    : {}),
                  ...(payload.websiteIds !== undefined
                    ? { websiteIds: payload.websiteIds }
                    : {}),
                }
              : product
          )
        )

        setVisibilitySuccess(successMessage)
        toast.success(successMessage)
      } catch (visibilityUpdateError: any) {
        const message =
          visibilityUpdateError?.message || 'Failed to update product visibility.'
        setVisibilityError(message)
        toast.error(message)
      } finally {
        setVisibilityUpdatingProductId('')
      }
    },
    [token]
  )

  const handleProductVisibilityToggle = useCallback(
    async (productId: string, nextValue: boolean) => {
      await updateProductCatalogVisibility(
        productId,
        { isAvailable: nextValue },
        nextValue
          ? 'Product is now visible on its configured websites.'
          : 'Product is hidden across all websites.'
      )
    },
    [updateProductCatalogVisibility]
  )

  const handleWebsiteVisibilityToggle = useCallback(
    async (websiteId: string, nextValue: boolean) => {
      if (!selectedProduct) return

      const allWebsiteIds = Array.from(
        new Set(
          websiteOptions.map((website) => normalizeText(website.value)).filter(Boolean)
        )
      )
      const baseIds = selectedProductWebsiteVisibility.configuredWebsiteIds.length
        ? selectedProductWebsiteVisibility.configuredWebsiteIds
        : allWebsiteIds
      const nextSet = new Set(baseIds)

      if (nextValue) {
        nextSet.add(websiteId)
      } else {
        nextSet.delete(websiteId)
      }

      if (nextSet.size === 0) {
        const message =
          'At least one website must stay enabled. Hide the product globally if you want it off everywhere.'
        setVisibilityError(message)
        toast.error(message)
        return
      }

      const nextWebsiteIds =
        allWebsiteIds.length && nextSet.size === allWebsiteIds.length
          ? []
          : allWebsiteIds.filter((id) => nextSet.has(id))

      const websiteLabel =
        websiteOptions.find((website) => website.value === websiteId)?.label ||
        'the selected website'

      await updateProductCatalogVisibility(
        selectedProduct._id,
        { websiteIds: nextWebsiteIds },
        nextValue
          ? `Product will show on ${websiteLabel}.`
          : `Product hidden on ${websiteLabel}.`
      )
    },
    [
      selectedProduct,
      selectedProductWebsiteVisibility.configuredWebsiteIds,
      updateProductCatalogVisibility,
      websiteOptions,
    ]
  )

  const handleAdjustInventory = useCallback(async () => {
    if (!selectedRow || !token) return

    const nextQuantity = Number(stockInput)
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      setAdjustmentError('Inventory quantity must be a non-negative integer.')
      return
    }

    try {
      setAdjusting(true)
      setAdjustmentError('')
      setAdjustmentSuccess('')

      const response = await fetch(
        `${API_BASE}/v1/products/${selectedRow.productId}/inventory`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            updates: [
              {
                variantId: selectedRow.variantId,
                stockQuantity: nextQuantity,
              },
            ],
            reason: adjustmentReason,
            note: adjustmentNote,
          }),
        }
      )

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body?.message || 'Failed to update inventory.')
      }

      setAdjustmentSuccess('Inventory updated successfully.')
      await fetchData()
    } catch (inventoryError: any) {
      setAdjustmentError(
        inventoryError?.message || 'Failed to update inventory.'
      )
    } finally {
      setAdjusting(false)
    }
  }, [
    adjustmentNote,
    adjustmentReason,
    fetchData,
    selectedRow,
    stockInput,
    token,
  ])

  return (
    <>
      <TablePageHeader
        title='Inventory Management'
        stacked
        actionsClassName='gap-2 flex-wrap overflow-visible pb-0'
        showHeaderChrome={false}
      >
        <div className='flex w-full flex-wrap items-start gap-3 overflow-visible'>
          <div className='flex min-w-0 flex-1 flex-wrap items-start gap-3'>
            {isAdmin ? (
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className='h-10 w-[240px] shrink-0 xl:w-[260px]'>
                  <SelectValue placeholder='Select vendor' />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor.value} value={vendor.value}>
                      {vendor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
              <SelectTrigger className='h-10 w-[135px] shrink-0 xl:w-[145px]'>
                <SelectValue placeholder='All websites' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All websites</SelectItem>
                <SelectItem value='all_visible'>Visible on all websites</SelectItem>
                {websiteOptions.map((website) => (
                  <SelectItem key={website.value} value={website.value}>
                    {website.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className='h-10 w-[145px] shrink-0 xl:w-[155px]'>
                <SelectValue placeholder='All categories' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className='h-10 w-[150px] shrink-0 xl:w-[160px]'>
                <SelectValue placeholder='All stock states' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All stock states</SelectItem>
                <SelectItem value='attention'>Needs attention</SelectItem>
                <SelectItem value='healthy'>Healthy</SelectItem>
                <SelectItem value='low'>Low stock</SelectItem>
                <SelectItem value='out'>Out of stock</SelectItem>
                <SelectItem value='unavailable'>Not sellable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={catalogFilter} onValueChange={setCatalogFilter}>
              <SelectTrigger className='h-10 w-[155px] shrink-0 xl:w-[165px]'>
                <SelectValue placeholder='All selling states' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All selling states</SelectItem>
                <SelectItem value='sellable'>Sellable</SelectItem>
                <SelectItem value='draft'>Draft / pending</SelectItem>
                <SelectItem value='hidden'>Hidden</SelectItem>
                <SelectItem value='inactive'>Inactive variant</SelectItem>
                <SelectItem value='not_sellable'>Any not sellable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='ml-0 flex w-full flex-wrap items-start justify-end gap-3 self-start lg:ml-auto lg:w-auto lg:flex-nowrap'>
            <div ref={searchContainerRef} className='flex items-center gap-2'>
              {searchOpen ? (
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder='Search product, SKU, brand, attribute, or website'
                    className='h-10 w-[340px] shrink-0 pl-9'
                    disabled={!selectedVendorId}
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-10 w-10 shrink-0 rounded-full text-[#183b63] hover:bg-transparent hover:text-[#183b63]'
                  onClick={() => setSearchOpen(true)}
                  aria-label='Open search'
                  disabled={!selectedVendorId}
                >
                  <Search className='h-6 w-6 stroke-[2.5]' />
                </Button>
              )}
            </div>

            <Button
              variant='outline'
              className='h-10 shrink-0'
              onClick={() => setStatsOpen(true)}
              disabled={!selectedVendorId}
            >
              Statistics
            </Button>
            <Button
              className='h-10 shrink-0'
              onClick={() => fetchData()}
              disabled={loading || !selectedVendorId}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        {!selectedVendorId ? (
          <Card className='border border-dashed border-slate-300 bg-white/80 py-0 shadow-sm'>
            <CardHeader>
              <CardTitle>Select a vendor</CardTitle>
              <CardDescription>
                Admin inventory controls open after you choose a vendor catalog.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <TableShell
              className='flex-1'
              title='Variant inventory'
              description='Track sellable stock the way Shopify separates on-hand inventory from what can actually be sold.'
              footer={
                <ServerPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredRows.length}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='min-w-[280px]'>Product</TableHead>
                    <TableHead className='min-w-[170px]'>Sku</TableHead>
                    <TableHead className='min-w-[180px]'>Category</TableHead>
                    <TableHead className='min-w-[220px]'>Websites</TableHead>
                    <TableHead className='min-w-[190px]'>Storefront</TableHead>
                    <TableHead className='min-w-[150px]'>Availability</TableHead>
                    <TableHead className='min-w-[140px]'>Retail value</TableHead>
                    <TableHead className='min-w-[180px]'>Status</TableHead>
                    <TableHead className='min-w-[120px]'>Updated</TableHead>
                    <TableHead className='text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className='h-24 text-center'>
                        <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Loading inventory...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className='text-muted-foreground h-24 text-center'
                      >
                        {products.length === 0
                          ? 'No variants found. Add products with variants to manage inventory.'
                          : 'No inventory rows match the current filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => {
                      const catalogState = getCatalogState(row)
                      const healthState = getHealthState(row)

                      return (
                        <TableRow key={row.key}>
                          <TableCell>
                            <div className='flex min-w-0 gap-4'>
                              <div className='bg-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                                {row.imageUrl ? (
                                  <img
                                    src={row.imageUrl}
                                    alt={row.productName}
                                    className='h-full w-full object-cover'
                                  />
                                ) : (
                                  <div className='text-muted-foreground flex flex-col items-center gap-1 text-[11px]'>
                                    <ImageIcon className='h-4 w-4' />
                                    <span>No image</span>
                                  </div>
                                )}
                              </div>
                              <div className='min-w-0 space-y-1'>
                                <div className='truncate text-sm font-semibold'>
                                  {row.productName}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1 text-sm'>
                              <div className='font-medium'>{row.variantSku}</div>
                              <div className='text-muted-foreground text-xs'>
                                Base: {row.baseSku || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1 text-sm'>
                              <div className='font-medium'>{row.categoryName}</div>
                              <div className='text-muted-foreground text-xs'>
                                {row.mainCategoryName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-2'>
                              <div className='flex flex-wrap gap-1.5'>
                                {row.websiteNames.slice(0, 2).map((websiteName) => (
                                  <Badge
                                    key={`${row.key}:${websiteName}`}
                                    variant='secondary'
                                    className='rounded-md'
                                  >
                                    {websiteName}
                                  </Badge>
                                ))}
                                {row.websiteNames.length > 2 ? (
                                  <Badge variant='outline' className='rounded-md'>
                                    +{row.websiteNames.length - 2} more
                                  </Badge>
                                ) : null}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                {row.usesAllWebsites
                                  ? 'Using all vendor websites'
                                  : `${row.websiteIds.length} website${row.websiteIds.length === 1 ? '' : 's'} enabled`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-2'>
                              <div className='flex items-center gap-3'>
                                <Switch
                                  checked={row.productVisible}
                                  onCheckedChange={(checked) =>
                                    handleProductVisibilityToggle(
                                      row.productId,
                                      checked
                                    )
                                  }
                                  disabled={
                                    visibilityUpdatingProductId === row.productId
                                  }
                                />
                                <span
                                  className={cn(
                                    'text-sm font-medium',
                                    row.productVisible
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                  )}
                                >
                                  {visibilityUpdatingProductId === row.productId
                                    ? 'Saving...'
                                    : row.productVisible
                                      ? 'Visible'
                                      : 'Hidden'}
                                </span>
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                Global product visibility
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1 text-sm'>
                              <div className='font-medium'>
                                On hand: {row.onHand.toLocaleString()}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                Available: {row.available.toLocaleString()}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                Unavailable: {row.unavailable.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1 text-sm'>
                              <div className='font-medium'>
                                {formatINR(row.inventoryValue, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                Unit: {formatINR(row.unitPrice)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-wrap gap-1.5'>
                              <Badge
                                variant='outline'
                                className={cn('rounded-md', catalogState.className)}
                              >
                                {catalogState.label}
                              </Badge>
                              <Badge
                                variant='outline'
                                className={cn('rounded-md', healthState.className)}
                              >
                                {healthState.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {formatDate(row.updatedAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='rounded-md'
                              onClick={() => setSelectedRowKey(row.key)}
                            >
                              <PencilLine className='mr-2 h-4 w-4' />
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableShell>
          </>
        )}
      </Main>

      <Sheet
        open={Boolean(selectedRow)}
        onOpenChange={(open) => !open && setSelectedRowKey(null)}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-3xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>
              {selectedRow?.productName || 'Inventory item'} inventory
            </SheetTitle>
            <SheetDescription>
              Review stock health, storefront visibility, and manual
              inventory adjustments.
            </SheetDescription>
          </SheetHeader>

          {selectedRow ? (
            <div className='flex h-full flex-col overflow-hidden'>
              <div className='flex-1 overflow-y-auto px-5 py-5'>
                <div className='flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm'>
                  <div className='flex gap-4'>
                    <div className='bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                      {selectedRow.imageUrl ? (
                        <img
                          src={selectedRow.imageUrl}
                          alt={selectedRow.productName}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-1 text-[11px]'>
                          <ImageIcon className='h-5 w-5' />
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 space-y-1'>
                      <div className='truncate text-lg font-semibold'>
                        {selectedRow.productName}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        Variant SKU: {selectedRow.variantSku}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        Base SKU: {selectedRow.baseSku || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'rounded-md',
                        getCatalogState(selectedRow).className
                      )}
                    >
                      {getCatalogState(selectedRow).label}
                    </Badge>
                    <Badge
                      variant='outline'
                      className={cn(
                        'rounded-md',
                        getHealthState(selectedRow).className
                      )}
                    >
                      {getHealthState(selectedRow).label}
                    </Badge>
                  </div>
                </div>

                <div className='mt-5 grid gap-3 sm:grid-cols-4'>
                  <div className='rounded-md border bg-white px-4 py-3 shadow-sm'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                      On hand
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {selectedRow.onHand.toLocaleString()}
                    </p>
                  </div>
                  <div className='rounded-md border bg-white px-4 py-3 shadow-sm'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                      Available
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {selectedRow.available.toLocaleString()}
                    </p>
                  </div>
                  <div className='rounded-md border bg-white px-4 py-3 shadow-sm'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                      Unavailable
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {selectedRow.unavailable.toLocaleString()}
                    </p>
                  </div>
                  <div className='rounded-md border bg-white px-4 py-3 shadow-sm'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                      Retail value
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {formatINR(selectedRow.inventoryValue, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

                <div className='mt-5 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]'>
                  <div className='space-y-5'>
                    <Card className='border bg-white py-0 shadow-sm'>
                      <CardHeader>
                        <CardTitle className='text-base'>
                          Inventory details
                        </CardTitle>
                        <CardDescription>
                          Core catalog and pricing context for this SKU.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='grid gap-3 sm:grid-cols-2'>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Category
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {selectedRow.categoryName}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Main category
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {selectedRow.mainCategoryName}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Unit price
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {formatINR(selectedRow.unitPrice)}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Compare at
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {formatINR(selectedRow.compareAtPrice)}
                          </p>
                        </div>
                        <div className='sm:col-span-2'>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Websites
                          </p>
                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            {selectedRow.websiteNames.map((websiteName) => (
                              <Badge
                                key={`${selectedRow.key}:${websiteName}`}
                                variant='secondary'
                                className='rounded-md'
                              >
                                {websiteName}
                              </Badge>
                            ))}
                          </div>
                          <p className='text-muted-foreground mt-2 text-xs'>
                            {selectedRow.usesAllWebsites
                              ? 'This product is configured to use all vendor websites.'
                              : `${selectedRow.websiteIds.length} website${selectedRow.websiteIds.length === 1 ? '' : 's'} currently enabled.`}
                          </p>
                        </div>
                        <div className='sm:col-span-2'>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Subcategories
                          </p>
                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            {selectedRow.subcategoryNames.length ? (
                              selectedRow.subcategoryNames.map((subcategory) => (
                                <Badge
                                  key={`${selectedRow.key}:${subcategory}`}
                                  variant='outline'
                                  className='rounded-md'
                                >
                                  {subcategory}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-muted-foreground text-sm'>
                                No subcategories
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Created
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {formatDateTime(selectedRow.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                            Updated
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {formatDateTime(selectedRow.updatedAt)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='border bg-white py-0 shadow-sm'>
                      <CardHeader>
                        <CardTitle className='text-base'>
                          Recent inventory history
                        </CardTitle>
                        <CardDescription>
                          Manual adjustments logged for this SKU.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        {selectedRowAdjustments.length ? (
                          selectedRowAdjustments.slice(0, 8).map((adjustment) => {
                            const delta = Number(adjustment.delta || 0)

                            return (
                              <div
                                key={adjustment._id || `${adjustment.createdAt}-${delta}`}
                                className='rounded-md border bg-slate-50 px-4 py-3'
                              >
                                <div className='flex items-start justify-between gap-3'>
                                  <div>
                                    <p className='text-sm font-medium'>
                                      {formatReasonLabel(adjustment.reason)}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                      {adjustment.actorName || adjustment.actorRole || 'System'}{' '}
                                      on {formatDateTime(adjustment.createdAt)}
                                    </p>
                                  </div>
                                  <Badge
                                    variant='outline'
                                    className={cn(
                                      'rounded-md',
                                      delta >= 0
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-red-200 bg-red-50 text-red-700'
                                    )}
                                  >
                                    {delta >= 0 ? '+' : ''}
                                    {delta}
                                  </Badge>
                                </div>
                                <div className='mt-2 text-xs text-muted-foreground'>
                                  {adjustment.previousQuantity || 0} to{' '}
                                  {adjustment.nextQuantity || 0}
                                </div>
                                {normalizeText(adjustment.note) ? (
                                  <p className='mt-2 text-sm text-slate-700'>
                                    {adjustment.note}
                                  </p>
                                ) : null}
                              </div>
                            )
                          })
                        ) : (
                          <div className='text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm'>
                            No inventory history recorded for this SKU yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className='space-y-5'>
                    <Card className='border bg-white py-0 shadow-sm'>
                      <CardHeader>
                        <CardTitle className='text-base'>
                          Storefront visibility
                        </CardTitle>
                        <CardDescription>
                          Manage the global visibility switch here, then fine-tune
                          which websites should show this product.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        <div className='flex items-start justify-between gap-4 rounded-md border bg-slate-50 px-4 py-3'>
                          <div>
                            <p className='text-sm font-semibold text-slate-900'>
                              Product visibility
                            </p>
                            <p className='text-muted-foreground mt-1 text-xs'>
                              Turn this off to hide the product everywhere,
                              regardless of website rules.
                            </p>
                          </div>
                          <div className='flex items-center gap-3'>
                            <Switch
                              checked={selectedProduct?.isAvailable !== false}
                              onCheckedChange={(checked) =>
                                handleProductVisibilityToggle(
                                  selectedRow.productId,
                                  checked
                                )
                              }
                              disabled={
                                visibilityUpdatingProductId === selectedRow.productId
                              }
                            />
                            <span
                              className={cn(
                                'text-sm font-medium',
                                selectedProduct?.isAvailable !== false
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              )}
                            >
                              {visibilityUpdatingProductId === selectedRow.productId
                                ? 'Saving...'
                                : selectedProduct?.isAvailable !== false
                                  ? 'Visible'
                                  : 'Hidden'}
                            </span>
                          </div>
                        </div>

                        <div className='rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
                          {selectedProductWebsiteVisibility.usesAllWebsites
                            ? 'All vendor websites are currently enabled for this product.'
                            : `${selectedProductWebsiteVisibility.websiteIds.length} website${selectedProductWebsiteVisibility.websiteIds.length === 1 ? '' : 's'} are currently enabled for this product.`}
                        </div>

                        {websiteOptions.length ? (
                          <div className='space-y-2'>
                            {websiteOptions.map((website) => {
                              const checked =
                                selectedProductWebsiteVisibility.websiteIds.includes(
                                  website.value
                                )

                              return (
                                <div
                                  key={`${selectedRow.productId}:${website.value}`}
                                  className='flex items-center justify-between gap-4 rounded-md border px-4 py-3'
                                >
                                  <div className='min-w-0'>
                                    <p className='truncate text-sm font-medium text-slate-900'>
                                      {website.label}
                                    </p>
                                    <p className='text-muted-foreground mt-1 text-xs'>
                                      {checked
                                        ? 'Visible on this website when global visibility is on.'
                                        : 'Hidden on this website.'}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={checked}
                                    onCheckedChange={(nextValue) =>
                                      handleWebsiteVisibilityToggle(
                                        website.value,
                                        nextValue
                                      )
                                    }
                                    disabled={
                                      visibilityUpdatingProductId ===
                                      selectedRow.productId
                                    }
                                  />
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className='rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground'>
                            No websites found for this vendor yet.
                          </div>
                        )}

                        {selectedProduct?.isAvailable === false ? (
                          <div className='rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
                            Global visibility is off. Website rules are saved, but
                            the product is currently hidden everywhere.
                          </div>
                        ) : null}

                        {visibilityError ? (
                          <div className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
                            {visibilityError}
                          </div>
                        ) : null}

                        {visibilitySuccess ? (
                          <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                            {visibilitySuccess}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card className='border bg-white py-0 shadow-sm'>
                      <CardHeader>
                        <CardTitle className='text-base'>
                          Adjust stock quantity
                        </CardTitle>
                        <CardDescription>
                          Update on-hand stock. Sellable availability is derived from
                          product visibility and variant status.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                            New on-hand quantity
                          </p>
                          <Input
                            type='number'
                            min='0'
                            step='1'
                            value={stockInput}
                            onChange={(event) => setStockInput(event.target.value)}
                          />
                        </div>

                        <div className='space-y-2'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                            Adjustment reason
                          </p>
                          <Select
                            value={adjustmentReason}
                            onValueChange={setAdjustmentReason}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='Select reason' />
                            </SelectTrigger>
                            <SelectContent>
                              {adjustmentReasonOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='space-y-2'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                            Internal note
                          </p>
                          <Textarea
                            value={adjustmentNote}
                            onChange={(event) => setAdjustmentNote(event.target.value)}
                            placeholder='Explain why this stock count changed'
                            rows={4}
                          />
                        </div>

                        {adjustmentError ? (
                          <div className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
                            {adjustmentError}
                          </div>
                        ) : null}

                        {adjustmentSuccess ? (
                          <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                            {adjustmentSuccess}
                          </div>
                        ) : null}

                        <div className='rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
                          Shopify tracks multiple inventory states like on hand,
                          available, committed, incoming, and unavailable. Your
                          current backend tracks on-hand stock and derives sellable
                          availability from storefront visibility.
                        </div>

                        <Button
                          className='w-full'
                          onClick={handleAdjustInventory}
                          disabled={adjusting}
                        >
                          {adjusting ? (
                            <>
                              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                              Saving...
                            </>
                          ) : (
                            'Apply inventory update'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Inventory statistics'
        description='Operational summary for the currently selected vendor and filters.'
        items={statsItems}
      />
    </>
  )
}
