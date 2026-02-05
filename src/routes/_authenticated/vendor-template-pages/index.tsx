import VendorTemplatePages from '@/features/vendor-template/vendor-template-pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-pages/')({
  component: VendorTemplatePages,
})
