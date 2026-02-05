import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { AboutPreview } from '@/features/template-preview/components/AboutPreview'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import { useLiveTemplatePreview } from '@/features/template-preview/hooks/useLiveTemplatePreview'
import { TemplatePageSkeleton } from '@/features/template-preview/components/TemplatePageSkeleton'

export const Route = createFileRoute('/template/$vendorId/about')({
  component: TemplateAboutPreviewRoute,
})

function TemplateAboutPreviewRoute() {
  const { vendorId } = Route.useParams()
  const {
    template,
    sectionOrder,
    loading,
    error,
    categoryMap,
    subcategories,
    vendorName,
  } = useTemplatePreviewData(vendorId, 'about')
  const live = useLiveTemplatePreview(
    vendorId,
    'about',
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
      active='about'
    >
      <AboutPreview
        template={live.template}
        sectionOrder={live.sectionOrder}
        vendorId={vendorId}
      />
    </PreviewChrome>
  )
}
