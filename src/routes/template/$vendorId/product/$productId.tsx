import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import axios from 'axios'
import { createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, ChevronLeft, Package, Tag, Star } from 'lucide-react'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'
import { toast } from 'sonner'
import { TemplatePageSkeleton } from '@/features/template-preview/components/TemplatePageSkeleton'

type CategoryMap = Record<string, string>

interface ProductDetail {
  _id?: string
  productName?: string
  brand?: string
  shortDescription?: string
  description?: string
  productCategory?: string
  specifications?: Array<Record<string, string>>
  defaultImages?: Array<{ url: string }>
  variants?: Array<{
    _id?: string
    variantSku?: string
    actualPrice?: number
    finalPrice?: number
    discountPercent?: number
    stockQuantity?: number
    variantsImageUrls?: Array<{ url: string }>
    variantAttributes?: Record<string, string>
  }>
  faqs?: Array<{ question?: string; answer?: string }>
}

interface TemplateMeta {
  logo?: string
  buttonLabel?: string
  theme?: {
    templateColor?: string
    fontScale?: number
  }
  customPages?: Array<{
    id?: string
    title?: string
    slug?: string
    isPublished?: boolean
  }>
  heroStyle?: {
    primaryButtonColor?: string
  }
}

type VariantDetail = NonNullable<ProductDetail['variants']>[number]

export const Route = createFileRoute('/template/$vendorId/product/$productId')({
  component: TemplateProductDetail,
})

function TemplateProductDetail() {
  const { vendorId, productId } = Route.useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
  const [vendorName, setVendorName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<VariantDetail | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [showMagnifier, setShowMagnifier] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [imgBounds, setImgBounds] = useState({ width: 0, height: 0 })
  const token = useSelector((state: { auth?: { token?: string } }) => state?.auth?.token)

  const headers = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }, [token])

  const productCategory = useMemo(() => {
    if (!product?.productCategory) return 'Uncategorized'
    const mapped = categoryMap[product.productCategory]
    if (mapped) return mapped
    if (/^[a-f\d]{24}$/i.test(product.productCategory)) {
      return 'Uncategorized'
    }
    return product.productCategory
  }, [product?.productCategory, categoryMap])

  useEffect(() => {
    let mounted = true

    const loadProduct = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/products/${productId}`)
        const payload = res.data?.product || res.data?.data || res.data
        return payload as ProductDetail
      } catch {
        return null
      }
    }

    const loadTemplate = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/templates/${vendorId}`, {
          headers,
        })
        const payload = res.data?.data || res.data?.template || res.data
        return payload as any
      } catch {
        return null
      }
    }

    const loadCategories = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/categories/getall`, {
          headers,
        })
        const list = res.data?.data || []
        if (!Array.isArray(list)) return {}
        return list.reduce<CategoryMap>((acc, item) => {
          const key = item?._id || item?.id
          const value =
            item?.name || item?.title || item?.categoryName || item?.label
          if (key && value) acc[key] = value
          return acc
        }, {})
      } catch {
        return {}
      }
    }

    const loadVendorProfile = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/v1/vendors/vendorprofile?id=${vendorId}`
        )
        const vendor = res.data?.vendor
        return (
          vendor?.name ||
          vendor?.businessName ||
          vendor?.storeName ||
          null
        )
      } catch {
        return null
      }
    }

    setLoading(true)
    setError(null)

    Promise.all([loadProduct(), loadCategories(), loadTemplate(), loadVendorProfile()])
      .then(([productResult, categoryResult, templateResult, vendorNameResult]) => {
        if (!mounted) return
        if (!productResult) {
          setError('Product not found.')
          return
        }
        setProduct(productResult)
        const firstVariant = productResult?.variants?.[0] || null
        setSelectedVariant(firstVariant)
        const defaultImg = productResult.defaultImages?.[0]?.url?.trim() || ''
        const variantImg = firstVariant?.variantsImageUrls?.[0]?.url?.trim() || ''
        setSelectedImage(defaultImg || variantImg)
        setCategoryMap(categoryResult || {})
        setVendorName(vendorNameResult || null)
        if (templateResult?.components) {
          setTemplateMeta({
            logo: templateResult.components.logo,
            buttonLabel: templateResult.components.home_page?.button_header,
            theme: templateResult.components.theme,
            customPages: templateResult.components.custom_pages || [],
            heroStyle: templateResult.components.home_page?.hero_style || {},
          })
        }
      })
      .catch(() => {
        if (!mounted) return
        setError('Failed to load product details.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [productId, headers, vendorId])

  useEffect(() => {
    if (selectedVariant?.variantsImageUrls?.[0]?.url) {
      setSelectedImage(selectedVariant.variantsImageUrls[0].url.trim())
    }
  }, [selectedVariant])

  useEffect(() => {
    setQuantity(1)
  }, [selectedVariant?._id])

  const onThumbKey = (e: KeyboardEvent<HTMLButtonElement>, img: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedImage(img)
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setImgBounds({ width: rect.width, height: rect.height })
  }

  const handleMouseEnter = () => setShowMagnifier(true)
  const handleMouseLeave = () => setShowMagnifier(false)

  if (loading) {
    return <TemplatePageSkeleton />
  }

  if (error || !product) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-950 text-white'>
        <div className='rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm text-white/80'>
          {error || 'Unable to load product.'}
        </div>
      </div>
    )
  }

  const defaultImageUrls = (product.defaultImages || [])
    .map((img) => img?.url?.trim())
    .filter(Boolean)
  const variantImageUrls =
    product.variants?.flatMap((variant) =>
      (variant.variantsImageUrls || []).map((img) => img?.url?.trim()).filter(Boolean)
    ) || []
  const allImageUrls = Array.from(new Set([...defaultImageUrls, ...variantImageUrls])).filter(
    Boolean
  ) as string[]

  const specs: Record<string, string> = {
    Brand: product.brand || 'N/A',
    'Stock Available': String(selectedVariant?.stockQuantity ?? 0),
    Price: `Rs. ${(selectedVariant?.finalPrice || 0).toLocaleString()}`,
    ...(selectedVariant?.variantAttributes || {}),
  }

  const basePrice = selectedVariant?.finalPrice ?? product?.variants?.[0]?.finalPrice ?? 0
  const actualPrice = selectedVariant?.actualPrice ?? product?.variants?.[0]?.actualPrice ?? basePrice
  const discountPercent = selectedVariant?.discountPercent ?? 0
  const stockAvailable = selectedVariant?.stockQuantity ?? 0
  const maxQuantity = Math.max(stockAvailable, 1)
  const totalAmount = basePrice * quantity

  const specificationEntries =
    product.specifications
      ?.flatMap((item) => Object.entries(item).filter(([, value]) => Boolean(value)))
      .filter(([key]) => Boolean(key)) || []

  return (
    <PreviewChrome
      vendorId={vendorId}
      logoUrl={templateMeta?.logo}
      vendorName={vendorName || undefined}
      buttonLabel={templateMeta?.buttonLabel}
      buttonColor={templateMeta?.heroStyle?.primaryButtonColor}
      theme={templateMeta?.theme}
      customPages={templateMeta?.customPages || []}
      active='home'
    >
      <div className='flex items-center gap-3 text-sm text-slate-500'>
        <a
          href={`/template/${vendorId}`}
          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'
        >
          <ChevronLeft className='h-4 w-4' />
          Back to catalog
        </a>
      </div>

      <div className='grid gap-8 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <div className='flex flex-col gap-4 lg:flex-row'>
            <div className='flex gap-3 lg:flex-col'>
              {allImageUrls.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  aria-label={`View product image ${index + 1}`}
                  onClick={() => setSelectedImage(img)}
                  onKeyDown={(e) => onThumbKey(e, img)}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition ${
                    selectedImage === img
                      ? 'border-indigo-400 ring-2 ring-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  <img src={img} alt='Product' className='h-full w-full object-cover' />
                </button>
              ))}
            </div>
            <div className='relative flex-1'>
              <div
                className='relative h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100'
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.productName || 'Product'}
                    className='h-full w-full object-contain'
                  />
                ) : (
                  <div className='flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                    No Image
                  </div>
                )}
                {showMagnifier && selectedImage && (
                  <div
                    className='absolute h-44 w-44 rounded-full border-4 border-white shadow-2xl'
                    style={{
                      left: cursorPos.x - 88,
                      top: cursorPos.y - 88,
                      backgroundImage: `url(${selectedImage})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${imgBounds.width * 2}px ${imgBounds.height * 2}px`,
                      backgroundPosition: `-${cursorPos.x * 2 - 88}px -${
                        cursorPos.y * 2 - 88
                      }px`,
                    }}
                  />
                )}
              </div>
              <p className='mt-2 text-xs text-slate-500'>Hover over image to zoom</p>
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              {productCategory}
            </p>
            <h1
              className='mt-2 text-3xl font-semibold text-slate-900'
              style={{ color: 'var(--template-accent)' }}
            >
              {product.productName}
            </h1>
            <p className='mt-2 text-sm text-slate-600'>
              {product.shortDescription || product.description}
            </p>
            <div className='mt-4 flex flex-wrap items-center gap-3'>
              <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
                <Tag className='h-4 w-4 text-slate-500' />
                {product.brand || 'Brand'}
              </span>
              <span className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700'>
                <BadgeCheck className='h-4 w-4' />
                Verified Listing
              </span>
            </div>
            <div className='mt-5 rounded-3xl border border-slate-200 bg-white p-5'>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>
                    Pricing
                  </p>
                  <div className='mt-2 flex items-end gap-3'>
                    <span
                      className='text-3xl font-semibold text-slate-900'
                      style={{ color: 'var(--template-accent)' }}
                    >
                      Rs. {basePrice.toLocaleString()}
                    </span>
                    {actualPrice > basePrice && (
                      <span className='text-sm text-slate-400 line-through'>
                        Rs. {actualPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className='mt-2 text-xs text-slate-500'>
                    Stock available: {stockAvailable}
                  </p>
                </div>
                {discountPercent > 0 && (
                  <span className='rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600'>
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              <div className='mt-5 flex flex-wrap items-center gap-4'>
                <div>
                  <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>
                    Quantity
                  </p>
                  <div className='mt-2 flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className='h-10 w-10 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300'
                    >
                      -
                    </button>
                    <input
                      type='number'
                      min={1}
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value) || 1
                        setQuantity(Math.min(Math.max(1, next), maxQuantity))
                      }}
                      className='h-10 w-20 rounded-full border border-slate-200 text-center text-sm font-semibold text-slate-700'
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setQuantity((prev) => Math.min(maxQuantity, prev + 1))
                      }
                      className='h-10 w-10 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300'
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm'>
                  <p className='text-xs text-slate-500'>Total</p>
                  <p className='mt-1 font-semibold text-slate-900'>
                    Rs. {totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className='mt-5 flex flex-wrap items-center gap-3'>
              <button
                type='button'
                onClick={async () => {
                  setMessage(null)
                  const auth = getTemplateAuth(String(vendorId))
                  if (!auth) {
                    toast.error('Please login to add items to cart.')
                    window.location.href = `/template/${vendorId}/login?next=/template/${vendorId}/product/${productId}`
                    return
                  }
                  const variantId = selectedVariant?._id || product?.variants?.[0]?._id
                  if (!variantId) {
                    toast.error('No variant available for this product.')
                    setMessage('No variant available.')
                    return
                  }
                  if (stockAvailable <= 0) {
                    toast.error('This variant is out of stock.')
                    setMessage('Out of stock.')
                    return
                  }
                  setAdding(true)
                  try {
                    await templateApiFetch(String(vendorId), '/cart', {
                      method: 'POST',
                      body: JSON.stringify({
                        product_id: productId,
                        variant_id: variantId,
                        quantity,
                      }),
                    })
                    toast.success('Added to cart.')
                    setMessage('Added to cart.')
                  } catch (err: any) {
                    toast.error(err?.message || 'Unable to add to cart.')
                    setMessage(err?.message || 'Unable to add to cart.')
                  } finally {
                    setAdding(false)
                  }
                }}
                className='rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60'
                style={{
                  backgroundColor:
                    templateMeta?.heroStyle?.primaryButtonColor ||
                    'var(--template-accent)',
                }}
                disabled={adding || stockAvailable <= 0}
              >
                {adding ? 'Adding...' : 'Add to cart'}
              </button>
              {message && (
                <span className='text-xs font-semibold text-slate-500'>
                  {message}
                </span>
              )}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-5'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-700'>
              <Package className='h-4 w-4' />
              Variants
            </div>
            <div className='mt-4 space-y-3'>
              {(product.variants || []).map((variant, index) => (
                <div
                  key={variant.variantSku || index}
                  className={`rounded-2xl border p-4 transition ${
                    selectedVariant?._id === variant._id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                  onClick={() => setSelectedVariant(variant)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedVariant(variant)
                    }
                  }}
                >
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex flex-wrap gap-2'>
                      {Object.entries(variant.variantAttributes || {}).map(
                        ([key, value]) => (
                          <span
                            key={`${key}-${value}`}
                            className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'
                          >
                            {key}: {value}
                          </span>
                        )
                      )}
                    </div>
                    <div
                      className='text-sm font-semibold text-slate-900'
                      style={{ color: 'var(--template-accent)' }}
                    >
                      Rs. {(variant.finalPrice || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                    <span>Stock: {variant.stockQuantity || 0}</span>
                    <span>Discount: {variant.discountPercent || 0}%</span>
                    <span className='text-slate-400'>
                      {variant.variantSku}
                    </span>
                  </div>
                </div>
              ))}
              {(product.variants || []).length === 0 && (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500'>
                  No variants configured yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6'>
            <h2 className='text-lg font-semibold text-slate-900'>Description</h2>
            <p className='mt-3 text-sm text-slate-600'>
              {product.description || 'No description provided.'}
            </p>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6'>
            <h2 className='text-lg font-semibold text-slate-900'>Specifications</h2>
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
              {Object.entries(specs).map(([key, value]) => (
                <div
                  key={key}
                  className='flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm'
                >
                  <span className='text-slate-500'>{key}</span>
                  <span className='font-semibold text-slate-900'>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {specificationEntries.length > 0 && (
            <div className='rounded-3xl border border-slate-200 bg-white p-6'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Detailed Specifications
              </h2>
              <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                {specificationEntries.map(([label, value]) => (
                  <div
                    key={`${label}-${value}`}
                    className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm'
                  >
                    <p className='text-xs uppercase tracking-wide text-slate-400'>
                      {label}
                    </p>
                    <p className='mt-1 font-semibold text-slate-900'>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Customer Reviews</h2>
              <div className='flex items-center gap-1 text-sm font-semibold text-amber-600'>
                <Star className='h-4 w-4 fill-amber-400 text-amber-400' /> 4.6
              </div>
            </div>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                >
                  <p className='font-semibold text-slate-900'>Customer {index}</p>
                  <p className='mt-2 text-slate-500'>
                    Great product! Highly recommended. The quality exceeded expectations.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6'>
            <h2 className='text-lg font-semibold text-slate-900'>FAQs</h2>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              {(product.faqs || []).map((faq, index) => (
                <div
                  key={`${faq.question}-${index}`}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                >
                  <p className='font-semibold text-slate-900'>
                    {faq.question || 'Question'}
                  </p>
                  <p className='mt-2'>{faq.answer || 'Answer'}</p>
                </div>
              ))}
              {(product.faqs || []).length === 0 && (
                <p className='text-slate-500'>No FAQs available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PreviewChrome>
  )
}
