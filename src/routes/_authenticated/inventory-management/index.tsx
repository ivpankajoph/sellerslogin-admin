import InventoryDashboard from '@/features/inventory-management'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inventory-management/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <InventoryDashboard />
}
