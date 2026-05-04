import FoodStoreAdminPage from '@/features/food-store-admin'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/food/tables')({
  component: () => <FoodStoreAdminPage mode='tables' />,
})
