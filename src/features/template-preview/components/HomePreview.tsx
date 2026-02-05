import { ArrowUpRight } from 'lucide-react'
import { type TemplateData } from '@/features/vendor-template/data'
import { type JSX, useMemo, useState } from 'react'
import { InlineEditableText } from './InlineEditableText'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'
import { toast } from 'sonner'

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
  variants?: Array<{ _id?: string; finalPrice?: number; stockQuantity?: number }>
}

interface HomePreviewProps {
  template: TemplateData
  products: Product[]
  sectionOrder: string[]
  categoryMap?: Record<string, string>
  vendorId: string
}

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

const toCategorySlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const getCategoryId = (product: Product, categoryMap: Record<string, string>) => {
  if (typeof product.productCategory === 'string') {
    if (categoryMap[product.productCategory]) return product.productCategory
    if (/^[a-f\d]{24}$/i.test(product.productCategory)) {
      return product.productCategory
    }
    return undefined
  }
  const id = product.productCategory?._id
  return id || undefined
}

export function HomePreview({
  template,
  products,
  sectionOrder,
  categoryMap = {},
  vendorId,
}: HomePreviewProps) {
  const hero = template.components.home_page
  const desc = template.components.home_page.description
  const theme = template.components.theme
  const accent = theme?.templateColor || '#0f172a'
  const bannerColor = theme?.bannerColor || '#0f172a'
  const heroStyle = hero.hero_style || {}
  const productStyle = hero.products_style || {}
  const [addingId, setAddingId] = useState<string | null>(null)

  const categoryEntries = useMemo(() => {
    const map = new Map<string, { label: string; id?: string }>()
    products.forEach((product) => {
      const label = getCategoryLabel(product, categoryMap)
      if (!label) return
      const id = getCategoryId(product, categoryMap)
      const key = id || label
      if (!map.has(key)) map.set(key, { label, id })
    })
    return Array.from(map.values())
  }, [products, categoryMap])

  const emitSelect = (sectionId: string, componentId?: string) => {
    if (typeof window === 'undefined') return
    window.parent?.postMessage(
      {
        type: 'template-editor-select',
        vendorId,
        page: 'home',
        sectionId,
        componentId,
      },
      window.location.origin
    )
  }

  const wrapSection = (sectionId: string, content: JSX.Element) => (
    <div
      className='group cursor-pointer rounded-3xl transition hover:ring-2 hover:ring-slate-900/15'
      onClickCapture={(event) => {
        if (
          (event.target as HTMLElement | null)?.closest?.(
            '[data-inline-edit="true"]'
          )
        ) {
          return
        }
        if (
          sectionId === 'products' &&
          (event.target as HTMLElement | null)?.closest?.('a[href]')
        ) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        emitSelect(sectionId)
      }}
    >
      {content}
    </div>
  )

  const sections: Record<string, JSX.Element> = {
    hero: wrapSection(
      'hero',
      (
      <section
        className='relative overflow-hidden rounded-3xl border border-white/70 bg-slate-900 text-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)]'
        style={{ backgroundColor: bannerColor }}
      >
        <div className='absolute inset-0 opacity-40'>
          {hero.backgroundImage ? (
            <img
              src={hero.backgroundImage}
              alt='Hero background'
              className='h-full w-full object-cover'
            />
          ) : (
            <div
              className='h-full w-full'
              style={{ backgroundColor: bannerColor }}
            />
          )}
        </div>
        <div
          className='absolute inset-0 opacity-30'
          style={{ backgroundColor: bannerColor }}
        />
        <div className='relative z-10 grid gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='space-y-4'>
            <InlineEditableText
              as='p'
              value={hero.hero_kicker}
              fallback='Featured Collection'
              path={['components', 'home_page', 'hero_kicker']}
              vendorId={vendorId}
              page='home'
              colorPath={['components', 'home_page', 'hero_style', 'badgeColor']}
              sizePath={['components', 'home_page', 'hero_style', 'badgeSize']}
              color={heroStyle.badgeColor}
              fontSize={heroStyle.badgeSize}
              className='text-xs font-semibold uppercase tracking-[0.34em] text-white/70'
            />
            <InlineEditableText
              as='h1'
              value={hero.header_text}
              fallback='Build a storefront that feels alive.'
              path={['components', 'home_page', 'header_text']}
              vendorId={vendorId}
              page='home'
              colorPath={['components', 'home_page', 'hero_style', 'titleColor']}
              sizePath={['components', 'home_page', 'hero_style', 'titleSize']}
              color={heroStyle.titleColor}
              fontSize={heroStyle.titleSize}
              className='text-3xl font-semibold leading-tight sm:text-5xl'
            />
            <InlineEditableText
              as='p'
              value={hero.header_text_small}
              fallback='Showcase your products with cinematic layouts and a story-first approach.'
              path={['components', 'home_page', 'header_text_small']}
              vendorId={vendorId}
              page='home'
              colorPath={['components', 'home_page', 'hero_style', 'subtitleColor']}
              sizePath={['components', 'home_page', 'hero_style', 'subtitleSize']}
              color={heroStyle.subtitleColor}
              fontSize={heroStyle.subtitleSize}
              className='max-w-xl text-base text-white/80'
            />
            <div className='flex flex-wrap gap-3'>
              <div
                className='inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white'
                style={{
                  backgroundColor: heroStyle.primaryButtonColor || accent,
                }}
              >
                <InlineEditableText
                  value={hero.button_header}
                  fallback='Explore Products'
                  path={['components', 'home_page', 'button_header']}
                  vendorId={vendorId}
                  page='home'
                  className='text-sm font-semibold text-white'
                />
                <ArrowUpRight className='h-4 w-4' />
              </div>
              <div
                className='inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white/80'
                style={{
                  borderColor: heroStyle.secondaryButtonColor || undefined,
                  color: heroStyle.badgeColor || undefined,
                }}
              >
                <InlineEditableText
                  value={hero.button_secondary || hero.badge_text}
                  fallback='New arrivals weekly'
                  path={['components', 'home_page', 'button_secondary']}
                  vendorId={vendorId}
                  page='home'
                  className='text-sm font-semibold text-white/80'
                />
              </div>
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-1'>
            <div className='rounded-2xl border border-white/20 bg-white/10 p-4'>
              <p className='text-xs uppercase tracking-[0.3em] text-white/60'>
                Rating
              </p>
              <p className='mt-2 text-3xl font-semibold'>4.9</p>
              <p className='text-sm text-white/70'>from 2,300+ customers</p>
            </div>
            <div className='rounded-2xl border border-white/20 bg-white/10 p-4'>
              <p className='text-xs uppercase tracking-[0.3em] text-white/60'>
                Fulfillment
              </p>
              <p className='mt-2 text-3xl font-semibold'>48h</p>
              <p className='text-sm text-white/70'>average delivery time</p>
            </div>
          </div>
        </div>
      </section>
      )
    ),
    description: wrapSection(
      'description',
      (
      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.32em] text-slate-400'>
            Brand Story
          </p>
          <InlineEditableText
            as='h2'
            value={desc.large_text}
            fallback='A storefront built for modern shoppers.'
            path={['components', 'home_page', 'description', 'large_text']}
            vendorId={vendorId}
            page='home'
            className='text-2xl font-semibold text-slate-900 sm:text-3xl'
          />
          <InlineEditableText
            as='p'
            value={desc.summary}
            fallback='Curate hero products, share your story, and inspire visitors to explore your catalog.'
            path={['components', 'home_page', 'description', 'summary']}
            vendorId={vendorId}
            page='home'
            className='text-sm text-slate-600 sm:text-base'
          />
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>
              Success
            </p>
            <p className='mt-2 text-3xl font-semibold text-slate-900'>
              <InlineEditableText
                value={desc.percent.percent_in_number}
                fallback='92'
                path={[
                  'components',
                  'home_page',
                  'description',
                  'percent',
                  'percent_in_number',
                ]}
                vendorId={vendorId}
                page='home'
                className='text-3xl font-semibold text-slate-900'
              />
              <span className='text-lg text-slate-500'>%</span>
            </p>
            <InlineEditableText
              as='p'
              value={desc.percent.percent_text}
              fallback='Satisfied buyers'
              path={[
                'components',
                'home_page',
                'description',
                'percent',
                'percent_text',
              ]}
              vendorId={vendorId}
              page='home'
              className='text-sm text-slate-500'
            />
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>
              Sold
            </p>
            <InlineEditableText
              as='p'
              value={desc.sold.sold_number}
              fallback='12k'
              path={[
                'components',
                'home_page',
                'description',
                'sold',
                'sold_number',
              ]}
              vendorId={vendorId}
              page='home'
              className='mt-2 text-3xl font-semibold text-slate-900'
            />
            <InlineEditableText
              as='p'
              value={desc.sold.sold_text}
              fallback='Products shipped'
              path={[
                'components',
                'home_page',
                'description',
                'sold',
                'sold_text',
              ]}
              vendorId={vendorId}
              page='home'
              className='text-sm text-slate-500'
            />
          </div>
        </div>
      </section>
      )
    ),
    products: wrapSection(
      'products',
      (
      <section className='space-y-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
          <InlineEditableText
            as='p'
            value={hero.products_kicker}
            fallback='Catalog'
            path={['components', 'home_page', 'products_kicker']}
            vendorId={vendorId}
            page='home'
            colorPath={['components', 'home_page', 'products_style', 'kickerColor']}
            sizePath={['components', 'home_page', 'products_style', 'kickerSize']}
            color={productStyle.kickerColor}
            fontSize={productStyle.kickerSize}
            className='text-xs font-semibold uppercase tracking-[0.32em] text-slate-400'
          />
            <InlineEditableText
              as='h3'
              value={hero.products_heading}
              fallback='Products in this template'
              path={['components', 'home_page', 'products_heading']}
              vendorId={vendorId}
              page='home'
              colorPath={['components', 'home_page', 'products_style', 'titleColor']}
              sizePath={['components', 'home_page', 'products_style', 'titleSize']}
              color={productStyle.titleColor}
              fontSize={productStyle.titleSize}
              className='text-2xl font-semibold text-slate-900'
            />
          </div>
          <InlineEditableText
            as='p'
            value={hero.products_subtitle}
            fallback={`${products.length} products available`}
            path={['components', 'home_page', 'products_subtitle']}
            vendorId={vendorId}
            page='home'
            className='text-sm text-slate-500'
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          <a
            href={`/template/${vendorId}`}
            className='rounded-full border bg-white px-3 py-1 text-xs font-semibold transition'
            style={{ borderColor: accent, color: accent }}
          >
            All
          </a>
          {categoryEntries.map((entry) => {
            const slug = entry.id ? entry.id : toCategorySlug(entry.label)
            return (
              <a
                key={`${entry.label}-${slug}`}
                href={`/template/${vendorId}/category/${slug}`}
                className='rounded-full border bg-white px-3 py-1 text-xs font-semibold transition'
                style={{ borderColor: accent, color: accent }}
              >
                {entry.label}
              </a>
            )
          })}
          {products.length === 0 && (
            <span className='rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs text-slate-400'>
              No categories yet
            </span>
          )}
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {products.slice(0, 6).map((product, index) => (
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
                {getCategoryLabel(product, categoryMap) ? (
                  <span className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    {getCategoryLabel(product, categoryMap)}
                  </span>
                ) : null}
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
                  <button
                    type='button'
                    className='rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-60'
                    style={{ borderColor: accent, color: accent }}
                    disabled={
                      addingId === product._id ||
                      (product.variants?.[0]?.stockQuantity ?? 1) <= 0
                    }
                    onClick={async (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      if (!product._id) return
                      const auth = getTemplateAuth(String(vendorId))
                      if (!auth) {
                        toast.error('Please login to add items to cart.')
                        window.location.href = `/template/${vendorId}/login?next=/template/${vendorId}`
                        return
                      }
                      const variantId = product.variants?.[0]?._id
                      if (!variantId) {
                        toast.error('No variant available for this product.')
                        return
                      }
                      setAddingId(product._id)
                      try {
                        await templateApiFetch(String(vendorId), '/cart', {
                          method: 'POST',
                          body: JSON.stringify({
                            product_id: product._id,
                            variant_id: variantId,
                            quantity: 1,
                          }),
                        })
                        toast.success('Added to cart.')
                      } catch (err: any) {
                        toast.error(err?.message || 'Unable to add to cart.')
                      } finally {
                        setAddingId(null)
                      }
                    }}
                  >
                    {(product.variants?.[0]?.stockQuantity ?? 1) <= 0
                      ? 'Out'
                      : addingId === product._id
                        ? 'Adding'
                        : 'Add'}
                  </button>
                </div>
              </div>
            </a>
          ))}
          {products.length === 0 && (
            <div className='col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
              Upload products from the dashboard to populate this section.
            </div>
          )}
        </div>
      </section>
      )
    ),
  }

  const defaultOrder = ['hero', 'description', 'products']
  const order = sectionOrder.length ? sectionOrder : defaultOrder
  const normalizedOrder = order.includes('products')
    ? order
    : [...order, 'products']

  return (
    <div className='space-y-10'>
      {normalizedOrder.map((key) => (
        <div key={key}>{sections[key] || null}</div>
      ))}
    </div>
  )
}
