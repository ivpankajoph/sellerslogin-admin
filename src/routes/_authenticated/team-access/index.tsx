import { createFileRoute } from '@tanstack/react-router'
import TeamAccessPage from '@/features/team-access'

export const Route = createFileRoute('/_authenticated/team-access/')({
  component: TeamAccessPage,
})
