import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

import { toast } from 'sonner'

type Order = {
  _id: string
  order_number: string
  status: string
  total: number
  createdAt: string
  payment_method?: string
  items: Array<{
    _id?: string
    product_id?: string
    product_name: string
    image_url?: string
    variant_attributes?: Record<string, string>
    quantity: number
    total_price?: number
  }>
}

const API_BASE = import.meta.env.VITE_PUBLIC_API_URL
  

const formatMoney = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`

export const Route = createFileRoute('/template/$vendorId/orders')({
  component: TemplateOrders,
})

function TemplateOrders() {
  const { vendorId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const auth = getTemplateAuth(vendorId)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const isAuthenticated = Boolean(auth?.token)
  const formatAttrs = (attrs?: Record<string, string>) => {
    if (!attrs) return ''
    return Object.values(attrs)
      .filter((value) => value)
      .join(' / ')
  }
  const downloadInvoice = async (orderId: string, orderNumber?: string) => {
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
      link.download = `invoice-${orderNumber || orderId}.pdf`
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
        const data = await templateApiFetch(vendorId, '/orders')
        setOrders(data.orders || [])
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [vendorId])

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
          <h1 className='text-2xl font-semibold text-slate-900'>
            Login required
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Sign in to view your orders.
          </p>
          <a
            href={`/template/${vendorId}/login`}
            className='mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white'
          >
            Go to login
          </a>
        </div>
      ) : (
        <div className='space-y-6'>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>My Orders</h1>
            <div className='mt-3 h-1 w-20 rounded-full bg-slate-900/80' />
          </div>

          {loading ? (
            <div className='space-y-4'>
              <div className='h-24 rounded-2xl bg-slate-200/60 animate-pulse' />
              <div className='h-24 rounded-2xl bg-slate-200/60 animate-pulse' />
            </div>
          ) : orders.length ? (
            <div className='space-y-4'>
              {orders.map((order) => (
                <div
                  key={order._id}
                  className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
                >
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm text-slate-500'>Order</p>
                      <p className='text-lg font-semibold text-slate-900'>
                        {order.order_number}
                      </p>
                    </div>
                    <div className='text-sm text-slate-500'>
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                    <div className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600'>
                      {order.status}
                    </div>
                    <div className='text-lg font-semibold text-slate-900'>
                      {formatMoney(order.total)}
                    </div>
                  </div>
                  <div className='mt-4 grid gap-3 text-sm text-slate-600'>
                    {order.items.map((item, index) => (
                      <a
                        key={`${order._id}-${item._id || index}`}
                        href={
                          item.product_id
                            ? `/template/${vendorId}/product/${item.product_id}`
                            : '#'
                        }
                        className='flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300'
                      >
                        <div className='flex items-start gap-3'>
                          <img
                            src={
                              item.image_url ||
                              'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                            }
                            alt={item.product_name}
                            className='h-12 w-12 rounded-lg object-cover'
                          />
                          <div className='min-w-0'>
                            <p className='text-sm font-semibold text-slate-900'>
                              {item.product_name}
                            </p>
                            <p className='text-xs text-slate-500'>
                              {formatAttrs(item.variant_attributes) || 'Default variant'}
                            </p>
                            <p className='text-xs text-slate-500'>Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className='text-sm font-semibold text-slate-900'>
                          {formatMoney(item.total_price || 0)}
                        </span>
                      </a>
                    ))}
                  </div>
                  <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm'>
                    <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      {order.items?.length || 0} items
                    </span>
                    <div className='flex flex-wrap gap-2'>
                      <a
                        href={`/template/${vendorId}/orders/${order._id}`}
                        className='inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300'
                      >
                        View details
                      </a>
                      <button
                        type='button'
                        onClick={() => downloadInvoice(order._id, order.order_number)}
                        className='inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                        disabled={!isAuthenticated}
                      >
                        Download invoice
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500'>
              No orders yet.
            </div>
          )}
        </div>
      )}
    </PreviewChrome>
  )
}

