import FoodCustomersPage from '@/features/food-customers'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/customers')({
  component: FoodCustomersPage,
})
