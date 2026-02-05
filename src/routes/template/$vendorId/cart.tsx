import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  getTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

type CartItem = {
  _id: string
  product_id?: string
  product_name: string
  image_url?: string
  variant_attributes?: Record<string, string>
  quantity: number
  unit_price: number
  total_price: number
}

type Cart = {
  items: CartItem[]
  subtotal: number
  total_quantity: number
}

export const Route = createFileRoute('/template/$vendorId/cart')({
  component: TemplateCart,
})

function TemplateCart() {
  const { vendorId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const auth = getTemplateAuth(vendorId)
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [message,] = useState<string | null>(null)
  const formatAttrs = (attrs?: Record<string, string>) => {
    if (!attrs) return ''
    return Object.values(attrs)
      .filter((value) => value)
      .join(' / ')
  }

  const loadCart = async () => {
    try {
      const data = await templateApiFetch(vendorId, '/cart')
      setCart(data.cart || null)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    loadCart()
  }, [vendorId])

  const subtotal = useMemo(() => cart?.subtotal || 0, [cart])

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return
    const data = await templateApiFetch(vendorId, `/cart/item/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    })
    setCart(data.cart || null)
  }

  const removeItem = async (itemId: string) => {
    const data = await templateApiFetch(vendorId, `/cart/item/${itemId}`, {
      method: 'DELETE',
    })
    setCart(data.cart || null)
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
            Sign in to view your cart for this store.
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
            <h1 className='text-3xl font-semibold text-slate-900'>Cart</h1>
            <div className='mt-3 h-1 w-20 rounded-full bg-slate-900/80' />
          </div>

          {message && (
            <div className='rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600'>
              {message}
            </div>
          )}

          {loading ? (
            <div className='grid gap-4'>
              <div className='h-24 rounded-2xl bg-slate-200/60 animate-pulse' />
              <div className='h-24 rounded-2xl bg-slate-200/60 animate-pulse' />
            </div>
          ) : (
            <div className='grid gap-8 lg:grid-cols-[2fr_1fr]'>
              <div className='space-y-4'>
                {(cart?.items || []).length ? (
                  cart?.items?.map((item) => (
                    <div
                      key={item._id}
                      className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                    >
                      <a
                        href={
                          item.product_id
                            ? `/template/${vendorId}/product/${item.product_id}`
                            : '#'
                        }
                        className='flex items-center gap-4'
                      >
                        <img
                          src={
                            item.image_url ||
                            'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                          }
                          alt={item.product_name}
                          className='h-16 w-16 rounded-xl object-cover'
                        />
                        <div className='space-y-1'>
                          <p className='text-sm font-semibold text-slate-900'>
                            {item.product_name}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {formatAttrs(item.variant_attributes) ||
                              'Default variant'}
                          </p>
                          <p className='text-xs text-slate-500'>
                            ₹{item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </a>
                      <div className='flex items-center gap-3'>
                        <div className='flex items-center rounded-lg border border-slate-200 bg-white'>
                          <button
                            type='button'
                            onClick={() =>
                              updateQuantity(
                                item._id,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                            className='h-9 w-9 text-sm font-semibold text-slate-600 hover:bg-slate-50'
                          >
                            -
                          </button>
                          <input
                            type='number'
                            min='1'
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item._id,
                                Number(event.target.value)
                              )
                            }
                            className='h-9 w-12 border-x border-slate-200 text-center text-sm'
                          />
                          <button
                            type='button'
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            className='h-9 w-9 text-sm font-semibold text-slate-600 hover:bg-slate-50'
                          >
                            +
                          </button>
                        </div>
                        <span className='text-sm font-semibold text-slate-900'>
                          ₹{item.total_price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item._id)}
                          className='rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50'
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500'>
                    Your cart is empty.
                  </div>
                )}
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                <h2 className='text-lg font-semibold text-slate-900'>
                  Cart totals
                </h2>
                <div className='mt-4 space-y-3 text-sm text-slate-600'>
                  <div className='flex items-center justify-between'>
                    <span>Subtotal</span>
                    <span className='font-semibold'>
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between border-t pt-3 text-base font-semibold text-slate-900'>
                    <span>Total</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <a
                  href={`/template/${vendorId}/checkout`}
                  className='mt-6 inline-flex w-full justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white'
                >
                  Proceed to checkout
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </PreviewChrome>
  )
}


