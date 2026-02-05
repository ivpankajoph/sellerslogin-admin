import Vendor from '@/features/vendor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vendor/')({
  component: Vendor,
})

