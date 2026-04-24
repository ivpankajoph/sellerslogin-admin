import FoodBillStatusPage from '@/features/food-bill-status'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/bill-status')({
  component: FoodBillStatusPage,
})
