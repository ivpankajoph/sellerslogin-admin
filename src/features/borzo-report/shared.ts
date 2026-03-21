import api from '@/lib/axios'

export const MAIN_WEBSITE_OPTION_ID = 'main-website'
export const MAIN_WEBSITE_LABEL = 'Main Website'

export type ReportSummary = {
  totalOrders: number
  totalRevenue: number
  statusCounts: Record<string, number>
}

export type BorzoReport = {
  ophmate: ReportSummary
  template: ReportSummary
}

export type BorzoCourier = {
  courier_id?: number
  surname?: string
  name?: string
  middlename?: string | null
  phone?: string
  latitude?: string | number | null
  longitude?: string | number | null
  photo_url?: string
}

export type BorzoOrder = {
  order_id?: number
  order_name?: string
  status?: string
  status_description?: string
  payment_amount?: string
  created_datetime?: string
  finish_datetime?: string
  courier?: BorzoCourier
  source_type?: 'main_website' | 'vendor_website'
  website_id?: string
  website_name?: string
  vendor_name?: string
  points?: Array<{
    address?: string
    tracking_url?: string
    contact_person?: { name?: string; phone?: string }
    delivery?: { status?: string }
  }>
}

type VendorLocalOrder = {
  _id?: string
  order_number?: string
  total?: number
  shipping_fee?: number
  status?: string
  createdAt?: string
  template_id?: string
  template_key?: string
  template_name?: string
  website_id?: string
  website_name?: string
  website_slug?: string
  vendor_id?:
    | string
    | {
        name?: string
        email?: string
        businessName?: string
        business_name?: string
        storeName?: string
        vendor_business_name?: string
      }
  shipping_address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    pincode?: string
  }
  borzo?: {
    order_id?: number
    status?: string
    status_description?: string
    tracking_url?: string
    courier?: BorzoCourier
  }
}

type FetchBorzoReportOptions = {
  isVendor: boolean
  websiteId?: string
}

type MapLocalOrderMeta = {
  sourceType: 'main_website' | 'vendor_website'
  websiteId: string
  websiteName: string
  vendorName?: string
}

const createEmptySummary = (): ReportSummary => ({
  totalOrders: 0,
  totalRevenue: 0,
  statusCounts: {},
})

export type StatusTab = 'all' | 'active' | 'completed' | 'drafts'

export const STATUS_TABS: Array<{ key: StatusTab; label: string }> = [
  { key: 'all', label: 'All orders' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'drafts', label: 'Drafts' },
]

export const normalizeStatus = (status?: string) =>
  String(status || 'unknown').toLowerCase()

export const getStatusBucket = (status?: string): StatusTab => {
  const key = normalizeStatus(status)
  if (['completed', 'delivered', 'finished'].includes(key)) return 'completed'
  if (['draft', 'new', 'created', 'pending'].includes(key)) return 'drafts'
  if (
    ['searching', 'executing', 'active', 'courier_assigned', 'in_progress'].includes(
      key
    )
  ) {
    return 'active'
  }
  return 'active'
}

export const statusPillClass = (status?: string) => {
  const key = normalizeStatus(status)
  if (['completed', 'delivered', 'finished'].includes(key)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (['cancelled', 'canceled', 'failed'].includes(key)) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (['draft', 'new', 'created', 'pending'].includes(key)) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export const formatMoney = (value?: number | string) =>
  `INR ${Number(value || 0).toLocaleString('en-IN')}`

export const formatDate = (value?: string) => {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-GB')
}

export const formatTime = (value?: string) => {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const getBorzoOrderWebsiteLabel = (order?: BorzoOrder | null) =>
  String(order?.website_name || '').trim() ||
  (order?.website_id === MAIN_WEBSITE_OPTION_ID ||
  order?.source_type === 'main_website'
    ? MAIN_WEBSITE_LABEL
    : 'Unknown website')

const getVendorLabel = (order: VendorLocalOrder) =>
  String(
    (typeof order?.vendor_id === 'object' &&
      (order.vendor_id?.businessName ||
        order.vendor_id?.business_name ||
        order.vendor_id?.storeName ||
        order.vendor_id?.name ||
        order.vendor_id?.email)) ||
      ''
  ).trim()

const getWebsiteLabelFromLocal = (order: VendorLocalOrder) =>
  String(
    order?.website_name ||
      order?.website_slug ||
      order?.template_name ||
      order?.template_key ||
      ''
  ).trim() || 'Unknown website'

const mapLocalToBorzoOrder = (
  order: VendorLocalOrder,
  meta: MapLocalOrderMeta
): BorzoOrder | null => {
  if (!order?.borzo?.order_id) return null

  const address = [
    order.shipping_address?.line1,
    order.shipping_address?.line2,
    order.shipping_address?.city,
    order.shipping_address?.state,
    order.shipping_address?.pincode,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    order_id: Number(order.borzo.order_id),
    order_name: order.order_number,
    status: order.borzo.status || order.status,
    status_description: order.borzo.status_description,
    payment_amount: String(Number(order.shipping_fee || 0).toFixed(2)),
    created_datetime: order.createdAt,
    courier: order.borzo.courier,
    source_type: meta.sourceType,
    website_id: meta.websiteId,
    website_name: meta.websiteName,
    vendor_name: meta.vendorName,
    points: [
      { address: 'Vendor pickup' },
      {
        address: address || 'Customer drop-off',
        tracking_url: order.borzo.tracking_url,
        delivery: { status: order.borzo.status },
      },
    ],
  }
}

const buildSummary = (orders: VendorLocalOrder[]): ReportSummary => {
  return orders.reduce((acc, order) => {
    if (!order?.borzo?.order_id) return acc
    const status = order?.borzo?.status || order?.status || 'unknown'
    acc.totalOrders += 1
    acc.totalRevenue += Number(order?.total || 0)
    acc.statusCounts[status] = (acc.statusCounts[status] || 0) + 1
    return acc
  }, createEmptySummary())
}

export const fetchBorzoReportData = async ({
  isVendor,
  websiteId = 'all',
}: FetchBorzoReportOptions): Promise<{
  report: BorzoReport
  orders: BorzoOrder[]
}> => {
  const normalizedWebsiteId = String(websiteId || 'all').trim() || 'all'
  const includeMainOrders =
    !isVendor &&
    (normalizedWebsiteId === 'all' ||
      normalizedWebsiteId === MAIN_WEBSITE_OPTION_ID)
  const includeTemplateOrders =
    isVendor || normalizedWebsiteId !== MAIN_WEBSITE_OPTION_ID

  const [ophmateRes, templateRes] = await Promise.all([
    includeMainOrders
      ? api.get('/orders', {
          params: {
            limit: 500,
            has_borzo: 'true',
          },
        })
      : Promise.resolve(null),
    includeTemplateOrders
      ? api.get('/template-orders', {
          params: {
            limit: 500,
            has_borzo: 'true',
            ...(normalizedWebsiteId !== 'all' &&
            normalizedWebsiteId !== MAIN_WEBSITE_OPTION_ID
              ? { website_id: normalizedWebsiteId }
              : {}),
          },
        })
      : Promise.resolve(null),
  ])

  const ophmateOrders =
    includeMainOrders && Array.isArray(ophmateRes?.data?.orders)
      ? ophmateRes.data.orders
      : []
  const templateOrders =
    includeTemplateOrders && Array.isArray(templateRes?.data?.orders)
      ? templateRes.data.orders
      : []

  const mappedMainOrders = includeMainOrders
    ? ophmateOrders
        .map((order: VendorLocalOrder) =>
          mapLocalToBorzoOrder(order, {
            sourceType: 'main_website',
            websiteId: MAIN_WEBSITE_OPTION_ID,
            websiteName: MAIN_WEBSITE_LABEL,
          })
        )
        .filter(Boolean)
    : []

  const mappedTemplateOrders = templateOrders
    .map((order: VendorLocalOrder) =>
      mapLocalToBorzoOrder(order, {
        sourceType: 'vendor_website',
        websiteId: String(order?.website_id || order?.template_id || '').trim(),
        websiteName: getWebsiteLabelFromLocal(order),
        vendorName: getVendorLabel(order),
      })
    )
    .filter(Boolean)

  return {
    report: {
      ophmate: includeMainOrders ? buildSummary(ophmateOrders) : createEmptySummary(),
      template: includeTemplateOrders
        ? buildSummary(templateOrders)
        : createEmptySummary(),
    },
    orders: [...mappedMainOrders, ...mappedTemplateOrders] as BorzoOrder[],
  }
}

export const fetchBorzoOrderDetailsById = async (
  orderId: number,
  isVendor: boolean,
  fallbackOrders: BorzoOrder[] = []
): Promise<{ order: BorzoOrder | null; courier: BorzoCourier | null }> => {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return { order: null, courier: null }
  }

  const localMatch =
    fallbackOrders.find((order) => Number(order?.order_id) === orderId) || null

  if (localMatch) {
    return {
      order: localMatch,
      courier: localMatch.courier || null,
    }
  }

  if (isVendor) {
    return { order: null, courier: null }
  }

  const [ordersResult, courierResult] = await Promise.allSettled([
    api.get('/borzo/orders', { params: { order_id: orderId, limit: 1 } }),
    api.get('/borzo/courier', { params: { order_id: orderId } }),
  ])

  let remoteOrder: BorzoOrder | null = null
  let remoteCourier: BorzoCourier | null = null

  if (ordersResult.status === 'fulfilled') {
    const ordersResponse = ordersResult.value?.data?.response || {}
    const orders = Array.isArray(ordersResponse?.orders)
      ? ordersResponse.orders
      : Array.isArray(ordersResponse)
        ? ordersResponse
        : []

    remoteOrder =
      orders.find((order: BorzoOrder) => Number(order?.order_id) === orderId) ||
      orders[0] ||
      null
  }

  if (courierResult.status === 'fulfilled') {
    const courierResponse = courierResult.value?.data?.response || {}
    remoteCourier = courierResponse?.courier || null
  }

  return {
    order: remoteOrder,
    courier: remoteCourier || remoteOrder?.courier || null,
  }
}

export const getMapEmbedUrl = (courier?: BorzoCourier | null) => {
  const lat = Number(courier?.latitude)
  const lng = Number(courier?.longitude)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const offset = 0.08
    const bbox = [lng - offset, lat - offset, lng + offset, lat + offset].join(
      ','
    )

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      bbox
    )}&layer=mapnik&marker=${lat}%2C${lng}`
  }

  return 'https://www.openstreetmap.org/export/embed.html?bbox=77.02%2C28.36%2C77.36%2C28.79&layer=mapnik&marker=28.6139%2C77.209'
}
