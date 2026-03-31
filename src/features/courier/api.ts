import api from '@/lib/axios'
import {
  getCourierAssignmentForOrder,
  getRemoteCourierAssignment,
  normalizeCourierOrder,
  type CourierAssignment,
  type CourierOrderSummary,
} from './data'

const getOrderBasePath = (order: CourierOrderSummary) =>
  order.source === 'template-orders'
    ? `/template-orders/${order.id}`
    : `/orders/${order.id}`

export const loadCourierOrders = async (isVendor: boolean) => {
  const params = {
    page: 1,
    limit: 50,
  }

  const orderSources = isVendor
    ? [
        { endpoint: '/orders', source: 'orders' as const },
        { endpoint: '/template-orders', source: 'template-orders' as const },
      ]
    : [
        { endpoint: '/orders', source: 'orders' as const },
        { endpoint: '/template-orders', source: 'template-orders' as const },
      ]

  const responses = await Promise.allSettled(
    orderSources.map(({ endpoint }) => api.get(endpoint, { params }))
  )

  const nextOrders = responses.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return []

    const source = orderSources[index]?.source || 'orders'
    const rows = Array.isArray(result.value?.data?.orders)
      ? result.value.data.orders
      : []

    return rows
      .map((order: unknown) => normalizeCourierOrder(order, source))
      .filter(Boolean) as CourierOrderSummary[]
  })

  const dedupedOrders = Array.from(
    new Map(nextOrders.map((order) => [order.id, order])).values()
  ).sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime()
    const rightTime = new Date(right.createdAt || 0).getTime()
    return rightTime - leftTime
  })

  if (
    !dedupedOrders.length &&
    responses.every((result) => result.status === 'rejected')
  ) {
    const firstError = responses.find((result) => result.status === 'rejected')
    throw (firstError as PromiseRejectedResult | undefined)?.reason
  }

  return dedupedOrders
}

export const getAssignedCourierForOrder = (order: CourierOrderSummary | null) => {
  if (!order) return null
  return (
    getRemoteCourierAssignment(order) ||
    getCourierAssignmentForOrder(order.id) ||
    null
  ) as CourierAssignment | null
}

export const fetchNimbuspostQuote = async (
  order: CourierOrderSummary,
  payload: Record<string, unknown> = {}
) => {
  const res = await api.post(`${getOrderBasePath(order)}/nimbuspost/quote`, payload)
  return res?.data
}

export const createNimbuspostShipment = async (
  order: CourierOrderSummary,
  payload: Record<string, unknown> = {}
) => {
  const res = await api.post(`${getOrderBasePath(order)}/nimbuspost/create`, payload)
  return res?.data
}

export const createDelhiveryShipment = async (
  order: CourierOrderSummary,
  payload: Record<string, unknown> = {}
) => {
  const res = await api.post(`${getOrderBasePath(order)}/delhivery/create`, payload)
  return res?.data
}

export const editDelhiveryShipment = async (
  order: CourierOrderSummary,
  payload: Record<string, unknown> = {}
) => {
  const res = await api.post(`${getOrderBasePath(order)}/delhivery/edit`, payload)
  return res?.data
}

export const cancelDelhiveryShipment = async (
  order: CourierOrderSummary,
  payload: Record<string, unknown> = {}
) => {
  const res = await api.post(`${getOrderBasePath(order)}/delhivery/cancel`, payload)
  return res?.data
}

export const trackDelhiveryShipment = async (
  order: CourierOrderSummary,
  params: Record<string, unknown> = {}
) => {
  const res = await api.get(`${getOrderBasePath(order)}/delhivery/track`, { params })
  return res?.data
}

export const cancelNimbuspostShipment = async (order: CourierOrderSummary) => {
  const res = await api.post(`${getOrderBasePath(order)}/nimbuspost/cancel`)
  return res?.data
}

export const trackNimbuspostShipment = async (order: CourierOrderSummary) => {
  const res = await api.get(`${getOrderBasePath(order)}/nimbuspost/track`)
  return res?.data
}

export const createNimbuspostManifest = async (order: CourierOrderSummary) => {
  const res = await api.post(`${getOrderBasePath(order)}/nimbuspost/manifest`)
  return res?.data
}

export const fetchNimbuspostOrderNdr = async (order: CourierOrderSummary) => {
  const res = await api.get(`${getOrderBasePath(order)}/nimbuspost/ndr`)
  return res?.data
}

export const submitNimbuspostOrderNdr = async (
  order: CourierOrderSummary,
  payload: {
    action: string
    action_data?: Record<string, unknown>
  }
) => {
  const res = await api.post(`${getOrderBasePath(order)}/nimbuspost/ndr`, payload)
  return res?.data
}

export const fetchNimbuspostCouriers = async () => {
  const res = await api.get('/nimbuspost/couriers')
  return res?.data
}

export const fetchNimbuspostNdrList = async (params?: Record<string, unknown>) => {
  const res = await api.get('/nimbuspost/ndr', { params })
  return res?.data
}

export const submitNimbuspostNdrAction = async (payload: unknown) => {
  const res = await api.post('/nimbuspost/ndr/action', payload)
  return res?.data
}

export const fetchDelhiveryB2cServiceability = async (filterCodes: string) => {
  const res = await api.get('/delhivery/serviceability', {
    params: { filter_codes: filterCodes },
  })
  return res?.data
}

export const fetchDelhiveryHeavyServiceability = async (
  pincode: string,
  productType = 'Heavy'
) => {
  const res = await api.get('/delhivery/serviceability/heavy', {
    params: { pincode, product_type: productType },
  })
  return res?.data
}

export const fetchDelhiveryShippingEstimate = async (params: {
  md: 'E' | 'S'
  cgm: string
  o_pin: string
  d_pin: string
  ss: 'Delivered' | 'RTO' | 'DTO'
  pt: 'Pre-paid' | 'COD'
  l?: string
  b?: string
  h?: string
  ipkg_type?: 'box' | 'flyer'
}) => {
  const res = await api.get('/delhivery/shipping-estimate', { params })
  return res?.data
}

export const fetchNimbuspostRateServiceability = async (payload: {
  origin: string
  destination: string
  payment_type: 'prepaid' | 'cod'
  order_amount: string
  weight: string
  length: string
  breadth: string
  height: string
}) => {
  const res = await api.post('/nimbuspost/serviceability/rate', payload)
  return res?.data
}
