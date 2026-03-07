import GetDomainPage from '@/features/get-domain'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/get-domain/')({
  component: GetDomainPage,
})
                