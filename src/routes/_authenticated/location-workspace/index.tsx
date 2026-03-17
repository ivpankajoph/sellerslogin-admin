import { createFileRoute } from '@tanstack/react-router'
import LocationWorkspacePage from '@/features/location-workspace'

export const Route = createFileRoute('/_authenticated/location-workspace/')({
  component: LocationWorkspacePage,
})
