import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import { useLiveTemplatePreview } from '@/features/template-preview/hooks/useLiveTemplatePreview'
import { InlineEditableText } from '@/features/template-preview/components/InlineEditableText'
import { TemplatePageSkeleton } from '@/features/template-preview/components/TemplatePageSkeleton'

type Section = {
  id?: string
  type?: string
  data?: Record<string, unknown>
}

export const Route = createFileRoute('/template/$vendorId/page/$pageSlug')({
  component: TemplateCustomPageRoute,
})

function TemplateCustomPageRoute() {
  const { vendorId, pageSlug } = Route.useParams()
  const {
    template,
    sectionOrder,
    categoryMap,
    subcategories,
    vendorName,
    loading,
    error,
  } = useTemplatePreviewData(vendorId, 'home')
  const live = useLiveTemplatePreview(vendorId, 'home', template, sectionOrder)

  const pages = live.template.components.custom_pages || []
  const page =
    pages.find((item) => item.slug === pageSlug) ||
    pages.find((item) => item.id === pageSlug)
  const pageIndex = Math.max(
    pages.findIndex((item) => item.id === page?.id),
    pages.findIndex((item) => item.slug === page?.slug)
  )

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
      theme={live.template.components.theme}
      customPages={template.components.custom_pages || []}
      categories={Object.entries(categoryMap).map(([id, name]) => ({
        _id: id,
        name,
      }))}
      subcategories={subcategories}
      active='home'
    >
      <div className='space-y-8'>
        <section className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Custom Page
          </p>
          <InlineEditableText
            as='h1'
            value={page?.title}
            fallback='Untitled Page'
            path={['components', 'custom_pages', String(pageIndex), 'title']}
            vendorId={vendorId}
            page='home'
            className='mt-3 text-3xl font-semibold text-slate-900'
          />
          <p className='mt-2 text-sm text-slate-600'>
            Customize sections from the Template Pages editor.
          </p>
        </section>

        <div className='space-y-6'>
          {(page?.sections || []).map((section: Section, index: number) => (
            <CustomSectionRenderer
              key={section.id || `${section.type}-${index}`}
              section={section}
              vendorId={vendorId}
              pageIndex={pageIndex}
              sectionIndex={index}
            />
          ))}
          {(page?.sections || []).length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
              Add sections to this page from the Template Pages builder.
            </div>
          )}
        </div>
      </div>
    </PreviewChrome>
  )
}

function CustomSectionRenderer({
  section,
  vendorId,
  pageIndex,
  sectionIndex,
}: {
  section: Section
  vendorId: string
  pageIndex: number
  sectionIndex: number
}) {
  const type = section.type || 'text'
  const data = section.data || {}
  const style = (data as { style?: Record<string, unknown> }).style || {}
  const textColor = style.textColor as string | undefined
  const backgroundColor = style.backgroundColor as string | undefined
  const fontSize = Number(style.fontSize || 0) || undefined
  const buttonColor = style.buttonColor as string | undefined

  const basePath = [
    'components',
    'custom_pages',
    String(pageIndex),
    'sections',
    String(sectionIndex),
    'data',
  ]
  const stylePath = [...basePath, 'style']
  const textColorPath = [...stylePath, 'textColor']
  const fontSizePath = [...stylePath, 'fontSize']
  const buttonColorPath = [...stylePath, 'buttonColor']

  if (type === 'hero') {
    return (
      <section
        className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <div
          className='px-6 py-12 text-center'
          style={textColor ? { color: textColor } : undefined}
        >
          <InlineEditableText
            as='p'
            value={data.kicker as string}
            fallback='Highlight'
            path={[...basePath, 'kicker']}
            vendorId={vendorId}
            page='home'
            colorPath={textColorPath}
            sizePath={fontSizePath}
            color={textColor}
            fontSize={fontSize}
            className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'
          />
          <InlineEditableText
            as='h2'
            value={data.title as string}
            fallback='Hero headline'
            path={[...basePath, 'title']}
            vendorId={vendorId}
            page='home'
            colorPath={textColorPath}
            sizePath={fontSizePath}
            color={textColor}
            fontSize={fontSize}
            className='mt-3 text-3xl font-semibold text-slate-900'
          />
          <InlineEditableText
            as='p'
            value={data.subtitle as string}
            fallback='Describe the purpose of this page.'
            path={[...basePath, 'subtitle']}
            vendorId={vendorId}
            page='home'
            colorPath={textColorPath}
            sizePath={fontSizePath}
            color={textColor}
            fontSize={fontSize}
            className='mt-3 text-sm text-slate-600'
          />
          {(Array.isArray(data.buttons) && data.buttons.length) ||
          data.buttonLabel ? (
            <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
              {(Array.isArray(data.buttons) && data.buttons.length
                ? data.buttons
                : [{ label: data.buttonLabel, href: data.buttonHref }]
              ).map((button: any, index: number) => (
                <a
                  key={`${button.label}-${index}`}
                  href={String(button.href || '#')}
                  className='rounded-full px-5 py-2 text-sm font-semibold text-white'
                  style={{
                    backgroundColor: buttonColor || 'var(--template-accent)',
                  }}
                >
                  <InlineEditableText
                    value={button.label as string}
                    fallback='Button'
                    path={
                      (
                        [
                          ...basePath,
                          Array.isArray(data.buttons) && data.buttons.length
                            ? 'buttons'
                            : 'buttonLabel',
                          Array.isArray(data.buttons) && data.buttons.length
                            ? String(index)
                            : '',
                          Array.isArray(data.buttons) && data.buttons.length
                            ? 'label'
                            : '',
                        ].filter(Boolean) as string[]
                      )
                    }
                    vendorId={vendorId}
                    page='home'
                    colorPath={buttonColorPath}
                    color={buttonColor}
                    className='text-sm font-semibold text-white'
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  if (type === 'image') {
    return (
      <section
        className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <div className='aspect-[16/9] w-full bg-slate-100'>
          {data.imageUrl ? (
            <img
              src={String(data.imageUrl)}
              alt={String(data.caption || 'Section image')}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
              Add Image
            </div>
          )}
        </div>
        {data.caption ? (
          <InlineEditableText
            as='div'
            value={data.caption as string}
            fallback='Section caption'
            path={[...basePath, 'caption']}
            vendorId={vendorId}
            page='home'
            colorPath={textColorPath}
            sizePath={fontSizePath}
            color={textColor}
            fontSize={fontSize}
            className='px-6 py-4 text-sm text-slate-600'
          />
        ) : null}
      </section>
    )
  }

  if (type === 'features') {
    const items = Array.isArray(data.items) ? data.items : []
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='Key highlights'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-lg font-semibold text-slate-900'
        />
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          {items.map((item: any, index: number) => (
            <div
              key={`${item?.title}-${index}`}
              className='rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm'
            >
              <InlineEditableText
                as='p'
                value={item?.title}
                fallback='Feature'
                path={[...basePath, 'items', String(index), 'title']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={item?.description}
                fallback='Describe the benefit.'
                path={[...basePath, 'items', String(index), 'description']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='mt-2 text-slate-600'
              />
            </div>
          ))}
          {items.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400'>
              Add feature items
            </div>
          )}
        </div>
      </section>
    )
  }

  if (type === 'cta') {
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-slate-900 px-6 py-10 text-white shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='Call to action'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-2xl font-semibold'
        />
        <InlineEditableText
          as='p'
          value={data.subtitle as string}
          fallback='Encourage visitors to take an action.'
          path={[...basePath, 'subtitle']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='mt-3 text-sm text-white/80'
        />
        {(Array.isArray(data.buttons) && data.buttons.length) ||
        data.buttonLabel ? (
          <div className='mt-6 flex flex-wrap gap-3'>
            {(Array.isArray(data.buttons) && data.buttons.length
              ? data.buttons
              : [{ label: data.buttonLabel, href: data.buttonHref }]
            ).map((button: any, index: number) => (
              <a
                key={`${button.label}-${index}`}
                href={String(button.href || '#')}
                className='inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900'
                style={{
                  backgroundColor: buttonColor || undefined,
                  color: buttonColor ? '#fff' : undefined,
                }}
              >
                <InlineEditableText
                  value={button.label as string}
                  fallback='Button'
                  path={
                    (
                      [
                        ...basePath,
                        Array.isArray(data.buttons) && data.buttons.length
                          ? 'buttons'
                          : 'buttonLabel',
                        Array.isArray(data.buttons) && data.buttons.length
                          ? String(index)
                          : '',
                        Array.isArray(data.buttons) && data.buttons.length
                          ? 'label'
                          : '',
                      ].filter(Boolean) as string[]
                    )
                  }
                  vendorId={vendorId}
                  page='home'
                  colorPath={buttonColorPath}
                  color={buttonColor}
                  className='text-sm font-semibold text-white'
                />
              </a>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  if (type === 'gallery') {
    const images = Array.isArray(data.images) ? data.images : []
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='Gallery'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-lg font-semibold text-slate-900'
        />
        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {images.map((image: string, index: number) => (
            <div
              key={`${image}-${index}`}
              className='aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100'
            >
              {image ? (
                <img
                  src={image}
                  alt='Gallery'
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                  Add Image
                </div>
              )}
            </div>
          ))}
          {images.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400'>
              Add gallery images
            </div>
          )}
        </div>
      </section>
    )
  }

  if (type === 'pricing') {
    const plans = Array.isArray(data.plans) ? data.plans : []
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='Pricing Plans'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-lg font-semibold text-slate-900'
        />
        <InlineEditableText
          as='p'
          value={data.subtitle as string}
          fallback='Choose the plan that fits your goals.'
          path={[...basePath, 'subtitle']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='mt-2 text-sm text-slate-600'
        />
        <div className='mt-6 grid gap-4 md:grid-cols-2'>
          {plans.map((plan: any, index: number) => (
            <div
              key={`${plan.name}-${index}`}
              className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
            >
              <InlineEditableText
                as='h4'
                value={plan.name as string}
                fallback='Plan'
                path={[...basePath, 'plans', String(index), 'name']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='text-lg font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={plan.price as string}
                fallback='0'
                path={[...basePath, 'plans', String(index), 'price']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='mt-2 text-2xl font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={plan.description as string}
                fallback='Plan details'
                path={[...basePath, 'plans', String(index), 'description']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='mt-2 text-sm text-slate-600'
              />
              <ul className='mt-4 space-y-2 text-sm text-slate-600'>
                {(plan.features || []).map((feature: string, idx: number) => (
                  <InlineEditableText
                    key={`${feature}-${idx}`}
                    as='li'
                    value={feature}
                    fallback='Feature'
                    path={[
                      ...basePath,
                      'plans',
                      String(index),
                      'features',
                      String(idx),
                    ]}
                    vendorId={vendorId}
                    page='home'
                    colorPath={textColorPath}
                    sizePath={fontSizePath}
                    color={textColor}
                    fontSize={fontSize}
                    className='text-sm text-slate-600'
                  />
                ))}
              </ul>
              {plan.ctaLabel ? (
                <button
                  type='button'
                  className='mt-4 rounded-full px-4 py-2 text-sm font-semibold text-white'
                  style={{
                    backgroundColor: buttonColor || 'var(--template-accent)',
                  }}
                >
                  <InlineEditableText
                    value={plan.ctaLabel as string}
                    fallback='Button'
                    path={[...basePath, 'plans', String(index), 'ctaLabel']}
                    vendorId={vendorId}
                    page='home'
                    colorPath={buttonColorPath}
                    color={buttonColor}
                    className='text-sm font-semibold text-white'
                  />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (type === 'faq') {
    const items = Array.isArray(data.items) ? data.items : []
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='FAQs'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-lg font-semibold text-slate-900'
        />
        <InlineEditableText
          as='p'
          value={data.subtitle as string}
          fallback='FAQ details'
          path={[...basePath, 'subtitle']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='mt-2 text-sm text-slate-600'
        />
        <div className='mt-4 space-y-3'>
          {items.map((item: any, index: number) => (
            <div
              key={`${item.question}-${index}`}
              className='rounded-2xl border border-slate-100 bg-slate-50 p-4'
            >
              <InlineEditableText
                as='p'
                value={item.question as string}
                fallback='Question'
                path={[...basePath, 'items', String(index), 'question']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={item.answer as string}
                fallback='Answer'
                path={[...basePath, 'items', String(index), 'answer']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='mt-2 text-sm text-slate-600'
              />
            </div>
          ))}
          {items.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400'>
              Add FAQs
            </div>
          )}
        </div>
      </section>
    )
  }

  if (type === 'testimonials') {
    const items = Array.isArray(data.items) ? data.items : []
    return (
      <section
        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <InlineEditableText
          as='h3'
          value={data.title as string}
          fallback='Testimonials'
          path={[...basePath, 'title']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='text-lg font-semibold text-slate-900'
        />
        <InlineEditableText
          as='p'
          value={data.subtitle as string}
          fallback='Testimonials subtitle'
          path={[...basePath, 'subtitle']}
          vendorId={vendorId}
          page='home'
          colorPath={textColorPath}
          sizePath={fontSizePath}
          color={textColor}
          fontSize={fontSize}
          className='mt-2 text-sm text-slate-600'
        />
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          {items.map((item: any, index: number) => (
            <div
              key={`${item.name}-${index}`}
              className='rounded-2xl border border-slate-100 bg-slate-50 p-4'
            >
              <InlineEditableText
                as='p'
                value={item.quote as string}
                fallback='Great experience!'
                path={[...basePath, 'items', String(index), 'quote']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='text-sm text-slate-600'
              />
              <InlineEditableText
                as='p'
                value={item.name as string}
                fallback='Customer'
                path={[...basePath, 'items', String(index), 'name']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='mt-3 text-sm font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={item.role as string}
                fallback='Role'
                path={[...basePath, 'items', String(index), 'role']}
                vendorId={vendorId}
                page='home'
                colorPath={textColorPath}
                sizePath={fontSizePath}
                color={textColor}
                fontSize={fontSize}
                className='text-xs text-slate-500'
              />
            </div>
          ))}
          {items.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400'>
              Add testimonials
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section
      className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <InlineEditableText
        as='h3'
        value={data.title as string}
        fallback='Text block'
        path={[...basePath, 'title']}
        vendorId={vendorId}
        page='home'
        colorPath={textColorPath}
        sizePath={fontSizePath}
        color={textColor}
        fontSize={fontSize}
        className='text-lg font-semibold text-slate-900'
      />
      <InlineEditableText
        as='p'
        value={data.body as string}
        fallback='Add descriptive text for this section.'
        path={[...basePath, 'body']}
        vendorId={vendorId}
        page='home'
        colorPath={textColorPath}
        sizePath={fontSizePath}
        color={textColor}
        fontSize={fontSize}
        className='mt-2 text-sm text-slate-600'
      />
    </section>
  )
}
