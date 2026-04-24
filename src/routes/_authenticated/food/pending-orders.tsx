import FoodPendingOrdersPage from '@/features/food-pending-orders'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/pending-orders')({
  component: FoodPendingOrdersPage,
})
