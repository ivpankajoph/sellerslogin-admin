import { createFileRoute } from '@tanstack/react-router'
import { DeliverySystemDashboard } from '@/features/delivery-system'

export const Route = createFileRoute('/_authenticated/delivery-system')({
  component: DeliverySystemDashboard,
})

