import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

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

type Cart = {
  items: Array<{
    _id: string
    product_id?: string
    product_name: string
    image_url?: string
    variant_attributes?: Record<string, string>
    quantity: number
    total_price: number
  }>
  subtotal: number
}

export const Route = createFileRoute('/template/$vendorId/checkout')({
  component: TemplateCheckout,
})

function TemplateCheckout() {
  const { vendorId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const auth = getTemplateAuth(vendorId)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [cart, setCart] = useState<Cart | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const formatAttrs = (attrs?: Record<string, string>) => {
    if (!attrs) return ''
    return Object.values(attrs)
      .filter((value) => value)
      .join(' / ')
  }

  const [form, setForm] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  })

  const total = useMemo(() => cart?.subtotal || 0, [cart])

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const [cartRes, addressRes] = await Promise.all([
          templateApiFetch(vendorId, '/cart'),
          templateApiFetch(vendorId, '/addresses'),
        ])
        setCart(cartRes.cart || null)
        setAddresses(addressRes.addresses || [])
        if (addressRes.addresses?.[0]?._id) {
          setSelectedAddress(addressRes.addresses[0]._id)
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load checkout data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [vendorId])

  const handleCreateAddress = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const data = await templateApiFetch(vendorId, '/addresses', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const nextAddresses = [data.address, ...addresses]
      setAddresses(nextAddresses)
      setSelectedAddress(data.address._id)
      setForm({
        label: 'Home',
        full_name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to save address')
    } finally {
      setCreating(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError('Select an address before placing order.')
      return
    }
    setCreating(true)
    setError('')
    try {
      await templateApiFetch(vendorId, '/orders', {
        method: 'POST',
        body: JSON.stringify({
          address_id: selectedAddress,
          payment_method: 'cod',
        }),
      })
      window.location.href = `/template/${vendorId}/orders`
    } catch (err: any) {
      setError(err?.message || 'Failed to place order')
    } finally {
      setCreating(false)
    }
  }

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
            Sign in to continue checkout.
          </p>
          <a
            href={`/template/${vendorId}/login`}
            className='mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white'
          >
            Go to login
          </a>
        </div>
      ) : (
        <div className='grid gap-8 lg:grid-cols-[2fr_1fr]'>
          <div className='space-y-6'>
            <div>
              <h1 className='text-3xl font-semibold text-slate-900'>Checkout</h1>
              <div className='mt-3 h-1 w-20 rounded-full bg-slate-900/80' />
            </div>

            {error && (
              <div className='rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600'>
                {error}
              </div>
            )}

            {loading ? (
              <div className='space-y-4'>
                <div className='h-40 rounded-2xl bg-slate-200/60 animate-pulse' />
                <div className='h-72 rounded-2xl bg-slate-200/60 animate-pulse' />
              </div>
            ) : (
              <>
                <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                  <h2 className='text-lg font-semibold text-slate-900'>
                    Shipping address
                  </h2>
                  <div className='mt-4 space-y-3'>
                    {addresses.map((address) => (
                      <label
                        key={address._id}
                        className={`flex items-start gap-3 rounded-lg border p-4 text-sm transition ${
                          selectedAddress === address._id
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200'
                        }`}
                      >
                        <input
                          type='radio'
                          name='address'
                          checked={selectedAddress === address._id}
                          onChange={() => setSelectedAddress(address._id)}
                          className='mt-1'
                        />
                        <div>
                          <p className='font-semibold text-slate-900'>
                            {address.label || 'Address'}
                          </p>
                          <p className='text-slate-600'>
                            {address.full_name} • {address.phone}
                          </p>
                          <p className='text-slate-500'>
                            {address.line1} {address.line2 && `, ${address.line2}`}
                          </p>
                          <p className='text-slate-500'>
                            {address.city}, {address.state} {address.pincode}
                          </p>
                        </div>
                      </label>
                    ))}
                    {!addresses.length && (
                      <p className='text-sm text-slate-500'>
                        No saved addresses yet.
                      </p>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleCreateAddress}
                  className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
                >
                  <h3 className='text-lg font-semibold text-slate-900'>
                    Add new address
                  </h3>
                  <div className='mt-4 grid gap-4 md:grid-cols-2'>
                    <input
                      value={form.full_name}
                      onChange={(event) =>
                        setForm({ ...form, full_name: event.target.value })
                      }
                      placeholder='Full name'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm'
                      required
                    />
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                      placeholder='Phone'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm'
                      required
                    />
                    <input
                      value={form.line1}
                      onChange={(event) =>
                        setForm({ ...form, line1: event.target.value })
                      }
                      placeholder='Address line 1'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm md:col-span-2'
                      required
                    />
                    <input
                      value={form.line2}
                      onChange={(event) =>
                        setForm({ ...form, line2: event.target.value })
                      }
                      placeholder='Address line 2'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm md:col-span-2'
                    />
                    <input
                      value={form.city}
                      onChange={(event) =>
                        setForm({ ...form, city: event.target.value })
                      }
                      placeholder='City'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm'
                      required
                    />
                    <input
                      value={form.state}
                      onChange={(event) =>
                        setForm({ ...form, state: event.target.value })
                      }
                      placeholder='State'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm'
                      required
                    />
                    <input
                      value={form.pincode}
                      onChange={(event) =>
                        setForm({ ...form, pincode: event.target.value })
                      }
                      placeholder='Pincode'
                      className='rounded-lg border border-slate-200 px-4 py-3 text-sm'
                      required
                    />
                  </div>
                  <button
                    type='submit'
                    disabled={creating}
                    className='mt-4 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60'
                  >
                    {creating ? 'Saving...' : 'Save address'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>
              Order summary
            </h2>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              {cart?.items?.map((item) => (
                <a
                  key={item._id}
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
                    ₹{item.total_price.toFixed(2)}
                  </span>
                </a>
              ))}
              <div className='flex justify-between border-t pt-3 font-semibold text-slate-900'>
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={creating || !cart?.items?.length}
              className='mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-60'
            >
              Place order (COD)
            </button>
          </div>
        </div>
      )}
    </PreviewChrome>
  )
}

