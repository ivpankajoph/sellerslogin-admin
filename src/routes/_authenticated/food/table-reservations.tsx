import FoodTableReservationsPage from '@/features/food-table-reservations'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/table-reservations')({
  component: FoodTableReservationsPage,
})
