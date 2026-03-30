import borzoLogo from '@/assets/toolkit-apps/borzo.svg'
import delhiveryLogo from '@/assets/toolkit-apps/delhivery.png'
import nimbuspostLogo from '@/assets/toolkit-apps/nimbuspost.svg'
import porterLogo from '@/assets/toolkit-apps/porter.svg'

export type CourierPartnerId = 'borzo' | 'delhivery' | 'nimbuspost' | 'porter'

export type CourierPartner = {
  id: CourierPartnerId
  title: string
  shortLabel: string
  description: string
  imageSrc: string
  themeClass: string
  etaLabel: string
  live: boolean
  reportPath: string
}

export type CourierOrderSummary = {
  id: string
  orderNumber: string
  source: 'orders' | 'template-orders'
  customerName: string
  customerPhone: string
  customerEmail: string
  total: number
  itemsCount: number
  createdAt: string
  address: string
  city: string
  state: string
  pincode: string
  status: string
  deliveryProvider: string
  trackingUrl: string
  externalDeliveryId: string
  websiteLabel: string
}

export type CourierQuote = {
  partnerId: CourierPartnerId
  amount: number
  etaLabel: string
  calculationLabel: string
}

export type CourierAssignment = {
  orderId: string
  orderNumber: string
  source: 'orders' | 'template-orders'
  partnerId: CourierPartnerId
  partnerName: string
  amount: number
  etaLabel: string
  assignedAt: string
  trackingStatus: string
  trackingCode: string
  trackingUrl: string
  customerName: string
  customerPhone: string
  total: number
  websiteLabel: string
}

const STORAGE_KEY = 'sellerslogin-courier-assignments-v1'

export const COURIER_PARTNERS: CourierPartner[] = [
  {
    id: 'borzo',
    title: 'Borzo',
    shortLabel: 'Borzo',
    description: 'Already integrated for instant local delivery and courier workflows.',
    imageSrc: borzoLogo,
    themeClass: 'border-emerald-200 bg-emerald-50',
    etaLabel: '35-55 mins',
    live: true,
    reportPath: '/borzo-report',
  },
  {
    id: 'delhivery',
    title: 'Delhivery',
    shortLabel: 'Delhivery',
    description: 'National shipping partner for standard parcel movement and RTO flows.',
    imageSrc: delhiveryLogo,
    themeClass: 'border-sky-200 bg-sky-50',
    etaLabel: '1-3 days',
    live: true,
    reportPath: '/courier/delhivery',
  },
  {
    id: 'nimbuspost',
    title: 'NimbusPost',
    shortLabel: 'NimbusPost',
    description: 'Static app card for multi-courier routing. Integration can be added later.',
    imageSrc: nimbuspostLogo,
    themeClass: 'border-blue-200 bg-blue-50',
    etaLabel: '1-4 days',
    live: false,
    reportPath: '/courier/nimbuspost',
  },
  {
    id: 'porter',
    title: 'Porter',
    shortLabel: 'Porter',
    description: 'Static app card for on-demand city logistics and same-day dispatch.',
    imageSrc: porterLogo,
    themeClass: 'border-orange-200 bg-orange-50',
    etaLabel: '45-90 mins',
    live: false,
    reportPath: '/courier/porter',
  },
]

export const COURIER_PARTNER_MAP = Object.fromEntries(
  COURIER_PARTNERS.map((partner) => [partner.id, partner])
) as Record<CourierPartnerId, CourierPartner>

const toText = (value: unknown) => String(value ?? '').trim()

const safeWindow = () =>
  typeof window !== 'undefined' && window?.localStorage ? window : null

const trackingStatusByPartner: Record<CourierPartnerId, string> = {
  borzo: 'Request queued',
  delhivery: 'Pickup requested',
  nimbuspost: 'Awaiting API integration',
  porter: 'Dispatcher review',
}

const trackingPrefixByPartner: Record<CourierPartnerId, string> = {
  borzo: 'BRZ',
  delhivery: 'DLV',
  nimbuspost: 'NMB',
  porter: 'PTR',
}

export const formatCourierAddress = (shippingAddress?: {
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}) =>
  [
    shippingAddress?.line1,
    shippingAddress?.line2,
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.pincode,
    shippingAddress?.country,
  ]
    .map((value) => toText(value))
    .filter(Boolean)
    .join(', ')

export const normalizeCourierOrder = (
  order: any,
  source: 'orders' | 'template-orders'
): CourierOrderSummary | null => {
  const orderId = toText(order?._id)
  if (!orderId) return null

  const websiteLabel =
    toText(order?.website_name) ||
    toText(order?.website_slug) ||
    toText(order?.template_name) ||
    toText(order?.template_key) ||
    'Main website'
  const items = Array.isArray(order?.items) ? order.items : []
  const itemsCount = items.reduce(
    (sum: number, item: any) => sum + Number(item?.quantity || 0),
    0
  )
  const address = formatCourierAddress(order?.shipping_address)

  return {
    id: orderId,
    orderNumber: toText(order?.order_number) || `#${orderId.slice(-6).toUpperCase()}`,
    source,
    customerName:
      toText(order?.shipping_address?.full_name) ||
      toText(order?.user_id?.name) ||
      'Customer',
    customerPhone:
      toText(order?.shipping_address?.phone) || toText(order?.user_id?.phone),
    customerEmail: toText(order?.user_id?.email),
    total: Number(order?.total || order?.subtotal || 0),
    itemsCount: itemsCount || items.length || 1,
    createdAt: toText(order?.createdAt),
    address,
    city: toText(order?.shipping_address?.city),
    state: toText(order?.shipping_address?.state),
    pincode: toText(order?.shipping_address?.pincode),
    status: toText(order?.status) || 'pending',
    deliveryProvider: toText(order?.delivery_provider),
    trackingUrl: toText(order?.borzo?.tracking_url),
    externalDeliveryId: toText(order?.borzo?.order_id),
    websiteLabel,
  }
}

export const estimateCourierQuote = (
  order: CourierOrderSummary,
  partnerId: CourierPartnerId
): CourierQuote => {
  const baseRateMap: Record<CourierPartnerId, number> = {
    borzo: 54,
    delhivery: 68,
    nimbuspost: 61,
    porter: 76,
  }
  const variableRateMap: Record<CourierPartnerId, number> = {
    borzo: 0.013,
    delhivery: 0.01,
    nimbuspost: 0.011,
    porter: 0.012,
  }
  const itemRateMap: Record<CourierPartnerId, number> = {
    borzo: 9,
    delhivery: 11,
    nimbuspost: 10,
    porter: 13,
  }

  const zoneFactor = order.state ? 12 : 0
  const cityFactor = order.city ? 6 : 0
  const amount =
    baseRateMap[partnerId] +
    order.total * variableRateMap[partnerId] +
    order.itemsCount * itemRateMap[partnerId] +
    zoneFactor +
    cityFactor

  return {
    partnerId,
    amount: Math.round(amount),
    etaLabel: COURIER_PARTNER_MAP[partnerId].etaLabel,
    calculationLabel: `Base + order value + item count + zone factor`,
  }
}

export const readCourierAssignments = (): CourierAssignment[] => {
  const browser = safeWindow()
  if (!browser) return []

  try {
    const raw = browser.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeCourierAssignments = (assignments: CourierAssignment[]) => {
  const browser = safeWindow()
  if (!browser) return
  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
}

export const saveCourierAssignment = (
  order: CourierOrderSummary,
  partnerId: CourierPartnerId
) => {
  const quote = estimateCourierQuote(order, partnerId)
  const partner = COURIER_PARTNER_MAP[partnerId]
  const existing = readCourierAssignments().filter(
    (assignment) => assignment.orderId !== order.id
  )

  const timestamp = new Date().toISOString()
  const assignment: CourierAssignment = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    partnerId,
    partnerName: partner.title,
    amount: quote.amount,
    etaLabel: quote.etaLabel,
    assignedAt: timestamp,
    trackingStatus: trackingStatusByPartner[partnerId],
    trackingCode:
      order.externalDeliveryId ||
      `${trackingPrefixByPartner[partnerId]}-${order.id.slice(-6).toUpperCase()}`,
    trackingUrl: order.trackingUrl,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    total: order.total,
    websiteLabel: order.websiteLabel,
  }

  writeCourierAssignments([assignment, ...existing])
  return assignment
}

export const getCourierAssignmentForOrder = (orderId: string) =>
  readCourierAssignments().find((assignment) => assignment.orderId === orderId) || null
