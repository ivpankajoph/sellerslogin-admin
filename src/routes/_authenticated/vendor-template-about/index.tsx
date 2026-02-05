import VendorTemplateAbout from '@/features/vendor-template/vendor-template-about'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template-about/')({
  component: VendorTemplateAbout,
})
