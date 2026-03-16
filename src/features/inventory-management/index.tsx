import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RootState } from '@/store'
import { Eye, ImageIcon, Loader2 } from 'lucide-react'
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
  baseSku?: string
  defaultImages?: Array<{ url?: string }>
  mainCategory?: ProductCategoryRef
  productCategory?: ProductCategoryRef
  productCategories?: ProductCategoryRef[]
  productSubCategories?: ProductSubcategoryRef[]
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

type NormalizedRef = {
  id: string
  name: string
  slug: string
}

type NormalizedSubcategory = NormalizedRef & {
  categoryId: string
}

type InventoryRow = {
  key: string
  id: string
  name: string
  slug: string
  mainCategoryId: string
  mainCategoryName: string
  productCount: number
  totalStock: number
  lowStockProducts: number
  products: VendorProduct[]
  subcategories: NormalizedSubcategory[]
}

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)
const FETCH_LIMIT = 100

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const isLikelyObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value)

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
  const raw = value.category_id
  if (!raw) return ''
  if (typeof raw === 'string') return normalizeText(raw)
  return normalizeText(raw._id || raw.id)
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

const getAuthHeaders = (token: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined

const getStockCount = (product: VendorProduct) =>
  Array.isArray(product.variants)
    ? product.variants.reduce(
        (sum, variant) => sum + Number(variant?.stockQuantity || 0),
        0
      )
    : 0

const getVariantCount = (product: VendorProduct) =>
  Array.isArray(product.variants) ? product.variants.length : 0

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

const getLowStockState = (stock: number) => {
  if (stock === 0) {
    return {
      label: 'Out of stock',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (stock < 10) {
    return {
      label: 'Low stock',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'Healthy stock',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

const formatStatusLabel = (product: VendorProduct) => {
  if (product.isAvailable === false) return 'Hidden'
  return normalizeText(product.status) || 'Active'
}

const formatDate = (value?: string) => {
  const raw = normalizeText(value)
  if (!raw) return 'N/A'
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return raw
  return new Date(parsed).toLocaleDateString()
}

async function fetchVendorProducts(vendorId: string, token: string) {
  const products: VendorProduct[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(
      `${API_BASE}/v1/products/vendor/${vendorId}?page=${page}&limit=${FETCH_LIMIT}&includeUnavailable=true`,
      {
        headers: getAuthHeaders(token),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor products (${response.status})`)
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
        headers: getAuthHeaders(token),
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

function buildInventoryRows(
  products: VendorProduct[],
  categoryCatalog: CategoryCatalogItem[]
) {
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

  const rows = new Map<
    string,
    InventoryRow & {
      productMap: Map<string, VendorProduct>
      subcategoryMap: Map<string, NormalizedSubcategory>
    }
  >()

  products.forEach((product) => {
    const rawCategoryRefs = uniqueRefs([
      ...(Array.isArray(product.productCategories)
        ? product.productCategories
        : []),
      ...(product.productCategory ? [product.productCategory] : []),
    ])
    const rawSubcategoryRefs = uniqueRefs(product.productSubCategories || [])
    const productMainRef = toRef(product.mainCategory)

    rawCategoryRefs.forEach((rawCategoryRef) => {
      const categoryRef = toRef(rawCategoryRef)
      const catalogCategory =
        (categoryRef.id && categoryById.get(categoryRef.id)) ||
        (categoryRef.name &&
          categoryByName.get(normalizeSearchValue(categoryRef.name))) ||
        null

      const categoryCatalogRef = catalogCategory
        ? toRef(catalogCategory)
        : { id: '', name: '', slug: '' }
      const categoryKey =
        categoryCatalogRef.id ||
        categoryRef.id ||
        categoryCatalogRef.slug ||
        categoryRef.slug ||
        normalizeSearchValue(categoryCatalogRef.name || categoryRef.name)

      if (!categoryKey) return

      const categoryMainRef = catalogCategory
        ? toRef(catalogCategory.mainCategory)
        : { id: '', name: '', slug: '' }
      const row = rows.get(categoryKey) || {
        key: categoryKey,
        id: categoryCatalogRef.id || categoryRef.id,
        name: categoryCatalogRef.name || categoryRef.name || 'Unnamed category',
        slug: categoryCatalogRef.slug || categoryRef.slug,
        mainCategoryId: categoryMainRef.id || productMainRef.id,
        mainCategoryName:
          categoryMainRef.name ||
          mainCategoryNameById.get(categoryMainRef.id || productMainRef.id) ||
          productMainRef.name ||
          'Unassigned',
        productCount: 0,
        totalStock: 0,
        lowStockProducts: 0,
        products: [],
        subcategories: [],
        productMap: new Map<string, VendorProduct>(),
        subcategoryMap: new Map<string, NormalizedSubcategory>(),
      }

      if (!row.productMap.has(product._id)) {
        row.productMap.set(product._id, product)
      }

      rawSubcategoryRefs.forEach((rawSubcategoryRef) => {
        const subcategoryRef = toRef(rawSubcategoryRef)
        const explicitCategoryId = toSubcategoryCategoryId(rawSubcategoryRef)
        const matchedSubcategory =
          (subcategoryRef.id && subcategoryById.get(subcategoryRef.id)) ||
          (subcategoryRef.name &&
            subcategoryByName.get(normalizeSearchValue(subcategoryRef.name))) ||
          null

        const categoryIdForMatch =
          matchedSubcategory?.categoryId || explicitCategoryId || row.id

        if (row.id && categoryIdForMatch && row.id !== categoryIdForMatch) {
          return
        }

        const normalizedSubcategory: NormalizedSubcategory = {
          ...(matchedSubcategory || subcategoryRef),
          categoryId: categoryIdForMatch || row.id,
        }

        const subcategoryKey =
          normalizedSubcategory.id ||
          normalizedSubcategory.slug ||
          normalizeSearchValue(normalizedSubcategory.name)

        if (!subcategoryKey || !normalizedSubcategory.name) return
        row.subcategoryMap.set(subcategoryKey, normalizedSubcategory)
      })

      rows.set(categoryKey, row)
    })
  })

  return Array.from(rows.values())
    .map((row) => {
      const rowProducts = Array.from(row.productMap.values()).sort((a, b) =>
        normalizeText(a.productName).localeCompare(normalizeText(b.productName))
      )
      const totalStock = rowProducts.reduce(
        (sum, product) => sum + getStockCount(product),
        0
      )
      const lowStockProducts = rowProducts.filter((product) => {
        const stock = getStockCount(product)
        return stock > 0 && stock < 10
      }).length

      return {
        key: row.key,
        id: row.id,
        name: row.name,
        slug: row.slug,
        mainCategoryId: row.mainCategoryId,
        mainCategoryName: row.mainCategoryName,
        productCount: rowProducts.length,
        totalStock,
        lowStockProducts,
        products: rowProducts,
        subcategories: Array.from(row.subcategoryMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function getProductSubcategoriesForCategory(
  product: VendorProduct,
  row: InventoryRow
) {
  const allowedIds = new Set(
    row.subcategories.map((subcategory) => subcategory.id).filter(Boolean)
  )
  const allowedNames = new Set(
    row.subcategories
      .map((subcategory) => normalizeSearchValue(subcategory.name))
      .filter(Boolean)
  )

  return uniqueRefs(product.productSubCategories || [])
    .map((subcategory) => ({
      ...toRef(subcategory),
      categoryId: toSubcategoryCategoryId(subcategory),
    }))
    .filter((subcategory) => {
      if (!subcategory.name) return false
      if (!row.subcategories.length) return true
      if (
        subcategory.categoryId &&
        row.id &&
        subcategory.categoryId === row.id
      ) {
        return true
      }
      if (subcategory.id && allowedIds.has(subcategory.id)) return true
      return allowedNames.has(normalizeSearchValue(subcategory.name))
    })
}

export default function InventoryDashboard() {
  const vendorId = useSelector(
    (state: RootState) => state.auth?.user?.id || state.auth?.user?._id || ''
  )
  const token = useSelector((state: RootState) => state.auth?.token || '')

  const [products, setProducts] = useState<VendorProduct[]>([])
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogItem[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [mainCategoryFilter, setMainCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statsOpen, setStatsOpen] = useState(false)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    null
  )

  const fetchData = useCallback(async () => {
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
        fetchVendorProducts(vendorId, token),
        fetchCategoryCatalog(token),
      ])

      if (productsResult.status === 'rejected') {
        throw productsResult.reason
      }

      setProducts(productsResult.value)
      setCategoryCatalog(
        categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
      )
    } catch (fetchError: any) {
      setProducts([])
      setCategoryCatalog([])
      setError(fetchError?.message || 'Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [token, vendorId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const inventoryRows = useMemo(
    () => buildInventoryRows(products, categoryCatalog),
    [categoryCatalog, products]
  )

  const mainCategoryOptions = useMemo(() => {
    const entries = new Map<string, string>()
    inventoryRows.forEach((row) => {
      const key = row.mainCategoryId || row.mainCategoryName
      const label = row.mainCategoryName || 'Unassigned'
      if (key) entries.set(key, label)
    })

    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [inventoryRows])

  const filteredRows = useMemo(() => {
    const query = normalizeSearchValue(search)

    return inventoryRows.filter((row) => {
      const matchesMainCategory =
        mainCategoryFilter === 'all' ||
        row.mainCategoryId === mainCategoryFilter ||
        row.mainCategoryName === mainCategoryFilter

      if (!matchesMainCategory) return false
      if (!query) return true

      const haystack = [
        row.name,
        row.slug,
        row.mainCategoryName,
        ...row.subcategories.map((subcategory) => subcategory.name),
        ...row.products.map((product) => product.productName || ''),
        ...row.products.map((product) => product.brand || ''),
      ]
        .map((value) => normalizeSearchValue(value))
        .join(' ')

      return haystack.includes(query)
    })
  }, [inventoryRows, mainCategoryFilter, search])

  useEffect(() => {
    setPage(1)
  }, [mainCategoryFilter, pageSize, search])

  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1)
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [currentPage, filteredRows, pageSize])

  const selectedCategory = useMemo(
    () => inventoryRows.find((row) => row.key === selectedCategoryKey) || null,
    [inventoryRows, selectedCategoryKey]
  )

  useEffect(() => {
    if (selectedCategoryKey && !selectedCategory) {
      setSelectedCategoryKey(null)
    }
  }, [selectedCategory, selectedCategoryKey])

  const totalStockUnits = useMemo(
    () => products.reduce((sum, product) => sum + getStockCount(product), 0),
    [products]
  )

  const lowStockProducts = useMemo(
    () =>
      products.filter((product) => {
        const stock = getStockCount(product)
        return stock > 0 && stock < 10
      }).length,
    [products]
  )

  const statsItems = useMemo(
    () => [
      {
        label: 'Used Categories',
        value: inventoryRows.length,
        helper: 'Categories currently mapped to your products.',
      },
      {
        label: 'Main Categories',
        value: mainCategoryOptions.length,
        helper: 'Main categories currently represented in inventory.',
      },
      {
        label: 'Mapped Products',
        value: products.length,
        helper: 'Products contributing to this inventory view.',
      },
      {
        label: 'Stock Units',
        value: totalStockUnits,
        helper: 'Combined stock quantity across the full catalog.',
      },
      {
        label: 'Low Stock Products',
        value: lowStockProducts,
        helper: 'Products that are running low on stock.',
      },
    ],
    [
      inventoryRows.length,
      lowStockProducts,
      mainCategoryOptions.length,
      products.length,
      totalStockUnits,
    ]
  )

  return (
    <>
      <TablePageHeader
        title='Inventory Management'
        stacked
        actionsClassName='gap-2'
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search category, subcategory, or product'
          className='h-10 w-[340px] shrink-0'
        />
        <Select
          value={mainCategoryFilter}
          onValueChange={setMainCategoryFilter}
        >
          <SelectTrigger className='h-10 w-[220px] shrink-0'>
            <SelectValue placeholder='All main categories' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All main categories</SelectItem>
            {mainCategoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
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
          className='h-10 shrink-0'
          onClick={() => fetchData()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
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
          title='Inventory categories'
          description=''
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
                <TableHead className='min-w-[220px]'>Category</TableHead>
                <TableHead className='min-w-[180px]'>Main Category</TableHead>
                <TableHead className='min-w-[220px]'>
                  Subcategories Used
                </TableHead>
                <TableHead className='min-w-[120px]'>Products</TableHead>
                <TableHead className='min-w-[130px]'>Stock Units</TableHead>
                <TableHead className='min-w-[140px]'>Low Stock</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Loading inventory...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-24 text-center'
                  >
                    {products.length === 0
                      ? 'No inventory categories found. Add products to your catalog first.'
                      : 'No inventory categories match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className='space-y-1'>
                        <div className='text-sm font-medium'>{row.name}</div>
                        <div className='text-muted-foreground text-xs'>
                          {row.slug || 'No slug'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className='rounded-md border-slate-200 bg-slate-50 text-slate-700'
                      >
                        {row.mainCategoryName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-1.5'>
                        {row.subcategories.length ? (
                          row.subcategories.slice(0, 3).map((subcategory) => (
                            <Badge
                              key={subcategory.id || subcategory.name}
                              variant='secondary'
                              className='rounded-md'
                            >
                              {subcategory.name}
                            </Badge>
                          ))
                        ) : (
                          <span className='text-muted-foreground text-sm'>
                            No subcategories
                          </span>
                        )}
                        {row.subcategories.length > 3 ? (
                          <Badge variant='outline' className='rounded-md'>
                            +{row.subcategories.length - 3} more
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='secondary' className='rounded-md'>
                        {row.productCount} products
                      </Badge>
                    </TableCell>
                    <TableCell className='text-sm font-medium'>
                      {row.totalStock} units
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={cn(
                          'rounded-md',
                          row.lowStockProducts
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        {row.lowStockProducts
                          ? `${row.lowStockProducts} low stock`
                          : 'Stable'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='rounded-md'
                        onClick={() => setSelectedCategoryKey(row.key)}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        View Inventory
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <Sheet
        open={Boolean(selectedCategory)}
        onOpenChange={(open) => !open && setSelectedCategoryKey(null)}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-3xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>
              {selectedCategory?.name || 'Category'} inventory
            </SheetTitle>
            <SheetDescription>
              Products currently mapped to this category.
            </SheetDescription>
          </SheetHeader>

          {selectedCategory ? (
            <div className='flex-1 overflow-y-auto px-5 py-5'>
              <div className='grid gap-3 sm:grid-cols-4'>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Main category
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {selectedCategory.mainCategoryName}
                  </p>
                </div>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Products
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {selectedCategory.products.length}
                  </p>
                </div>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Stock units
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {selectedCategory.totalStock}
                  </p>
                </div>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Low stock products
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {selectedCategory.lowStockProducts}
                  </p>
                </div>
              </div>

              <div className='mt-5 space-y-3'>
                {selectedCategory.products.map((product) => {
                  const stock = getStockCount(product)
                  const stockState = getLowStockState(stock)
                  const productImageUrl = getPrimaryProductImageUrl(product)
                  const usedSubcategories = getProductSubcategoriesForCategory(
                    product,
                    selectedCategory
                  )

                  return (
                    <div
                      key={product._id}
                      className='bg-background rounded-lg border p-4 shadow-sm'
                    >
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='flex min-w-0 gap-4'>
                          <div className='bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                            {productImageUrl ? (
                              <img
                                src={productImageUrl}
                                alt={product.productName || 'Product image'}
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
                            <div className='truncate text-sm font-semibold'>
                              {product.productName || 'Unnamed product'}
                            </div>
                            <div className='text-muted-foreground text-xs break-all'>
                              {product.baseSku || product._id}
                            </div>
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-1.5'>
                          <Badge variant='outline' className='rounded-md'>
                            {formatStatusLabel(product)}
                          </Badge>
                          <Badge
                            variant='outline'
                            className={cn('rounded-md', stockState.className)}
                          >
                            {stockState.label}
                          </Badge>
                        </div>
                      </div>

                      <div className='mt-4 grid gap-3 sm:grid-cols-4'>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium'>
                            Brand
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {product.brand || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium'>
                            Variants
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {getVariantCount(product)}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium'>
                            Stock
                          </p>
                          <p className='mt-1 text-sm font-medium'>{stock}</p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-xs font-medium'>
                            Price
                          </p>
                          <p className='mt-1 text-sm font-medium'>
                            {getPriceRange(product.variants)}
                          </p>
                        </div>
                      </div>

                      <div className='mt-4'>
                        <p className='text-muted-foreground mb-2 text-xs font-medium'>
                          Subcategories
                        </p>
                        <div className='flex flex-wrap gap-1.5'>
                          {usedSubcategories.length ? (
                            usedSubcategories.map((subcategory) => (
                              <Badge
                                key={subcategory.id || subcategory.name}
                                variant='secondary'
                                className='rounded-md'
                              >
                                {subcategory.name}
                              </Badge>
                            ))
                          ) : (
                            <span className='text-muted-foreground text-sm'>
                              No subcategories
                            </span>
                          )}
                        </div>
                      </div>

                      <div className='text-muted-foreground mt-4 text-xs'>
                        Created: {formatDate(product.createdAt)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Inventory statistics'
        description='Summary of your category-wise inventory.'
        items={statsItems}
      />
    </>
  )
}
