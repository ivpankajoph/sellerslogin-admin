import { createFileRoute } from '@tanstack/react-router'
import BrevoConnectPage from '@/features/brevo-connect'
import IntegrationsPage from '@/features/integrations'

const supportedProviders = [
  'razorpay',
  'cashfree',
  'delhivery',
  'google_merchant',
  'brevo',
] as const

type ProviderId = (typeof supportedProviders)[number]

export const Route = createFileRoute('/_authenticated/integrations/$provider')({
  component: ProviderIntegrationsPage,
})

function ProviderIntegrationsPage() {
  const { provider } = Route.useParams()
  const normalized = String(provider || '').toLowerCase()
  const safeProvider = (supportedProviders.includes(normalized as ProviderId)
    ? normalized
    : 'razorpay') as ProviderId

  if (safeProvider === 'brevo') {
    return <BrevoConnectPage />
  }

  return <IntegrationsPage focusProvider={safeProvider} />
}
