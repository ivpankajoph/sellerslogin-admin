import { useEffect, useMemo, useState } from 'react'
import { Edit3, ImageIcon, Loader2, RefreshCcw, Save, Search } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '@/store'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  SheetFooter,
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
import { Textarea } from '@/components/ui/textarea'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'

type ProductRow = {
  _id: string
  productName?: string
  brand?: string
  slug?: string
  status?: string
  updatedAt?: string
  defaultImages?: Array<{ url?: string }>
  variants?: Array<{
    variantsImageUrls?: Array<{ url?: string }>
  }>
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
}

type MetaEditorForm = {
  metaTitle: string
  metaDescription: string
  metaKeywords: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]
const DEFAULT_PAGE_SIZE = 10

const normalizeText = (value: unknown) => String(value || '').trim()

const parseKeywords = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const formatKeywords = (keywords?: string[]) =>
  Array.isArray(keywords) ? keywords.filter(Boolean).join(', ') : ''

const formatDate = (value?: string) => {
  const normalized = normalizeText(value)
  if (!normalized) return 'Recently updated'

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return 'Recently updated'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const getStatusBadgeClassName = (status?: string) => {
  switch (normalizeText(status).toLowerCase()) {
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

const formatStatusLabel = (status?: string) => {
  const normalized = normalizeText(status).toLowerCase()
  if (!normalized) return 'Pending'
  if (normalized === 'approved') return 'Verified'
  return normalized.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const buildEditorForm = (product?: ProductRow | null): MetaEditorForm => ({
  metaTitle: normalizeText(product?.metaTitle),
  metaDescription: normalizeText(product?.metaDescription),
  metaKeywords: formatKeywords(product?.metaKeywords),
})

const getPrimaryProductImageUrl = (product?: ProductRow) => {
  const defaultImage = normalizeText(product?.defaultImages?.[0]?.url)
  if (defaultImage) return defaultImage

  return Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => normalizeText(variant?.variantsImageUrls?.[0]?.url))
        .find(Boolean) || ''
    : ''
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function ProductImage({ product }: { product: ProductRow }) {
  const [failed, setFailed] = useState(false)
  const src = getPrimaryProductImageUrl(product)

  if (!src || failed) {
    return (
      <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-slate-100 text-slate-400'>
        <ImageIcon className='h-6 w-6' />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={product.productName || 'Product image'}
      className='h-14 w-14 shrink-0 rounded-md border object-cover'
      loading='lazy'
      onError={() => setFailed(true)}
    />
  )
}

export default function SeoMetaTagsPage() {
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const role = normalizeText(authUser?.role).toLowerCase()
  const isVendor = role === 'vendor'
  const ownerId = normalizeText(authUser?._id || authUser?.id)

  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null)
  const [editorForm, setEditorForm] = useState<MetaEditorForm>(buildEditorForm())

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [pageSize, statusFilter])

  useEffect(() => {
    if (!token) {
      setProducts([])
      setTotalItems(0)
      setTotalPages(1)
      return
    }

    const controller = new AbortController()

    const loadProducts = async () => {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          includeUnavailable: 'true',
        })

        if (search) params.set('search', search)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (isVendor && ownerId) params.set('ownerId', ownerId)

        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/all?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const items = Array.isArray(data?.products) ? (data.products as ProductRow[]) : []

        setProducts(items)
        setTotalItems(Number(data?.pagination?.total || 0))
        setTotalPages(Number(data?.pagination?.totalPages || 1))

        if (selectedProduct?._id) {
          const nextSelectedProduct =
            items.find((item) => item._id === selectedProduct._id) || null
          setSelectedProduct(nextSelectedProduct)
          if (nextSelectedProduct) {
            setEditorForm(buildEditorForm(nextSelectedProduct))
          }
        }
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return
        setProducts([])
        setTotalItems(0)
        setTotalPages(1)
        setError(getErrorMessage(fetchError, 'Failed to load product SEO meta tags.'))
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadProducts()

    return () => controller.abort()
  }, [token, page, pageSize, search, statusFilter, isVendor, ownerId, selectedProduct?._id, refreshTick])

  const stats = useMemo(
    () => ({
      withMetaTitle: products.filter((product) => normalizeText(product.metaTitle)).length,
      withMetaDescription: products.filter((product) =>
        normalizeText(product.metaDescription)
      ).length,
      withMetaKeywords: products.filter(
        (product) => Array.isArray(product.metaKeywords) && product.metaKeywords.length > 0
      ).length,
    }),
    [products]
  )

  const openEditor = (product: ProductRow) => {
    setSelectedProduct(product)
    setEditorForm(buildEditorForm(product))
    setSheetOpen(true)
  }

  const refreshSelectedProduct = (productId: string, nextMeta: MetaEditorForm) => {
    setProducts((current) =>
      current.map((product) =>
        product._id === productId
          ? {
              ...product,
              metaTitle: nextMeta.metaTitle,
              metaDescription: nextMeta.metaDescription,
              metaKeywords: parseKeywords(nextMeta.metaKeywords),
              updatedAt: new Date().toISOString(),
            }
          : product
      )
    )
  }

  const handleSave = async () => {
    if (!selectedProduct?._id || !token) return

    const payload = {
      metaTitle: editorForm.metaTitle.trim(),
      metaDescription: editorForm.metaDescription.trim(),
      metaKeywords: parseKeywords(editorForm.metaKeywords),
    }

    try {
      setSaving(true)

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/${selectedProduct._id}/content`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          normalizeText(data?.message) || 'Failed to update product SEO meta tags.'
        )
      }

      const nextForm = {
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        metaKeywords: formatKeywords(payload.metaKeywords),
      }

      refreshSelectedProduct(selectedProduct._id, nextForm)
      setSelectedProduct((current) =>
        current
          ? {
              ...current,
              metaTitle: payload.metaTitle,
              metaDescription: payload.metaDescription,
              metaKeywords: payload.metaKeywords,
              updatedAt: new Date().toISOString(),
            }
          : current
      )
      setEditorForm(nextForm)
      toast.success('Product SEO meta tags updated successfully')
      setSheetOpen(false)
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, 'Failed to update product SEO meta tags.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <TablePageHeader title='SEO Edit Page' stackOnMobile>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder='Search by product name, brand, slug, or description'
          className='h-10 w-full sm:w-80'
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='h-10 w-full sm:w-44'>
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
          className='h-10'
          onClick={() => {
            setPage(1)
            setSearch(searchInput.trim())
            setRefreshTick((current) => current + 1)
          }}
          disabled={loading}
        >
          <Search className='mr-2 h-4 w-4' />
          Search
        </Button>
        <Button
          variant='outline'
          className='h-10'
          onClick={() => setRefreshTick((current) => current + 1)}
          disabled={loading}
        >
          <RefreshCcw className='mr-2 h-4 w-4' />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='rounded-md border bg-background p-4'>
            <p className='text-muted-foreground text-sm'>Visible Products</p>
            <p className='mt-2 text-2xl font-semibold'>{products.length}</p>
          </div>
          <div className='rounded-md border bg-background p-4'>
            <p className='text-muted-foreground text-sm'>Meta Title Filled</p>
            <p className='mt-2 text-2xl font-semibold'>{stats.withMetaTitle}</p>
          </div>
          <div className='rounded-md border bg-background p-4'>
            <p className='text-muted-foreground text-sm'>Keywords Added</p>
            <p className='mt-2 text-2xl font-semibold'>{stats.withMetaKeywords}</p>
          </div>
        </div>

        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        <TableShell
          className='flex-1'
          description=''
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          }
        >
          <Table className='min-w-[1220px] table-fixed'>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[380px]'>Product</TableHead>
                <TableHead className='w-[190px]'>Meta Title</TableHead>
                <TableHead className='w-[260px]'>Meta Description</TableHead>
                <TableHead className='w-[160px]'>Keywords</TableHead>
                <TableHead className='w-[110px]'>Status</TableHead>
                <TableHead className='w-[150px]'>Updated</TableHead>
                <TableHead className='w-[130px] text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Loading product SEO records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-muted-foreground h-24 text-center'>
                    No products found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className='w-[380px] max-w-[380px]'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <ProductImage product={product} />
                        <div className='min-w-0 flex-1 space-y-1'>
                          <div className='truncate font-medium' title={product.productName}>
                            {product.productName || 'Unnamed Product'}
                          </div>
                          <div
                            className='text-muted-foreground truncate text-xs'
                            title={`${product.brand || 'No brand'}${product.slug ? ` /${product.slug}` : ''}`}
                          >
                            {product.brand || 'No brand'}{product.slug ? ` /${product.slug}` : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='w-[190px] max-w-[190px] text-sm'>
                      <div className='truncate' title={normalizeText(product.metaTitle)}>
                        {normalizeText(product.metaTitle) || (
                          <span className='text-muted-foreground'>Not added yet</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='w-[260px] max-w-[260px] text-sm'>
                      <div className='truncate' title={normalizeText(product.metaDescription)}>
                        {normalizeText(product.metaDescription) || (
                          <span className='text-muted-foreground'>Not added yet</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='w-[160px] max-w-[160px] text-sm'>
                      <div className='truncate' title={formatKeywords(product.metaKeywords)}>
                        {formatKeywords(product.metaKeywords) || (
                          <span className='text-muted-foreground'>No keywords</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='w-[110px] max-w-[110px]'>
                      <Badge
                        variant='outline'
                        className={getStatusBadgeClassName(product.status)}
                      >
                        {formatStatusLabel(product.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className='w-[150px] max-w-[150px] text-sm text-muted-foreground'>
                      {formatDate(product.updatedAt)}
                    </TableCell>
                    <TableCell className='w-[130px] max-w-[130px] text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full'
                        onClick={() => openEditor(product)}
                      >
                        <Edit3 className='mr-2 h-4 w-4' />
                        Edit
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
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            setSelectedProduct(null)
            setEditorForm(buildEditorForm())
          }
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-2xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>{selectedProduct?.productName || 'SEO Edit Page'}</SheetTitle>
            <SheetDescription>
              Product page ke SEO meta fields ko update karein. Keywords comma separated
              format me save honge.
            </SheetDescription>
          </SheetHeader>

          <div className='flex-1 space-y-5 overflow-y-auto px-5 py-5'>
            <div className='grid gap-4 rounded-md border bg-muted/20 p-4 sm:grid-cols-2'>
              <div>
                <p className='text-muted-foreground text-xs font-medium'>Brand</p>
                <p className='mt-1 text-sm font-semibold'>
                  {selectedProduct?.brand || 'Not available'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs font-medium'>Last updated</p>
                <p className='mt-1 text-sm font-semibold'>
                  {formatDate(selectedProduct?.updatedAt)}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor='seo-meta-title'>Meta Title</Label>
              <Input
                id='seo-meta-title'
                value={editorForm.metaTitle}
                onChange={(event) =>
                  setEditorForm((current) => ({
                    ...current,
                    metaTitle: event.target.value,
                  }))
                }
                placeholder='Enter product meta title'
              />
            </div>

            <div>
              <Label htmlFor='seo-meta-description'>Meta Description</Label>
              <Textarea
                id='seo-meta-description'
                value={editorForm.metaDescription}
                onChange={(event) =>
                  setEditorForm((current) => ({
                    ...current,
                    metaDescription: event.target.value,
                  }))
                }
                placeholder='Enter product meta description'
                className='min-h-32'
              />
            </div>

            <div>
              <Label htmlFor='seo-meta-keywords'>Meta Keywords</Label>
              <Textarea
                id='seo-meta-keywords'
                value={editorForm.metaKeywords}
                onChange={(event) =>
                  setEditorForm((current) => ({
                    ...current,
                    metaKeywords: event.target.value,
                  }))
                }
                placeholder='keyword one, keyword two, keyword three'
                className='min-h-28'
              />
              <p className='text-muted-foreground mt-2 text-xs'>
                {parseKeywords(editorForm.metaKeywords).length} keywords ready to save
              </p>
            </div>

            <div className='grid gap-4 rounded-md border bg-background p-4 sm:grid-cols-3'>
              <div>
                <p className='text-muted-foreground text-xs'>Title length</p>
                <p className='mt-1 text-sm font-semibold'>{editorForm.metaTitle.length}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Description length</p>
                <p className='mt-1 text-sm font-semibold'>
                  {editorForm.metaDescription.length}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Keyword count</p>
                <p className='mt-1 text-sm font-semibold'>
                  {parseKeywords(editorForm.metaKeywords).length}
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className='border-t px-5 py-4 sm:flex-row sm:justify-end'>
            <Button
              variant='outline'
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !selectedProduct}>
              {saving ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Save className='mr-2 h-4 w-4' />
              )}
              Save Meta Tags
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
