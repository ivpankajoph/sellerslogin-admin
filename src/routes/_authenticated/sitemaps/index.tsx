import { createFileRoute } from '@tanstack/react-router'
import SitemapsPage from '@/features/sitemaps'

export const Route = createFileRoute('/_authenticated/sitemaps/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SitemapsPage />
}
