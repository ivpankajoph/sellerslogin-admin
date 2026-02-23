export const INTEGRATION_PROVIDER_IDS = [
  'razorpay',
  'cashfree',
  'cod',
  'borzo',
  'delhivery',
] as const

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number]
export type PaymentProviderId = 'cod' | 'razorpay' | 'cashfree'
export type DeliveryProviderId = 'none' | 'borzo' | 'delhivery'
export type IntegrationCategory = 'payment' | 'delivery'

export type IntegrationProviderState = {
  provider: IntegrationProviderId
  category: IntegrationCategory
  enabled: boolean
  connected: boolean
  connected_at?: string | null
  last_checked_at?: string | null
  last_error?: string
}

export type VendorIntegrationsResponse = {
  defaults: {
    payment: PaymentProviderId
    delivery: DeliveryProviderId
  }
  providers: Record<IntegrationProviderId, IntegrationProviderState>
}

const PAYMENT_PROVIDERS = new Set<PaymentProviderId>(['cod', 'razorpay', 'cashfree'])
const DELIVERY_PROVIDERS = new Set<DeliveryProviderId>(['none', 'borzo', 'delhivery'])

const getProviderCategory = (provider: IntegrationProviderId): IntegrationCategory =>
  provider === 'borzo' || provider === 'delhivery' ? 'delivery' : 'payment'

export const isProviderUsable = (
  provider: IntegrationProviderId,
  state?: Partial<IntegrationProviderState> | null,
) => {
  if (provider === 'cod') {
    return state?.enabled !== false
  }
  return Boolean(state?.enabled && state?.connected)
}

export const isProviderUsableFromData = (
  data: VendorIntegrationsResponse | null,
  provider: IntegrationProviderId,
) => {
  if (!data?.providers) return false
  return isProviderUsable(provider, data.providers[provider])
}

export const parseVendorIntegrations = (
  payload: unknown,
): VendorIntegrationsResponse | null => {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Partial<VendorIntegrationsResponse>
  const sourceProviders = (source.providers || {}) as Record<
    string,
    Partial<IntegrationProviderState> | undefined
  >

  const providers = INTEGRATION_PROVIDER_IDS.reduce(
    (acc, provider) => {
      const input = sourceProviders[provider]
      acc[provider] = {
        provider,
        category: getProviderCategory(provider),
        enabled: Boolean(input?.enabled),
        connected: Boolean(input?.connected),
        connected_at: input?.connected_at ?? null,
        last_checked_at: input?.last_checked_at ?? null,
        last_error: input?.last_error || '',
      }
      return acc
    },
    {} as Record<IntegrationProviderId, IntegrationProviderState>,
  )

  const paymentDefault = source.defaults?.payment
  const deliveryDefault = source.defaults?.delivery

  return {
    defaults: {
      payment: PAYMENT_PROVIDERS.has(paymentDefault as PaymentProviderId)
        ? (paymentDefault as PaymentProviderId)
        : 'cod',
      delivery: DELIVERY_PROVIDERS.has(deliveryDefault as DeliveryProviderId)
        ? (deliveryDefault as DeliveryProviderId)
        : 'none',
    },
    providers,
  }
}
