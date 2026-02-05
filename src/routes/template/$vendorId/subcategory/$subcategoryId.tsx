import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import { TemplatePageSkeleton } from '@/features/template-preview/components/TemplatePageSkeleton'

interface Product {
  _id?: string
  productName?: string
  shortDescription?: string
  productSubCategories?: string[]
  productSubCategory?: string[] | string
  defaultImages?: Array<{ url: string }>
  variants?: Array<{ finalPrice?: number }>
}

export const Route = createFileRoute(
  '/template/$vendorId/subcategory/$subcategoryId'
)({
  component: TemplateSubcategoryRoute,
})

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const getMinPrice = (variants: Array<{ finalPrice?: number }> = []) => {
  const values = variants
    .map((variant) => variant.finalPrice)
    .filter((value): value is number => typeof value === 'number')
  return values.length ? Math.min(...values) : 0
}

const getSubcategoryCategoryId = (
  sub?: { category_id?: { _id?: string } | string }
) => {
  if (!sub?.category_id) return ''
  return typeof sub.category_id === 'string'
    ? sub.category_id
    : sub.category_id?._id || ''
}

const getProductSubcategoryIds = (product: Product) => {
  const raw =
    product.productSubCategories ??
    product.productSubCategory ??
    (product as { subCategory?: string[] | string }).subCategory ??
    (product as { subcategory?: string[] | string }).subcategory

  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return [raw]
  return []
}

function TemplateSubcategoryRoute() {
  const { vendorId, subcategoryId } = Route.useParams()
  const {
    template,
    products,
    categoryMap,
    subcategories,
    vendorName,
    loading,
    error,
  } = useTemplatePreviewData(vendorId, 'home')

  const isObjectId = /^[a-f\d]{24}$/i.test(subcategoryId)
  const normalizedSlug = toSlug(subcategoryId)

  const resolvedSubcategory = useMemo(() => {
    if (isObjectId) {
      return subcategories.find((sub) => sub._id === subcategoryId)
    }
    return subcategories.find(
      (sub) => toSlug(sub.name || '') === normalizedSlug
    )
  }, [isObjectId, subcategories, subcategoryId, normalizedSlug])

  const resolvedSubcategoryId = resolvedSubcategory?._id
  const resolvedLabel =
    resolvedSubcategory?.name || subcategoryId.replace(/-/g, ' ')
  const parentCategoryId = getSubcategoryCategoryId(resolvedSubcategory)
  const parentCategoryLabel = parentCategoryId
    ? categoryMap[parentCategoryId]
    : undefined

  const filteredProducts = useMemo(() => {
    if (!resolvedSubcategoryId) return []
    return products.filter((product) =>
      getProductSubcategoryIds(product).includes(resolvedSubcategoryId)
    )
  }, [products, resolvedSubcategoryId])

  if (loading) {
    return <TemplatePageSkeleton />
  }

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-950 text-white'>
        <div className='rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm text-white/80'>
          {error}
        </div>
      </div>
    )
  }

  return (
    <PreviewChrome
      vendorId={vendorId}
      logoUrl={template.components.logo}
      vendorName={vendorName || undefined}
      buttonLabel={template.components.home_page.button_header}
      buttonColor={
        template.components.home_page.hero_style?.primaryButtonColor || undefined
      }
      theme={template.components.theme}
      customPages={template.components.custom_pages || []}
      categories={Object.entries(categoryMap).map(([id, name]) => ({
        _id: id,
        name,
      }))}
      subcategories={subcategories}
      active='home'
    >
      <div className='flex items-center gap-3 text-sm text-slate-500'>
        <a
          href={
            parentCategoryId
              ? `/template/${vendorId}/category/${parentCategoryId}`
              : `/template/${vendorId}`
          }
          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'
        >
          <ChevronLeft className='h-4 w-4' />
          {parentCategoryLabel || 'Back to category'}
        </a>
      </div>

      <section className='space-y-4'>
        <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Subcategory
          </p>
          <h1
            className='mt-3 text-3xl font-semibold text-slate-900'
            style={{ color: 'var(--template-accent)' }}
          >
            {resolvedLabel}
          </h1>
          <p className='mt-2 text-sm text-slate-600'>
            {filteredProducts.length} products available in this subcategory.
          </p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredProducts.map((product, index) => (
            <a
              key={product._id || `${product.productName}-${index}`}
              href={
                product._id
                  ? `/template/${vendorId}/product/${product._id}`
                  : '#'
              }
              className='group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
            >
              <div className='aspect-[4/3] overflow-hidden bg-slate-100'>
                {product.defaultImages?.[0]?.url ? (
                  <img
                    src={product.defaultImages[0].url}
                    alt={product.productName || 'Product'}
                    className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                    No Image
                  </div>
                )}
              </div>
              <div className='space-y-2 p-4'>
                <p className='text-sm font-semibold text-slate-900'>
                  {product.productName || 'Untitled Product'}
                </p>
                <p className='line-clamp-2 text-xs text-slate-500'>
                  {product.shortDescription || 'No description yet.'}
                </p>
                <div className='flex items-center justify-between'>
                  <span
                    className='text-sm font-semibold text-slate-900'
                    style={{ color: 'var(--template-accent)' }}
                  >
                    Rs. {getMinPrice(product.variants).toLocaleString()}
                  </span>
                  <span className='text-xs text-slate-400'>View</span>
                </div>
              </div>
            </a>
          ))}
          {filteredProducts.length === 0 && (
            <div className='col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
              No products found for this subcategory yet.
            </div>
          )}
        </div>
      </section>
    </PreviewChrome>
  )
}
