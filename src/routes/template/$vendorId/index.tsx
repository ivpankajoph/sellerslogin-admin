import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { HomePreview } from '@/features/template-preview/components/HomePreview'
import { TemplatePageSkeleton } from '@/features/template-preview/components/TemplatePageSkeleton'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import { useLiveTemplatePreview } from '@/features/template-preview/hooks/useLiveTemplatePreview'

export const Route = createFileRoute('/template/$vendorId/')({
  component: TemplateHomePreviewRoute,
})

type FaqItem = { question?: string }

function TemplateHomePreviewRoute() {
  const { vendorId } = Route.useParams()
  const {
    template,
    products,
    sectionOrder,
    categoryMap,
    subcategories,
    vendorName,
    loading,
    error,
  } = useTemplatePreviewData(vendorId, 'home')
  const live = useLiveTemplatePreview(
    vendorId,
    'home',
    template,
    sectionOrder
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
      buttonColor={
        template.components.home_page.hero_style?.primaryButtonColor || undefined
      }
      theme={live.template.components.theme}
      customPages={template.components.custom_pages || []}
      categories={Object.entries(categoryMap).map(([id, name]) => ({
        _id: id,
        name,
      }))}
      subcategories={subcategories}
      active='home'
      footer={
        <div className='grid gap-6 md:grid-cols-[1.2fr_0.8fr]'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.32em] text-slate-400'>
              Social Channels
            </p>
            <div className='mt-3 flex flex-wrap gap-2 text-sm text-slate-600'>
              <span>{template.components.social_page?.facebook || 'Facebook'}</span>
              <span>{template.components.social_page?.instagram || 'Instagram'}</span>
              <span>{template.components.social_page?.whatsapp || 'WhatsApp'}</span>
              <span>{template.components.social_page?.twitter || 'Twitter'}</span>
            </div>
          </div>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.32em] text-slate-400'>
              FAQs
            </p>
            <div className='mt-3 space-y-2 text-sm text-slate-600'>
              {(template.components.social_page?.faqs?.faqs || [])
                .slice(0, 2)
                .map((faq: FaqItem, index: number) => (
                  <p key={`${faq.question}-${index}`}>
                    {faq.question || 'Add FAQ question in the editor.'}
                  </p>
                ))}
              {(!template.components.social_page?.faqs?.faqs ||
                template.components.social_page?.faqs?.faqs?.length === 0) && (
                <p>Add FAQs in the Social + FAQ builder.</p>
              )}
            </div>
          </div>
        </div>
      }
    >
      <HomePreview
        template={live.template}
        products={products}
        sectionOrder={live.sectionOrder}
        categoryMap={categoryMap}
        vendorId={vendorId}
      />
    </PreviewChrome>
  )
}
