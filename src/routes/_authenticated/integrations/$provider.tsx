import { createFileRoute } from '@tanstack/react-router'
import IntegrationsPage from '@/features/integrations'

const supportedProviders = ['razorpay', 'cashfree', 'cod', 'borzo', 'delhivery'] as const

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

  return <IntegrationsPage focusProvider={safeProvider} />
}

