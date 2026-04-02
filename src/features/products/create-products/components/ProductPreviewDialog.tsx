import React, { useMemo, useState } from 'react'
import { CircleX, Eye, ImageOff, Heart, Share2, ShoppingCart, Truck, Shield, RotateCcw, Star, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
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
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [imageZoom, setImageZoom] = useState(false)

  const variants = useMemo(
    () => (formData.variants || []).filter((variant) => variant?.isActive !== false),
    [formData.variants]
  )
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

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-w-[98vw] w-full overflow-hidden rounded-2xl p-0 border-none'
      >
        <div className='flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50'>
          
          {/* HEADER - Sleek & Minimal */}
          <div className='flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 py-3 z-10 shadow-sm'>
            <DialogHeader>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full'>
                  <Eye className='h-3.5 w-3.5' />
                  Preview Mode
                </div>
                <div className='h-4 w-px bg-gray-200' />
                <DialogTitle className='text-sm font-medium text-gray-600'>
                  Storefront View
                </DialogTitle>
              </div>
            </DialogHeader>

            <DialogClose asChild>
              <button className='p-2.5 hover:bg-gray-100 rounded-full transition-all hover:scale-105'>
                <CircleX className='h-5 w-5 text-gray-500' />
              </button>
            </DialogClose>
          </div>

          {/* BODY - Full Width Optimized Layout */}
          <div className='overflow-hidden'>
            <div className='max-w-full mx-auto px-6 py-6'>
              <div className='grid lg:grid-cols-3 gap-6 items-start'>

                {/* LEFT COLUMN - IMAGE GALLERY + DESCRIPTION + VARIANTS */}
                <div className='space-y-4'>
                  {/* Image Gallery */}
                  <div className='space-y-4'>
                    {/* Main Image */}
                    <div className='relative group'>
                      <div className='aspect-square relative rounded-xl bg-white border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300'>
                        {selectedImage?.url ? (
                          <>
                            <img
                              src={selectedImage.url}
                              alt={fallbackName}
                              className={`w-full h-full object-contain p-4 transition-transform duration-300 ${
                                imageZoom ? 'scale-150' : 'group-hover:scale-105'
                              }`}
                            />
                            {/* Image Navigation Arrows */}
                            {images.length > 1 && (
                              <>
                                <button
                                  onClick={handlePrevImage}
                                  className='absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110'
                                >
                                  <ChevronLeft className='h-5 w-5 text-gray-700' />
                                </button>
                                <button
                                  onClick={handleNextImage}
                                  className='absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110'
                                >
                                  <ChevronRight className='h-5 w-5 text-gray-700' />
                                </button>
                              </>
                            )}
                            {/* Zoom Button */}
                            <button
                              onClick={() => setImageZoom(!imageZoom)}
                              className='absolute bottom-4 right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110'
                            >
                              <ZoomIn className='h-4 w-4 text-gray-700' />
                            </button>
                          </>
                        ) : (
                          <div className='flex flex-col items-center justify-center h-full text-gray-300'>
                            <ImageOff className='h-16 w-16 mb-3' />
                            <span className='text-sm font-medium'>No Image Available</span>
                          </div>
                        )}
                      </div>

                      {/* Wishlist & Share Actions */}
                      <div className='absolute top-3 right-3 flex gap-2'>
                        <button
                          onClick={() => setIsWishlisted(!isWishlisted)}
                          className={`p-2.5 rounded-full backdrop-blur-md shadow-md transition-all hover:scale-110 ${
                            isWishlisted
                              ? 'bg-red-500 text-white'
                              : 'bg-white/90 hover:bg-white text-gray-700'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                        </button>
                        <button className='p-2.5 bg-white/90 hover:bg-white rounded-full backdrop-blur-md shadow-md transition-all hover:scale-110'>
                          <Share2 className='h-4 w-4 text-gray-700' />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail Gallery */}
                    {images.length > 1 && (
                      <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImageIndex(i)}
                            className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                              selectedImageIndex === i
                                ? 'border-black ring-2 ring-black/10 shadow-md'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <img
                              src={img.url}
                              className='w-full h-full object-cover'
                              alt={`Thumbnail ${i + 1}`}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description - Moved Under Images */}
                  <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
                    <h3 className='text-xs font-bold text-gray-900 uppercase tracking-wider mb-2'>Description</h3>
                    <p className='text-sm text-gray-600 leading-relaxed'>
                      {formData.shortDescription || 'No description provided for this product.'}
                    </p>
                  </div>

                  {/* Variants - Moved Under Images */}
                  {variants.length > 0 && (
                    <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3'>
                      <h3 className='text-xs font-bold text-gray-900 uppercase tracking-wider'>
                        Select Variant
                      </h3>
                      <div className='flex flex-wrap gap-2'>
                        {variants.map((variant, i) => {
                          const variantName = getVariantDisplayName(variant, i, formData.productName)
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedVariantIndex(i)
                                setSelectedImageIndex(0)
                              }}
                              className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all hover:scale-105 ${
                                selectedVariantIndex === i
                                  ? 'bg-black text-white border-black shadow-md'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:shadow-sm'
                              }`}
                            >
                              {variantName}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMNS - PRODUCT DETAILS (Takes 2 columns) */}
                <div className='lg:col-span-2 space-y-5'>
                  {/* Brand & Title */}
                  <div className='space-y-2'>
                    {formData.brand && (
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full'>
                          {formData.brand}
                        </span>
                        <div className='flex items-center gap-1'>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className='h-3.5 w-3.5 fill-yellow-400 text-yellow-400' />
                          ))}
                          <span className='text-xs text-gray-500 ml-1.5'>(4.8 • 1,234 reviews)</span>
                        </div>
                      </div>
                    )}
                    <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 leading-tight'>
                      {fallbackName}
                    </h1>
                    {selectedVariantLabel && selectedVariantLabel !== fallbackName && (
                      <p className='text-base font-medium text-gray-600'>
                        {selectedVariantLabel}
                      </p>
                    )}
                  </div>

                  {/* Price Section - Enhanced */}
                  <div className='bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100'>
                    <div className='flex items-baseline gap-3 flex-wrap'>
                      <span className='text-3xl lg:text-4xl font-bold text-gray-900'>
                        {formatCurrency(selectedVariant?.finalPrice || 0)}
                      </span>
                      {selectedVariant?.actualPrice > selectedVariant?.finalPrice && (
                        <>
                          <span className='text-xl line-through text-gray-400'>
                            {formatCurrency(selectedVariant.actualPrice)}
                          </span>
                          <span className='bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md'>
                            Save {discountPercent}%
                          </span>
                        </>
                      )}
                    </div>
                    {discountPercent > 0 && (
                      <p className='text-xs text-green-700 font-medium mt-1.5'>
                        You save {formatCurrency((selectedVariant?.actualPrice || 0) - (selectedVariant?.finalPrice || 0))}
                      </p>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className='flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-100'>
                    <div className={`h-2.5 w-2.5 rounded-full ${selectedVariant?.stockQuantity > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <p className={`text-xs font-semibold ${selectedVariant?.stockQuantity > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {stockLabel}
                    </p>
                  </div>

                  {/* Trust Badges */}
                  <div className='grid grid-cols-3 gap-3 pt-4 border-t border-gray-100'>
                    <div className='flex flex-col items-center text-center space-y-1.5'>
                      <div className='p-2.5 bg-blue-50 rounded-full'>
                        <Truck className='h-5 w-5 text-blue-600' />
                      </div>
                      <p className='text-[10px] font-semibold text-gray-700'>Free Delivery</p>
                    </div>
                    <div className='flex flex-col items-center text-center space-y-1.5'>
                      <div className='p-2.5 bg-green-50 rounded-full'>
                        <Shield className='h-5 w-5 text-green-600' />
                      </div>
                      <p className='text-[10px] font-semibold text-gray-700'>Secure Payment</p>
                    </div>
                    <div className='flex flex-col items-center text-center space-y-1.5'>
                      <div className='p-2.5 bg-purple-50 rounded-full'>
                        <RotateCcw className='h-5 w-5 text-purple-600' />
                      </div>
                      <p className='text-[10px] font-semibold text-gray-700'>Easy Returns</p>
                    </div>
                  </div>

                  {/* CTA Buttons - Enhanced */}
                  <div className='space-y-2.5 pt-3'>
                    <button
                      disabled={selectedVariant?.stockQuantity === 0}
                      className='w-full bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-base disabled:cursor-not-allowed'
                    >
                      <ShoppingCart className='h-4 w-4' />
                      {selectedVariant?.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button className='w-full bg-white hover:bg-gray-50 text-black font-semibold py-3.5 rounded-xl transition-all border-2 border-gray-200 hover:border-black active:scale-[0.98] text-base'>
                      Buy Now
                    </button>
                  </div>
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
