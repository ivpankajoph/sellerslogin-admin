import TeamAccessPage from '@/features/team-access'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/team-access-analytics/')({
  component: TeamAccessAnalyticsRoute,
})

function TeamAccessAnalyticsRoute() {
  return <TeamAccessPage initialTab='activity' />
}
