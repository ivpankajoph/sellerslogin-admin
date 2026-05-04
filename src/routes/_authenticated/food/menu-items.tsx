import FoodPosMenuPage from '@/features/food-pos-menu'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/menu-items')({
  component: FoodPosMenuPage,
})
