import { createFileRoute } from '@tanstack/react-router'
import MetaPixelDashboard from '@/features/meta-pixel'

export const Route = createFileRoute('/_authenticated/meta-pixel/analytics')({
  component: () => <MetaPixelDashboard view='analytics' />,
})
