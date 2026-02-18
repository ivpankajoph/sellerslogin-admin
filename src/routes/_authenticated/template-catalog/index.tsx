import { createFileRoute } from '@tanstack/react-router'
import TemplateCatalogPage from '@/features/template-catalog'

export const Route = createFileRoute('/_authenticated/template-catalog/')({
  component: TemplateCatalogPage,
})
