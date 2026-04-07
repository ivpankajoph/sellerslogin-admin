import VendorTemplateProductBenefits from '@/features/vendor-template/vendor-template-product-benefits'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/vendor-template-product-benefits/'
)({
  component: VendorTemplateProductBenefits,
})
