import AdminProductsTable from '@/features/products/admin-products'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/products/admin-products/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <AdminProductsTable/>
}
