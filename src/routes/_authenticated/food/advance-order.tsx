import FoodPosPage from '@/features/food-pos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/advance-order')({
  component: () => <FoodPosPage isAdvance />,
})
