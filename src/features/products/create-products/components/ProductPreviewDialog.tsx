import React, { useMemo, useState } from 'react'
import { CircleX, Eye, ImageOff } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductFormData } from '../types/type'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: ProductFormData
  mainCategoryLabels?: string[]
  categoryLabels?: string[]
  subcategoryLabels?: string[]
  websiteLabels?: string[]
  cityLabels?: string[]
  searchPreviewTitle?: string
  searchPreviewDescription?: string
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
  if (index === 0) {
    const baseProductName = String(productName || '').trim()
    if (baseProductName) return baseProductName
  }

  const customName = String(variant?.variantDisplayName || '').trim()
  if (customName) return customName

  const summary = Object.values(variant?.variantAttributes || {})
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ')

  if (summary) return summary
  return `Variant ${index + 1}`
}

const ProductPreviewDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  formData,
}) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const variants = formData.variants || []
  const selectedVariant = variants[selectedVariantIndex] || null 

  const images = useMemo(() => {
    return selectedVariant?.variantsImageUrls?.length
      ? selectedVariant.variantsImageUrls
      : formData.defaultImages || []
  }, [selectedVariant, formData.defaultImages])

  const selectedImage = images[selectedImageIndex] || images[0]
  const fallbackName = formData.productName || 'Untitled Product'
  const selectedVariantLabel = selectedVariant
    ? getVariantDisplayName(selectedVariant, selectedVariantIndex, formData.productName)
    : ''

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        /* Fixed width to 5xl (approx 1024px) and allowed height to be auto/constrained */
        className='max-w-5xl w-[95vw] overflow-hidden rounded-2xl p-0 border-none'
      >
        <div className='flex flex-col bg-white'>
          
          {/* HEADER */}
          <div className='flex items-center justify-between border-b px-6 py-3'>
            <DialogHeader>
              <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400'>
                <Eye className='h-3.5 w-3.5' />
                Preview Mode
              </div>
              <DialogTitle className='text-base font-semibold'>
                Storefront View
              </DialogTitle>
            </DialogHeader>

            <DialogClose asChild>
              <button className='p-2 hover:bg-gray-100 rounded-full transition-colors'>
                <CircleX className='h-5 w-5 text-gray-400' />
              </button>
            </DialogClose>
          </div>

          {/* BODY - Controlled height for rectangular feel */}
          <div className='overflow-y-auto max-h-[80vh]'>
            <div className='grid md:grid-cols-2 gap-0'>

              {/* LEFT - IMAGES (Boxed to maintain symmetry) */}
              <div className='p-6 bg-gray-50/50 border-r border-gray-100 flex flex-col justify-center'>
                <div className='aspect-square relative rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center'>
                  {selectedImage?.url ? (
                    <img
                      src={selectedImage.url}
                      alt={fallbackName}
                      className='w-full h-full object-contain p-4'
                    />
                  ) : (
                    <div className='flex flex-col items-center text-gray-300'>
                      <ImageOff className='h-12 w-12 mb-2' />
                      <span className='text-xs'>No Image Available</span>
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className='flex gap-2 mt-4 justify-center overflow-x-auto pb-2'>
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === i
                            ? 'border-black ring-2 ring-black/5'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img.url}
                          className='w-full h-full object-cover'
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT - DETAILS */}
              <div className='p-8 flex flex-col justify-between'>
                <div className='space-y-5'>
                  {/* BRAND & TITLE */}
                  <div>
                    {formData.brand && (
                      <span className='text-xs font-bold text-blue-600 uppercase tracking-widest'>
                        {formData.brand}
                      </span>
                    )}
                    <h1 className='text-2xl font-bold text-gray-900 mt-1 leading-tight'>
                      {fallbackName}
                    </h1>
                    {selectedVariantLabel ? (
                      <p className='mt-2 text-sm font-medium text-gray-500'>
                        {selectedVariantLabel}
                      </p>
                    ) : null}
                  </div>

                  {/* PRICE SECTION */}
                  <div className='flex items-baseline gap-3'>
                    <span className='text-3xl font-bold text-gray-900'>
                      {formatCurrency(selectedVariant?.finalPrice || 0)}
                    </span>
                    {selectedVariant?.actualPrice > selectedVariant?.finalPrice && (
                      <>
                        <span className='text-lg line-through text-gray-400'>
                          {formatCurrency(selectedVariant.actualPrice)}
                        </span>
                        <span className='bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded'>
                          {discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  <div className='h-px bg-gray-100 w-full' />

                  {/* DESCRIPTION */}
                  <p className='text-sm text-gray-600 leading-relaxed line-clamp-3'>
                    {formData.shortDescription || 'No description provided for this product.'}
                  </p>

                  {/* VARIANTS */}
                  {variants.length > 0 && (
                    <div className='space-y-3'>
                      <p className='text-xs font-bold text-gray-400 uppercase'>Select Variant</p>
                      <div className='flex flex-wrap gap-2'>
                        {variants.map((variant, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedVariantIndex(i)
                              setSelectedImageIndex(0)
                            }}
                            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all ${
                              selectedVariantIndex === i
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {getVariantDisplayName(variant, i, formData.productName)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='flex items-center gap-2'>
                    <div className={`h-2 w-2 rounded-full ${selectedVariant?.stockQuantity > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <p className='text-xs font-medium text-gray-500 uppercase tracking-tighter'>{stockLabel}</p>
                  </div>
                </div>

                {/* CTA */}
                <div className='mt-8'>
                  <button className='w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-transform active:scale-[0.98]'>
                    Add to Cart
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductPreviewDialog
