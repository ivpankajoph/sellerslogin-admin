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
  productCategory?: {
    _id?: string
    name?: string
    title?: string
    categoryName?: string
  } | string
  productCategoryName?: string
  defaultImages?: Array<{ url: string }>
  variants?: Array<{ finalPrice?: number }>
}

export const Route = createFileRoute('/template/$vendorId/category/$categoryId')(
  {
    component: TemplateCategoryRoute,
  }
)

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

const getCategoryLabel = (
  product: Product,
  categoryMap: Record<string, string>
) => {
  if (product.productCategoryName) return product.productCategoryName
  if (typeof product.productCategory === 'string') {
    const fallback = categoryMap[product.productCategory]
    if (fallback) return fallback
    if (/^[a-f\d]{24}$/i.test(product.productCategory)) {
      return ''
    }
    return product.productCategory
  }
  return (
    categoryMap[product.productCategory as string] ||
    product.productCategory?.name ||
    product.productCategory?.title ||
    product.productCategory?.categoryName ||
    ''
  )
}

const getCategoryId = (product: Product, categoryMap: Record<string, string>) => {
  if (typeof product.productCategory === 'string') {
    if (categoryMap[product.productCategory]) return product.productCategory
    if (/^[a-f\d]{24}$/i.test(product.productCategory)) {
      return product.productCategory
    }
    return undefined
  }
  return product.productCategory?._id || undefined
}

const getSubcategoryCategoryId = (
  sub?: { category_id?: { _id?: string } | string }
) => {
  if (!sub?.category_id) return ''
  return typeof sub.category_id === 'string'
    ? sub.category_id
    : sub.category_id?._id || ''
}

function TemplateCategoryRoute() {
  const { vendorId, categoryId } = Route.useParams()
  const {
    template,
    products,
    categoryMap,
    subcategories,
    vendorName,
    loading,
    error,
  } = useTemplatePreviewData(vendorId, 'home')

  const isObjectId = /^[a-f\d]{24}$/i.test(categoryId)
  const normalizedSlug = toSlug(categoryId)

  const resolvedCategoryId = useMemo(() => {
    if (isObjectId) return categoryId
    const match = Object.entries(categoryMap).find(
      ([, name]) => toSlug(name) === normalizedSlug
    )
    return match?.[0]
  }, [categoryId, categoryMap, isObjectId, normalizedSlug])

  const resolvedCategoryLabel = useMemo(() => {
    if (resolvedCategoryId && categoryMap[resolvedCategoryId]) {
      return categoryMap[resolvedCategoryId]
    }
    if (!isObjectId) {
      const match = Object.entries(categoryMap).find(
        ([, name]) => toSlug(name) === normalizedSlug
      )
      if (match) return match[1]
    }
    return categoryId.replace(/-/g, ' ')
  }, [categoryId, categoryMap, isObjectId, normalizedSlug, resolvedCategoryId])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productCategoryId = getCategoryId(product, categoryMap)
      if (resolvedCategoryId) {
        return productCategoryId === resolvedCategoryId
      }
      const label = getCategoryLabel(product, categoryMap)
      return toSlug(label) === normalizedSlug
    })
  }, [products, categoryMap, resolvedCategoryId, normalizedSlug])

  const relatedSubcategories = useMemo(() => {
    if (!resolvedCategoryId) return []
    return subcategories.filter(
      (sub) => getSubcategoryCategoryId(sub) === resolvedCategoryId
    )
  }, [resolvedCategoryId, subcategories])

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
          href={`/template/${vendorId}`}
          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'
        >
          <ChevronLeft className='h-4 w-4' />
          Back to storefront
        </a>
      </div>

      <section className='space-y-4'>
        <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Category
          </p>
          <h1
            className='mt-3 text-3xl font-semibold text-slate-900'
            style={{ color: 'var(--template-accent)' }}
          >
            {resolvedCategoryLabel}
          </h1>
          <p className='mt-2 text-sm text-slate-600'>
            {filteredProducts.length} products available in this category.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          {relatedSubcategories.map((sub) => (
            <a
              key={sub._id}
              href={`/template/${vendorId}/subcategory/${sub._id}`}
              className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300'
            >
              {sub.name || 'Subcategory'}
            </a>
          ))}
          {relatedSubcategories.length === 0 && (
            <span className='rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs text-slate-400'>
              No subcategories listed
            </span>
          )}
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
              No products found for this category yet.
            </div>
          )}
        </div>
      </section>
    </PreviewChrome>
  )
}
