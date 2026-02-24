import { createFileRoute } from '@tanstack/react-router'
import CitiesPage from '@/features/cities'

export const Route = createFileRoute('/_authenticated/cities/')({
  component: CitiesPage,
})
