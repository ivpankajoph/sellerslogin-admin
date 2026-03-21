import { Link } from '@tanstack/react-router'
import {
  Boxes,
  CalendarDays,
  Eye,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Main } from '@/components/layout/main'
import axios from 'axios'
import type { RootState } from '@/store'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { LinkedText } from '../components/linked-text'

type ProductVariant = {
  variantSku?: string
  variantAttributes?: Record<string, unknown>
  actualPrice?: number
  finalPrice?: number
  stockQuantity?: number
  variantsImageUrls?: Array<{ url?: string }>
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
}

type WebsiteOption = {
  id: string
  label: string
  vendorId: string
}

const limit = 10
const DETAILS_CARD_CLASSNAME =
  'rounded-md border bg-background px-4 py-3 shadow-sm'

const titleCase = (value?: string) => {
  const normalized = (value || 'pending').trim().toLowerCase()
  if (normalized === 'approved') return 'Verified'
  return normalized.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatFieldLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

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

const getStatusClassName = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'draft':
      return 'border-slate-200 bg-slate-100 text-slate-700'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const resolveBaseUrl = () => {
  const explicit = String(
    import.meta.env.VITE_PUBLIC_API_URL_BANNERS || ''
  ).trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const api = String(import.meta.env.VITE_PUBLIC_API_URL || '').trim()
  if (!api) return ''
  return api
    .replace(/\/v1$/, '')
    .replace(/\/api$/, '')
    .replace(/\/$/, '')
}

const resolveImageUrl = (value?: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (isAbsoluteUrl(trimmed)) return trimmed
  if (/^(localhost:|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)/.test(trimmed)) {
    return `http://${trimmed}`
  }
  if (trimmed.startsWith('ik.imagekit.io') || trimmed.startsWith('imagekit.io')) {
    return `https://${trimmed}`
  }
  const base = resolveBaseUrl()
  if (!base) return trimmed
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${normalized}`
}

const getVariantImageUrl = (variant?: ProductVariant) =>
  String(variant?.variantsImageUrls?.[0]?.url || '').trim()

const getPrimaryProductImageUrl = (product?: Product) => {
  const defaultImage = String(product?.defaultImages?.[0]?.url || '').trim()
  if (defaultImage) return resolveImageUrl(defaultImage)
  const fromVariant = Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => getVariantImageUrl(variant))
        .find((imageUrl) => Boolean(imageUrl)) || ''
    : ''
  return resolveImageUrl(fromVariant)
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
      <div className={cn('flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400', className)}>
        <ImageIcon className='h-8 w-8' />
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
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
      <div className='text-foreground mt-1 text-sm font-semibold'>{children}</div>
    </div>
  )
}

function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
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
            Review product verification status, pricing, stock, variants, and FAQ data.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-5 py-5'>
          <div className='grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)]'>
            <ProductImage
              src={getPrimaryProductImageUrl(product)}
              alt={product.productName || 'Product image'}
              className='h-36 w-36 rounded-md border object-cover'
            />
            <div className='space-y-5'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant='outline'
                  className={cn('rounded-md', getStatusClassName(product.status))}
                >
                  {titleCase(product.status)}
                </Badge>
                <Badge variant='outline' className='rounded-md'>
                  <CalendarDays className='mr-1 h-3.5 w-3.5' />
                  {formatDate(product.createdAt)}
                </Badge>
              </div>

              <div className='grid gap-4 sm:grid-cols-3'>
                <ProductDetailCard label='Brand'>
                  {product.brand || 'Unavailable'}
                </ProductDetailCard>
                <ProductDetailCard label='Variants'>{variants.length}</ProductDetailCard>
                <ProductDetailCard label='Stock'>
                  {getTotalStock(product.variants)} units
                </ProductDetailCard>
              </div>

              <div className={DETAILS_CARD_CLASSNAME}>
                <p className='text-muted-foreground text-xs font-medium'>Description</p>
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
                  <div key={key} className='bg-muted/20 rounded-md border px-4 py-3'>
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
              <div className='space-y-4'>
                {variants.map((variant, index) => (
                  <div
                    key={variant.variantSku || index}
                    className='bg-muted/20 rounded-md border p-4'
                  >
                    <div className='flex flex-col gap-4 sm:flex-row'>
                      <ProductImage
                        src={resolveImageUrl(variant.variantsImageUrls?.[0]?.url)}
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
                              <Badge key={key} variant='secondary' className='rounded-md'>
                                {formatFieldLabel(key)}: {String(value)}
                              </Badge>
                            ))}
                          {!Object.keys(variant.variantAttributes || {}).length ? (
                            <Badge variant='outline' className='rounded-md'>
                              Default variant
                            </Badge>
                          ) : null}
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                          <ProductDetailCard label='SKU' className='shadow-none'>
                            {variant.variantSku || 'Unavailable'}
                          </ProductDetailCard>
                          <ProductDetailCard label='Actual Price' className='shadow-none'>
                            {formatINR(variant.actualPrice || 0)}
                          </ProductDetailCard>
                          <ProductDetailCard label='Final Price' className='shadow-none'>
                            {formatINR(variant.finalPrice || 0)}
                          </ProductDetailCard>
                          <ProductDetailCard label='Stock' className='shadow-none'>
                            {Number(variant.stockQuantity || 0)} units
                          </ProductDetailCard>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-muted-foreground text-sm'>No variants found.</p>
            )}
          </section>

          {Array.isArray(product.faqs) && product.faqs.length > 0 && (
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function AdminProductsTable() {
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const [products, setProducts] = useState<Product[]>([])
  const [websites, setWebsites] = useState<WebsiteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(limit)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('all')
  const [refreshTick, setRefreshTick] = useState(0)
  const [statsOpen, setStatsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) || null,
    [selectedWebsiteId, websites]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!token) {
      setWebsites([])
      setSelectedWebsiteId('all')
      return
    }

    const fetchWebsites = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        const options: WebsiteOption[] = (response.data?.data || [])
          .map((website: any) => {
            const websiteName = String(
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
            const vendorId = String(
              website?.vendor_id?._id || website?.vendor_id || ''
            ).trim()

            return {
              id: String(website?._id || website?.id || '').trim(),
              label: vendorName ? `${websiteName} - ${vendorName}` : websiteName,
              vendorId,
            }
          })
          .filter((item: WebsiteOption) => item.id && item.vendorId)

        setWebsites(options)
        setSelectedWebsiteId((current) =>
          current !== 'all' && !options.some((item) => item.id === current)
            ? 'all'
            : current
        )
      } catch {
        setWebsites([])
        setSelectedWebsiteId('all')
      }
    }

    void fetchWebsites()
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          includeUnavailable: 'true',
        })
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (selectedWebsiteId !== 'all') {
          params.set('website_id', selectedWebsiteId)
          const ownerId = selectedWebsite?.vendorId || ''
          if (ownerId) {
            params.set('ownerId', ownerId)
          }
        }

        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/all?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        setProducts(Array.isArray(data?.products) ? data.products : [])
        setTotalPages(Number(data?.pagination?.totalPages || 1))
        setTotalProducts(Number(data?.pagination?.total || 0))
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') return
        setProducts([])
        setError('Failed to fetch products.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [
    debouncedSearch,
    page,
    pageSize,
    refreshTick,
    selectedWebsite?.vendorId,
    selectedWebsiteId,
    statusFilter,
    token,
  ])

  useEffect(() => {
    setPage(1)
  }, [selectedWebsiteId, statusFilter, pageSize])

  const totalVariants = useMemo(
    () => products.reduce((sum, product) => sum + (product.variants?.length || 0), 0),
    [products]
  )
  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + getTotalStock(product.variants), 0),
    [products]
  )
  const verifiedProducts = useMemo(
    () =>
      products.filter((product) => (product.status || '').toLowerCase() === 'approved')
        .length,
    [products]
  )
  const needsReview = Math.max(products.length - verifiedProducts, 0)

  const statsItems = useMemo(
    () => [
      {
        label: 'Total Products',
        value: totalProducts,
        helper: 'Products in current scope.',
      },
      {
        label: 'Visible (Current Page)',
        value: products.length,
        helper: 'Rows visible in current table page.',
      },
      {
        label: 'Verified (Current Page)',
        value: verifiedProducts,
        helper: 'Approved products in visible rows.',
      },
      {
        label: 'Needs Review (Current Page)',
        value: needsReview,
        helper: 'Pending, draft, or rejected in visible rows.',
      },
      {
        label: 'Variants (Current Page)',
        value: totalVariants,
        helper: 'Total variants in visible rows.',
      },
      {
        label: 'Stock Units (Current Page)',
        value: totalStock,
        helper: 'Total stock units in visible rows.',
      },
    ],
    [needsReview, products.length, totalProducts, totalStock, totalVariants, verifiedProducts]
  )

  return (
    <>
      <TablePageHeader title='All Admin Products'>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search by product, brand, SKU, or description'
          className='h-10 w-72 shrink-0'
        />
        <Select
          value={selectedWebsiteId}
          onValueChange={(value) => {
            setSelectedWebsiteId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className='h-10 w-72 shrink-0'>
            <SelectValue placeholder='All websites' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All websites</SelectItem>
            {websites.map((website) => (
              <SelectItem key={website.id} value={website.id}>
                {website.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className='h-10 w-44 shrink-0'>
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
          onClick={() => setRefreshTick((tick) => tick + 1)}
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
          description={
            selectedWebsiteId === 'all'
              ? ''
              : `Website scope: ${selectedWebsite?.label || 'Selected website'}`
          }
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalProducts}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[280px]'>Product</TableHead>
                <TableHead className='min-w-[160px]'>Brand</TableHead>
                <TableHead className='min-w-[120px]'>Variants</TableHead>
                <TableHead className='min-w-[130px]'>Stock</TableHead>
                <TableHead className='min-w-[160px]'>Price Range</TableHead>
                <TableHead className='min-w-[130px]'>Status</TableHead>
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-24 text-center'
                  >
                    {selectedWebsiteId === 'all'
                      ? 'No products found.'
                      : 'No products found for this website.'}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <ProductImage
                          src={getPrimaryProductImageUrl(product)}
                          alt={product.productName || 'Product'}
                          className='h-14 w-14 rounded-md border object-cover'
                        />
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-slate-900'>
                            {product.productName || 'Unnamed Product'}
                          </p>
                          <LinkedText
                            as='p'
                            text={product.shortDescription || 'No short description available.'}
                            preserveWhitespace={false}
                            className='text-muted-foreground max-w-[340px] truncate text-xs'
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='text-sm font-medium text-slate-700'>
                      {product.brand || 'Unavailable'}
                    </TableCell>
                    <TableCell className='text-sm font-semibold text-slate-900'>
                      {product.variants?.length || 0}
                    </TableCell>
                    <TableCell className='text-sm font-semibold text-slate-900'>
                      {getTotalStock(product.variants)} units
                    </TableCell>
                    <TableCell className='text-sm font-semibold text-slate-900'>
                      {getPriceRange(product.variants)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold',
                          getStatusClassName(product.status)
                        )}
                      >
                        {titleCase(product.status)}
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
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Product statistics'
        description='Summary for the current admin product scope.'
        items={statsItems}
      />
    </>
  )
}
