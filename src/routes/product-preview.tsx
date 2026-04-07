import ProductPreviewPage from '@/features/products/create-products/components/ProductPreviewPage'
import type { ProductFormData } from '@/features/products/create-products/types/type'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

const emptyFormData: ProductFormData = {
  mainCategory: '',
  mainCategories: [],
  productName: '',
  productCategory: '',
  productCategories: [],
  productSubCategories: [],
  availableCities: [],
  websiteIds: [],
  brand: '',
  shortDescription: '',
  description: '',
  defaultImages: [],
  isAvailable: true,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [],
  specifications: [],
  variants: [],
  faqs: [],
}

type PreviewDraftRecord = {
  savedAt?: number
  expiresAt?: number
  formData?: ProductFormData
}

function ProductPreviewRoute() {
  const [formData, setFormData] = useState<ProductFormData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const draftKey = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('draftKey') || ''
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!draftKey) {
      setErrorMessage('Preview data was not found. Please reopen the preview from the product form.')
      return
    }

    try {
      const rawValue = window.localStorage.getItem(draftKey)
      if (!rawValue) {
        setErrorMessage('Preview data expired. Please reopen the preview from the product form.')
        return
      }

      const parsedValue = JSON.parse(rawValue) as PreviewDraftRecord
      if (
        parsedValue?.expiresAt &&
        Number.isFinite(parsedValue.expiresAt) &&
        Date.now() > Number(parsedValue.expiresAt)
      ) {
        window.localStorage.removeItem(draftKey)
        setErrorMessage('Preview data expired. Please reopen the preview from the product form.')
        return
      }

      if (!parsedValue?.formData) {
        setErrorMessage('Preview data is incomplete. Please reopen the preview from the product form.')
        return
      }

      setFormData(parsedValue.formData)
    } catch {
      setErrorMessage('Preview could not be loaded. Please reopen the preview from the product form.')
    }
  }, [draftKey])

  if (errorMessage) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-50 px-6'>
        <div className='max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
          <h1 className='text-xl font-semibold text-slate-900'>Preview unavailable</h1>
          <p className='mt-3 text-sm leading-6 text-slate-600'>{errorMessage}</p>
        </div>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-50 px-6'>
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm'>
          Loading product preview...
        </div>
      </div>
    )
  }

  return <ProductPreviewPage formData={formData || emptyFormData} />
}

export const Route = createFileRoute('/product-preview')({
  component: ProductPreviewRoute,
})
