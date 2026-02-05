import VendorTemplate from '@/features/vendor-template'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-template/')({
  component: VendorTemplate,
})


