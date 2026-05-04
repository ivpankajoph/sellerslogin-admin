import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CreditCard,
  ImageIcon,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  ShoppingBasket,
  Split,
  Table2,
  Trash2,
  Truck,
  User,
  Utensils,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  foodOpsApi,
  type FoodOpsCashier,
  type FoodOpsPaymentSplit,
  type FoodOpsPosOrder,
  type FoodOpsTable,
  type FoodOpsWaiter,
} from '@/features/food-ops/api'
import {
  FoodModuleShell,
  formatLabel,
  money,
  useFoodOperationsData,
  type FoodOffer,
  type FoodRestaurantProfile,
} from '@/features/food-ops/shared'

type PosCartItem = {
  key: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  portion: 'full' | 'half'
}

const buildCartKey = (menuItemId: string, portion: 'full' | 'half' = 'full') =>
  `${menuItemId}-${portion}`

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100

const getDefaultSplitMethod = (index: number): FoodOpsPaymentSplit['method'] =>
  index === 0 ? 'cash' : index === 1 ? 'upi' : 'card'

const defaultPaymentBreakdown = (total = 0): FoodOpsPaymentSplit[] => [
  { method: 'cash', amount: roundMoney(total) },
  { method: 'upi', amount: 0 },
]

const INITIAL_POS_CARD_COUNT = 8
const MAX_INITIAL_COMBO_COUNT = 4
const MENU_SHOW_MORE_COUNT = 4
const POS_GST_RATE = 0.05
const POS_GST_LABEL = 'GST (5%)'

const getMenuItemImage = (item: {
  image_url?: string
  gallery_images?: string[]
}) =>
  item.image_url || item.gallery_images?.find((image) => image?.trim()) || ''

const getComboItemMenuItem = (
  comboItem: NonNullable<FoodOffer['combo_items']>[number] | undefined,
  menuItems: Array<{
    _id: string
    item_name?: string
    image_url?: string
    gallery_images?: string[]
  }>
) =>
  menuItems.find(
    (item) =>
      item._id === comboItem?.menu_item_id ||
      String(item.item_name || '')
        .trim()
        .toLowerCase() ===
        String(comboItem?.item_name || '')
          .trim()
          .toLowerCase()
  )

const getOfferAmount = (offer: FoodOffer) =>
  Number(
    offer.combo_price ||
      offer.flat_discount ||
      offer.discount_percent ||
      offer.max_discount ||
      0
  )

const readText = (...values: unknown[]) =>
  values
    .map((value) => String(value || '').trim())
    .find(Boolean) || ''

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getRestaurantName = (
  restaurant?: FoodRestaurantProfile | null,
  fallback?: string
) => readText(restaurant?.restaurant_name, fallback, 'Restaurant')

const getRestaurantAddress = (restaurant?: FoodRestaurantProfile | null) =>
  [restaurant?.address, restaurant?.city, restaurant?.state, restaurant?.pincode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')

const formatDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function FoodPosPage({
  isAdvance = false,
}: {
  isAdvance?: boolean
}) {
  const { loading, summary, restaurant, menuItems, offers } =
    useFoodOperationsData()
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [waiters, setWaiters] = useState<FoodOpsWaiter[]>([])
  const [cashiers, setCashiers] = useState<FoodOpsCashier[]>([])
  const [recentOrders, setRecentOrders] = useState<FoodOpsPosOrder[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [printOrder, setPrintOrder] = useState<FoodOpsPosOrder | null>(null)

  const [orderType, setOrderType] = useState(isAdvance ? 'advance' : 'dine-in')
  const [tableId, setTableId] = useState('none')
  const [waiterId, setWaiterId] = useState('none')
  const [cashierId, setCashierId] = useState('none')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [portionMode, setPortionMode] = useState<'full' | 'half'>('full')
  const [visibleMenuCount, setVisibleMenuCount] = useState(0)
  const [recentOrderStatusFilter, setRecentOrderStatusFilter] = useState<
    'paid' | 'unpaid'
  >('unpaid')
  const [paymentBreakdown, setPaymentBreakdown] = useState<
    FoodOpsPaymentSplit[]
  >([])

  const loadOpsData = async () => {
    try {
      const [tablesData, waitersData, cashiersData, ordersData] =
        await Promise.all([
          foodOpsApi.getTables(),
          foodOpsApi.getWaiters(),
          foodOpsApi.getCashiers(),
          foodOpsApi.getPosOrders(),
        ])
      setTables(tablesData)
      setWaiters(waitersData)
      setCashiers(cashiersData)
      setRecentOrders(ordersData)
      if (waiterId === 'none' && waitersData[0]?._id)
        setWaiterId(waitersData[0]._id)
      if (cashierId === 'none' && cashiersData[0]?._id)
        setCashierId(cashiersData[0]._id)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load POS data')
    }
  }

  useEffect(() => {
    void loadOpsData()
  }, [])

  const filteredMenuItems = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return menuItems.filter((item) => {
      if (
        categoryFilter !== 'all' &&
        String(item.category || '') !== categoryFilter
      ) {
        return false
      }
      if (!searchValue) return true
      return (
        String(item.item_name || '')
          .toLowerCase()
          .includes(searchValue) ||
        String(item.category || '')
          .toLowerCase()
          .includes(searchValue)
      )
    })
  }, [categoryFilter, menuItems, search])

  const filteredOffers = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return offers.filter((offer) => {
      if (offer.is_active === false) return false
      const searchable = [
        offer.offer_title,
        offer.offer_type,
        offer.coupon_code,
        offer.free_item_name,
        ...(offer.combo_items || []).map((item) => item.item_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return !searchValue || searchable.includes(searchValue)
    })
  }, [offers, search])

  const visibleOffers = useMemo(
    () => filteredOffers.slice(0, MAX_INITIAL_COMBO_COUNT),
    [filteredOffers]
  )

  const filteredRecentOrders = useMemo(
    () =>
      recentOrders.filter(
        (order) => order.payment_status === recentOrderStatusFilter
      ),
    [recentOrderStatusFilter, recentOrders]
  )

  const recentOrderStatusCounts = useMemo(
    () => ({
      paid: recentOrders.filter((order) => order.payment_status === 'paid')
        .length,
      unpaid: recentOrders.filter((order) => order.payment_status === 'unpaid')
        .length,
    }),
    [recentOrders]
  )

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          menuItems
            .map((item) => String(item.category || '').trim())
            .filter(Boolean)
        )
      ),
    [menuItems]
  )

  const visibleMenuItems = useMemo(
    () =>
      filteredMenuItems.slice(
        0,
        Math.max(0, INITIAL_POS_CARD_COUNT - visibleOffers.length) +
          visibleMenuCount
      ),
    [filteredMenuItems, visibleMenuCount, visibleOffers.length]
  )

  useEffect(() => {
    setVisibleMenuCount(0)
  }, [categoryFilter, portionMode, search])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )
  const gstAmount = useMemo(() => subtotal * POS_GST_RATE, [subtotal])
  const total = useMemo(() => subtotal + gstAmount, [gstAmount, subtotal])

  const splitTotal = useMemo(
    () =>
      paymentBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [paymentBreakdown]
  )

  const balanceSplitBreakdown = useCallback(
    (rows: FoodOpsPaymentSplit[], options?: { editedIndex?: number }) => {
      const nextRows = rows.map((row, index) => ({
        method: row.method || getDefaultSplitMethod(index),
        amount: roundMoney(Number(row.amount || 0)),
      }))

      if (nextRows.length === 1 && options?.editedIndex === 0) {
        nextRows.push({
          method: 'upi',
          amount: Math.max(0, roundMoney(total - nextRows[0].amount)),
        })
      }

      if (nextRows.length < 2) return nextRows

      const balanceIndex =
        options?.editedIndex === nextRows.length - 1
          ? -1
          : nextRows.length - 1

      if (balanceIndex < 0) return nextRows

      const paidBeforeBalance = nextRows.reduce(
        (sum, row, index) =>
          index === balanceIndex ? sum : sum + Number(row.amount || 0),
        0
      )
      nextRows[balanceIndex] = {
        ...nextRows[balanceIndex],
        amount: Math.max(0, roundMoney(total - paidBeforeBalance)),
      }

      return nextRows
    },
    [total]
  )

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value)
    if (value === 'split') {
      setPaymentBreakdown((current) =>
        current.length
          ? balanceSplitBreakdown(current)
          : defaultPaymentBreakdown(total)
      )
    }
  }

  const addPaymentSplit = () => {
    setPaymentBreakdown((current) => {
      if (!current.length) return defaultPaymentBreakdown(total)

      if (current.length === 1) {
        return balanceSplitBreakdown([
          ...current,
          {
            method: 'upi',
            amount: 0,
          },
        ])
      }

      const amountPaid = current.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      )
      return [
        ...current,
        {
          method: getDefaultSplitMethod(current.length),
          amount: Math.max(0, roundMoney(total - amountPaid)),
        },
      ]
    })
  }

  const updatePaymentSplitAmount = (index: number, rawAmount: string) => {
    const amount = roundMoney(Number(rawAmount || 0))
    setPaymentBreakdown((current) =>
      balanceSplitBreakdown(
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, amount } : item
        ),
        { editedIndex: index }
      )
    )
  }

  useEffect(() => {
    if (paymentMethod !== 'split' || !paymentBreakdown.length) return
    setPaymentBreakdown((current) => balanceSplitBreakdown(current))
  }, [balanceSplitBreakdown, paymentBreakdown.length, paymentMethod])

  const addItem = (
    menuItemId: string,
    name: string,
    price: number,
    portion: 'full' | 'half',
    options?: { key?: string; skipMenuItemId?: boolean }
  ) => {
    setCart((current) => {
      const key = options?.key || buildCartKey(menuItemId, portion)
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...current,
        {
          key,
          menuItemId: options?.skipMenuItemId ? '' : menuItemId,
          name,
          quantity: 1,
          price,
          portion,
        },
      ]
    })
  }

  const updateQuantity = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const resetForm = () => {
    setCart([])
    setOrderType(isAdvance ? 'advance' : 'dine-in')
    setTableId('none')
    setPaymentMethod('cash')
    setPaymentStatus('unpaid')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setEditingOrderId(null)
    setPaymentBreakdown([])
  }

  const loadOrderIntoForm = (order: FoodOpsPosOrder) => {
    setEditingOrderId(order._id)
    setOrderType(order.type || 'dine-in')
    setTableId(order.table_id || 'none')
    setWaiterId(order.waiter_id || 'none')
    setCashierId(order.cashier_id || 'none')
    setPaymentMethod(order.payment_method || 'cash')
    setPaymentStatus(order.payment_status || 'unpaid')
    setCustomerName(
      order.customer_details?.name || order.shipping_address?.full_name || ''
    )
    setCustomerPhone(
      order.customer_details?.phone || order.shipping_address?.phone || ''
    )
    setCustomerEmail(order.customer_details?.email || '')
    setPaymentBreakdown(
      order.payment_breakdown?.length
        ? order.payment_breakdown.map((entry) => ({
            method: entry.method,
            amount: Number(entry.amount || 0),
          }))
        : []
    )
    setCart(
      (order.items || []).map((item) => ({
        // POS orders only support full/half plate portions.
        key: buildCartKey(
          item.menu_item_id || `${item.product_name}-${Math.random()}`,
          item.portion === 'half' ? 'half' : 'full'
        ),
        menuItemId: item.menu_item_id || '',
        name: item.product_name || 'Item',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        portion: item.portion === 'half' ? 'half' : 'full',
      }))
    )
  }

  const normalizeSplitPayload = () => {
    if (paymentMethod !== 'split') return []
    return paymentBreakdown
      .map((item) => ({
        method: item.method,
        amount: Number(item.amount || 0),
      }))
      .filter((item) => item.amount > 0)
  }

  const handleSubmit = async () => {
    if (!cart.length) {
      toast.error('Add at least one item to the POS bill')
      return
    }
    if (orderType === 'dine-in' && tableId === 'none') {
      toast.error('Select a table for dine-in order')
      return
    }

    const splitPayload = normalizeSplitPayload()
    if (paymentMethod === 'split' && splitPayload.length < 2) {
      toast.error('Add at least two split payment rows')
      return
    }
    if (paymentMethod === 'split' && Math.abs(splitTotal - total) > 0.01) {
      toast.error('Split payment total must match the bill total')
      return
    }

    const selectedTable = tables.find((item) => item._id === tableId)
    const selectedWaiter = waiters.find((item) => item._id === waiterId)
    const selectedCashier = cashiers.find((item) => item._id === cashierId)

    setSubmitting(true)
    try {
      const payload = {
        type: orderType,
        table_id: tableId !== 'none' ? tableId : undefined,
        table_number: selectedTable?.number || '',
        waiter_id: waiterId !== 'none' ? waiterId : undefined,
        waiter_name: selectedWaiter?.name || '',
        cashier_id: cashierId !== 'none' ? cashierId : undefined,
        cashier_name: selectedCashier?.name || '',
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_breakdown: splitPayload,
        total_amount: total,
        customer_details: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        items: cart.map((item) => ({
          menu_item_id: item.menuItemId || undefined,
          name: item.name,
          quantity: item.quantity,
          portion: item.portion,
          price: item.price,
        })),
      }

      let savedOrder: FoodOpsPosOrder | null = null
      if (editingOrderId) {
        savedOrder = await foodOpsApi.updatePosOrder(editingOrderId, payload)
        toast.success('POS order updated')
      } else {
        savedOrder = await foodOpsApi.createPosOrder(payload)
        toast.success('POS order created')
      }
      resetForm()
      await loadOpsData()
      if (savedOrder) setPrintOrder(savedOrder)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save POS order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePaymentStatus = async (order: FoodOpsPosOrder) => {
    const isPaid = order.payment_status === 'paid'
    const nextPaymentStatus = isPaid ? 'unpaid' : 'paid'
    try {
      await foodOpsApi.updatePosOrder(order._id, {
        payment_status: nextPaymentStatus,
        status: isPaid ? 'pending' : 'completed',
      })
      toast.success(
        isPaid ? 'POS order marked unpaid' : 'POS order marked paid'
      )
      await loadOpsData()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to update POS order'
      )
    }
  }

  const handlePrint = (order: FoodOpsPosOrder) => {
    setPrintOrder(order)
  }

  const printBill = () => {
    if (!printOrder || typeof window === 'undefined') return

    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) {
      toast.error('Unable to open print window')
      return
    }

    const restaurantName = getRestaurantName(
      restaurant,
      summary?.restaurant_name
    )
    const restaurantAddress = getRestaurantAddress(restaurant)
    const restaurantPhone = readText(restaurant?.mobile)
    const restaurantEmail = readText(restaurant?.email)
    const restaurantGst = readText(restaurant?.gst_number)
    const restaurantFssai = readText(restaurant?.fssai_license_number)
    const customerName = readText(
      printOrder.customer_details?.name,
      printOrder.shipping_address?.full_name,
      'Walk-in customer'
    )
    const customerPhone = readText(
      printOrder.customer_details?.phone,
      printOrder.shipping_address?.phone
    )
    const orderDate = formatDateTime(printOrder.createdAt)
    const subtotal = (printOrder.items || []).reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    )
    const gstAmount = subtotal * POS_GST_RATE
    const grandTotal = subtotal + gstAmount

    const rows = (printOrder.items || [])
      .map(
        (item) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.product_name || '')}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;">${Number(item.quantity || 0)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${money(Number(item.price || 0))}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${money(Number(item.price || 0) * Number(item.quantity || 0))}</td>
          </tr>
        `
      )
      .join('')

    popup.document.write(`
      <html>
        <head>
          <title>${escapeHtml(printOrder.order_number)}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
          <div style="max-width:720px;margin:0 auto;">
          <div style="text-align:center;border-bottom:1px dashed #94a3b8;padding-bottom:14px;margin-bottom:14px;">
            <h1 style="margin:0 0 6px;font-size:24px;">${escapeHtml(restaurantName)}</h1>
            ${restaurantAddress ? `<p style="margin:0 0 4px;font-size:13px;">${escapeHtml(restaurantAddress)}</p>` : ''}
            ${restaurantPhone || restaurantEmail ? `<p style="margin:0 0 4px;font-size:13px;">${escapeHtml([restaurantPhone && `Phone: ${restaurantPhone}`, restaurantEmail && `Email: ${restaurantEmail}`].filter(Boolean).join(' | '))}</p>` : ''}
            ${restaurantGst ? `<p style="margin:0 0 4px;font-size:13px;">GSTIN: ${escapeHtml(restaurantGst)}</p>` : ''}
            ${restaurantFssai ? `<p style="margin:0;font-size:13px;">FSSAI: ${escapeHtml(restaurantFssai)}</p>` : ''}
          </div>
          <h2 style="margin:0 0 12px;text-align:center;font-size:18px;">Tax Invoice / POS Bill</h2>
          <table style="width:100%;margin-bottom:14px;font-size:13px;">
            <tbody>
              <tr><td><strong>Bill No:</strong> ${escapeHtml(printOrder.order_number)}</td><td style="text-align:right;"><strong>Date:</strong> ${escapeHtml(orderDate || '-')}</td></tr>
              <tr><td><strong>Customer:</strong> ${escapeHtml(customerName)}</td><td style="text-align:right;"><strong>Type:</strong> ${escapeHtml(formatLabel(printOrder.type))}</td></tr>
              <tr><td><strong>WhatsApp:</strong> ${escapeHtml(customerPhone || '-')}</td><td style="text-align:right;"><strong>Payment:</strong> ${escapeHtml(formatLabel(printOrder.payment_method))} / ${escapeHtml(formatLabel(printOrder.payment_status))}</td></tr>
              ${printOrder.table_number || printOrder.waiter_name || printOrder.cashier_name ? `<tr><td colspan="2"><strong>Service:</strong> ${escapeHtml([printOrder.table_number && `Table ${printOrder.table_number}`, printOrder.waiter_name && `Waiter ${printOrder.waiter_name}`, printOrder.cashier_name && `Cashier ${printOrder.cashier_name}`].filter(Boolean).join(' | '))}</td></tr>` : ''}
            </tbody>
          </table>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding-bottom:8px;border-bottom:1px solid #0f172a;">Item</th>
                <th style="text-align:center; padding-bottom:8px;border-bottom:1px solid #0f172a;">Qty</th>
                <th style="text-align:right; padding-bottom:8px;border-bottom:1px solid #0f172a;">Rate</th>
                <th style="text-align:right; padding-bottom:8px;border-bottom:1px solid #0f172a;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:16px;margin-left:auto;max-width:280px;font-size:14px;">
            <p style="display:flex;justify-content:space-between;margin:0 0 8px;"><span>Subtotal</span><strong>${money(subtotal)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:0 0 8px;"><span>${POS_GST_LABEL}</span><strong>${money(gstAmount)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:12px 0 0;padding-top:10px;border-top:1px solid #0f172a;font-size:18px;"><span>Grand Total</span><strong>${money(grandTotal)}</strong></p>
          </div>
          <p style="margin:24px 0 0;text-align:center;font-size:13px;">Thank you for dining with us.</p>
          </div>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const selectedTable = tables.find((item) => item._id === tableId)
  const selectedWaiter = waiters.find((item) => item._id === waiterId)
  const selectedCashier = cashiers.find((item) => item._id === cashierId)
  const tableLabel =
    tableId === 'none' ? 'No table' : `Table ${selectedTable?.number || ''}`
  const waiterLabel =
    waiterId === 'none' ? 'No waiter' : selectedWaiter?.name || 'Waiter'
  const cashierLabel =
    cashierId === 'none' ? 'No cashier' : selectedCashier?.name || 'Cashier'

  return (
    <FoodModuleShell
      title={isAdvance ? 'New Advance Order' : 'POS Billing'}
      description={
        isAdvance
          ? 'Create an advance restaurant order and keep it ready for billing or fulfilment.'
          : 'Create, edit, split, and print dine-in, takeaway, or delivery bills using your live Food Hub menu.'
      }
      moduleLabel={isAdvance ? 'Advance Order' : 'POS Billing'}
      showModuleCard={false}
    >
      <Card className='overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
        <CardContent className='p-0'>
          <div className='border-b border-slate-200 bg-gradient-to-r from-white via-sky-50/50 to-emerald-50/40 p-4'>
            <div className='grid w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 shadow-inner xl:grid-cols-6'>
              {[
                { value: 'dine-in', label: 'Dine-In', icon: Utensils },
                { value: 'takeaway', label: 'Takeaway', icon: ShoppingBasket },
                { value: 'delivery', label: 'Delivery', icon: Truck },
              ].map((option) => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setOrderType(option.value)}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition ${
                    orderType === option.value
                      ? 'bg-white text-sky-700 shadow-[0_8px_20px_rgba(15,23,42,0.10)] ring-1 ring-sky-100'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <option.icon className='h-4 w-4' />
                  {option.label}
                </button>
              ))}
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger
                  aria-label='Select table'
                  className='h-12 rounded-xl border-0 bg-white px-3 text-sky-700 shadow-[0_8px_20px_rgba(15,23,42,0.10)] ring-1 ring-sky-100 transition hover:bg-white hover:text-sky-800 focus:ring-2 focus:ring-sky-200'
                >
                  <span className='flex min-w-0 flex-1 items-center justify-center gap-2'>
                    <Table2 className='h-4 w-4 shrink-0' />
                    <span className='min-w-0 truncate text-sm font-black text-slate-950'>
                      {tableLabel}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No table</SelectItem>
                  {tables.map((table) => (
                    <SelectItem key={table._id} value={table._id}>
                      Table {table.number} ({formatLabel(table.status)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={waiterId} onValueChange={setWaiterId}>
                <SelectTrigger
                  aria-label='Select waiter'
                  className='h-12 rounded-xl border-0 bg-white px-3 text-emerald-700 shadow-[0_8px_20px_rgba(15,23,42,0.10)] ring-1 ring-emerald-100 transition hover:bg-white hover:text-emerald-800 focus:ring-2 focus:ring-emerald-200'
                >
                  <span className='flex min-w-0 flex-1 items-center justify-center gap-2'>
                    <User className='h-4 w-4 shrink-0' />
                    <span className='min-w-0 truncate text-sm font-black text-slate-950'>
                      {waiterLabel}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No waiter</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter._id} value={waiter._id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cashierId} onValueChange={setCashierId}>
                <SelectTrigger
                  aria-label='Select cashier'
                  className='h-12 rounded-xl border-0 bg-white px-3 text-amber-700 shadow-[0_8px_20px_rgba(15,23,42,0.10)] ring-1 ring-amber-100 transition hover:bg-white hover:text-amber-800 focus:ring-2 focus:ring-amber-200'
                >
                  <span className='flex min-w-0 flex-1 items-center justify-center gap-2'>
                    <Banknote className='h-4 w-4 shrink-0' />
                    <span className='min-w-0 truncate text-sm font-black text-slate-950'>
                      {cashierLabel}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No cashier</SelectItem>
                  {cashiers.map((cashier) => (
                    <SelectItem key={cashier._id} value={cashier._id}>
                      {cashier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid min-h-[720px] bg-slate-50 xl:grid-cols-[minmax(380px,0.78fr)_minmax(0,1.22fr)]'>
            <div className='border-b border-slate-200 bg-white xl:border-r xl:border-b-0'>
              <div className='flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4'>
                <div className='flex items-center gap-3'>
                  <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700'>
                    <ShoppingBasket className='h-5 w-5' />
                  </span>
                  <div>
                    <p className='text-base font-black tracking-tight text-slate-900 uppercase'>
                      Billing Summary
                    </p>
                    <p className='text-xs font-bold text-slate-500'>
                      {editingOrderId
                        ? 'Editing existing POS bill'
                        : 'New restaurant bill'}
                    </p>
                  </div>
                </div>
                {editingOrderId ? (
                  <Button
                    variant='outline'
                    className='rounded-xl'
                    onClick={resetForm}
                  >
                    Cancel Edit
                  </Button>
                ) : null}
              </div>

              <div className='border-b border-slate-100 bg-slate-50/70 px-5 py-5'>
                {cart.length ? (
                  <div className='space-y-3'>
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-black text-slate-900'>
                              {item.name}
                            </p>
                            <p className='mt-1 text-xs text-slate-500'>
                              {formatLabel(item.portion)} plate -{' '}
                              {money(item.price)} each
                            </p>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 rounded-xl text-rose-600'
                            onClick={() =>
                              updateQuantity(item.key, -item.quantity)
                            }
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                        <div className='mt-3 flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-8 w-8 rounded-xl'
                              onClick={() => updateQuantity(item.key, -1)}
                            >
                              -
                            </Button>
                            <span className='w-6 text-center text-sm font-black text-slate-900'>
                              {item.quantity}
                            </span>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-8 w-8 rounded-xl'
                              onClick={() => updateQuantity(item.key, 1)}
                            >
                              +
                            </Button>
                          </div>
                          <p className='text-sm font-black text-slate-900'>
                            {money(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-sm'>
                    <span className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50'>
                      <ShoppingBasket className='h-9 w-9 text-slate-300' />
                    </span>
                    <p className='mt-4 text-xs font-black tracking-[0.2em] text-slate-300 uppercase'>
                      Cart is empty
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Add items from the menu on the right.
                    </p>
                  </div>
                )}
              </div>

              <div className='space-y-5 bg-white px-5 py-5'>
                <div className='space-y-2 border-b border-slate-200 pb-4'>
                  <div className='flex items-center justify-between text-sm font-bold text-slate-500'>
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm font-bold text-slate-500'>
                    <span>{POS_GST_LABEL}</span>
                    <span>{money(gstAmount)}</span>
                  </div>
                  <div className='flex items-center justify-between pt-2'>
                    <span className='text-2xl font-black text-sky-600 uppercase'>
                      Total
                    </span>
                    <span className='text-2xl font-black text-sky-600'>
                      {money(total)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className='mb-3 text-xs font-black tracking-[0.14em] text-slate-400 uppercase'>
                    Payment Method
                  </p>
                  <div className='grid gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4'>
                    {[
                      { value: 'cash', label: 'Cash', icon: Banknote },
                      { value: 'upi', label: 'UPI', icon: WalletCards },
                      { value: 'card', label: 'Card', icon: CreditCard },
                      { value: 'split', label: 'Split', icon: Split },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => handlePaymentMethodChange(option.value)}
                        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black uppercase transition ${
                          paymentMethod === option.value
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-200 hover:bg-white'
                        }`}
                      >
                        <option.icon className='h-4 w-4' />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className='mb-3 text-xs font-black tracking-[0.14em] text-slate-400 uppercase'>
                    Payment Status
                  </p>
                  <Select
                    value={paymentStatus}
                    onValueChange={setPaymentStatus}
                  >
                    <SelectTrigger className='h-12 rounded-xl bg-slate-50 font-bold'>
                      <SelectValue placeholder='Payment status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='unpaid'>Unpaid</SelectItem>
                      <SelectItem value='pending'>Pending</SelectItem>
                      <SelectItem value='paid'>Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'split' ? (
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <div>
                        <p className='text-sm font-black text-slate-900'>
                          Split Payment
                        </p>
                        <p className='text-xs text-slate-500'>
                          Split total must match bill total.
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        className='rounded-xl'
                        onClick={addPaymentSplit}
                      >
                        <Split className='mr-2 h-4 w-4' />
                        Add
                      </Button>
                    </div>
                    <div className='space-y-3'>
                      {paymentBreakdown.map((entry, index) => (
                        <div
                          key={`${entry.method}-${index}`}
                          className='grid gap-3 md:grid-cols-[0.9fr_1fr_auto]'
                        >
                          <Select
                            value={entry.method}
                            onValueChange={(value) =>
                              setPaymentBreakdown((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        method:
                                          value as FoodOpsPaymentSplit['method'],
                                      }
                                    : item
                                )
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='cash'>Cash</SelectItem>
                              <SelectItem value='upi'>UPI</SelectItem>
                              <SelectItem value='card'>Card</SelectItem>
                              <SelectItem value='cod'>COD</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type='number'
                            min='0'
                            step='0.01'
                            placeholder='Amount'
                            value={String(entry.amount || '')}
                            onChange={(event) =>
                              updatePaymentSplitAmount(
                                index,
                                event.target.value
                              )
                            }
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='rounded-xl text-rose-600'
                            onClick={() =>
                              setPaymentBreakdown((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                              )
                            }
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className='mt-3 flex items-center justify-between text-xs font-bold text-slate-600'>
                      <span>Split total</span>
                      <span>{money(splitTotal)}</span>
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className='mb-3 text-xs font-black tracking-[0.14em] text-slate-400 uppercase'>
                    Customer Details
                  </p>
                  <div className='space-y-3'>
                    <div className='relative'>
                      <User className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      <Input
                        className='pl-9'
                        placeholder='Customer name'
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(event.target.value)
                        }
                      />
                    </div>
                    <div className='grid gap-3 md:grid-cols-2'>
                      <div className='relative'>
                        <MessageCircle className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400' />
                        <Input
                          className='pl-9'
                          placeholder='WhatsApp no.'
                          value={customerPhone}
                          onChange={(event) =>
                            setCustomerPhone(event.target.value)
                          }
                        />
                      </div>
                      <div className='relative'>
                        <Mail className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400' />
                        <Input
                          className='pl-9'
                          placeholder='Customer email'
                          value={customerEmail}
                          onChange={(event) =>
                            setCustomerEmail(event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  className='h-14 w-full rounded-2xl bg-sky-600 text-sm font-black tracking-[0.08em] text-white uppercase shadow-[0_14px_30px_rgba(2,132,199,0.25)] hover:bg-sky-700'
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving bill...'
                    : editingOrderId
                      ? 'Update & Preview'
                      : 'Confirm & Preview'}
                </Button>
              </div>
            </div>

            <div className='bg-slate-50 p-4 sm:p-5 lg:p-6'>
              <div className='mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
                <div className='space-y-3'>
                  <div className='grid gap-3 md:grid-cols-[minmax(240px,360px)_220px] md:items-center md:justify-between'>
                    <div className='grid grid-cols-2 rounded-xl bg-slate-100 p-1'>
                      {[
                        { value: 'full', label: 'Full Plate' },
                        { value: 'half', label: 'Half Plate' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() =>
                            setPortionMode(option.value as 'full' | 'half')
                          }
                          className={`h-11 rounded-lg px-4 text-sm font-black uppercase transition ${
                            portionMode === option.value
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-white/70'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger className='h-11 rounded-xl border-slate-200 bg-slate-50 font-bold shadow-sm'>
                        <SelectValue placeholder='Category' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Category</SelectItem>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='relative'>
                    <Search className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                    <Input
                      className='h-12 w-full rounded-xl border-slate-200 bg-slate-50 pr-4 pl-11 text-base font-semibold shadow-sm'
                      placeholder='Search food item or category'
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              {visibleOffers.length ? (
                <div className='mb-5 space-y-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-black tracking-[0.14em] text-slate-400 uppercase'>
                        Combo Offers
                      </p>
                      <p className='text-xs font-semibold text-slate-500'>
                        Active deals available for this bill
                      </p>
                    </div>
                  </div>
                  <div className='grid gap-3 lg:grid-cols-2'>
                    {visibleOffers.map((offer) => {
                      const comboItems = offer.combo_items || []
                      const amount = getOfferAmount(offer)
                      const comboImages = comboItems
                        .slice(0, 3)
                        .map((comboItem) => {
                          const menuItem = getComboItemMenuItem(
                            comboItem,
                            menuItems
                          )
                          return menuItem ? getMenuItemImage(menuItem) : ''
                        })
                      const title =
                        offer.offer_title ||
                        comboItems
                          .map((item) => item.item_name)
                          .filter(Boolean)
                          .join(' + ') ||
                        'Food combo'
                      return (
                        <div
                          key={offer._id}
                          className='rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-4 shadow-sm'
                        >
                          <div className='flex items-start gap-3'>
                            <span className='grid h-16 w-16 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-0.5 shadow-inner'>
                              {comboImages.length ? (
                                comboImages.map((image, index) => (
                                  <span
                                    key={`${offer._id}-combo-image-${index}`}
                                    className={`flex items-center justify-center overflow-hidden bg-emerald-50 ${
                                      comboImages.length === 1
                                        ? 'col-span-2 row-span-2'
                                        : comboImages.length === 2 &&
                                            index === 0
                                          ? 'row-span-2'
                                          : ''
                                    }`}
                                  >
                                    {image ? (
                                      <img
                                        src={image}
                                        alt={`${title} item ${index + 1}`}
                                        className='h-full w-full object-cover'
                                        loading='lazy'
                                      />
                                    ) : (
                                      <ImageIcon className='h-4 w-4 text-emerald-200' />
                                    )}
                                  </span>
                                ))
                              ) : (
                                <span className='col-span-2 row-span-2 flex items-center justify-center bg-emerald-50'>
                                  <ImageIcon className='h-7 w-7 text-emerald-200' />
                                </span>
                              )}
                              {comboItems.length > 3 ? (
                                <span className='flex items-center justify-center bg-emerald-100 text-[11px] font-black text-emerald-800'>
                                  +{comboItems.length - 3}
                                </span>
                              ) : null}
                            </span>
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-start justify-between gap-3'>
                                <div className='min-w-0'>
                                  <p className='line-clamp-1 text-lg font-black text-slate-950'>
                                    {title}
                                  </p>
                                  <p className='mt-1 text-xs font-black tracking-[0.12em] text-emerald-700 uppercase'>
                                    {formatLabel(offer.offer_type || 'offer')}
                                  </p>
                                </div>
                                <span className='shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800'>
                                  Active
                                </span>
                              </div>
                            </div>
                          </div>
                          {comboItems.length ? (
                            <div className='mt-3 flex flex-wrap gap-2'>
                              {comboItems.slice(0, 3).map((item, index) => (
                                <span
                                  key={`${offer._id}-${item.item_name}-${index}`}
                                  className='rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-emerald-100'
                                >
                                  {Number(item.quantity || 1)}x{' '}
                                  {item.item_name || 'Item'}
                                </span>
                              ))}
                              {comboItems.length > 3 ? (
                                <span className='rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-emerald-100'>
                                  +{comboItems.length - 3} more
                                </span>
                              ) : null}
                            </div>
                          ) : offer.free_item_name || offer.coupon_code ? (
                            <p className='mt-3 text-sm font-semibold text-slate-600'>
                              {offer.free_item_name || offer.coupon_code}
                            </p>
                          ) : null}
                          <div className='mt-4 flex items-end justify-between gap-3'>
                            <div>
                              <p className='text-xl font-black text-slate-950'>
                                {offer.offer_type === 'percentage_discount'
                                  ? `${Number(offer.discount_percent || 0)}% Off`
                                  : amount > 0
                                    ? money(amount)
                                    : 'Offer'}
                              </p>
                              <p className='text-xs font-bold text-slate-400'>
                                Combo / offer billing
                              </p>
                            </div>
                            <Button
                              type='button'
                              className='h-10 rounded-full bg-emerald-700 px-5 text-xs font-black text-white hover:bg-emerald-800'
                              onClick={() =>
                                addItem('', title, amount, 'full', {
                                  key: `offer-${offer._id}`,
                                  skipMenuItemId: true,
                                })
                              }
                              disabled={amount <= 0}
                            >
                              <Plus className='mr-2 h-4 w-4' />
                              Add
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-3'>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-44 animate-pulse rounded-2xl bg-white shadow-sm'
                    />
                  ))
                ) : filteredMenuItems.length ? (
                  visibleMenuItems.map((item) => {
                    const selectedVariant = item.variants?.find((variant) =>
                      String(variant.name || '')
                        .toLowerCase()
                        .includes(portionMode)
                    )
                    const fallbackFullVariant = item.variants?.find(
                      (variant) => variant.is_default
                    )
                    const price =
                      portionMode === 'half'
                        ? Number(
                            selectedVariant?.offer_price ||
                              selectedVariant?.price ||
                              0
                          )
                        : Number(
                            selectedVariant?.offer_price ||
                              selectedVariant?.price ||
                              fallbackFullVariant?.offer_price ||
                              fallbackFullVariant?.price ||
                              item.offer_price ||
                              item.price ||
                              0
                          )
                    const canAdd = price > 0
                    const image = getMenuItemImage(item)
                    return (
                      <button
                        key={item._id}
                        type='button'
                        disabled={!canAdd}
                        onClick={() =>
                          addItem(
                            item._id,
                            item.item_name || 'Item',
                            price,
                            portionMode
                          )
                        }
                        className='group min-h-44 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_35px_rgba(15,23,42,0.10)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-slate-200'
                      >
                        <div className='flex min-h-20 items-start gap-4'>
                          <span className='flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-inner'>
                            {image ? (
                              <img
                                src={image}
                                alt={item.item_name || 'Menu item'}
                                className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
                                loading='lazy'
                              />
                            ) : (
                              <ImageIcon className='h-8 w-8 text-slate-300' />
                            )}
                          </span>
                          <div className='min-w-0 flex-1'>
                            <div className='mb-2 flex items-start justify-between gap-2'>
                              <p className='line-clamp-2 text-lg font-black text-slate-900'>
                                {item.item_name}
                              </p>
                              <span className='shrink-0 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 uppercase'>
                                {formatLabel(portionMode)}
                              </span>
                            </div>
                            <p className='truncate text-sm font-semibold text-slate-500'>
                              {item.category || 'Food Item'}
                            </p>
                          </div>
                        </div>
                        <div className='mt-5 flex items-end justify-between gap-3'>
                          <div>
                            <span className='text-xl font-black text-slate-950'>
                              {canAdd ? money(price) : 'Not available'}
                            </span>
                            <p className='mt-1 text-xs font-bold text-slate-400'>
                              {formatLabel(portionMode)} plate
                            </p>
                          </div>
                          <span className='inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-black text-white uppercase transition group-hover:bg-sky-600'>
                            <Plus className='h-4 w-4' />
                            {canAdd ? 'Add' : 'No Half'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className='col-span-full rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500'>
                    No menu items found.
                  </div>
                )}
              </div>
              {filteredMenuItems.length > visibleMenuItems.length ? (
                <div className='mt-5 flex justify-center'>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-11 rounded-full border-sky-200 bg-white px-6 text-sm font-black text-sky-700 shadow-sm hover:bg-sky-50 hover:text-sky-800'
                    onClick={() =>
                      setVisibleMenuCount(
                        (current) => current + MENU_SHOW_MORE_COUNT
                      )
                    }
                  >
                    Show More (
                    {filteredMenuItems.length - visibleMenuItems.length} left)
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='text-xl font-black text-slate-900'>
            Recent POS Orders
          </CardTitle>
          <div className='grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1'>
            {[
              {
                value: 'unpaid',
                label: 'Unpaid',
                count: recentOrderStatusCounts.unpaid,
              },
              {
                value: 'paid',
                label: 'Paid',
                count: recentOrderStatusCounts.paid,
              },
            ].map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() =>
                  setRecentOrderStatusFilter(
                    option.value as 'paid' | 'unpaid'
                  )
                }
                className={`h-10 rounded-xl px-4 text-xs font-black uppercase transition ${
                  recentOrderStatusFilter === option.value
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className='space-y-3 px-6 pb-6'>
          {filteredRecentOrders.length ? (
            filteredRecentOrders.slice(0, 10).map((order) => (
              <div
                key={order._id}
                className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_auto] lg:items-center'
              >
                <div>
                  <p className='text-sm font-black text-slate-900'>
                    {order.order_number}
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {order.customer_details?.name ||
                      order.shipping_address?.full_name ||
                      'Customer'}{' '}
                    • {formatLabel(order.type)}
                  </p>
                  <p className='mt-1 text-[11px] font-semibold text-slate-500'>
                    {formatLabel(order.payment_status)}
                    {order.payment_method
                      ? ` • ${formatLabel(order.payment_method)}`
                      : ''}
                  </p>
                </div>
                <div className='text-sm font-black text-slate-900'>
                  {money(order.total)}
                </div>
                <div className='text-xs font-bold text-slate-500'>
                  {order.payment_method === 'split' &&
                  order.payment_breakdown?.length
                    ? `${order.payment_breakdown.length} splits`
                    : 'Single payment'}
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    className='rounded-xl'
                    onClick={() => loadOrderIntoForm(order)}
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </Button>
                  <Button
                    variant='outline'
                    className='rounded-xl'
                    onClick={() => handlePrint(order)}
                  >
                    <Printer className='mr-2 h-4 w-4' />
                    Print
                  </Button>
                  <Button
                    variant='outline'
                    className='rounded-xl'
                    onClick={() => void handleTogglePaymentStatus(order)}
                  >
                    {order.payment_status === 'paid'
                      ? 'Mark Unpaid'
                      : 'Mark Paid'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
              No {recentOrderStatusFilter} POS orders yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!printOrder}
        onOpenChange={(open) => !open && setPrintOrder(null)}
      >
        <DialogContent className='max-h-[92vh] max-w-2xl overflow-hidden rounded-[24px] border-slate-200 bg-white p-0'>
          <DialogHeader className='border-b border-slate-100 px-5 py-4'>
            <DialogTitle>Print POS Bill</DialogTitle>
            <DialogDescription>
              Review the bill and print a clean customer copy.
            </DialogDescription>
          </DialogHeader>
          {printOrder
            ? (() => {
                const restaurantName = getRestaurantName(
                  restaurant,
                  summary?.restaurant_name
                )
                const restaurantAddress = getRestaurantAddress(restaurant)
                const customerName = readText(
                  printOrder.customer_details?.name,
                  printOrder.shipping_address?.full_name,
                  'Walk-in customer'
                )
                const customerPhone = readText(
                  printOrder.customer_details?.phone,
                  printOrder.shipping_address?.phone
                )
                const subtotal = (printOrder.items || []).reduce(
                  (sum, item) =>
                    sum +
                    Number(item.price || 0) * Number(item.quantity || 0),
                  0
                )
                const gstAmount = subtotal * POS_GST_RATE
                const grandTotal = subtotal + gstAmount

                return (
                  <div className='max-h-[calc(92vh-106px)] space-y-3 overflow-y-auto px-5 py-4'>
                    <div className='rounded-xl border border-slate-200 bg-white p-3 text-center'>
                      <p className='text-lg font-black text-slate-950'>
                        {restaurantName}
                      </p>
                      {restaurantAddress ? (
                        <p className='mt-1 text-xs font-semibold text-slate-500'>
                          {restaurantAddress}
                        </p>
                      ) : null}
                      <div className='mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500'>
                        {restaurant?.mobile ? (
                          <span>Phone: {restaurant.mobile}</span>
                        ) : null}
                        {restaurant?.email ? (
                          <span>Email: {restaurant.email}</span>
                        ) : null}
                        {restaurant?.gst_number ? (
                          <span>GSTIN: {restaurant.gst_number}</span>
                        ) : null}
                        {restaurant?.fssai_license_number ? (
                          <span>FSSAI: {restaurant.fssai_license_number}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                      <div className='grid gap-3 text-sm md:grid-cols-2'>
                        <div>
                          <p className='text-xs font-black tracking-[0.12em] text-slate-400 uppercase'>
                            Bill Details
                          </p>
                          <p className='mt-2 font-black text-slate-900'>
                            {printOrder.order_number}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {formatDateTime(printOrder.createdAt) || '-'}
                          </p>
                        </div>
                        <div className='md:text-right'>
                          <p className='text-xs font-black tracking-[0.12em] text-slate-400 uppercase'>
                            Customer
                          </p>
                          <p className='mt-2 font-black text-slate-900'>
                            {customerName}
                          </p>
                          <p className='text-xs text-slate-500'>
                            WhatsApp: {customerPhone || '-'}
                          </p>
                        </div>
                      </div>
                      <div className='mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3'>
                        <span>Type: {formatLabel(printOrder.type)}</span>
                        <span>
                          Payment: {formatLabel(printOrder.payment_method)}
                        </span>
                        <span>
                          Status: {formatLabel(printOrder.payment_status)}
                        </span>
                      </div>
                    </div>

                    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
                      <div className='grid grid-cols-[minmax(0,1fr)_48px_82px_90px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black tracking-[0.12em] text-slate-500 uppercase'>
                        <span>Item</span>
                        <span className='text-center'>Qty</span>
                        <span className='text-right'>Rate</span>
                        <span className='text-right'>Amount</span>
                      </div>
                      {printOrder.items.map((item, index) => (
                        <div
                          key={`${item.product_name}-${index}`}
                          className='grid grid-cols-[minmax(0,1fr)_48px_82px_90px] gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0'
                        >
                          <span className='min-w-0 font-bold text-slate-700'>
                            {item.product_name}
                          </span>
                          <span className='text-center font-semibold text-slate-600'>
                            {item.quantity || 0}
                          </span>
                          <span className='text-right font-semibold text-slate-600'>
                            {money(Number(item.price || 0))}
                          </span>
                          <span className='text-right font-black text-slate-900'>
                            {money(
                              Number(item.price || 0) *
                                Number(item.quantity || 0)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className='ml-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-3'>
                      <div className='space-y-2 text-sm font-bold text-slate-600'>
                        <div className='flex justify-between gap-3'>
                          <span>Subtotal</span>
                          <span>{money(subtotal)}</span>
                        </div>
                        <div className='flex justify-between gap-3'>
                          <span>{POS_GST_LABEL}</span>
                          <span>{money(gstAmount)}</span>
                        </div>
                        <div className='flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-black text-slate-950'>
                          <span>Grand Total</span>
                          <span>{money(grandTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <p className='text-center text-xs font-semibold text-slate-500'>
                      Thank you for dining with us.
                    </p>
                    <div className='sticky bottom-0 -mx-5 flex justify-end gap-3 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur'>
                      <Button
                        variant='outline'
                        className='rounded-xl'
                        onClick={() => setPrintOrder(null)}
                      >
                        Save
                      </Button>
                      <Button
                        className='rounded-xl bg-slate-900 text-white hover:bg-black'
                        onClick={printBill}
                      >
                        <Printer className='mr-2 h-4 w-4' />
                        Print Bill
                      </Button>
                    </div>
                  </div>
                )
              })()
            : null}
        </DialogContent>
      </Dialog>
    </FoodModuleShell>
  )
}
