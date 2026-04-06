import brevoLogo from '@/assets/toolkit-apps/brevo.svg'
import cashfreeLogo from '@/assets/toolkit-apps/cashfree.png'
import delhiveryLogo from '@/assets/toolkit-apps/delhivery.png'
import googleMerchantLogo from '@/assets/toolkit-apps/google-merchant.svg'
import nimbuspostLogo from '@/assets/toolkit-apps/nimbuspost.svg'
import razorpayLogo from '@/assets/toolkit-apps/razorpay.png'

export const INTEGRATION_PROVIDER_IDS = [
  'razorpay',
  'cashfree',
  'delhivery',
  'nimbuspost',
  'google_merchant',
  'brevo',
] as const

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number]
export type PaymentProviderId = 'none' | 'razorpay' | 'cashfree'
export type DeliveryProviderId = 'none' | 'delhivery' | 'nimbuspost'
export type IntegrationCategory = 'payment' | 'delivery' | 'marketing'
export type IntegrationProviderField = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password'
}
export type IntegrationCatalogItem = {
  title: string
  shortLabel: string
  category: IntegrationCategory
  description: string
  imageSrc: string
  docs?: string
  fields: IntegrationProviderField[]
}

export type IntegrationProviderState = {
  provider: IntegrationProviderId
  category: IntegrationCategory
  enabled: boolean
  connected: boolean
  connected_at?: string | null
  last_checked_at?: string | null
  last_error?: string
  config?: Record<string, string>
}

export type VendorIntegrationsResponse = {
  defaults: {
    payment: PaymentProviderId
    delivery: DeliveryProviderId
  }
  providers: Record<IntegrationProviderId, IntegrationProviderState>
}

export const INTEGRATION_PROVIDER_META: Record<
  IntegrationProviderId,
  IntegrationCatalogItem
> = {
  razorpay: {
    title: 'Razorpay',
    shortLabel: 'Razorpay',
    category: 'payment',
    description: 'Accept UPI, cards and netbanking payments.',
    imageSrc: razorpayLogo,
    docs: 'https://razorpay.com/docs',
    fields: [
      { key: 'key_id', label: 'Key ID', placeholder: 'rzp_live_xxxx' },
      { key: 'key_secret', label: 'Key Secret', type: 'password' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' },
    ],
  },
  cashfree: {
    title: 'Cashfree',
    shortLabel: 'Cashfree',
    category: 'payment',
    description: 'Alternative payment gateway for checkout.',
    imageSrc: cashfreeLogo,
    docs: 'https://docs.cashfree.com',
    fields: [
      { key: 'app_id', label: 'App ID' },
      { key: 'secret_key', label: 'Secret Key', type: 'password' },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox / production' },
    ],
  },
  delhivery: {
    title: 'Delhivery',
    shortLabel: 'Delhivery',
    category: 'delivery',
    description: 'Delhivery shipping API integration.',
    imageSrc: delhiveryLogo,
    docs: 'https://delhivery-express-api-doc.readme.io',
    fields: [
      { key: 'token', label: 'API Token', type: 'password' },
      {
        key: 'base_url',
        label: 'Base URL (domain only)',
        placeholder: 'https://track.delhivery.com',
      },
      {
        key: 'pickup_location',
        label: 'Pickup Location',
        placeholder: 'warehouse_name',
      },
    ],
  },
  nimbuspost: {
    title: 'NimbusPost',
    shortLabel: 'NimbusPost',
    category: 'delivery',
    description: 'Multi-courier shipment, tracking, manifest, and NDR workflows.',
    imageSrc: nimbuspostLogo,
    docs: 'https://api.nimbuspost.com/v1/',
    fields: [
      {
        key: 'warehouse_name',
        label: 'Warehouse Name',
        placeholder: 'test warehouse',
      },
      {
        key: 'pickup_name',
        label: 'Pickup Contact Name',
        placeholder: 'Pankaj Verma',
      },
      {
        key: 'pickup_phone',
        label: 'Pickup Contact Phone',
        placeholder: '9999999999',
      },
      {
        key: 'pickup_address',
        label: 'Pickup Address',
        placeholder: 'Surajpur Greater Noida',
      },
      {
        key: 'pickup_address_2',
        label: 'Pickup Address 2',
        placeholder: 'Near landmark',
      },
      {
        key: 'pickup_city',
        label: 'Pickup City',
        placeholder: 'Greater Noida',
      },
      {
        key: 'pickup_state',
        label: 'Pickup State',
        placeholder: 'Uttar Pradesh',
      },
      {
        key: 'pickup_pincode',
        label: 'Pickup Pincode',
        placeholder: '201306',
      },
      {
        key: 'pickup_gst_number',
        label: 'GST Number',
        placeholder: 'Optional',
      },
    ],
  },
  google_merchant: {
    title: 'Google Merchant',
    shortLabel: 'Merchant',
    category: 'marketing',
    description:
      'Connect the vendor Google account with OAuth and choose which Merchant Center account to use.',
    imageSrc: googleMerchantLogo,
    docs: 'https://developers.google.com/merchant/api',
    fields: [],
  },
  brevo: {
    title: 'Brevo',
    shortLabel: 'Brevo',
    category: 'marketing',
    description: 'Email marketing, campaigns, templates, and contact tools.',
    imageSrc: brevoLogo,
    docs: 'https://developers.brevo.com/docs',
    fields: [],
  },
}

const PAYMENT_PROVIDERS = new Set<PaymentProviderId>(['none', 'razorpay', 'cashfree'])
const DELIVERY_PROVIDERS = new Set<DeliveryProviderId>([
  'none',
  'delhivery',
  'nimbuspost',
])

const getProviderCategory = (provider: IntegrationProviderId): IntegrationCategory =>
  provider === 'delhivery' || provider === 'nimbuspost'
    ? 'delivery'
    : provider === 'brevo' || provider === 'google_merchant'
      ? 'marketing'
      : 'payment'

export const isProviderUsable = (
  _provider: IntegrationProviderId,
  state?: Partial<IntegrationProviderState> | null,
) => {
  return Boolean(state?.enabled && state?.connected)
}

export const isProviderUsableFromData = (
  data: VendorIntegrationsResponse | null,
  provider: IntegrationProviderId,
) => {
  if (!data?.providers) return false
  return isProviderUsable(provider, data.providers[provider])
}

export const getConnectedProviderIds = (data: VendorIntegrationsResponse | null) =>
  INTEGRATION_PROVIDER_IDS.filter((provider) => isProviderUsableFromData(data, provider))

export const isProviderInstalledFromData = (
  data: VendorIntegrationsResponse | null,
  provider: IntegrationProviderId,
) => {
  const state = data?.providers?.[provider]
  if (!state) return false
  return Boolean(state.enabled || state.connected)
}

export const getInstalledProviderIds = (data: VendorIntegrationsResponse | null) =>
  INTEGRATION_PROVIDER_IDS.filter((provider) => isProviderInstalledFromData(data, provider))

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
        config:
          input?.config && typeof input.config === 'object'
            ? (input.config as Record<string, string>)
            : {},
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
        : 'none',
      delivery: DELIVERY_PROVIDERS.has(deliveryDefault as DeliveryProviderId)
        ? (deliveryDefault as DeliveryProviderId)
        : 'none',
    },
    providers,
  }
}

export const applyBrevoStatus = (
  data: VendorIntegrationsResponse | null,
  payload: unknown,
): VendorIntegrationsResponse | null => {
  if (!data) return null

  const source =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const connected = Boolean(source.connected)

  return {
    ...data,
    providers: {
      ...data.providers,
      brevo: {
        ...data.providers.brevo,
        provider: 'brevo',
        category: 'marketing',
        enabled: connected,
        connected,
        connected_at: data.providers.brevo.connected_at ?? null,
        last_checked_at: data.providers.brevo.last_checked_at ?? null,
        last_error: '',
        config: data.providers.brevo.config ?? {},
      },
    },
  }
}
