import { createFileRoute } from '@tanstack/react-router'
import TemplateWorkspacePage from '@/features/template-workspace'

export const Route = createFileRoute('/_authenticated/template-workspace/')({
  component: TemplateWorkspacePage,
})
