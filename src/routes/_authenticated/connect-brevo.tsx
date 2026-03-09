import { createFileRoute } from '@tanstack/react-router'
import BrevoConnectPage from '@/features/brevo-connect'

export const Route = createFileRoute('/_authenticated/connect-brevo')({
  component: BrevoConnectPage,
})

