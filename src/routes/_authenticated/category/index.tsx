import { Category } from '@/features/category'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/category/')({
  component: Category,
})


