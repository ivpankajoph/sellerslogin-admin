import { createFileRoute } from '@tanstack/react-router'
import SeoManagerPage from '@/features/seo'

export const Route = createFileRoute('/_authenticated/seo/entities')({
  component: () => <SeoManagerPage section='entities' />,
})
