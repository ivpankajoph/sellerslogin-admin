import VendorTemplateBlog from '@/features/vendor-template/vendor-template-blog'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-blog/')({
  component: VendorTemplateBlog,
})
