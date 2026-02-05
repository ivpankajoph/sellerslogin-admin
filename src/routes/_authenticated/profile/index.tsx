import ProfilePage from '@/features/profile'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})


