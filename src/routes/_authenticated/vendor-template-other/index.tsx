import VendorTemplateOther from '@/features/vendor-template/vendor-template-other'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-other/')({
  component: VendorTemplateOther,
})


