import ProductCreator from '@/features/products/create-products'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/products/create-products/',
)({
  component: ProductCreator,
})


