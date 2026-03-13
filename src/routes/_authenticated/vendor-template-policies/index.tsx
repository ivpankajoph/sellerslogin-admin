import VendorTemplatePolicies from '@/features/vendor-template/vendor-template-policies'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-policies/')({
  component: VendorTemplatePolicies,
})
