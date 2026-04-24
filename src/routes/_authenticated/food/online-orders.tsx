import FoodOnlineOrdersPage from '@/features/food-online-orders'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/online-orders')({
  component: FoodOnlineOrdersPage,
})
