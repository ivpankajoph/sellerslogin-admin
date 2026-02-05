import VendorTemplateContact from '@/features/vendor-template/vendor-template-contact'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/vendor-template-contact/',
)({
  component: VendorTemplateContact,
})


