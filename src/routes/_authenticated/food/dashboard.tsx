import FoodOperationsDashboardPage from '@/features/food-dashboard'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/dashboard')({
  component: FoodOperationsDashboardPage,
})
