import { createFileRoute } from '@tanstack/react-router'
import { UserDetails } from '@/features/users/user-details'

export const Route = createFileRoute('/_authenticated/users/$userId')({
  component: UserDetails,
})
