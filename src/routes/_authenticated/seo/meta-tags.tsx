import { createFileRoute } from '@tanstack/react-router'
import SeoMetaTagsPage from '@/features/seo-meta-tags'

export const Route = createFileRoute('/_authenticated/seo/meta-tags')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SeoMetaTagsPage />
}
