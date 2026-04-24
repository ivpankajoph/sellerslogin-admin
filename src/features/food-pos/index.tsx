import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Printer, ShoppingBasket, Split, Trash2 } from 'lucide-react'
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
  FoodModuleShell,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'
import {
  foodOpsApi,
  type FoodOpsCashier,
  type FoodOpsPaymentSplit,
  type FoodOpsPosOrder,
  type FoodOpsTable,
  type FoodOpsWaiter,
} from '@/features/food-ops/api'

type PosCartItem = {
  key: string
  menuItemId: string
  name: string
  quantity: number
  price: number
}

const buildCartKey = (menuItemId: string) => `${menuItemId}`

const defaultPaymentSplit = (): FoodOpsPaymentSplit => ({ method: 'cash', amount: 0 })

export default function FoodPosPage() {
  const { loading, menuItems } = useFoodOperationsData()
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [waiters, setWaiters] = useState<FoodOpsWaiter[]>([])
  const [cashiers, setCashiers] = useState<FoodOpsCashier[]>([])
  const [recentOrders, setRecentOrders] = useState<FoodOpsPosOrder[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [printOrder, setPrintOrder] = useState<FoodOpsPosOrder | null>(null)

  const [orderType, setOrderType] = useState('dine-in')
  const [tableId, setTableId] = useState('none')
  const [waiterId, setWaiterId] = useState('none')
  const [cashierId, setCashierId] = useState('none')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [search, setSearch] = useState('')
  const [paymentBreakdown, setPaymentBreakdown] = useState<FoodOpsPaymentSplit[]>([])

  const loadOpsData = async () => {
    try {
      const [tablesData, waitersData, cashiersData, ordersData] = await Promise.all([
        foodOpsApi.getTables(),
        foodOpsApi.getWaiters(),
        foodOpsApi.getCashiers(),
        foodOpsApi.getPosOrders(),
      ])
      setTables(tablesData)
      setWaiters(waitersData)
      setCashiers(cashiersData)
      setRecentOrders(ordersData)
      if (waiterId === 'none' && waitersData[0]?._id) setWaiterId(waitersData[0]._id)
      if (cashierId === 'none' && cashiersData[0]?._id) setCashierId(cashiersData[0]._id)
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
      if (!searchValue) return true
      return (
        String(item.item_name || '').toLowerCase().includes(searchValue) ||
        String(item.category || '').toLowerCase().includes(searchValue)
      )
    })
  }, [menuItems, search])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const splitTotal = useMemo(
    () => paymentBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [paymentBreakdown]
  )

  const addItem = (menuItemId: string, name: string, price: number) => {
    setCart((current) => {
      const key = buildCartKey(menuItemId)
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...current, { key, menuItemId, name, quantity: 1, price }]
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
    setOrderType('dine-in')
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
        key: buildCartKey(item.menu_item_id || `${item.product_name}-${Math.random()}`),
        menuItemId: item.menu_item_id || '',
        name: item.product_name || 'Item',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
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
          portion: 'full',
          price: item.price,
        })),
      }

      if (editingOrderId) {
        await foodOpsApi.updatePosOrder(editingOrderId, payload)
        toast.success('POS order updated')
      } else {
        await foodOpsApi.createPosOrder(payload)
        toast.success('POS order created')
      }
      resetForm()
      await loadOpsData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save POS order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkPaid = async (orderId: string) => {
    try {
      await foodOpsApi.updatePosOrder(orderId, {
        payment_status: 'paid',
        status: 'completed',
      })
      toast.success('POS order updated')
      await loadOpsData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update POS order')
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

    const rows = (printOrder.items || [])
      .map(
        (item) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${item.product_name || ''}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity || 0}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${money(Number(item.price || 0))}</td>
          </tr>
        `
      )
      .join('')

    popup.document.write(`
      <html>
        <head>
          <title>${printOrder.order_number}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
          <h1 style="margin:0 0 8px;">Restaurant POS Bill</h1>
          <p style="margin:0 0 18px;">Order: ${printOrder.order_number}</p>
          <p style="margin:0 0 4px;">Customer: ${printOrder.customer_details?.name || printOrder.shipping_address?.full_name || '-'}</p>
          <p style="margin:0 0 4px;">Phone: ${printOrder.customer_details?.phone || printOrder.shipping_address?.phone || '-'}</p>
          <p style="margin:0 0 18px;">Order Type: ${formatLabel(printOrder.type)}</p>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding-bottom:8px;">Item</th>
                <th style="text-align:center; padding-bottom:8px;">Qty</th>
                <th style="text-align:right; padding-bottom:8px;">Price</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <h2 style="text-align:right; margin-top:20px;">Total: ${money(printOrder.total)}</h2>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  return (
    <FoodModuleShell
      title='POS Billing'
      description='Create, edit, split, and print dine-in, takeaway, or delivery bills using your live Food Hub menu.'
      moduleLabel='POS Billing'
    >
      <div className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <CardTitle className='text-xl font-black text-slate-900'>
              Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 px-6 pb-6'>
            <Input
              placeholder='Search food item or category'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className='grid gap-3 md:grid-cols-2'>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className='h-28 animate-pulse rounded-2xl bg-slate-100' />
                ))
              ) : filteredMenuItems.length ? (
                filteredMenuItems.map((item) => {
                  const price = Number(item.offer_price || item.price || 0)
                  return (
                    <button
                      key={item._id}
                      type='button'
                      onClick={() => addItem(item._id, item.item_name || 'Item', price)}
                      className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white'
                    >
                      <p className='text-sm font-black text-slate-900'>{item.item_name}</p>
                      <p className='mt-1 text-xs font-medium text-slate-500'>
                        {item.category || 'Food Item'}
                      </p>
                      <div className='mt-4 flex items-center justify-between'>
                        <span className='text-sm font-black text-slate-900'>{money(price)}</span>
                        <span className='inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black uppercase text-white'>
                          <Plus className='h-3.5 w-3.5' />
                          Add
                        </span>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className='col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
                  No menu items found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <div className='flex items-center justify-between gap-3'>
              <CardTitle className='text-xl font-black text-slate-900'>
                {editingOrderId ? 'Edit Bill' : 'Current Bill'}
              </CardTitle>
              {editingOrderId ? (
                <Button variant='outline' className='rounded-xl' onClick={resetForm}>
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className='space-y-4 px-6 pb-6'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue placeholder='Order type' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='dine-in'>Dine In</SelectItem>
                  <SelectItem value='takeaway'>Takeaway</SelectItem>
                  <SelectItem value='delivery'>Delivery</SelectItem>
                  <SelectItem value='advance'>Advance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger><SelectValue placeholder='Select table' /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder='Select waiter' /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder='Select cashier' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No cashier</SelectItem>
                  {cashiers.map((cashier) => (
                    <SelectItem key={cashier._id} value={cashier._id}>
                      {cashier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder='Payment method' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='cash'>Cash</SelectItem>
                  <SelectItem value='upi'>UPI</SelectItem>
                  <SelectItem value='card'>Card</SelectItem>
                  <SelectItem value='split'>Split Payment</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue placeholder='Payment status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='unpaid'>Unpaid</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='paid'>Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-3'>
              <Input placeholder='Customer name' value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              <Input placeholder='Customer phone' value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
              <Input placeholder='Customer email' value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
            </div>

            {paymentMethod === 'split' ? (
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-black text-slate-900'>Split Payment</p>
                    <p className='text-xs text-slate-500'>
                      Match the split total with the final bill amount.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    className='rounded-xl'
                    onClick={() =>
                      setPaymentBreakdown((current) => [...current, defaultPaymentSplit()])
                    }
                  >
                    <Split className='mr-2 h-4 w-4' />
                    Add Split
                  </Button>
                </div>
                <div className='space-y-3'>
                  {paymentBreakdown.map((entry, index) => (
                    <div key={`${entry.method}-${index}`} className='grid gap-3 md:grid-cols-[0.9fr_1fr_auto]'>
                      <Select
                        value={entry.method}
                        onValueChange={(value) =>
                          setPaymentBreakdown((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, method: value as FoodOpsPaymentSplit['method'] }
                                : item
                            )
                          )
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value='cash'>Cash</SelectItem>
                          <SelectItem value='upi'>UPI</SelectItem>
                          <SelectItem value='card'>Card</SelectItem>
                          <SelectItem value='cod'>COD</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder='Amount'
                        value={String(entry.amount || '')}
                        onChange={(event) =>
                          setPaymentBreakdown((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amount: Number(event.target.value || 0) }
                                : item
                            )
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
                            current.filter((_, itemIndex) => itemIndex !== index)
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

            <div className='space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.key} className='flex items-center gap-3'>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-black text-slate-900'>{item.name}</p>
                      <p className='text-xs text-slate-500'>{money(item.price)} each</p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button type='button' variant='outline' size='icon' className='h-8 w-8 rounded-xl' onClick={() => updateQuantity(item.key, -1)}>-</Button>
                      <span className='w-5 text-center text-sm font-bold text-slate-900'>{item.quantity}</span>
                      <Button type='button' variant='outline' size='icon' className='h-8 w-8 rounded-xl' onClick={() => updateQuantity(item.key, 1)}>+</Button>
                    </div>
                    <Button type='button' variant='ghost' size='icon' className='h-8 w-8 rounded-xl text-rose-600' onClick={() => updateQuantity(item.key, -item.quantity)}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))
              ) : (
                <div className='flex items-center gap-3 text-sm text-slate-500'>
                  <ShoppingBasket className='h-4 w-4' />
                  Add items from the menu to start billing.
                </div>
              )}
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between text-sm font-bold text-slate-700'>
                <span>Total</span>
                <span className='text-lg font-black text-slate-900'>{money(total)}</span>
              </div>
            </div>

            <Button className='h-11 w-full rounded-2xl bg-slate-900 text-white hover:bg-black' onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting
                ? editingOrderId
                  ? 'Updating...'
                  : 'Creating...'
                : editingOrderId
                  ? 'Update POS Order'
                  : 'Create POS Order'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='px-6 py-5'>
          <CardTitle className='text-xl font-black text-slate-900'>
            Recent POS Orders
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 px-6 pb-6'>
          {recentOrders.length ? (
            recentOrders.slice(0, 10).map((order) => (
              <div key={order._id} className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_auto] lg:items-center'>
                <div>
                  <p className='text-sm font-black text-slate-900'>{order.order_number}</p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {(order.customer_details?.name || order.shipping_address?.full_name || 'Customer')} • {formatLabel(order.type)}
                  </p>
                  <p className='mt-1 text-[11px] font-semibold text-slate-500'>
                    {formatLabel(order.payment_status)}
                    {order.payment_method ? ` • ${formatLabel(order.payment_method)}` : ''}
                  </p>
                </div>
                <div className='text-sm font-black text-slate-900'>{money(order.total)}</div>
                <div className='text-xs font-bold text-slate-500'>
                  {order.payment_method === 'split' && order.payment_breakdown?.length
                    ? `${order.payment_breakdown.length} splits`
                    : 'Single payment'}
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button variant='outline' className='rounded-xl' onClick={() => loadOrderIntoForm(order)}>
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </Button>
                  <Button variant='outline' className='rounded-xl' onClick={() => handlePrint(order)}>
                    <Printer className='mr-2 h-4 w-4' />
                    Print
                  </Button>
                  <Button variant='outline' className='rounded-xl' onClick={() => void handleMarkPaid(order._id)}>
                    Mark Paid
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
              No POS orders yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!printOrder} onOpenChange={(open) => !open && setPrintOrder(null)}>
        <DialogContent className='max-w-2xl rounded-[28px] border-slate-200 bg-white'>
          <DialogHeader>
            <DialogTitle>Print POS Bill</DialogTitle>
            <DialogDescription>
              Review the bill and print a clean customer copy.
            </DialogDescription>
          </DialogHeader>
          {printOrder ? (
            <div className='space-y-4'>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-black text-slate-900'>{printOrder.order_number}</p>
                    <p className='text-xs text-slate-500'>
                      {printOrder.customer_details?.name || printOrder.shipping_address?.full_name || 'Walk-in customer'}
                    </p>
                  </div>
                  <div className='text-right text-xs text-slate-500'>
                    <p>{formatLabel(printOrder.type)}</p>
                    <p>{formatLabel(printOrder.payment_status)}</p>
                  </div>
                </div>
              </div>
              <div className='space-y-2 rounded-2xl border border-slate-200 bg-white p-4'>
                {printOrder.items.map((item, index) => (
                  <div key={`${item.product_name}-${index}`} className='flex items-center justify-between gap-3 text-sm'>
                    <span className='font-medium text-slate-700'>
                      {item.product_name} x {item.quantity}
                    </span>
                    <span className='font-black text-slate-900'>
                      {money(Number(item.price || 0) * Number(item.quantity || 0))}
                    </span>
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <span className='font-bold text-slate-700'>Total</span>
                <span className='text-lg font-black text-slate-900'>{money(printOrder.total)}</span>
              </div>
              <div className='flex justify-end'>
                <Button className='rounded-2xl bg-slate-900 text-white hover:bg-black' onClick={printBill}>
                  <Printer className='mr-2 h-4 w-4' />
                  Print Bill
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </FoodModuleShell>
  )
}
