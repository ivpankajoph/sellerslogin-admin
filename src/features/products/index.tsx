import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { RootState } from '@/store'
import {
  Boxes,
  CalendarDays,
  Eye,
  FileText,
  Globe2,
  HelpCircle,
  ImageIcon,
  Layers3,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Switch } from '@/components/ui/switch'
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

type ProductWebsiteRef =
  | string
  | {
      _id?: string
      id?: string
      name?: string
      website_name?: string
      displayName?: string
      business_name?: string
      website_slug?: string
      template_name?: string
      template_key?: string
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
  variantMetaTitle?: string
  variantMetaDescription?: string
  variantMetaKeywords?: string[]
  variantCanonicalUrl?: string
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
  isAvailable?: boolean
  createdAt?: string
  specifications?: Array<Record<string, unknown>>
  faqs?: Array<{ question?: string; answer?: string }>
  mainCategory?: ProductCategoryRef
  productCategory?: ProductCategoryRef
  productCategories?: ProductCategoryRef[]
  productSubCategories?: ProductSubcategoryRef[]
  websiteIds?: ProductWebsiteRef[]
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

type WebsiteOption = {
  value: string
  label: string
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

const sanitizeStringList = (values: string[]) =>
  Array.from(new Set(values.map(normalizeText).filter(Boolean)))

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

const getWebsiteOptionLabel = (website: ProductWebsiteRef) => {
  if (typeof website === 'string') return normalizeText(website)

  return (
    normalizeText(website.name) ||
    normalizeText(website.website_name) ||
    normalizeText(website.displayName) ||
    normalizeText(website.business_name) ||
    normalizeText(website.website_slug) ||
    normalizeText(website.template_name) ||
    normalizeText(website.template_key) ||
    'Untitled website'
  )
}

const getWebsiteOptionId = (website: ProductWebsiteRef) => {
  if (typeof website === 'string') return normalizeText(website)
  return normalizeText(website._id || website.id)
}

const getProductWebsiteIds = (product?: Product | null) =>
  sanitizeStringList(
    (Array.isArray(product?.websiteIds) ? product?.websiteIds : [])
      .map((website) => getWebsiteOptionId(website))
      .filter(Boolean)
  )

const resolveProductWebsiteVisibility = (
  product: Product | null | undefined,
  websiteOptions: WebsiteOption[]
) => {
  const configuredWebsiteIds = getProductWebsiteIds(product)
  const allWebsiteIds = sanitizeStringList(
    websiteOptions.map((website) => website.value)
  )
  const usesAllWebsites = configuredWebsiteIds.length === 0
  const websiteIds = usesAllWebsites ? allWebsiteIds : configuredWebsiteIds

  return {
    configuredWebsiteIds,
    usesAllWebsites,
    websiteIds,
  }
}

const getWebsiteVisibilitySummary = (
  product: Product,
  websiteOptions: WebsiteOption[]
) => {
  if (!websiteOptions.length) return 'No websites'

  const visibility = resolveProductWebsiteVisibility(product, websiteOptions)
  if (visibility.usesAllWebsites) return 'All websites'

  return `${visibility.websiteIds.length} website${
    visibility.websiteIds.length === 1 ? '' : 's'
  }`
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

async function fetchVendorWebsites(
  vendorId: string,
  token: string,
  signal?: AbortSignal
) {
  const response = await fetch(
    `${API_BASE}/v1/templates/by-vendor?vendor_id=${encodeURIComponent(vendorId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const rows = Array.isArray(data?.data) ? data.data : []

  return rows
    .map((website: ProductWebsiteRef) => ({
      value: getWebsiteOptionId(website),
      label: getWebsiteOptionLabel(website),
    }))
    .filter((website: WebsiteOption) => website.value && website.label)
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

function ProductCategorizationSection({
  product,
  categoryLookup,
}: {
  product: Product
  categoryLookup: CategoryLookup
}) {
  const categorization = useMemo(() => {
    const categoryRefs = uniqueRefs([
      ...(Array.isArray(product.productCategories)
        ? product.productCategories
        : []),
      ...(product.productCategory ? [product.productCategory] : []),
    ])

    const subcategoryRefs = uniqueRefs(product.productSubCategories || [])

    const groups: { categoryName: string; subcategories: string[] }[] = []
    const categoryIdToIdx = new Map<string, number>()

    categoryRefs.forEach((catRef) => {
      const ref = toRef(catRef)
      const catalogCategory = getCatalogCategory(catRef, categoryLookup)
      const name = toRef(catalogCategory || ref).name
      const id = toRef(catalogCategory || ref).id
      if (name) {
        categoryIdToIdx.set(id || name, groups.length)
        groups.push({ categoryName: name, subcategories: [] })
      }
    })

    subcategoryRefs.forEach((subRef) => {
      const ref = toRef(subRef)
      const explicitCategoryId = toSubcategoryCategoryId(subRef)
      const matched =
        (ref.id ? categoryLookup.subcategoryById.get(ref.id) : undefined) ||
        (ref.name
          ? categoryLookup.subcategoryByName.get(normalizeSearchValue(ref.name))
          : undefined)

      const name = matched?.name || ref.name
      const categoryId = matched?.categoryId || explicitCategoryId

      if (name) {
        if (categoryId && categoryIdToIdx.has(categoryId)) {
          groups[categoryIdToIdx.get(categoryId)!].subcategories.push(name)
        } else if (categoryId) {
          const parent = categoryLookup.categoryById.get(categoryId)
          if (parent?.name) {
            const existingIdx = groups.findIndex(
              (g) => g.categoryName === parent.name
            )
            if (existingIdx !== -1) {
              groups[existingIdx].subcategories.push(name)
            } else {
              groups.push({ categoryName: parent.name, subcategories: [name] })
            }
          } else {
            groups.push({ categoryName: '', subcategories: [name] })
          }
        } else {
          groups.push({ categoryName: '', subcategories: [name] })
        }
      }
    })

    return groups.filter((g) => g.categoryName || g.subcategories.length > 0)
  }, [product, categoryLookup])

  if (!categorization.length) {
    return (
      <ProductDetailCard
        label='Categorization'
        className='col-span-full border-dashed shadow-none'
      >
        <span className='text-muted-foreground text-sm italic'>
          No categories or subcategories found
        </span>
      </ProductDetailCard>
    )
  }

  return (
    <div className={cn(DETAILS_CARD_CLASSNAME, 'col-span-full bg-slate-50/30')}>
      <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase'>
        Classification
      </p>
      <div className='grid gap-4 sm:grid-cols-2'>
        {categorization.map((group, idx) => (
          <div key={idx} className='relative'>
            <div className='flex flex-col gap-2'>
              {group.categoryName && (
                <div className='flex items-center gap-2'>
                  <div className='bg-primary/10 text-primary group ring-primary/20 hover:bg-primary/15 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition'>
                    <Layers3 className='h-3 w-3' />
                    {group.categoryName}
                  </div>
                </div>
              )}
              {group.subcategories.length > 0 && (
                <div
                  className={cn(
                    'flex flex-wrap gap-1.5',
                    group.categoryName
                      ? 'ml-3 border-l-2 border-slate-200 py-0.5 pl-3'
                      : ''
                  )}
                >
                  {group.subcategories.map((sub, sIdx) => (
                    <Badge
                      key={sIdx}
                      variant='secondary'
                      className='bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200'
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const buildProductEditorUrl = (productId: string) =>
  `/products/create-products?mode=edit&productId=${encodeURIComponent(productId)}`

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
              <ProductCategorizationSection
                product={product}
                categoryLookup={categoryLookup}
              />
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

function ProductWebsiteVisibilitySheet({
  product,
  websites,
  updating,
  onToggleWebsite,
  onToggleProductVisibility,
  open,
  onOpenChange,
}: {
  product: Product | null
  websites: WebsiteOption[]
  updating: boolean
  onToggleWebsite: (websiteId: string, nextValue: boolean) => void
  onToggleProductVisibility: (nextValue: boolean) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const visibility = useMemo(
    () => resolveProductWebsiteVisibility(product, websites),
    [product, websites]
  )

  if (!product) return null

  const enabledCount = visibility.websiteIds.length
  const productVisible = product.isAvailable !== false

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-xl'>
        <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
          <SheetTitle>Manage websites</SheetTitle>
          <SheetDescription>
            Choose where this product should appear.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-4 overflow-y-auto px-5 py-5'>
          <div className='rounded-md border bg-slate-50 px-4 py-3'>
            <p className='text-sm font-semibold text-slate-900'>
              {product.productName || 'Unnamed Product'}
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {visibility.usesAllWebsites
                ? 'This product is currently enabled for all vendor websites.'
                : `${enabledCount} website${enabledCount === 1 ? '' : 's'} enabled for this product.`}
            </p>
          </div>

          <div className='flex items-start justify-between gap-4 rounded-md border px-4 py-3'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>
                Product visibility
              </p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Turn this off to hide the product everywhere.
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <Switch
                checked={productVisible}
                onCheckedChange={onToggleProductVisibility}
                disabled={updating}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  productVisible ? 'text-emerald-700' : 'text-slate-500'
                )}
              >
                {updating ? 'Saving...' : productVisible ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>

          {websites.length ? (
            <div className='space-y-2'>
              {websites.map((website) => {
                const checked = visibility.websiteIds.includes(website.value)

                return (
                  <div
                    key={`${product._id}:${website.value}`}
                    className='flex items-center justify-between gap-4 rounded-md border px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-slate-900'>
                        {website.label}
                      </p>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        {checked
                          ? 'Product will show on this website.'
                          : 'Product is removed from this website.'}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(nextValue) =>
                        onToggleWebsite(website.value, nextValue)
                      }
                      disabled={updating || !productVisible}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm'>
              No websites found for this vendor yet.
            </div>
          )}

          {!productVisible ? (
            <div className='rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
              Website switches are disabled while the product is hidden
              globally.
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function VendorProductsTable() {
  const vendorId = useSelector(
    (state: RootState) =>
      state.auth?.user?.vendor_id ||
      state.auth?.user?.id ||
      state.auth?.user?._id ||
      ''
  )
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const [products, setProducts] = useState<Product[]>([])
  const [websiteOptions, setWebsiteOptions] = useState<WebsiteOption[]>([])
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
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState(false)
  const [websiteProduct, setWebsiteProduct] = useState<Product | null>(null)
  const [visibilityUpdatingProductId, setVisibilityUpdatingProductId] =
    useState('')

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!vendorId || !token) {
        setProducts([])
        setWebsiteOptions([])
        setCategoryCatalog([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const [productsResult, categoriesResult, websitesResult] =
          await Promise.allSettled([
            fetchAllVendorProducts(vendorId, token, signal),
            fetchCategoryCatalog(token, signal),
            fetchVendorWebsites(vendorId, token, signal),
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
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') return
        setProducts([])
        setWebsiteOptions([])
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

  const updateProductCatalogVisibility = useCallback(
    async (
      productId: string,
      payload: { isAvailable?: boolean; websiteIds?: string[] },
      successMessage: string
    ) => {
      if (!token) return

      try {
        setVisibilityUpdatingProductId(productId)

        const response = await fetch(
          `${API_BASE}/v1/admin/products/${productId}/content`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        )

        const body = await response.json().catch(() => ({}))
        if (!response.ok || body?.success === false) {
          throw new Error(
            body?.message || 'Failed to update website visibility.'
          )
        }

        const applyPatchToProduct = (product: Product): Product =>
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

        setProducts((prev) => prev.map(applyPatchToProduct))
        setSelectedProduct((current) =>
          current?._id === productId ? applyPatchToProduct(current) : current
        )
        setWebsiteProduct((current) =>
          current?._id === productId ? applyPatchToProduct(current) : current
        )

        toast.success(successMessage)
      } catch (error: any) {
        toast.error(error?.message || 'Failed to update website visibility.')
      } finally {
        setVisibilityUpdatingProductId('')
      }
    },
    [token]
  )

  const handleProductVisibilityToggle = useCallback(
    (nextValue: boolean) => {
      if (!websiteProduct) return

      void updateProductCatalogVisibility(
        websiteProduct._id,
        { isAvailable: nextValue },
        nextValue
          ? 'Product is visible on its configured websites.'
          : 'Product is hidden across all websites.'
      )
    },
    [updateProductCatalogVisibility, websiteProduct]
  )

  const handleWebsiteVisibilityToggle = useCallback(
    (websiteId: string, nextValue: boolean) => {
      if (!websiteProduct) return

      const allWebsiteIds = sanitizeStringList(
        websiteOptions.map((website) => website.value)
      )
      const currentVisibility = resolveProductWebsiteVisibility(
        websiteProduct,
        websiteOptions
      )
      const baseIds = currentVisibility.configuredWebsiteIds.length
        ? currentVisibility.configuredWebsiteIds
        : allWebsiteIds
      const nextSet = new Set(baseIds)

      if (nextValue) {
        nextSet.add(websiteId)
      } else {
        nextSet.delete(websiteId)
      }

      if (nextSet.size === 0) {
        toast.error(
          'At least one website must stay enabled. Hide the product globally if you want it off everywhere.'
        )
        return
      }

      const nextWebsiteIds =
        allWebsiteIds.length && nextSet.size === allWebsiteIds.length
          ? []
          : allWebsiteIds.filter((id) => nextSet.has(id))
      const websiteLabel =
        websiteOptions.find((website) => website.value === websiteId)?.label ||
        'the selected website'

      void updateProductCatalogVisibility(
        websiteProduct._id,
        { websiteIds: nextWebsiteIds },
        nextValue
          ? `Product will show on ${websiteLabel}.`
          : `Product removed from ${websiteLabel}.`
      )
    },
    [updateProductCatalogVisibility, websiteOptions, websiteProduct]
  )

  const handleDeleteProduct = async () => {
    if (!productToDelete || !token) return

    try {
      setDeletingProduct(true)
      const response = await fetch(
        `${API_BASE}/v1/products/${productToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to delete product')
      }

      setProducts((prev) =>
        prev.filter((item) => item._id !== productToDelete._id)
      )
      setSelectedProduct((current) =>
        current?._id === productToDelete._id ? null : current
      )
      setWebsiteProduct((current) =>
        current?._id === productToDelete._id ? null : current
      )

      setProductToDelete(null)

      toast.success(result?.message || 'Product deleted successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete product')
    } finally {
      setDeletingProduct(false)
    }
  }

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
                <TableHead className='min-w-[150px]'>Websites</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-24 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Loading products...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={cn(
                          'rounded-md',
                          product.isAvailable === false
                            ? 'border-slate-200 bg-slate-100 text-slate-500'
                            : 'border-violet-200 bg-violet-50 text-violet-700'
                        )}
                      >
                        {product.isAvailable === false
                          ? 'Hidden'
                          : getWebsiteVisibilitySummary(
                              product,
                              websiteOptions
                            )}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='rounded-md'
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className='mr-2 h-4 w-4' />
                          View Details
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='rounded-md'
                          onClick={() => setWebsiteProduct(product)}
                        >
                          <Globe2 className='mr-2 h-4 w-4' />
                          Websites
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='rounded-md'
                          onClick={() => {
                            if (typeof window === 'undefined') return
                            window.location.assign(
                              buildProductEditorUrl(product._id)
                            )
                          }}
                        >
                          <Pencil className='mr-2 h-4 w-4' />
                          Edit
                        </Button>
                        <Button
                          variant='destructive'
                          size='sm'
                          className='rounded-md'
                          onClick={() => setProductToDelete(product)}
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
                        </Button>
                      </div>
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

      <ProductWebsiteVisibilitySheet
        product={websiteProduct}
        websites={websiteOptions}
        updating={visibilityUpdatingProductId === websiteProduct?._id}
        open={Boolean(websiteProduct)}
        onOpenChange={(open) => !open && setWebsiteProduct(null)}
        onToggleWebsite={handleWebsiteVisibilityToggle}
        onToggleProductVisibility={handleProductVisibilityToggle}
      />

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to permanently delete this product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete?.productName || 'This product'} - will be removed
              from the vendor catalog and all assigned websites. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProduct}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteProduct()
              }}
              disabled={deletingProduct}
            >
              {deletingProduct ? 'Deleting...' : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
