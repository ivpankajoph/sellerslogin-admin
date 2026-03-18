import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { RootState } from '@/store'
import {
  Boxes,
  CalendarDays,
  Eye,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'
import { LinkedText } from './components/linked-text'

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
    }

type NormalizedRef = {
  id: string
  name: string
  slug: string
}

type ProductVariant = {
  _id?: string
  variantSku?: string
  variantAttributes?: Record<string, unknown>
  actualPrice?: number
  finalPrice?: number
  discountPercent?: number
  stockQuantity?: number
  variantsImageUrls?: Array<{ url?: string }>
  isActive?: boolean
}

type Product = {
  _id: string
  productName?: string
  brand?: string
  shortDescription?: string
  description?: string
  defaultImages?: Array<{ url?: string }>
  variants?: ProductVariant[]
  status?: string
  createdAt?: string
  specifications?: Array<Record<string, unknown>>
  faqs?: Array<{ question?: string; answer?: string }>
  mainCategory?: ProductCategoryRef
  productCategory?: ProductCategoryRef
  productCategories?: ProductCategoryRef[]
  productSubCategories?: ProductSubcategoryRef[]
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

type NormalizedSubcategory = NormalizedRef & {
  categoryId: string
}

type CategoryLookup = {
  categoryById: Map<string, CategoryCatalogItem>
  categoryByName: Map<string, CategoryCatalogItem>
  subcategoryById: Map<string, NormalizedSubcategory>
  subcategoryByName: Map<string, NormalizedSubcategory>
  mainCategoryNameById: Map<string, string>
}

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)
const FETCH_LIMIT = 50
const DETAILS_CARD_CLASSNAME =
  'rounded-md border bg-background px-4 py-3 shadow-sm'

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const isLikelyObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value)

const formatFieldLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeProductStatus = (value?: string) =>
  normalizeText(value).toLowerCase()

const formatProductStatusLabel = (value?: string) => {
  switch (normalizeProductStatus(value)) {
    case 'approved':
      return 'Verified'
    case 'pending':
      return 'Pending'
    case 'rejected':
      return 'Rejected'
    case 'draft':
      return 'Draft'
    default:
      return 'Unspecified'
  }
}

const getProductStatusClassName = (value?: string) => {
  switch (normalizeProductStatus(value)) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'draft':
      return 'border-slate-200 bg-slate-100 text-slate-700'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

const toRef = (
  value: ProductCategoryRef | ProductSubcategoryRef | undefined
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
    name: normalizeText(value.name),
    slug: normalizeText(value.slug),
  }
}

const toSubcategoryCategoryId = (value: ProductSubcategoryRef | undefined) => {
  if (!value || typeof value === 'string') return ''
  const raw = (value as { category_id?: unknown }).category_id
  if (!raw) return ''
  if (typeof raw === 'string') return normalizeText(raw)
  return normalizeText(
    (raw as { _id?: string; id?: string })._id ||
      (raw as { _id?: string; id?: string }).id
  )
}

const uniqueRefs = <T extends ProductCategoryRef | ProductSubcategoryRef>(
  items: T[] = []
) => {
  const seen = new Set<string>()

  return items.filter((item) => {
    const ref = toRef(item)
    const key =
      ref.id ||
      ref.slug ||
      normalizeSearchValue(ref.name) ||
      JSON.stringify(item)

    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildCategoryLookup = (
  categoryCatalog: CategoryCatalogItem[]
): CategoryLookup => {
  const categoryById = new Map<string, CategoryCatalogItem>()
  const categoryByName = new Map<string, CategoryCatalogItem>()
  const subcategoryById = new Map<string, NormalizedSubcategory>()
  const subcategoryByName = new Map<string, NormalizedSubcategory>()
  const mainCategoryNameById = new Map<string, string>()

  categoryCatalog.forEach((category) => {
    const categoryRef = toRef(category)
    if (categoryRef.id) categoryById.set(categoryRef.id, category)
    if (categoryRef.name) {
      categoryByName.set(normalizeSearchValue(categoryRef.name), category)
    }

    const mainRef = toRef(category.mainCategory)
    if (mainRef.id && mainRef.name) {
      mainCategoryNameById.set(mainRef.id, mainRef.name)
    }

    ;(Array.isArray(category.subcategories)
      ? category.subcategories
      : []
    ).forEach((subcategory) => {
      const normalized: NormalizedSubcategory = {
        ...toRef(subcategory),
        categoryId:
          normalizeText(
            typeof subcategory.category_id === 'string'
              ? subcategory.category_id
              : subcategory.category_id?._id || subcategory.category_id?.id
          ) || categoryRef.id,
      }

      if (normalized.id) subcategoryById.set(normalized.id, normalized)
      if (normalized.name) {
        subcategoryByName.set(normalizeSearchValue(normalized.name), normalized)
      }
    })
  })

  return {
    categoryById,
    categoryByName,
    subcategoryById,
    subcategoryByName,
    mainCategoryNameById,
  }
}

const getCatalogCategory = (
  value: ProductCategoryRef | undefined,
  lookup: CategoryLookup
) => {
  const ref = toRef(value)
  return (
    (ref.id && lookup.categoryById.get(ref.id)) ||
    (ref.name && lookup.categoryByName.get(normalizeSearchValue(ref.name))) ||
    null
  )
}

const getMainCategoryName = (product: Product, lookup: CategoryLookup) => {
  const productMainRef = toRef(product.mainCategory)

  if (productMainRef.name) return productMainRef.name
  if (productMainRef.id && lookup.mainCategoryNameById.has(productMainRef.id)) {
    return lookup.mainCategoryNameById.get(productMainRef.id) || 'Unassigned'
  }

  const rawCategoryRefs = uniqueRefs([
    ...(Array.isArray(product.productCategories)
      ? product.productCategories
      : []),
    ...(product.productCategory ? [product.productCategory] : []),
  ])

  for (const rawCategoryRef of rawCategoryRefs) {
    const catalogCategory = getCatalogCategory(rawCategoryRef, lookup)
    if (!catalogCategory) continue

    const mainRef = toRef(catalogCategory.mainCategory)
    if (mainRef.name) return mainRef.name
    if (mainRef.id && lookup.mainCategoryNameById.has(mainRef.id)) {
      return lookup.mainCategoryNameById.get(mainRef.id) || 'Unassigned'
    }
  }

  return 'Unassigned'
}

const getCategoryNames = (product: Product, lookup: CategoryLookup) =>
  uniqueRefs([
    ...(Array.isArray(product.productCategories)
      ? product.productCategories
      : []),
    ...(product.productCategory ? [product.productCategory] : []),
  ])
    .map((item) => {
      const ref = toRef(item)
      const catalogCategory = getCatalogCategory(item, lookup)
      return toRef(catalogCategory || ref).name
    })
    .filter(Boolean)

const getSubcategoryNames = (product: Product, lookup: CategoryLookup) =>
  uniqueRefs(product.productSubCategories || [])
    .map((item) => {
      const ref = toRef(item)
      const explicitCategoryId = toSubcategoryCategoryId(item)
      const matched =
        (ref.id && lookup.subcategoryById.get(ref.id)) ||
        (ref.name &&
          lookup.subcategoryByName.get(normalizeSearchValue(ref.name))) ||
        null

      if (matched?.name) return matched.name
      if (ref.name) return ref.name
      if (explicitCategoryId) return ''
      return ''
    })
    .filter(Boolean)

const formatDate = (value?: string) => {
  if (!value) return 'Unavailable'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unavailable'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

const getTotalStock = (variants?: ProductVariant[]) =>
  Array.isArray(variants)
    ? variants.reduce((sum, item) => sum + Number(item?.stockQuantity || 0), 0)
    : 0

const getVariantImageUrl = (variant?: ProductVariant) =>
  String(variant?.variantsImageUrls?.[0]?.url || '').trim()

const getPrimaryProductImageUrl = (product?: Product) => {
  const defaultImage = String(product?.defaultImages?.[0]?.url || '').trim()
  if (defaultImage) return defaultImage

  return Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => getVariantImageUrl(variant))
        .find((imageUrl) => Boolean(imageUrl)) || ''
    : ''
}

const getPriceRange = (variants?: ProductVariant[]) => {
  const prices = (variants || [])
    .map((item) => Number(item?.finalPrice ?? item?.actualPrice ?? 0))
    .filter((price) => Number.isFinite(price) && price >= 0)

  if (!prices.length) return formatINR(0)

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  return minPrice === maxPrice
    ? formatINR(minPrice)
    : `${formatINR(minPrice)} - ${formatINR(maxPrice)}`
}

const getSearchableProductText = (product: Product, lookup: CategoryLookup) => {
  const variantParts = (product.variants || []).flatMap((variant) => [
    variant.variantSku || '',
    ...Object.entries(variant.variantAttributes || {}).flatMap(
      ([key, value]) => [key, String(value || '')]
    ),
  ])
  const categoryParts = [
    getMainCategoryName(product, lookup),
    ...getCategoryNames(product, lookup),
    ...getSubcategoryNames(product, lookup),
  ]

  return [
    product.productName || '',
    product.brand || '',
    product.shortDescription || '',
    product.description || '',
    ...categoryParts,
    ...variantParts,
  ]
    .join(' ')
    .toLowerCase()
}

async function fetchAllVendorProducts(
  vendorId: string,
  token: string,
  signal?: AbortSignal
) {
  const rows: Product[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(
      `${API_BASE}/v1/products/vendor/${vendorId}?page=${page}&limit=${FETCH_LIMIT}&includeUnavailable=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    rows.push(...(Array.isArray(data?.products) ? data.products : []))
    totalPages = Number(data?.pagination?.totalPages || 1)
    page += 1
  } while (page <= totalPages)

  return rows
}

async function fetchCategoryCatalog(token: string, signal?: AbortSignal) {
  const rows: CategoryCatalogItem[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(
      `${API_BASE}/v1/categories/getall?page=${page}&limit=${FETCH_LIMIT}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    rows.push(...(Array.isArray(data?.data) ? data.data : []))
    totalPages = Number(data?.pagination?.totalPages || 1)
    page += 1
  } while (page <= totalPages)

  return rows
}

function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-slate-100 text-slate-400',
          className
        )}
      >
        <ImageIcon className='h-8 w-8' />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function ProductDetailCard({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(DETAILS_CARD_CLASSNAME, className)}>
      <p className='text-muted-foreground text-xs font-medium'>{label}</p>
      <div className='text-foreground mt-1 text-sm font-semibold'>
        {children}
      </div>
    </div>
  )
}

function ProductBadgeList({
  items,
  emptyLabel,
}: {
  items: string[]
  emptyLabel: string
}) {
  if (!items.length) {
    return <span className='text-muted-foreground text-sm'>{emptyLabel}</span>
  }

  return (
    <div className='flex flex-wrap gap-1.5'>
      {items.map((item) => (
        <Badge key={item} variant='secondary' className='rounded-md'>
          {item}
        </Badge>
      ))}
    </div>
  )
}

function ProductDetailsDialog({
  product,
  categoryLookup,
  open,
  onOpenChange,
}: {
  product: Product | null
  categoryLookup: CategoryLookup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!product) return null

  const categoryNames = getCategoryNames(product, categoryLookup)
  const subcategoryNames = getSubcategoryNames(product, categoryLookup)
  const variants = Array.isArray(product.variants) ? product.variants : []
  const specificationEntries =
    Array.isArray(product.specifications) &&
    product.specifications[0] &&
    Object.keys(product.specifications[0]).length > 0
      ? Object.entries(product.specifications[0])
      : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-3xl'>
        <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
          <SheetTitle>{product.productName || 'Unnamed Product'}</SheetTitle>
          <SheetDescription>
            Review product verification status, categories, pricing, stock,
            variants, and FAQ data.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-5 py-5'>
          <div className='grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)]'>
            <ProductImage
              src={getPrimaryProductImageUrl(product)}
              alt={product.productName || 'Product image'}
              className='h-36 w-36 rounded-md border object-cover'
            />
            <div className='space-y-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant='outline'
                  className={cn(
                    'rounded-md',
                    getProductStatusClassName(product.status)
                  )}
                >
                  {formatProductStatusLabel(product.status)}
                </Badge>
                <Badge variant='outline' className='rounded-md'>
                  <CalendarDays className='mr-1 h-3.5 w-3.5' />
                  {formatDate(product.createdAt)}
                </Badge>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <ProductDetailCard label='Brand'>
                  {product.brand || 'Unavailable'}
                </ProductDetailCard>
                <ProductDetailCard label='Main Category'>
                  {getMainCategoryName(product, categoryLookup)}
                </ProductDetailCard>
                <ProductDetailCard label='Variants'>
                  {variants.length}
                </ProductDetailCard>
                <ProductDetailCard label='Stock'>
                  {getTotalStock(product.variants)} units
                </ProductDetailCard>
              </div>
            </div>
          </div>

          <div className='mt-5 grid gap-4 xl:grid-cols-2'>
            <div className={DETAILS_CARD_CLASSNAME}>
              <p className='text-muted-foreground text-xs font-medium'>
                Description
              </p>
              <LinkedText
                as='p'
                text={
                  product.description ||
                  product.shortDescription ||
                  'No description available.'
                }
                className='mt-2 text-sm leading-6 text-slate-700'
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <ProductDetailCard label='Categories'>
                <ProductBadgeList
                  items={categoryNames}
                  emptyLabel='No categories mapped'
                />
              </ProductDetailCard>
              <ProductDetailCard label='Subcategories'>
                <ProductBadgeList
                  items={subcategoryNames}
                  emptyLabel='No subcategories mapped'
                />
              </ProductDetailCard>
              <ProductDetailCard label='Price Range'>
                {getPriceRange(product.variants)}
              </ProductDetailCard>
              <ProductDetailCard label='Short Description'>
                <LinkedText
                  as='p'
                  text={product.shortDescription || 'No short description'}
                  className='text-sm text-slate-700'
                />
              </ProductDetailCard>
            </div>
          </div>

          {specificationEntries.length ? (
            <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
              <div className='text-foreground mb-4 flex items-center gap-2'>
                <FileText className='h-4 w-4' />
                <h3 className='text-sm font-semibold'>Specifications</h3>
              </div>
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {specificationEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className='bg-muted/20 rounded-md border px-4 py-3'
                  >
                    <p className='text-muted-foreground text-xs font-medium'>
                      {formatFieldLabel(key)}
                    </p>
                    <p className='text-foreground mt-1 text-sm font-medium'>
                      {typeof value === 'boolean'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : String(value ?? 'Unavailable')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
            <div className='text-foreground mb-4 flex items-center gap-2'>
              <Boxes className='h-4 w-4' />
              <h3 className='text-sm font-semibold'>Variants</h3>
            </div>
            {variants.length ? (
              <div className='space-y-3'>
                {variants.map((variant, index) => (
                  <div
                    key={variant._id || variant.variantSku || index}
                    className='bg-muted/20 rounded-md border p-4'
                  >
                    <div className='flex flex-col gap-4 sm:flex-row'>
                      <ProductImage
                        src={variant.variantsImageUrls?.[0]?.url}
                        alt={`${product.productName || 'Product'} variant`}
                        className='h-20 w-20 rounded-md border object-cover'
                      />
                      <div className='min-w-0 flex-1 space-y-3'>
                        <div className='flex flex-wrap gap-1.5'>
                          {Object.entries(variant.variantAttributes || {})
                            .filter(
                              ([key, value]) =>
                                Boolean(key) &&
                                value !== undefined &&
                                value !== null &&
                                String(value).trim()
                            )
                            .map(([key, value]) => (
                              <Badge
                                key={key}
                                variant='secondary'
                                className='rounded-md'
                              >
                                {formatFieldLabel(key)}: {String(value)}
                              </Badge>
                            ))}
                          {!Object.keys(variant.variantAttributes || {})
                            .length ? (
                            <Badge variant='outline' className='rounded-md'>
                              Default variant
                            </Badge>
                          ) : null}
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                          <ProductDetailCard
                            label='SKU'
                            className='shadow-none'
                          >
                            {variant.variantSku || 'Unavailable'}
                          </ProductDetailCard>
                          <ProductDetailCard
                            label='Actual Price'
                            className='shadow-none'
                          >
                            {formatINR(variant.actualPrice || 0)}
                          </ProductDetailCard>
                          <ProductDetailCard
                            label='Final Price'
                            className='shadow-none'
                          >
                            {formatINR(variant.finalPrice || 0)}
                          </ProductDetailCard>
                          <ProductDetailCard
                            label='Stock'
                            className='shadow-none'
                          >
                            {Number(variant.stockQuantity || 0)} units
                          </ProductDetailCard>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-muted-foreground text-sm'>
                No variants found.
              </p>
            )}
          </section>

          {Array.isArray(product.faqs) && product.faqs.length > 0 ? (
            <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
              <div className='text-foreground mb-4 flex items-center gap-2'>
                <HelpCircle className='h-4 w-4' />
                <h3 className='text-sm font-semibold'>FAQs</h3>
              </div>
              <div className='space-y-3'>
                {product.faqs.map((faq, index) => (
                  <div
                    key={`${faq.question || 'faq'}-${index}`}
                    className='bg-muted/20 rounded-md border px-4 py-3'
                  >
                    <LinkedText
                      as='p'
                      text={faq.question || 'No question provided'}
                      className='text-foreground text-sm font-semibold'
                    />
                    <LinkedText
                      as='p'
                      text={faq.answer || 'No answer provided'}
                      className='mt-2 text-sm leading-6 text-slate-700'
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function VendorProductsTable() {
  const vendorId = useSelector(
    (state: RootState) => state.auth?.user?.id || state.auth?.user?._id || ''
  )
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const [products, setProducts] = useState<Product[]>([])
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogItem[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!vendorId || !token) {
        setProducts([])
        setCategoryCatalog([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const [productsResult, categoriesResult] = await Promise.allSettled([
          fetchAllVendorProducts(vendorId, token, signal),
          fetchCategoryCatalog(token, signal),
        ])

        if (productsResult.status === 'rejected') {
          throw productsResult.reason
        }

        setProducts(productsResult.value)
        setCategoryCatalog(
          categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
        )
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') return
        setProducts([])
        setCategoryCatalog([])
        setError('Failed to fetch products.')
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [token, vendorId]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  const categoryLookup = useMemo(
    () => buildCategoryLookup(categoryCatalog),
    [categoryCatalog]
  )

  const totalProducts = products.length
  const totalVariants = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + (product.variants?.length || 0),
        0
      ),
    [products]
  )
  const totalStock = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + getTotalStock(product.variants),
        0
      ),
    [products]
  )
  const verifiedProducts = useMemo(
    () =>
      products.filter(
        (product) => normalizeProductStatus(product.status) === 'approved'
      ).length,
    [products]
  )
  const productsNeedingReview = Math.max(totalProducts - verifiedProducts, 0)

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesStatus =
        statusFilter === 'all' ||
        normalizeProductStatus(product.status) === statusFilter

      if (!matchesStatus) return false
      if (!query) return true

      return getSearchableProductText(product, categoryLookup).includes(query)
    })
  }, [categoryLookup, products, search, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [pageSize, search, statusFilter])

  const totalPages = Math.max(Math.ceil(filteredProducts.length / pageSize), 1)
  const currentPage = Math.min(page, totalPages)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [currentPage, filteredProducts, pageSize])

  const statsItems = useMemo(
    () => [
      {
        label: 'Catalog Products',
        value: totalProducts,
        helper: 'Total products available in your vendor catalog.',
      },
      {
        label: 'Verified Products',
        value: verifiedProducts,
        helper: 'Products already verified for selling.',
      },
      {
        label: 'Needs Review',
        value: productsNeedingReview,
        helper: 'Products still in pending, draft, or rejected states.',
      },
      {
        label: 'Variants',
        value: totalVariants,
        helper: 'Total variants across your full catalog.',
      },
      {
        label: 'Stock Units',
        value: totalStock,
        helper: 'Combined stock available across all products.',
      },
    ],
    [
      productsNeedingReview,
      totalProducts,
      totalStock,
      totalVariants,
      verifiedProducts,
    ]
  )

  return (
    <>
      <TablePageHeader
        title='Products'
        stacked
        actionsClassName='gap-2'
        showHeaderChrome={false}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search product, brand, SKU, or description'
          className='h-10 w-[340px] shrink-0'
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='h-10 w-[200px] shrink-0'>
            <SelectValue placeholder='All status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All status</SelectItem>
            <SelectItem value='approved'>Verified only</SelectItem>
            <SelectItem value='pending'>Pending only</SelectItem>
            <SelectItem value='rejected'>Rejected only</SelectItem>
            <SelectItem value='draft'>Draft only</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => fetchData()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button asChild variant='outline' className='h-10 shrink-0'>
          <Link to='/upload-products'>Bulk Upload</Link>
        </Button>
        <Button asChild className='h-10 shrink-0'>
          <Link to='/products/create-products'>Create Product</Link>
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        <TableShell
          className='flex-1'
          title='Product list'
          description=''
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[260px]'>Product</TableHead>
                <TableHead className='min-w-[180px]'>Main Category</TableHead>
                <TableHead className='min-w-[160px]'>Brand</TableHead>
                <TableHead className='min-w-[120px]'>Stock</TableHead>
                <TableHead className='min-w-[140px]'>Price</TableHead>
                <TableHead className='min-w-[150px]'>Status</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Loading products...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-24 text-center'
                  >
                    {totalProducts === 0
                      ? 'No products found. Create a product or bulk upload your catalog to get started.'
                      : 'No products match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <ProductImage
                          src={getPrimaryProductImageUrl(product)}
                          alt={product.productName || 'Product'}
                          className='h-14 w-14 rounded-md border object-cover'
                        />
                        <div className='min-w-0 space-y-1'>
                          <div className='truncate text-sm font-medium'>
                            {product.productName || 'Unnamed Product'}
                          </div>
                          <LinkedText
                            as='p'
                            text={
                              product.shortDescription ||
                              'No short description available.'
                            }
                            preserveWhitespace={false}
                            className='text-muted-foreground max-w-[360px] truncate text-xs'
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className='rounded-md border-slate-200 bg-slate-50 text-slate-700'
                      >
                        {getMainCategoryName(product, categoryLookup)}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-sm'>
                      {product.brand || 'Unavailable'}
                    </TableCell>
                    <TableCell className='text-sm font-medium'>
                      {getTotalStock(product.variants)} units
                    </TableCell>
                    <TableCell className='text-sm font-medium'>
                      {getPriceRange(product.variants)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={cn(
                          'rounded-md',
                          getProductStatusClassName(product.status)
                        )}
                      >
                        {formatProductStatusLabel(product.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='rounded-md'
                        onClick={() => setSelectedProduct(product)}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <ProductDetailsDialog
        product={selectedProduct}
        categoryLookup={categoryLookup}
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Product statistics'
        description='Summary of your vendor catalog.'
        items={statsItems}
      />
    </>
  )
}
