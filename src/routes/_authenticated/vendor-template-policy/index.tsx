import VendorTemplatePolicy from '@/features/vendor-template/vendor-template-policy'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-policy/')({
  component: VendorTemplatePolicy,
})
