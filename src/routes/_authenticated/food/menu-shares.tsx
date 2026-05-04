import FoodMenuSharesPage from '@/features/food-menu-shares'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/menu-shares')({
  component: FoodMenuSharesPage,
})
