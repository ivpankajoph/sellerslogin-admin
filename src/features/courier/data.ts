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
  items: Array<{
    productName: string
    imageUrl: string
    quantity: number
    unitPrice: number
    totalPrice: number
    variantSummary: string
  }>
  borzo?: {
    order_id?: number
    status?: string
    tracking_url?: string
    updated_at?: string
  }
  delhivery?: {
    order_id?: string
    waybill?: string
    waybills?: string[]
    label_url?: string
    pickup_location?: string
    pickup_request_id?: string
    pickup_request_status?: string
    pickup_request_message?: string
    pickup_request_date?: string
    pickup_request_time?: string
    pickup_request_packages?: number
    pickup_requested_at?: string
    payment_mode?: string
    status?: string
    status_description?: string
    package_count?: number
    scans?: Array<{
      status?: string
      status_type?: string
      description?: string
      location?: string
      time?: string
    }>
    updated_at?: string
  }
  nimbuspost?: {
    order_id?: number
    shipment_id?: number
    awb_number?: string
    courier_name?: string
    status?: string
    label_url?: string
    manifest_url?: string
    last_quote_amount?: number
    updated_at?: string
  }
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
    description: 'Multi-courier shipping with live rate, shipment, tracking, manifest, and NDR actions.',
    imageSrc: nimbuspostLogo,
    themeClass: 'border-blue-200 bg-blue-50',
    etaLabel: '1-4 days',
    live: true,
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

const formatVariantSummary = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return toText(value)
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatVariantSummary(entry))
      .filter(Boolean)
      .join(' / ')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const nextValue = toText(entry)
        if (!nextValue) return ''
        return `${key}: ${nextValue}`
      })
      .filter(Boolean)
      .join(' / ')
  }
  return toText(value)
}

const safeWindow = () =>
  typeof window !== 'undefined' && window?.localStorage ? window : null

const trackingStatusByPartner: Record<CourierPartnerId, string> = {
  borzo: 'Request queued',
  delhivery: 'Pickup requested',
  nimbuspost: 'Shipment booked',
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
    trackingUrl: toText(order?.borzo?.tracking_url || order?.nimbuspost?.label_url),
    externalDeliveryId: toText(
      order?.borzo?.order_id ||
        order?.delhivery?.waybill ||
        order?.nimbuspost?.awb_number ||
        order?.nimbuspost?.shipment_id
    ),
    websiteLabel,
    items: items.map((item: any) => ({
      productName: toText(item?.product_name) || 'Product',
      imageUrl: toText(item?.image_url),
      quantity: Number(item?.quantity || 0) || 1,
      unitPrice: Number(item?.unit_price || 0),
      totalPrice: Number(item?.total_price || 0),
      variantSummary: formatVariantSummary(item?.variant_attributes),
    })),
    borzo: order?.borzo
      ? {
          order_id: Number(order?.borzo?.order_id || 0) || undefined,
          status: toText(order?.borzo?.status),
          tracking_url: toText(order?.borzo?.tracking_url),
          updated_at: toText(order?.borzo?.updated_at),
        }
      : undefined,
    delhivery: order?.delhivery
      ? {
          order_id: toText(order?.delhivery?.order_id),
          waybill: toText(order?.delhivery?.waybill),
          waybills: Array.isArray(order?.delhivery?.waybills)
            ? order.delhivery.waybills.map((entry: unknown) => toText(entry)).filter(Boolean)
            : [],
          label_url: toText(order?.delhivery?.label_url),
          pickup_location: toText(order?.delhivery?.pickup_location),
          pickup_request_id: toText(order?.delhivery?.pickup_request_id),
          pickup_request_status: toText(order?.delhivery?.pickup_request_status),
          pickup_request_message: toText(order?.delhivery?.pickup_request_message),
          pickup_request_date: toText(order?.delhivery?.pickup_request_date),
          pickup_request_time: toText(order?.delhivery?.pickup_request_time),
          pickup_request_packages:
            Number(order?.delhivery?.pickup_request_packages || 0) || undefined,
          pickup_requested_at: toText(order?.delhivery?.pickup_requested_at),
          payment_mode: toText(order?.delhivery?.payment_mode),
          status: toText(order?.delhivery?.status),
          status_description: toText(order?.delhivery?.status_description),
          package_count: Number(order?.delhivery?.package_count || 0) || undefined,
          scans: Array.isArray(order?.delhivery?.scans)
            ? order.delhivery.scans
                .map((entry: any) => ({
                  status: toText(entry?.status),
                  status_type: toText(entry?.status_type),
                  description: toText(entry?.description),
                  location: toText(entry?.location),
                  time: toText(entry?.time),
                }))
                .filter(
                  (entry: any) =>
                    entry.status || entry.description || entry.location || entry.time
                )
            : [],
          updated_at: toText(order?.delhivery?.updated_at),
        }
      : undefined,
    nimbuspost: order?.nimbuspost
      ? {
          order_id: Number(order?.nimbuspost?.order_id || 0) || undefined,
          shipment_id: Number(order?.nimbuspost?.shipment_id || 0) || undefined,
          awb_number: toText(order?.nimbuspost?.awb_number),
          courier_name: toText(order?.nimbuspost?.courier_name),
          status: toText(order?.nimbuspost?.status),
          label_url: toText(order?.nimbuspost?.label_url),
          manifest_url: toText(order?.nimbuspost?.manifest_url),
          last_quote_amount:
            Number(
              order?.nimbuspost?.last_quote?.total_charges ??
                order?.nimbuspost?.last_quote?.freight_charges ??
                0
            ) || undefined,
          updated_at: toText(order?.nimbuspost?.updated_at),
        }
      : undefined,
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

export const getRemoteCourierAssignment = (
  order: CourierOrderSummary | null | undefined
): CourierAssignment | null => {
  if (!order) return null

  if (order.delhivery?.waybill || order.delhivery?.waybills?.length) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      partnerId: 'delhivery',
      partnerName: COURIER_PARTNER_MAP.delhivery.title,
      amount: 0,
      etaLabel: COURIER_PARTNER_MAP.delhivery.etaLabel,
      assignedAt: order.delhivery?.updated_at || order.createdAt,
      trackingStatus: order.delhivery?.status || trackingStatusByPartner.delhivery,
      trackingCode:
        order.delhivery?.waybill ||
        order.delhivery?.waybills?.[0] ||
        `${trackingPrefixByPartner.delhivery}-${order.id.slice(-6).toUpperCase()}`,
      trackingUrl: order.delhivery?.label_url || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      websiteLabel: order.websiteLabel,
    }
  }

  if (order.nimbuspost?.shipment_id || order.nimbuspost?.awb_number) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      partnerId: 'nimbuspost',
      partnerName: COURIER_PARTNER_MAP.nimbuspost.title,
      amount: Number(order.nimbuspost?.last_quote_amount || 0),
      etaLabel: COURIER_PARTNER_MAP.nimbuspost.etaLabel,
      assignedAt: order.nimbuspost?.updated_at || order.createdAt,
      trackingStatus: order.nimbuspost?.status || trackingStatusByPartner.nimbuspost,
      trackingCode:
        order.nimbuspost?.awb_number ||
        `${trackingPrefixByPartner.nimbuspost}-${order.id.slice(-6).toUpperCase()}`,
      trackingUrl: order.nimbuspost?.label_url || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      websiteLabel: order.websiteLabel,
    }
  }

  if (order.borzo?.order_id) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      partnerId: 'borzo',
      partnerName: COURIER_PARTNER_MAP.borzo.title,
      amount: 0,
      etaLabel: COURIER_PARTNER_MAP.borzo.etaLabel,
      assignedAt: order.borzo?.updated_at || order.createdAt,
      trackingStatus: order.borzo?.status || trackingStatusByPartner.borzo,
      trackingCode:
        String(order.borzo?.order_id || '') ||
        `${trackingPrefixByPartner.borzo}-${order.id.slice(-6).toUpperCase()}`,
      trackingUrl: order.borzo?.tracking_url || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      websiteLabel: order.websiteLabel,
    }
  }

  return null
}
