import { Link } from '@tanstack/react-router'
import {
  Boxes,
  CalendarDays,
  Eye,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  Package,
  Tag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Pagination } from '@/components/pagination'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { LinkedText } from './components/linked-text'

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
  isAvailable?: boolean
  createdAt?: string
  specifications?: Array<Record<string, unknown>>
  faqs?: Array<{ question?: string; answer?: string }>
}

type VariantRow = {
  rowKey: string
  product: Product
  variant: ProductVariant
  variantIndex: number
}

type SummaryCard = {
  label: string
  value: number
  Icon: LucideIcon
  iconClass: string
}

const limit = 10

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

const getVariantPrice = (variant?: ProductVariant) =>
  formatINR(Number(variant?.finalPrice ?? variant?.actualPrice ?? 0))

const getVariantImageUrl = (variant?: ProductVariant) =>
  String(variant?.variantsImageUrls?.[0]?.url || '').trim()

const getPrimaryVariantImageUrl = (product?: Product) =>
  Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => getVariantImageUrl(variant))
        .find((imageUrl) => Boolean(imageUrl)) || ''
    : ''

const getVariantSummary = (variant?: ProductVariant) => {
  const attributes = Object.entries(variant?.variantAttributes || {}).filter(
    ([key, value]) => Boolean(key) && value !== undefined && value !== null && String(value).trim()
  )

  if (attributes.length) {
    return attributes
      .map(([key, value]) => `${formatFieldLabel(key)}: ${String(value)}`)
      .join(' • ')
  }

  if (variant?.variantSku) {
    return variant.variantSku
  }

  return 'Default variant'
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
          'flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400',
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

function VariantSummaryCell({
  variant,
  variantIndex,
}: {
  variant?: ProductVariant
  variantIndex: number
}) {
  const attributes = Object.entries(variant?.variantAttributes || {})
    .filter(
      ([key, value]) => Boolean(key) && value !== undefined && value !== null && String(value).trim()
    )
    .map(([key, value]) => ({
      label: formatFieldLabel(key),
      value: String(value).trim(),
    }))

  const previewAttributes = attributes.slice(0, 2)
  const remainingCount = attributes.length - previewAttributes.length

  return (
    <div className='max-w-[280px] space-y-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge
          variant='outline'
          className='rounded-full border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700'
        >
          Variant {variantIndex + 1}
        </Badge>
        <span className='text-xs text-slate-500'>
          {attributes.length || 0} {attributes.length === 1 ? 'detail' : 'details'}
        </span>
      </div>

      {previewAttributes.length ? (
        <div className='flex flex-wrap gap-1.5'>
          {previewAttributes.map((attribute) => (
            <span
              key={`${attribute.label}-${attribute.value}`}
              title={`${attribute.label}: ${attribute.value}`}
              className='max-w-[220px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700'
            >
              {attribute.label}: {attribute.value}
            </span>
          ))}

          {remainingCount > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type='button'
                  className='inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700'
                >
                  +{remainingCount} more
                </button>
              </PopoverTrigger>
              <PopoverContent
                align='start'
                className='w-[320px] rounded-2xl border-slate-200 p-0 shadow-xl'
              >
                <div className='border-b border-slate-100 px-4 py-3'>
                  <p className='text-sm font-semibold text-slate-900'>
                    {getVariantSummary(variant)}
                  </p>
                  <p className='text-xs text-slate-500'>
                    SKU: {variant?.variantSku || `Variant ${variantIndex + 1}`}
                  </p>
                </div>
                <ScrollArea className='max-h-64'>
                  <div className='space-y-2 p-4'>
                    {attributes.map((attribute) => (
                      <div
                        key={`${attribute.label}-${attribute.value}`}
                        className='rounded-xl border border-slate-100 bg-slate-50 px-3 py-2'
                      >
                        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                          {attribute.label}
                        </p>
                        <p className='mt-1 text-sm font-medium text-slate-900'>
                          {attribute.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      ) : (
        <p className='text-sm font-medium text-slate-700'>{getVariantSummary(variant)}</p>
      )}

      <p className='text-xs text-slate-500'>
        SKU: {variant?.variantSku || `Variant ${variantIndex + 1}`}
      </p>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-hidden rounded-[30px] border-slate-200 p-0 shadow-2xl sm:max-w-5xl'>
        <div className='border-b border-sky-100 bg-sky-50/70 px-6 py-5'>
          <Badge
            variant='outline'
            className='mb-3 rounded-full border-sky-200 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-sky-700'
          >
            Product Details
          </Badge>
          <DialogHeader className='text-left'>
            <DialogTitle className='text-2xl font-semibold text-slate-950'>
              {product.productName || 'Unnamed Product'}
            </DialogTitle>
            <DialogDescription className='text-sm text-slate-600'>
              Review your listing content, stock position, variants, and FAQ data.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className='max-h-[calc(90vh-112px)] space-y-6 overflow-y-auto px-6 py-6'>
          <div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
            <ProductImage
              src={getPrimaryVariantImageUrl(product)}
              alt={product.productName || 'Product variant image'}
              className='aspect-square w-full rounded-[28px] border border-slate-200 object-cover'
            />
            <div className='space-y-5'>
              <div className='flex flex-wrap items-center gap-3'>
                <Badge
                  variant='outline'
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    product.isAvailable !== false
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                  )}
                >
                  {product.isAvailable !== false ? 'Visible Everywhere' : 'Hidden Everywhere'}
                </Badge>
                <Badge
                  variant='outline'
                  className='rounded-full border-slate-200 px-3 py-1 text-slate-600'
                >
                  <CalendarDays className='h-3.5 w-3.5' />
                  {formatDate(product.createdAt)}
                </Badge>
              </div>

              <div className='grid gap-4 sm:grid-cols-3'>
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                    Brand
                  </p>
                  <p className='mt-2 text-base font-semibold text-slate-900'>
                    {product.brand || 'Unavailable'}
                  </p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                    Variants
                  </p>
                  <p className='mt-2 text-base font-semibold text-slate-900'>
                    {product.variants?.length || 0}
                  </p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                    Stock
                  </p>
                  <p className='mt-2 text-base font-semibold text-slate-900'>
                    {getTotalStock(product.variants)} units
                  </p>
                </div>
              </div>

              <div className='rounded-[24px] border border-slate-200 bg-white p-5'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Description
                </p>
                <LinkedText
                  as='p'
                  text={
                    product.description ||
                    product.shortDescription ||
                    'No description available.'
                  }
                  className='mt-3 text-sm leading-7 text-slate-700'
                />
              </div>
            </div>
          </div>

          {Array.isArray(product.specifications) &&
            product.specifications[0] &&
            Object.keys(product.specifications[0]).length > 0 && (
              <section className='rounded-[24px] border border-slate-200 bg-white p-5'>
                <div className='mb-4 flex items-center gap-2 text-slate-900'>
                  <FileText className='h-4 w-4 text-sky-700' />
                  <h3 className='text-lg font-semibold'>Specifications</h3>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                  {Object.entries(product.specifications[0]).map(([key, value]) => (
                    <div
                      key={key}
                      className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                        {formatFieldLabel(key)}
                      </p>
                      <p className='mt-2 text-sm font-medium text-slate-900'>
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
            )}

          <section className='rounded-[24px] border border-slate-200 bg-white p-5'>
            <div className='mb-4 flex items-center gap-2 text-slate-900'>
              <Boxes className='h-4 w-4 text-sky-700' />
              <h3 className='text-lg font-semibold'>Variants</h3>
            </div>
            <div className='space-y-4'>
              {(product.variants || []).map((variant, index) => (
                <div
                  key={variant.variantSku || index}
                  className='rounded-[22px] border border-slate-200 bg-slate-50 p-4'
                >
                  <div className='flex flex-col gap-4 lg:flex-row'>
                    <ProductImage
                      src={variant.variantsImageUrls?.[0]?.url}
                      alt={`${product.productName || 'Product'} variant`}
                      className='h-28 w-28 rounded-2xl border border-slate-200 object-cover'
                    />
                    <div className='min-w-0 flex-1 space-y-3'>
                      <div className='flex flex-wrap gap-2'>
                        {Object.entries(variant.variantAttributes || {}).map(
                          ([key, value]) => (
                            <Badge
                              key={key}
                              variant='outline'
                              className='rounded-full border-sky-200 bg-white px-3 py-1 text-sky-700'
                            >
                              {formatFieldLabel(key)}: {String(value || 'N/A')}
                            </Badge>
                          )
                        )}
                      </div>
                      <div className='grid gap-3 sm:grid-cols-3 xl:grid-cols-4'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            SKU
                          </p>
                          <p className='mt-1 text-sm font-medium text-slate-900'>
                            {variant.variantSku || 'Unavailable'}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            Actual Price
                          </p>
                          <p className='mt-1 text-sm font-medium text-slate-900'>
                            {formatINR(variant.actualPrice || 0)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            Final Price
                          </p>
                          <p className='mt-1 text-sm font-medium text-slate-900'>
                            {formatINR(variant.finalPrice || 0)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            Stock
                          </p>
                          <p className='mt-1 text-sm font-medium text-slate-900'>
                            {Number(variant.stockQuantity || 0)} units
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {Array.isArray(product.faqs) && product.faqs.length > 0 && (
            <section className='rounded-[24px] border border-slate-200 bg-white p-5'>
              <div className='mb-4 flex items-center gap-2 text-slate-900'>
                <HelpCircle className='h-4 w-4 text-sky-700' />
                <h3 className='text-lg font-semibold'>FAQs</h3>
              </div>
              <div className='space-y-3'>
                {product.faqs.map((faq, index) => (
                  <div
                    key={`${faq.question || 'faq'}-${index}`}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <LinkedText
                      as='p'
                      text={faq.question || 'No question provided'}
                      className='text-sm font-semibold text-slate-900'
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
      </DialogContent>
    </Dialog>
  )
}

export default function VendorProductsTable() {
  const vendorId = useSelector((state: any) => state.auth?.user?.id || state.auth?.user?._id || '')
  const token = useSelector((state: any) => state.auth?.token || '')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState('')

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      if (!vendorId || !token) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/vendor/${vendorId}?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal,
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setProducts(Array.isArray(data?.products) ? data.products : [])
        setTotalPages(Number(data?.pagination?.totalPages || 1))
        setTotalProducts(Number(data?.pagination?.total || 0))
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') return
        setProducts([])
        setError('Failed to fetch products.')
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [page, token, vendorId]
  )

  useEffect(() => {
    const controller = new AbortController()

    if (!vendorId || !token) {
      setProducts([])
      setLoading(false)
      return
    }

    loadProducts(controller.signal)
    return () => controller.abort()
  }, [loadProducts, token, vendorId])

  const totalVariants = useMemo(
    () => products.reduce((sum, product) => sum + (product.variants?.length || 0), 0),
    [products]
  )
  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + getTotalStock(product.variants), 0),
    [products]
  )
  const summaryCards = useMemo(
    () =>
      [
        {
          label: 'Total Products',
          value: totalProducts || products.length,
          Icon: Package,
          iconClass: 'bg-sky-100 text-sky-700',
        },
        {
          label: 'Total Variants',
          value: totalVariants,
          Icon: Boxes,
          iconClass: 'bg-emerald-100 text-emerald-700',
        },
        {
          label: 'Total Stock',
          value: totalStock,
          Icon: TrendingUp,
          iconClass: 'bg-amber-100 text-amber-700',
        },
      ] satisfies SummaryCard[],
    [products.length, totalProducts, totalStock, totalVariants]
  )

  const variantRows = useMemo<VariantRow[]>(
    () =>
      products.flatMap((product) => {
        const variants = Array.isArray(product.variants) && product.variants.length
          ? product.variants
          : [{}]

        return variants.map((variant, index) => ({
          rowKey: `${product._id}-${variant?._id || variant?.variantSku || index}`,
          product,
          variant,
          variantIndex: index,
        }))
      }),
    [products]
  )

  const handleVisibilityToggle = useCallback(
    async (productId: string, nextValue: boolean) => {
      if (!token) {
        toast.error('Your session has expired. Please login again.')
        return
      }

      setVisibilityUpdatingId(productId)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/admin/products/${productId}/content`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isAvailable: nextValue }),
          }
        )

        const body = await response.json().catch(() => null)
        if (!response.ok || body?.success === false || !body?.data?._id) {
          throw new Error(body?.message || 'Failed to update product visibility.')
        }

        setProducts((prev) =>
          prev.map((product) =>
            product._id === productId
              ? {
                  ...product,
                  isAvailable: nextValue,
                }
              : product
          )
        )
        setSelectedProduct((current) =>
          current && current._id === productId
            ? {
                ...current,
                isAvailable: nextValue,
              }
            : current
        )
        toast.success(nextValue ? 'Product is now visible everywhere.' : 'Product has been hidden everywhere.')
      } catch (updateError: any) {
        toast.error(updateError?.message || 'Failed to update product visibility.')
      } finally {
        setVisibilityUpdatingId('')
      }
    },
    [token]
  )

  return (
    <div className='flex min-h-screen flex-col'>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <section className='rounded-[32px] border border-sky-100 bg-sky-50/50 px-6 py-8 shadow-sm'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='space-y-4'>
              <Badge
                variant='outline'
                className='rounded-full border-sky-200 bg-white/80 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-sky-700'
              >
                Product Inventory
              </Badge>
              <div className='space-y-2'>
                <h1 className='text-4xl font-semibold tracking-tight text-slate-950'>
                  Your Product Catalog
                </h1>
                <p className='max-w-3xl text-lg leading-8 text-slate-600'>
                  Track live catalog entries, stock movement, and listing quality from the same product workspace style as the rest of the platform.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge
                  variant='outline'
                  className='rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700'
                >
                  {totalProducts || products.length} products
                </Badge>
                <Badge
                  variant='outline'
                  className='rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700'
                >
                  {totalVariants} variants
                </Badge>
                <Badge
                  variant='outline'
                  className='rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700'
                >
                  {totalStock} stock units
                </Badge>
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button
                asChild
                variant='outline'
                className='h-11 rounded-xl border-slate-200 px-5'
              >
                <Link to='/upload-products'>Bulk Upload</Link>
              </Button>
              <Button
                asChild
                className='h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800'
              >
                <Link to='/products/create-products'>Create Product</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className='grid gap-4 md:grid-cols-3'>
          {summaryCards.map(({ label, value, Icon, iconClass }) => (
            <div
              key={label}
              className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'
            >
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-sm font-medium text-slate-500'>{label}</p>
                  <p className='mt-3 text-4xl font-semibold tracking-tight text-slate-950'>
                    {value}
                  </p>
                </div>
                <div className={cn('rounded-2xl p-3', iconClass)}>
                  <Icon className='h-6 w-6' />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className='overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm'>
          {error && (
            <div className='border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700'>
              {error}
            </div>
          )}
          <div className='relative overflow-x-auto'>
            {loading && (
              <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm'>
                <div className='flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading products
                </div>
              </div>
            )}

            <table className='min-w-full text-left'>
              <thead className='bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500'>
                <tr>
                  <th className='px-6 py-4 font-semibold'>Product</th>
                  <th className='px-6 py-4 font-semibold'>Brand</th>
                  <th className='px-6 py-4 font-semibold'>Variant</th>
                  <th className='px-6 py-4 font-semibold'>Stock</th>
                  <th className='px-6 py-4 font-semibold'>Price</th>
                  <th className='px-6 py-4 font-semibold'>Visible</th>
                  <th className='px-6 py-4 font-semibold'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200'>
                {!loading && variantRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-6 py-16 text-center'>
                      <div className='flex flex-col items-center gap-3'>
                        <div className='rounded-full bg-slate-100 p-4 text-slate-500'>
                          <Package className='h-6 w-6' />
                        </div>
                        <h3 className='text-lg font-semibold text-slate-900'>
                          No products found
                        </h3>
                        <p className='max-w-md text-sm text-slate-500'>
                          Start by creating a product or bulk uploading your catalog.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  variantRows.map(({ rowKey, product, variant, variantIndex }) => (
                    <tr key={rowKey} className='transition-colors hover:bg-slate-50/80'>
                      <td className='px-6 py-5'>
                        <div className='flex items-center gap-4'>
                          <ProductImage
                            src={getVariantImageUrl(variant)}
                            alt={`${product.productName || 'Product'} variant ${variantIndex + 1}`}
                            className='h-16 w-16 rounded-2xl border border-slate-200 object-cover'
                          />
                          <div className='min-w-0'>
                            <p className='text-lg font-semibold text-slate-950'>
                              {product.productName || 'Unnamed Product'}
                            </p>
                            <LinkedText
                              as='p'
                              text={product.shortDescription || 'No short description available.'}
                              preserveWhitespace={false}
                              className='max-w-md overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-500'
                            />
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex items-center gap-2 text-slate-700'>
                          <Tag className='h-4 w-4 text-slate-400' />
                          <span className='font-medium'>{product.brand || 'Unavailable'}</span>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <VariantSummaryCell
                          variant={variant}
                          variantIndex={variantIndex}
                        />
                      </td>
                      <td className='px-6 py-5 text-base font-semibold text-slate-900'>
                        {Number(variant.stockQuantity || 0)} units
                      </td>
                      <td className='px-6 py-5 text-base font-semibold text-slate-900'>
                        {getVariantPrice(variant)}
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex min-w-[148px] items-center gap-3'>
                          <Switch
                            checked={product.isAvailable !== false}
                            onCheckedChange={(checked) =>
                              handleVisibilityToggle(product._id, checked)
                            }
                            disabled={visibilityUpdatingId === product._id}
                          />
                          <span
                            className={cn(
                              'text-sm font-medium',
                              product.isAvailable !== false
                                ? 'text-emerald-700'
                                : 'text-slate-500'
                            )}
                          >
                            {visibilityUpdatingId === product._id
                              ? 'Saving...'
                              : product.isAvailable !== false
                                ? 'Visible'
                                : 'Hidden'}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <Button
                          variant='outline'
                          className='h-10 rounded-xl border-slate-200 px-4'
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className='h-4 w-4' />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          isLoading={loading}
        />
      </Main>

      <ProductDetailsDialog
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </div>
  )
}
