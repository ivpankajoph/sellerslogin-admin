import { createFileRoute } from '@tanstack/react-router'
import { LoaderCircle, PackageOpen, RefreshCcw, Search, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createDelhiveryShipment,
  createManualCourierOrder,
  createShadowfaxShipment,
  fetchDelhiveryB2cServiceability,
  fetchDelhiveryShippingEstimate,
  fetchShadowfaxServiceability,
  loadManualCourierOrders,
} from '@/features/courier/api'
import type { CourierOrderSummary } from '@/features/courier/data'
import { formatINR } from '@/lib/currency'

export const Route = createFileRoute('/_authenticated/courier/manual')({
  component: ManualCourierOrdersPage,
})

type ManualForm = {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress1: string
  customerAddress2: string
  customerCity: string
  customerState: string
  customerPincode: string
  pickupName: string
  pickupPhone: string
  pickupEmail: string
  pickupAddress1: string
  pickupAddress2: string
  pickupCity: string
  pickupState: string
  pickupPincode: string
  pickupLocation: string
  pickupUniqueCode: string
  productName: string
  sku: string
  hsnCode: string
  category: string
  quantity: string
  unitPrice: string
  totalAmount: string
  paymentMode: 'Prepaid' | 'COD'
  codAmount: string
  weight: string
  length: string
  width: string
  height: string
  shadowfaxOrderModel: 'marketplace' | 'warehouse'
  promisedDeliveryDate: string
  notes: string
}

type PriceResult = {
  partner: string
  status: string
  price: string
  message: string
}

const defaultForm: ManualForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress1: '',
  customerAddress2: '',
  customerCity: '',
  customerState: '',
  customerPincode: '',
  pickupName: '',
  pickupPhone: '',
  pickupEmail: '',
  pickupAddress1: '',
  pickupAddress2: '',
  pickupCity: '',
  pickupState: '',
  pickupPincode: '',
  pickupLocation: '',
  pickupUniqueCode: '',
  productName: '',
  sku: '',
  hsnCode: '',
  category: '',
  quantity: '1',
  unitPrice: '0',
  totalAmount: '0',
  paymentMode: 'Prepaid',
  codAmount: '0',
  weight: '500',
  length: '10',
  width: '10',
  height: '10',
  shadowfaxOrderModel: 'marketplace',
  promisedDeliveryDate: '',
  notes: '',
}

const readText = (value: unknown) => String(value ?? '').trim()
const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) && next >= 0 ? next : fallback
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const data = (error as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
    return readText(data?.message || data?.error) || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) => (
  <label className='space-y-2'>
    <span className='text-sm font-medium text-foreground'>{label}</span>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>
)

const SectionTitle = ({ title }: { title: string }) => (
  <div className='border-b border-border pb-2'>
    <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
  </div>
)

function ManualCourierOrdersPage() {
  const [form, setForm] = useState<ManualForm>(defaultForm)
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [placing, setPlacing] = useState('')
  const [results, setResults] = useState<PriceResult[]>([])

  const update = <K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'quantity' || key === 'unitPrice') {
        const quantity = Math.max(toNumber(key === 'quantity' ? value : next.quantity, 1), 1)
        const unitPrice = toNumber(key === 'unitPrice' ? value : next.unitPrice, 0)
        next.totalAmount = String(quantity * unitPrice)
        if (next.paymentMode === 'COD') next.codAmount = String(quantity * unitPrice)
      }
      if (key === 'paymentMode' && value === 'Prepaid') next.codAmount = '0'
      if (key === 'paymentMode' && value === 'COD') next.codAmount = next.totalAmount
      return next
    })
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      setOrders(await loadManualCourierOrders())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load manual orders'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const selectedOrder = useMemo(() => orders[0] || null, [orders])

  const buildManualPayload = () => ({
    customer: {
      name: form.customerName,
      phone: form.customerPhone,
      email: form.customerEmail,
      address_line_1: form.customerAddress1,
      address_line_2: form.customerAddress2,
      city: form.customerCity,
      state: form.customerState,
      pincode: form.customerPincode,
      country: 'India',
    },
    item: {
      name: form.productName,
      sku: form.sku,
      hsn_code: form.hsnCode,
      category: form.category,
      quantity: toNumber(form.quantity, 1),
      unit_price: toNumber(form.unitPrice, 0),
      total_price: toNumber(form.totalAmount, 0),
    },
    shipment: {
      payment_mode: form.paymentMode,
      cod_amount: toNumber(form.codAmount, 0),
      total_amount: toNumber(form.totalAmount, 0),
      products_desc: form.productName,
    },
    shipment_overrides: buildShipmentOverrides(),
    notes: form.notes,
  })

  const buildShipmentOverrides = () => ({
    name: form.customerName,
    phone: form.customerPhone,
    add: [form.customerAddress1, form.customerAddress2, form.customerCity, form.customerState, form.customerPincode]
      .filter(Boolean)
      .join(', '),
    line1: form.customerAddress1,
    line2: form.customerAddress2,
    city: form.customerCity,
    state: form.customerState,
    pin: form.customerPincode,
    payment_mode: form.paymentMode,
    cod_amount: toNumber(form.codAmount, 0),
    total_amount: toNumber(form.totalAmount, 0),
    products_desc: form.productName,
    hsn_code: form.hsnCode,
    shipment_length: toNumber(form.length, 10),
    shipment_width: toNumber(form.width, 10),
    shipment_height: toNumber(form.height, 10),
    weight: toNumber(form.weight, 500),
    pickup_location: form.pickupLocation,
    pickup_name: form.pickupName,
    pickup_contact: form.pickupPhone,
    pickup_email: form.pickupEmail,
    pickup_address_line_1: form.pickupAddress1,
    pickup_address_line_2: form.pickupAddress2,
    pickup_city: form.pickupCity,
    pickup_state: form.pickupState,
    pickup_pincode: form.pickupPincode,
    pickup_unique_code: form.pickupUniqueCode,
    rts_name: form.pickupName,
    rts_contact: form.pickupPhone,
    rts_email: form.pickupEmail,
    rts_address_line_1: form.pickupAddress1,
    rts_address_line_2: form.pickupAddress2,
    rts_city: form.pickupCity,
    rts_state: form.pickupState,
    rts_pincode: form.pickupPincode,
    rts_unique_code: form.pickupUniqueCode,
    rto_name: form.pickupName,
    rto_contact_number: form.pickupPhone,
    rto_address: [form.pickupAddress1, form.pickupAddress2].filter(Boolean).join(', '),
    rto_city: form.pickupCity,
    rto_state: form.pickupState,
    rto_pincode: form.pickupPincode,
    actual_weight: toNumber(form.weight, 500),
    volumetric_weight: Math.ceil((toNumber(form.length, 10) * toNumber(form.width, 10) * toNumber(form.height, 10)) / 5),
    product_weight: toNumber(form.weight, 500),
    product_value: toNumber(form.totalAmount, 0),
    order_model: form.shadowfaxOrderModel,
    promised_delivery_date: form.promisedDeliveryDate,
    customer_name: form.customerName,
    customer_contact: form.customerPhone,
    customer_email: form.customerEmail,
    customer_address_line_1: form.customerAddress1,
    customer_address_line_2: form.customerAddress2,
    customer_city: form.customerCity,
    customer_state: form.customerState,
    customer_pincode: form.customerPincode,
  })

  const validateCore = () => {
    const required: Array<[string, string]> = [
      ['Customer name', form.customerName],
      ['Customer phone', form.customerPhone],
      ['Customer address', form.customerAddress1],
      ['Customer city', form.customerCity],
      ['Customer state', form.customerState],
      ['Customer pincode', form.customerPincode],
      ['Pickup name', form.pickupName],
      ['Pickup phone', form.pickupPhone],
      ['Pickup address', form.pickupAddress1],
      ['Pickup city', form.pickupCity],
      ['Pickup state', form.pickupState],
      ['Pickup pincode', form.pickupPincode],
      ['Product name', form.productName],
    ]
    const missing = required.find(([, value]) => !readText(value))
    if (missing) {
      toast.error(`${missing[0]} is required`)
      return false
    }
    return true
  }

  const checkPrice = async () => {
    if (!validateCore()) return
    setChecking(true)
    try {
      const [delhivery, delhiveryEstimate, shadowfax] = await Promise.allSettled([
        fetchDelhiveryB2cServiceability(form.customerPincode),
        fetchDelhiveryShippingEstimate({
          md: 'S',
          cgm: String(toNumber(form.weight, 500)),
          o_pin: form.pickupPincode,
          d_pin: form.customerPincode,
          ss: 'Delivered',
          pt: form.paymentMode === 'COD' ? 'COD' : 'Pre-paid',
          l: form.length,
          b: form.width,
          h: form.height,
          ipkg_type: 'box',
        }),
        fetchShadowfaxServiceability({
          pincodes: form.customerPincode,
          service: 'customer_delivery',
          page: 1,
          count: 10,
        }),
      ])

      const next: PriceResult[] = []
      const delhiveryServiceability =
        delhivery.status === 'fulfilled' ? delhivery.value?.serviceability || {} : {}
      const estimate = delhiveryEstimate.status === 'fulfilled' ? delhiveryEstimate.value?.estimate || {} : {}
      next.push({
        partner: 'Delhivery',
        status: delhivery.status === 'fulfilled' && delhiveryServiceability?.serviceable ? 'Available' : 'Unavailable',
        price: Number(estimate?.estimated_charge || 0) ? formatINR(Number(estimate.estimated_charge)) : 'Price not returned',
        message:
          delhivery.status === 'fulfilled'
            ? `${delhiveryServiceability?.serviceable_count ?? 0} serviceable record(s)`
            : getErrorMessage(delhivery.reason, 'Delhivery check failed'),
      })

      const shadowfaxServiceability =
        shadowfax.status === 'fulfilled' ? shadowfax.value?.serviceability || {} : {}
      next.push({
        partner: 'Shadowfax',
        status: shadowfax.status === 'fulfilled' && shadowfaxServiceability?.serviceable ? 'Available' : 'Unavailable',
        price: 'Serviceability checked',
        message:
          shadowfax.status === 'fulfilled'
            ? `${shadowfaxServiceability?.serviceable_count ?? 0} serviceable record(s)`
            : getErrorMessage(shadowfax.reason, 'Shadowfax check failed'),
      })
      setResults(next)
    } finally {
      setChecking(false)
    }
  }

  const saveManualOrder = async () => {
    if (!validateCore()) return null
    setSaving(true)
    try {
      const response = await createManualCourierOrder(buildManualPayload())
      const order = response.order as CourierOrderSummary | null
      if (order) {
        setOrders((current) => [order, ...current.filter((entry) => entry.id !== order.id)])
      }
      toast.success('Manual order created')
      return order
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create manual order'))
      return null
    } finally {
      setSaving(false)
    }
  }

  const placeShipment = async (partner: 'delhivery' | 'shadowfax', order?: CourierOrderSummary | null) => {
    const target = order || selectedOrder || (await saveManualOrder())
    if (!target) return
    setPlacing(`${partner}:${target.id}`)
    try {
      const payload =
        (target.manualCourier?.shipment_overrides as Record<string, unknown> | undefined) ||
        buildShipmentOverrides()
      if (partner === 'delhivery') {
        await createDelhiveryShipment(target, payload)
      } else {
        await createShadowfaxShipment(target, payload)
      }
      toast.success(`${partner === 'delhivery' ? 'Delhivery' : 'Shadowfax'} shipment created`)
      await loadOrders()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to create ${partner} shipment`))
    } finally {
      setPlacing('')
    }
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4 border border-border bg-card p-5'>
          <div>
            <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Manual Orders</h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>
              Create a courier-ready order, check Delhivery and Shadowfax serviceability, then place delivery from the same screen.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={() => void loadOrders()}>
              <RefreshCcw className='h-4 w-4' />
              Refresh
            </Button>
            <Button className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90' onClick={() => void saveManualOrder()} disabled={saving}>
              {saving ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <PackageOpen className='h-4 w-4' />}
              Create
            </Button>
          </div>
        </div>

        <Card className='rounded-none border-border bg-card shadow-sm'>
          <CardHeader />
          <CardContent className='space-y-8'>
            <SectionTitle title='Customer delivery details' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <Field label='Customer name' value={form.customerName} onChange={(value) => update('customerName', value)} />
              <Field label='Customer phone' value={form.customerPhone} onChange={(value) => update('customerPhone', value)} />
              <Field label='Customer email' value={form.customerEmail} onChange={(value) => update('customerEmail', value)} />
              <Field label='Address line 1' value={form.customerAddress1} onChange={(value) => update('customerAddress1', value)} />
              <Field label='Address line 2' value={form.customerAddress2} onChange={(value) => update('customerAddress2', value)} />
              <Field label='Destination pincode' value={form.customerPincode} onChange={(value) => update('customerPincode', value)} />
              <Field label='City' value={form.customerCity} onChange={(value) => update('customerCity', value)} />
              <Field label='State' value={form.customerState} onChange={(value) => update('customerState', value)} />
            </div>

            <SectionTitle title='Pickup / return details' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <Field label='Pickup name' value={form.pickupName} onChange={(value) => update('pickupName', value)} />
              <Field label='Pickup phone' value={form.pickupPhone} onChange={(value) => update('pickupPhone', value)} />
              <Field label='Pickup email' value={form.pickupEmail} onChange={(value) => update('pickupEmail', value)} />
              <Field label='Pickup address line 1' value={form.pickupAddress1} onChange={(value) => update('pickupAddress1', value)} />
              <Field label='Pickup address line 2' value={form.pickupAddress2} onChange={(value) => update('pickupAddress2', value)} />
              <Field label='Origin pincode' value={form.pickupPincode} onChange={(value) => update('pickupPincode', value)} />
              <Field label='Pickup city' value={form.pickupCity} onChange={(value) => update('pickupCity', value)} />
              <Field label='Pickup state' value={form.pickupState} onChange={(value) => update('pickupState', value)} />
              <Field label='Delhivery pickup location' value={form.pickupLocation} onChange={(value) => update('pickupLocation', value)} />
              <Field label='Shadowfax pickup unique code' value={form.pickupUniqueCode} onChange={(value) => update('pickupUniqueCode', value)} />
            </div>

            <SectionTitle title='Parcel and payment' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <Field label='Product name' value={form.productName} onChange={(value) => update('productName', value)} />
              <Field label='SKU' value={form.sku} onChange={(value) => update('sku', value)} />
              <Field label='HSN code' value={form.hsnCode} onChange={(value) => update('hsnCode', value)} />
              <Field label='Category' value={form.category} onChange={(value) => update('category', value)} />
              <Field label='Quantity' type='number' value={form.quantity} onChange={(value) => update('quantity', value)} />
              <Field label='Unit price' type='number' value={form.unitPrice} onChange={(value) => update('unitPrice', value)} />
              <Field label='Total amount' type='number' value={form.totalAmount} onChange={(value) => update('totalAmount', value)} />
              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Payment mode</span>
                <select
                  className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                  value={form.paymentMode}
                  onChange={(event) => update('paymentMode', event.target.value as ManualForm['paymentMode'])}
                >
                  <option value='Prepaid'>Prepaid</option>
                  <option value='COD'>COD</option>
                </select>
              </label>
              <Field label='COD amount' type='number' value={form.codAmount} onChange={(value) => update('codAmount', value)} />
              <Field label='Weight (gm)' type='number' value={form.weight} onChange={(value) => update('weight', value)} />
              <Field label='Length (cm)' type='number' value={form.length} onChange={(value) => update('length', value)} />
              <Field label='Width (cm)' type='number' value={form.width} onChange={(value) => update('width', value)} />
              <Field label='Height (cm)' type='number' value={form.height} onChange={(value) => update('height', value)} />
              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Shadowfax order model</span>
                <select
                  className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                  value={form.shadowfaxOrderModel}
                  onChange={(event) => update('shadowfaxOrderModel', event.target.value as ManualForm['shadowfaxOrderModel'])}
                >
                  <option value='marketplace'>Marketplace</option>
                  <option value='warehouse'>Warehouse</option>
                </select>
              </label>
              <Field label='Promised delivery date' type='date' value={form.promisedDeliveryDate} onChange={(value) => update('promisedDeliveryDate', value)} />
            </div>
            <label className='space-y-2 block'>
              <span className='text-sm font-medium text-foreground'>Notes</span>
              <Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className='min-h-[88px] rounded-none' />
            </label>

            <div className='flex flex-wrap gap-3'>
              <Button variant='outline' disabled={checking} onClick={() => void checkPrice()}>
                {checking ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
                Check price
              </Button>
              <Button className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90' disabled={saving} onClick={() => void saveManualOrder()}>
                Create manual order
              </Button>
              <Button variant='outline' disabled={Boolean(placing)} onClick={() => void placeShipment('delhivery')}>
                <Send className='h-4 w-4' />
                Create Delhivery shipment
              </Button>
              <Button variant='outline' disabled={Boolean(placing)} onClick={() => void placeShipment('shadowfax')}>
                <Send className='h-4 w-4' />
                Create Shadowfax shipment
              </Button>
            </div>

            {results.length ? (
              <div className='grid gap-4 md:grid-cols-2'>
                {results.map((result) => (
                  <div key={result.partner} className='rounded-none border border-border bg-muted/30 p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <p className='font-semibold text-foreground'>{result.partner}</p>
                      <Badge className={result.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className='mt-3 text-2xl font-bold text-foreground'>{result.price}</p>
                    <p className='mt-2 text-sm text-muted-foreground'>{result.message}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-none border-border bg-card shadow-sm'>
          <CardHeader>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-xl font-semibold text-foreground'>Manual order list</h2>
              <Button size='sm' className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90' onClick={() => void saveManualOrder()} disabled={saving}>
                Create
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='rounded-none border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>Loading manual orders...</div>
            ) : !orders.length ? (
              <div className='rounded-none border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground'>No manual orders created yet.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[920px] text-left text-sm'>
                  <thead className='border-b border-border bg-muted/40 text-muted-foreground'>
                    <tr>
                      <th className='px-4 py-3'>Order</th>
                      <th className='px-4 py-3'>Customer</th>
                      <th className='px-4 py-3'>Destination</th>
                      <th className='px-4 py-3'>Amount</th>
                      <th className='px-4 py-3'>Courier</th>
                      <th className='px-4 py-3 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className='border-b border-border align-top'>
                        <td className='px-4 py-4 font-semibold text-foreground'>{order.orderNumber}</td>
                        <td className='px-4 py-4'>
                          <p className='font-medium text-foreground'>{order.customerName}</p>
                          <p className='text-muted-foreground'>{order.customerPhone}</p>
                        </td>
                        <td className='px-4 py-4 text-muted-foreground'>{order.city}, {order.state}, {order.pincode}</td>
                        <td className='px-4 py-4 text-muted-foreground'>{formatINR(order.total)}</td>
                        <td className='px-4 py-4 text-muted-foreground'>
                          {order.delhivery?.waybill || order.shadowfax?.tracking_number || order.deliveryProvider || 'Not placed'}
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex justify-end gap-2'>
                            <Button size='sm' variant='outline' disabled={Boolean(placing)} onClick={() => void placeShipment('delhivery', order)}>
                              Delhivery
                            </Button>
                            <Button size='sm' variant='outline' disabled={Boolean(placing)} onClick={() => void placeShipment('shadowfax', order)}>
                              Shadowfax
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
