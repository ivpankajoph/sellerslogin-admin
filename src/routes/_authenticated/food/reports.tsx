import FoodReportsPage from '@/features/food-reports'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/reports')({
  component: FoodReportsPage,
})
