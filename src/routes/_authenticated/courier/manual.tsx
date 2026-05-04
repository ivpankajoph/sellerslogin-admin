import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, LoaderCircle, PackageOpen, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createManualCourierOrder,
  fetchCourierCategoryOptions,
  fetchDelhiveryWarehouses,
  type CourierCategoryOption,
  type DelhiveryWarehouse,
} from '@/features/courier/api'
import {
  resolveVendorProfile,
  resolveVendorProfilePincode,
} from '@/features/courier/vendor-profile'
import type { AppDispatch, RootState } from '@/store'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'

export const Route = createFileRoute('/_authenticated/courier/manual')({
  component: ManualCourierOrderCreatePage,
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
  productName: string
  category: string
  quantity: string
  weight: string
  length: string
  width: string
  height: string
  notes: string
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
  productName: '',
  category: '',
  quantity: '1',
  weight: '500',
  length: '10',
  width: '10',
  height: '10',
  notes: '',
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

const readText = (value: unknown) => String(value ?? '').trim()
const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) && next >= 0 ? next : fallback
}

const cleanPincode = (value: string) => value.replace(/\D/g, '').slice(0, 6)

const makeSlugPart = (value: string, fallback: string) => {
  const next = readText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8)
  return next || fallback
}

const generateSku = (productName: string, category: string, seed: string) =>
  `MAN-${makeSlugPart(category, 'GEN')}-${makeSlugPart(productName, 'ITEM')}-${seed}`

const generateHsnCode = (category: string) => {
  const key = readText(category).toLowerCase()
  if (key.includes('book')) return '490110'
  if (key.includes('cloth') || key.includes('fashion') || key.includes('apparel')) return '620990'
  if (key.includes('elect')) return '854370'
  if (key.includes('cosmetic') || key.includes('beauty')) return '330499'
  if (key.includes('food') || key.includes('grocery')) return '210690'
  if (key.includes('toy')) return '950300'
  if (key.includes('jewel')) return '711790'
  if (key.includes('home') || key.includes('kitchen')) return '392410'
  return '000000'
}

const warehouseText = (warehouse: DelhiveryWarehouse | null | undefined, key: keyof DelhiveryWarehouse) =>
  readText(warehouse?.[key])

const normalizeStateName = (value: string) => {
  const text = readText(value)
  return INDIAN_STATES.find((state) => state.toLowerCase() === text.toLowerCase()) || text
}

const fetchPincodeLocation = async (pincode: string) => {
  const pin = cleanPincode(pincode)
  if (pin.length !== 6) return null

  const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
  if (!response.ok) return null
  const payload = await response.json()
  const record = Array.isArray(payload?.[0]?.PostOffice) ? payload[0].PostOffice[0] : null
  if (!record) return null

  return {
    city: readText(record.Block) || readText(record.District) || readText(record.Name),
    state: normalizeStateName(readText(record.State)),
  }
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
  onBlur,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  onBlur?: () => void
  readOnly?: boolean
}) => (
  <label className='space-y-2'>
    <span className='text-sm font-medium text-foreground'>{label}</span>
    <Input
      type={type}
      value={value}
      onBlur={onBlur}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  </label>
)

const StateField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <label className='space-y-2'>
    <span className='text-sm font-medium text-foreground'>{label}</span>
    <select
      className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value=''>Select state</option>
      {INDIAN_STATES.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>
  </label>
)

const SectionTitle = ({ title }: { title: string }) => (
  <div className='border-b border-border pb-2'>
    <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
  </div>
)

function ManualCourierOrderCreatePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [form, setForm] = useState<ManualForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const user = useSelector((state: RootState) => state.auth?.user)
  const vendorProfileState = useSelector((state: RootState) => state.vendorprofile)
  const vendorProfile = useMemo(
    () => resolveVendorProfile(vendorProfileState),
    [vendorProfileState]
  )
  const [lookupTarget, setLookupTarget] = useState<'customer' | ''>('')
  const [categories, setCategories] = useState<CourierCategoryOption[]>([])
  const [manualCategory, setManualCategory] = useState(false)
  const [warehouses, setWarehouses] = useState<DelhiveryWarehouse[]>([])
  const [orderSeed] = useState(() => Date.now().toString(36).slice(-5).toUpperCase())
  const categoryInputRef = useRef<HTMLInputElement | null>(null)

  const primaryWarehouse = warehouses[0] || null
  const isVendor = String(user?.role || '').toLowerCase() === 'vendor'
  const generatedSku = useMemo(
    () => generateSku(form.productName, form.category, orderSeed),
    [form.category, form.productName, orderSeed]
  )
  const generatedHsnCode = useMemo(() => generateHsnCode(form.category), [form.category])

  useEffect(() => {
    if (!isVendor || vendorProfile || vendorProfileState?.loading) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorProfile, vendorProfileState?.loading])

  useEffect(() => {
    let cancelled = false
    const loadFormData = async () => {
      const [categoryResult, warehouseResult] = await Promise.allSettled([
        fetchCourierCategoryOptions(),
        fetchDelhiveryWarehouses(),
      ])
      if (cancelled) return
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
      if (warehouseResult.status === 'fulfilled') setWarehouses(warehouseResult.value.warehouses || [])
    }

    void loadFormData()
    return () => {
      cancelled = true
    }
  }, [])

  const update = <K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: key === 'customerPincode' ? cleanPincode(String(value)) : value,
      }
      return next
    })
  }

  const updatePincode = (target: 'customer', value: string) => {
    const pin = cleanPincode(value)
    update('customerPincode', pin)
    if (pin.length === 6) {
      void hydratePincode(target, pin)
    }
  }

  const hydratePincode = async (target: 'customer', pincode: string) => {
    const pin = cleanPincode(pincode)
    if (pin.length !== 6) return

    setLookupTarget(target)
    try {
      const location = await fetchPincodeLocation(pin)
      if (!location) return
      setForm((current) => ({
        ...current,
        customerPincode: pin,
        customerCity: current.customerCity || location.city,
        customerState: current.customerState || location.state,
      }))
    } catch {
      toast.error('Could not fetch city for this pincode')
    } finally {
      setLookupTarget('')
    }
  }

  const pickup = {
    name:
      warehouseText(primaryWarehouse, 'registered_name') ||
      warehouseText(primaryWarehouse, 'name') ||
      readText(user?.name || user?.business_name || user?.company_name) ||
      'Warehouse pickup',
    phone: warehouseText(primaryWarehouse, 'phone') || readText(user?.phone),
    email: warehouseText(primaryWarehouse, 'email') || readText(user?.email),
    address:
      warehouseText(primaryWarehouse, 'address') ||
      readText(user?.address || user?.business_address),
    city: warehouseText(primaryWarehouse, 'city') || readText(user?.city),
    state:
      warehouseText(primaryWarehouse, 'return_state') ||
      readText(user?.state),
    pincode:
      cleanPincode(warehouseText(primaryWarehouse, 'pin')) ||
      cleanPincode(warehouseText(primaryWarehouse, 'return_pin')) ||
      cleanPincode(resolveVendorProfilePincode(user, vendorProfile)),
  }

  const buildProviderFields = () => {
    const pickupLocation = [pickup.name, pickup.pincode].filter(Boolean).join('-') || 'Warehouse pickup'
    const pickupUniqueCode = [pickup.pincode, pickup.phone.slice(-4)].filter(Boolean).join('-') || pickupLocation
    const totalAmount = 0

    return {
      pickup_location: pickupLocation,
      pickup_unique_code: pickupUniqueCode,
      order_model: 'marketplace',
      payment_mode: 'Prepaid',
      cod_amount: 0,
      total_amount: totalAmount,
    }
  }

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
    ...buildProviderFields(),
    products_desc: form.productName,
    hsn_code: generatedHsnCode,
    shipment_length: toNumber(form.length, 10),
    shipment_width: toNumber(form.width, 10),
    shipment_height: toNumber(form.height, 10),
    weight: toNumber(form.weight, 500),
    pickup_name: pickup.name,
    pickup_contact: pickup.phone,
    pickup_email: pickup.email,
    pickup_address_line_1: pickup.address,
    pickup_address_line_2: '',
    pickup_city: pickup.city,
    pickup_state: pickup.state,
    pickup_pincode: pickup.pincode,
    rts_name: pickup.name,
    rts_contact: pickup.phone,
    rts_email: pickup.email,
    rts_address_line_1: pickup.address,
    rts_address_line_2: '',
    rts_city: pickup.city,
    rts_state: pickup.state,
    rts_pincode: pickup.pincode,
    rts_unique_code: buildProviderFields().pickup_unique_code,
    rto_name: pickup.name,
    rto_contact_number: pickup.phone,
    rto_address: pickup.address,
    rto_city: pickup.city,
    rto_state: pickup.state,
    rto_pincode: pickup.pincode,
    actual_weight: toNumber(form.weight, 500),
    volumetric_weight: Math.ceil((toNumber(form.length, 10) * toNumber(form.width, 10) * toNumber(form.height, 10)) / 5),
    product_weight: toNumber(form.weight, 500),
    product_value: 0,
    customer_name: form.customerName,
    customer_contact: form.customerPhone,
    customer_email: form.customerEmail,
    customer_address_line_1: form.customerAddress1,
    customer_address_line_2: form.customerAddress2,
    customer_city: form.customerCity,
    customer_state: form.customerState,
    customer_pincode: form.customerPincode,
  })

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
      sku: generatedSku,
      hsn_code: generatedHsnCode,
      category: form.category,
      quantity: toNumber(form.quantity, 1),
      unit_price: 0,
      total_price: 0,
    },
    shipment: {
      payment_mode: 'Prepaid',
      cod_amount: 0,
      total_amount: 0,
      products_desc: form.productName,
      parcel: {
        weight: toNumber(form.weight, 500),
        length: toNumber(form.length, 10),
        width: toNumber(form.width, 10),
        height: toNumber(form.height, 10),
      },
    },
    shipment_overrides: buildShipmentOverrides(),
    notes: form.notes,
  })

  const validateCore = () => {
    const required: Array<[string, string]> = [
      ['Customer name', form.customerName],
      ['Customer phone', form.customerPhone],
      ['Customer address', form.customerAddress1],
      ['Customer city', form.customerCity],
      ['Customer state', form.customerState],
      ['Customer pincode', form.customerPincode],
      ['Product name', form.productName],
      ['Category', form.category],
    ]
    const missing = required.find(([, value]) => !readText(value))
    if (missing) {
      toast.error(`${missing[0]} is required`)
      return false
    }
    return true
  }

  const saveManualOrder = async () => {
    if (!validateCore()) return
    setSaving(true)
    try {
      await createManualCourierOrder(buildManualPayload())
      toast.success('Manual order created')
      setForm(defaultForm)
      void navigate({ to: '/courier/manual-list' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create manual order'))
    } finally {
      setSaving(false)
    }
  }

  const startManualCategory = () => {
    setManualCategory(true)
    requestAnimationFrame(() => categoryInputRef.current?.focus())
  }

  const useCategoryList = () => {
    setManualCategory(false)
    requestAnimationFrame(() => categoryInputRef.current?.focus())
  }

  const addManualCategory = () => {
    const category = readText(form.category)
    if (!category) {
      toast.error('Enter a category name')
      requestAnimationFrame(() => categoryInputRef.current?.focus())
      return
    }
    update('category', category)
    setManualCategory(false)
  }

  return (
    <>
      <div className='space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-4 border border-border bg-card p-5'>
          <div>
            <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Create Manual Order</h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>
              Create a courier-neutral manual order. Pricing and shipment options are handled from the order list.
            </p>
          </div>
          <Button variant='outline' onClick={() => void navigate({ to: '/courier/manual-list' })}>
            Manual Order List
            <ArrowUpRight className='h-4 w-4' />
          </Button>
        </div>

        <Card className='rounded-none border-border bg-card shadow-sm'>
          <CardContent className='space-y-8 pt-6'>
            <SectionTitle title='Customer delivery details' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <Field label='Customer name' value={form.customerName} onChange={(value) => update('customerName', value)} />
              <Field label='Customer phone' value={form.customerPhone} onChange={(value) => update('customerPhone', value)} />
              <Field label='Customer email (optional)' value={form.customerEmail} onChange={(value) => update('customerEmail', value)} />
              <Field label='Address line 1' value={form.customerAddress1} onChange={(value) => update('customerAddress1', value)} />
              <Field label='Address line 2' value={form.customerAddress2} onChange={(value) => update('customerAddress2', value)} />
              <Field label={lookupTarget === 'customer' ? 'Destination pincode (fetching...)' : 'Destination pincode'} value={form.customerPincode} onChange={(value) => updatePincode('customer', value)} onBlur={() => void hydratePincode('customer', form.customerPincode)} />
              <Field label='City' value={form.customerCity} onChange={(value) => update('customerCity', value)} />
              <StateField label='State' value={form.customerState} onChange={(value) => update('customerState', value)} />
            </div>

            <SectionTitle title='Parcel details' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <Field label='Product name' value={form.productName} onChange={(value) => update('productName', value)} />
              <Field label='SKU (auto generated)' value={generatedSku} onChange={() => undefined} readOnly />
              <Field label='HSN code (auto generated)' value={generatedHsnCode} onChange={() => undefined} readOnly />
              <label className='space-y-2 xl:col-span-2'>
                <span className='flex items-center justify-between gap-3 text-sm font-medium text-foreground'>
                  <span>Category</span>
                  {manualCategory ? (
                    <button
                      type='button'
                      className='text-xs font-semibold text-primary underline-offset-4 hover:underline'
                      onClick={useCategoryList}
                    >
                      Choose from list
                    </button>
                  ) : null}
                </span>
                {manualCategory ? (
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Input
                      ref={categoryInputRef}
                      value={form.category}
                      onChange={(event) => update('category', event.target.value)}
                      placeholder='Enter new category name'
                    />
                    <Button
                      type='button'
                      className='h-11 shrink-0 rounded-none'
                      onClick={addManualCategory}
                    >
                      <Plus className='h-4 w-4' />
                      Add category
                    </Button>
                  </div>
                ) : (
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <div className='min-w-0 flex-1'>
                      <Input
                        ref={categoryInputRef}
                        list='manual-order-category-options'
                        value={form.category}
                        onChange={(event) => update('category', event.target.value)}
                        placeholder='Search or select category'
                      />
                      <datalist id='manual-order-category-options'>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name} />
                        ))}
                      </datalist>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-11 shrink-0 rounded-none border-primary px-4 text-primary hover:bg-primary hover:text-primary-foreground'
                      onClick={startManualCategory}
                    >
                      <Plus className='h-4 w-4' />
                      Add custom
                    </Button>
                  </div>
                )}
              </label>
              <Field label='Quantity' type='number' value={form.quantity} onChange={(value) => update('quantity', value)} />
              <Field label='Weight (gm)' type='number' value={form.weight} onChange={(value) => update('weight', value)} />
              <Field label='Length (cm)' type='number' value={form.length} onChange={(value) => update('length', value)} />
              <Field label='Width (cm)' type='number' value={form.width} onChange={(value) => update('width', value)} />
              <Field label='Height (cm)' type='number' value={form.height} onChange={(value) => update('height', value)} />
            </div>
            <label className='block space-y-2'>
              <span className='text-sm font-medium text-foreground'>Notes</span>
              <Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className='min-h-[88px] rounded-none' />
            </label>

            <div className='flex justify-end'>
              <Button className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90' disabled={saving} onClick={() => void saveManualOrder()}>
                {saving ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <PackageOpen className='h-4 w-4' />}
                Create manual order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
