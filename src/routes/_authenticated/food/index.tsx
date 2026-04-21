import FoodHubPage from '@/features/food'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/')({
  component: FoodHubPage,
})
