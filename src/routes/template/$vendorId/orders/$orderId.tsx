import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

import { toast } from 'sonner'

type OrderItem = {
  _id?: string
  product_id?: string
  product_name: string
  image_url?: string
  variant_attributes?: Record<string, string>
  quantity: number
  unit_price?: number
  total_price?: number
}

type OrderDetail = {
  _id: string
  order_number: string
  status: string
  payment_method?: string
  payment_status?: string
  createdAt?: string
  subtotal?: number
  discount?: number
  shipping_fee?: number
  total?: number
  items: OrderItem[]
  shipping_address?: {
    full_name?: string
    phone?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
}

const API_BASE =
  import.meta.env.VITE_PUBLIC_API_URL

const formatMoney = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`

export const Route = createFileRoute('/template/$vendorId/orders/$orderId')({
  component: TemplateOrderDetail,
})

function TemplateOrderDetail() {
  const { vendorId, orderId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const auth = getTemplateAuth(vendorId)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const totals = useMemo(() => {
    if (!order) return null
    const subtotal = Number(order.subtotal || 0)
    const discount = Number(order.discount || 0)
    const shipping = Number(order.shipping_fee || 0)
    const baseAmount = Math.max(subtotal - discount + shipping, 0)
    const taxAmount = Math.max(Number(order.total || 0) - baseAmount, 0)
    const taxRate = baseAmount ? (taxAmount / baseAmount) * 100 : 0
    return {
      subtotal,
      discount,
      shipping,
      taxAmount,
      taxRate,
      total: Number(order.total || 0),
    }
  }, [order])

  const downloadInvoice = async () => {
    if (!auth?.token) {
      toast.error('Please login to download invoices.')
      return
    }
    try {
      const response = await fetch(
        `${API_BASE}/v1/template-users/orders/${orderId}/invoice`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.message || 'Failed to download invoice')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${order?.order_number || orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice downloaded')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice')
    }
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        const data = await templateApiFetch(vendorId, `/orders/${orderId}`)
        setOrder(data.order || null)
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load order')
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }
    if (orderId) load()
  }, [vendorId, orderId])

  return (
    <PreviewChrome
      vendorId={vendorId}
      logoUrl={template.components.logo}
      vendorName={vendorName || undefined}
      buttonLabel={template.components.home_page?.button_header}
      buttonColor={template.components.home_page?.hero_style?.primaryButtonColor}
      theme={template.components.theme}
      customPages={template.components.custom_pages || []}
      categories={Object.entries(categoryMap).map(([id, name]) => ({
        _id: id,
        name,
      }))}
      subcategories={subcategories}
      active='home'
    >
      {!auth ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
          <h1 className='text-2xl font-semibold text-slate-900'>Login required</h1>
          <p className='mt-2 text-sm text-slate-500'>Sign in to view your order.</p>
          <a
            href={`/template/${vendorId}/login`}
            className='mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white'
          >
            Go to login
          </a>
        </div>
      ) : (
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div>
              <p className='text-sm text-slate-500'>Order details</p>
              <h1 className='text-2xl font-semibold text-slate-900'>
                {order?.order_number ? `Order #${order.order_number}` : 'Order'}
              </h1>
              <p className='text-sm text-slate-500'>
                {order?.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : 'Loading...'}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <a
                href={`/template/${vendorId}/orders`}
                className='inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300'
              >
                Back to orders
              </a>
              <button
                type='button'
                onClick={downloadInvoice}
                disabled={!order}
                className='inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
              >
                Download invoice (PDF)
              </button>
            </div>
          </div>

          {loading && (
            <div className='rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500'>
              Loading order details...
            </div>
          )}

          {!loading && !order && (
            <div className='rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500'>
              Order not found.
            </div>
          )}

          {order && totals && (
            <div className='grid gap-6 lg:grid-cols-[2fr_1fr]'>
              <div className='space-y-6'>
                <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                  <h2 className='text-lg font-semibold text-slate-900'>Items</h2>
                  <div className='mt-4 space-y-4'>
                    {order.items?.map((item) => (
                      <div
                        key={item._id || item.product_id}
                        className='flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center'
                      >
                        <a
                          href={
                            item.product_id
                              ? `/template/${vendorId}/product/${item.product_id}`
                              : '#'
                          }
                          className='relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100'
                        >
                          <img
                            src={
                              item.image_url ||
                              'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                            }
                            alt={item.product_name || 'Product'}
                            className='h-full w-full object-cover'
                          />
                        </a>
                        <div className='flex-1 space-y-1'>
                          <a
                            href={
                              item.product_id
                                ? `/template/${vendorId}/product/${item.product_id}`
                                : '#'
                            }
                            className='text-base font-semibold text-slate-900 hover:text-slate-700'
                          >
                            {item.product_name}
                          </a>
                          <p className='text-xs text-slate-500'>
                            {Object.values(item.variant_attributes || {}).join(' / ') ||
                              'Standard'}
                          </p>
                          <p className='text-xs text-slate-500'>Qty: {item.quantity}</p>
                        </div>
                        <div className='text-right text-sm font-semibold text-slate-900'>
                          {formatMoney(item.total_price || 0)}
                          <p className='text-xs text-slate-500'>
                            {formatMoney(item.unit_price || 0)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                  <h2 className='text-lg font-semibold text-slate-900'>Shipping address</h2>
                  <div className='mt-3 space-y-1 text-sm text-slate-600'>
                    <p className='font-semibold text-slate-900'>
                      {order.shipping_address?.full_name || 'Customer'}
                    </p>
                    <p>{order.shipping_address?.phone}</p>
                    <p>{order.shipping_address?.line1}</p>
                    {order.shipping_address?.line2 && <p>{order.shipping_address.line2}</p>}
                    <p>
                      {order.shipping_address?.city}, {order.shipping_address?.state}{' '}
                      {order.shipping_address?.pincode}
                    </p>
                    <p>{order.shipping_address?.country || 'India'}</p>
                  </div>
                </div>
              </div>

              <div className='space-y-6'>
                <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                  <h2 className='text-lg font-semibold text-slate-900'>Order summary</h2>
                  <div className='mt-4 space-y-3 text-sm text-slate-600'>
                    <div className='flex items-center justify-between'>
                      <span>Status</span>
                      <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
                        {order.status}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Payment</span>
                      <span className='text-slate-900'>
                        {order.payment_method || 'cod'} ({order.payment_status || 'pending'})
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Subtotal</span>
                      <span className='text-slate-900'>{formatMoney(totals.subtotal)}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Discount</span>
                      <span className='text-slate-900'>- {formatMoney(totals.discount)}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Shipping</span>
                      <span className='text-slate-900'>{formatMoney(totals.shipping)}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>GST ({totals.taxRate.toFixed(2)}%)</span>
                      <span className='text-slate-900'>{formatMoney(totals.taxAmount)}</span>
                    </div>
                    <div className='flex items-center justify-between border-t pt-3 text-base font-semibold text-slate-900'>
                      <span>Total</span>
                      <span>{formatMoney(totals.total)}</span>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 text-sm text-indigo-700 shadow-sm'>
                  <h2 className='text-lg font-semibold text-indigo-700'>Invoice details</h2>
                  <p className='mt-3'>Company: Life changing pvt ltd</p>
                  <p>GSTIN: 27AAECL1234F1Z5</p>
                  <p>Support: support@lifechangingpvt.com</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PreviewChrome>
  )
}
