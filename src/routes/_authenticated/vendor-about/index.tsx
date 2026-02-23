import VendorAboutPage from '@/features/vendor-about'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor-about/')({
  component: VendorAboutPage,
})
