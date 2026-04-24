import FoodInventoryPage from '@/features/food-inventory'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/inventory')({
  component: FoodInventoryPage,
})
