import React, { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  RotateCcw,
  Share2,
  Shield,
  ShoppingCart,
  Star,
  Truck,
  ZoomIn,
} from 'lucide-react'
import type { ProductFormData } from '../types/type'

type Props = {
  formData: ProductFormData
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const getVariantDisplayName = (
  variant: ProductFormData['variants'][number] | null,
  index: number,
  productName?: string
) => {
  const customName = String(variant?.variantDisplayName || '').trim()
  if (customName) return customName

  const summary = Object.values(variant?.variantAttributes || {})
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ')

  if (summary) return summary
  if (index === 0) {
    const baseProductName = String(productName || '').trim()
    if (baseProductName) return baseProductName
  }
  return `Variant ${index + 1}`
}

const isDefaultVariant = (
  variant: ProductFormData['variants'][number] | null
) => {
  const entries = Object.entries(variant?.variantAttributes || {})
    .map(([key, value]) => [
      String(key || '').trim().toLowerCase(),
      String(value || '').trim().toLowerCase(),
    ])
    .filter(([, value]) => Boolean(value))

  return (
    !entries.length ||
    (entries.length === 1 &&
      entries[0][0] === 'option' &&
      entries[0][1] === 'default')
  )
}

const ProductPreviewPage: React.FC<Props> = ({ formData }) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [imageZoom, setImageZoom] = useState(false)

  const variants = useMemo(
    () => (formData.variants || []).filter((variant) => variant?.isActive !== false),
    [formData.variants]
  )
  const selectedVariant = variants[selectedVariantIndex] || null

  const images = useMemo(() => {
    return selectedVariant &&
      !isDefaultVariant(selectedVariant) &&
      selectedVariant.variantsImageUrls?.length
      ? selectedVariant.variantsImageUrls
      : formData.defaultImages || []
  }, [selectedVariant, formData.defaultImages])

  const selectedImage = images[selectedImageIndex] || images[0]
  const fallbackName = formData.productName || 'Untitled Product'
  const selectedVariantLabel = selectedVariant
    ? getVariantDisplayName(selectedVariant, selectedVariantIndex, formData.productName)
    : ''
  const previewTitle = fallbackName

  const discountPercent = useMemo(() => {
    if (!selectedVariant?.actualPrice || !selectedVariant?.finalPrice) return 0
    if (selectedVariant.actualPrice <= selectedVariant.finalPrice) return 0
    return Math.round(
      ((selectedVariant.actualPrice - selectedVariant.finalPrice) /
        selectedVariant.actualPrice) *
        100
    )
  }, [selectedVariant])

  const stockLabel =
    selectedVariant?.stockQuantity > 0
      ? `${selectedVariant.stockQuantity} in stock`
      : 'Out of stock'

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div
      className='light min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900'
      style={{ colorScheme: 'light' }}
    >
      <div className='sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-blue-600'>
              Product Preview
            </p>
            <h1 className='mt-1 text-lg font-semibold text-slate-900'>
              This preview shows unsaved draft details only
            </h1>
          </div>
          <button
            type='button'
            onClick={() => window.close()}
            className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50'
          >
            Close Preview
          </button>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm'>
          Preview does not save to the website. Your product will only be created or updated when you click
          {' '}
          <span className='font-semibold'>
            {formData.productName ? 'Create Product / Update Product' : 'Create Product'}
          </span>
          {' '}
          on the form.
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          <div className='space-y-4'>
            <div className='relative group'>
              <div className='relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl'>
                {selectedImage?.url ? (
                  <>
                    <img
                      src={selectedImage.url}
                      alt={fallbackName}
                      className={`h-full w-full object-contain p-4 transition-transform duration-300 ${
                        imageZoom ? 'scale-150' : 'group-hover:scale-105'
                      }`}
                    />
                    {images.length > 1 ? (
                      <>
                        <button
                          type='button'
                          onClick={handlePrevImage}
                          className='absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg transition-all hover:scale-110 hover:bg-white'
                        >
                          <ChevronLeft className='h-5 w-5 text-slate-700' />
                        </button>
                        <button
                          type='button'
                          onClick={handleNextImage}
                          className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg transition-all hover:scale-110 hover:bg-white'
                        >
                          <ChevronRight className='h-5 w-5 text-slate-700' />
                        </button>
                      </>
                    ) : null}
                    <button
                      type='button'
                      onClick={() => setImageZoom((prev) => !prev)}
                      className='absolute bottom-4 right-4 rounded-full bg-white/95 p-3 shadow-lg transition-all hover:scale-110 hover:bg-white'
                    >
                      <ZoomIn className='h-4 w-4 text-slate-700' />
                    </button>
                  </>
                ) : (
                  <div className='flex h-full flex-col items-center justify-center text-slate-300'>
                    <ImageOff className='mb-3 h-16 w-16' />
                    <span className='text-sm font-medium'>No Image Available</span>
                  </div>
                )}
              </div>

              <div className='absolute right-3 top-3 flex gap-2'>
                <button
                  type='button'
                  onClick={() => setIsWishlisted((prev) => !prev)}
                  className={`rounded-full p-2.5 shadow-md transition-all hover:scale-110 ${
                    isWishlisted
                      ? 'bg-red-500 text-white'
                      : 'bg-white/95 text-slate-700 hover:bg-white'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                <button
                  type='button'
                  className='rounded-full bg-white/95 p-2.5 text-slate-700 shadow-md transition-all hover:scale-110 hover:bg-white'
                >
                  <Share2 className='h-4 w-4' />
                </button>
              </div>
            </div>

            {images.length > 1 ? (
              <div className='flex gap-2 overflow-x-auto pb-2'>
                {images.map((img, index) => (
                  <button
                    key={`${img.url}-${index}`}
                    type='button'
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedImageIndex === index
                        ? 'border-black ring-2 ring-black/10 shadow-md'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={img.url}
                      className='h-full w-full object-cover'
                      alt={`Thumbnail ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
              <h2 className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-900'>
                Description
              </h2>
              <p className='text-sm leading-relaxed text-slate-600'>
                {formData.shortDescription || 'No description provided for this product.'}
              </p>
            </div>

            {variants.length > 0 ? (
              <div className='space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                <h2 className='text-xs font-bold uppercase tracking-wider text-slate-900'>
                  Select Variant
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {variants.map((variant, index) => {
                    const variantName = getVariantDisplayName(
                      variant,
                      index,
                      formData.productName
                    )

                    return (
                      <button
                        key={`${variant.variantDisplayName}-${index}`}
                        type='button'
                        onClick={() => {
                          setSelectedVariantIndex(index)
                          setSelectedImageIndex(0)
                        }}
                        className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all hover:scale-105 ${
                          selectedVariantIndex === index
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:shadow-sm'
                        }`}
                      >
                        {variantName}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className='space-y-5 lg:col-span-2'>
            <div className='space-y-2'>
              {formData.brand ? (
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-blue-600'>
                    {formData.brand}
                  </span>
                  <div className='flex items-center gap-1'>
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className='h-3.5 w-3.5 fill-yellow-400 text-yellow-400'
                      />
                    ))}
                    <span className='ml-1.5 text-xs text-slate-500'>(Preview only)</span>
                  </div>
                </div>
              ) : null}

              <h2 className='text-2xl font-bold leading-tight text-slate-900 lg:text-4xl'>
                {previewTitle}
              </h2>
              {selectedVariantLabel &&
              fallbackName &&
              selectedVariantLabel !== fallbackName ? (
                <p className='text-base font-medium text-slate-600'>{selectedVariantLabel}</p>
              ) : null}
            </div>

            <div
              className='rounded-xl border border-slate-200 p-4 shadow-sm'
              style={{
                background: 'linear-gradient(90deg, #f8fafc 0%, #eff6ff 100%)',
              }}
            >
              <div className='flex flex-wrap items-baseline gap-3'>
                <span
                  className='text-3xl font-bold lg:text-4xl'
                  style={{ color: '#0f172a' }}
                >
                  {formatCurrency(selectedVariant?.finalPrice || 0)}
                </span>
                {selectedVariant?.actualPrice > selectedVariant?.finalPrice ? (
                  <>
                    <span
                      className='text-xl line-through'
                      style={{ color: '#64748b' }}
                    >
                      {formatCurrency(selectedVariant.actualPrice)}
                    </span>
                    <span className='rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md'>
                      Save {discountPercent}%
                    </span>
                  </>
                ) : null}
              </div>

              {discountPercent > 0 ? (
                <p
                  className='mt-1.5 text-xs font-medium'
                  style={{ color: '#166534' }}
                >
                  You save{' '}
                  {formatCurrency(
                    (selectedVariant?.actualPrice || 0) - (selectedVariant?.finalPrice || 0)
                  )}
                </p>
              ) : null}
            </div>

            <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  selectedVariant?.stockQuantity > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <p
                className={`text-xs font-semibold ${
                  selectedVariant?.stockQuantity > 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {stockLabel}
              </p>
            </div>

            <div className='grid grid-cols-3 gap-3 border-t border-slate-200 pt-4'>
              <div className='flex flex-col items-center space-y-1.5 text-center'>
                <div className='rounded-full bg-blue-50 p-2.5'>
                  <Truck className='h-5 w-5 text-blue-600' />
                </div>
                <p className='text-[10px] font-semibold text-slate-700'>Free Delivery</p>
              </div>
              <div className='flex flex-col items-center space-y-1.5 text-center'>
                <div className='rounded-full bg-green-50 p-2.5'>
                  <Shield className='h-5 w-5 text-green-600' />
                </div>
                <p className='text-[10px] font-semibold text-slate-700'>Secure Payment</p>
              </div>
              <div className='flex flex-col items-center space-y-1.5 text-center'>
                <div className='rounded-full bg-purple-50 p-2.5'>
                  <RotateCcw className='h-5 w-5 text-purple-600' />
                </div>
                <p className='text-[10px] font-semibold text-slate-700'>Easy Returns</p>
              </div>
            </div>

            <div className='space-y-2.5 pt-3'>
              <button
                type='button'
                disabled={selectedVariant?.stockQuantity === 0}
                className='flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 py-3.5 text-base font-bold text-white transition-all hover:from-slate-800 hover:to-slate-900 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400'
              >
                <ShoppingCart className='h-4 w-4' />
                {selectedVariant?.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                type='button'
                className='w-full rounded-xl border-2 border-slate-300 bg-white py-3.5 text-base font-semibold text-slate-900 transition-all hover:border-slate-900 hover:bg-slate-50'
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductPreviewPage
