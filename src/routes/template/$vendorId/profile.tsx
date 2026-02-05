import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

type Profile = {
  name?: string
  email?: string
  phone?: string
}

type Address = {
  _id: string
  label?: string
  full_name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country?: string
}

type Order = {
  _id: string
  order_number: string
  status: string
  total: number
  createdAt: string
  items?: Array<{
    _id?: string
    product_id?: string
    product_name?: string
    image_url?: string
    variant_attributes?: Record<string, string>
    quantity?: number
    total_price?: number
  }>
}

export const Route = createFileRoute('/template/$vendorId/profile')({
  component: TemplateProfile,
})

function TemplateProfile() {
  const { vendorId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const auth = getTemplateAuth(vendorId)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const formatAttrs = (attrs?: Record<string, string>) => {
    if (!attrs) return ''
    return Object.values(attrs)
      .filter((value) => value)
      .join(' / ')
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const [profileRes, addressRes, ordersRes] = await Promise.all([
          templateApiFetch(vendorId, '/me'),
          templateApiFetch(vendorId, '/addresses'),
          templateApiFetch(vendorId, '/orders'),
        ])
        setProfile(profileRes.user || null)
        setAddresses(addressRes.addresses || [])
        setOrders(ordersRes.orders || [])
      } catch {
        setProfile(null)
        setAddresses([])
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
            Sign in to view your profile.
          </p>
          <a
            href={`/template/${vendorId}/login`}
            className='mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white'
          >
            Go to login
          </a>
        </div>
      ) : loading ? (
        <div className='grid gap-4'>
          <div className='h-32 rounded-2xl bg-slate-200/60 animate-pulse' />
          <div className='h-40 rounded-2xl bg-slate-200/60 animate-pulse' />
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='space-y-6'>
            <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              <h2 className='text-xl font-semibold text-slate-900'>
                Account details
              </h2>
              <div className='mt-4 grid gap-3 text-sm text-slate-600'>
                <div>
                  <span className='font-semibold text-slate-900'>Name:</span>{' '}
                  {profile?.name || 'Not provided'}
                </div>
                <div>
                  <span className='font-semibold text-slate-900'>Email:</span>{' '}
                  {profile?.email || 'Not provided'}
                </div>
                <div>
                  <span className='font-semibold text-slate-900'>Phone:</span>{' '}
                  {profile?.phone || 'Not provided'}
                </div>
              </div>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              <h2 className='text-xl font-semibold text-slate-900'>
                Saved addresses
              </h2>
              <div className='mt-4 space-y-3 text-sm text-slate-600'>
                {addresses.length ? (
                  addresses.map((address) => (
                    <div
                      key={address._id}
                      className='rounded-xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <p className='font-semibold text-slate-900'>
                        {address.label || 'Address'}
                      </p>
                      <p>
                        {address.full_name} - {address.phone}
                      </p>
                      <p>
                        {address.line1}{' '}
                        {address.line2 ? `, ${address.line2}` : ''}
                      </p>
                      <p>
                        {address.city}, {address.state} {address.pincode}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No addresses saved yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-slate-900'>
              Orders history
            </h2>
            <div className='mt-4 max-h-[520px] space-y-4 overflow-y-auto pr-2 text-sm text-slate-600'>
              {orders.length ? (
                orders.map((order) => (
                  <div
                    key={order._id}
                    className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div>
                        <p className='text-xs uppercase tracking-wide text-slate-400'>
                          Order
                        </p>
                        <p className='font-semibold text-slate-900'>
                          {order.order_number}
                        </p>
                      </div>
                      <div className='text-xs text-slate-500'>
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                      <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600'>
                        {order.status}
                      </span>
                      <span className='text-sm font-semibold text-slate-900'>
                        Rs. {order.total.toFixed(2)}
                      </span>
                    </div>

                    <div className='mt-4 space-y-3'>
                      {order.items && order.items.length ? (
                        order.items.map((item, index) =>
                          item.product_id ? (
                            <a
                              key={`${order._id}-${item._id || index}`}
                              href={`/template/${vendorId}/product/${item.product_id}`}
                              className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300'
                            >
                              <div className='flex items-center gap-3'>
                                <img
                                  src={
                                    item.image_url ||
                                    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                                  }
                                  alt={item.product_name || 'Product'}
                                  className='h-12 w-12 rounded-lg object-cover'
                                />
                                <div className='min-w-0'>
                                  <p className='truncate text-sm font-semibold text-slate-900'>
                                    {item.product_name || 'Unnamed product'}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    {formatAttrs(item.variant_attributes) ||
                                      'Default variant'}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    Qty: {item.quantity || 0}
                                  </p>
                                </div>
                              </div>
                              <span className='text-sm font-semibold text-slate-900'>
                                Rs. {(item.total_price || 0).toFixed(2)}
                              </span>
                            </a>
                          ) : (
                            <div
                              key={`${order._id}-${item._id || index}`}
                              className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3'
                            >
                              <div className='flex items-center gap-3'>
                                <img
                                  src={
                                    item.image_url ||
                                    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                                  }
                                  alt={item.product_name || 'Product'}
                                  className='h-12 w-12 rounded-lg object-cover'
                                />
                                <div className='min-w-0'>
                                  <p className='truncate text-sm font-semibold text-slate-900'>
                                    {item.product_name || 'Unnamed product'}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    {formatAttrs(item.variant_attributes) ||
                                      'Default variant'}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    Qty: {item.quantity || 0}
                                  </p>
                                </div>
                              </div>
                              <span className='text-sm font-semibold text-slate-900'>
                                Rs. {(item.total_price || 0).toFixed(2)}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500'>
                          No items found for this order.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500'>
                  No orders yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PreviewChrome>
  )
}


