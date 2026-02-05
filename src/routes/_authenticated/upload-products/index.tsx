import ExcelProductUpload from '@/features/products/upload-products'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/upload-products/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExcelProductUpload/>
}
