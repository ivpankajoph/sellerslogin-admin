import api from '@/lib/axios'

export type FoodOpsTable = {
  _id: string
  number: string
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
}

export type FoodOpsWaiter = {
  _id: string
  name: string
  mobile?: string
  status: 'Active' | 'Inactive'
}

export type FoodOpsCashier = {
  _id: string
  name: string
  mobile?: string
  employee_id?: string
  shift_timing?: string
  status: 'Active' | 'Inactive'
}

export type FoodOpsCustomer = {
  _id: string
  name: string
  phone?: string
  email?: string
  city?: string
  birthday?: string
  anniversary?: string
  status: 'Active' | 'Inactive'
  createdAt?: string
}

export type FoodOpsInventoryItem = {
  _id: string
  name: string
  unit: string
  stock: number
  minimum_stock: number
}

export type FoodOpsInventoryAlertContact = {
  name?: string
  whatsapp: string
}

export type FoodOpsInventoryAlertSettings = {
  contacts: FoodOpsInventoryAlertContact[]
  whatsapp_enabled: boolean
  dashboard_enabled: boolean
}

export type FoodOpsRecipe = {
  _id: string
  menu_item_id?: { _id?: string; item_name?: string; category?: string } | string
  materials?: Array<{
    inventory_item_id?:
      | {
          _id?: string
          name?: string
          unit?: string
          stock?: number
          minimum_stock?: number
        }
      | string
    quantity_used?: number
  }>
}

export type FoodOpsReservation = {
  _id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  number_of_persons: number
  reservation_date: string
  reservation_time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  table_id?: { _id?: string; number?: string } | string | null
  notes?: string
}

export type FoodOpsPaymentSplit = {
  method: 'cash' | 'upi' | 'card' | 'cod'
  amount: number
}

export type FoodOpsPosOrder = {
  _id: string
  order_number: string
  type: string
  status: string
  payment_method: string
  payment_status: string
  payment_breakdown?: FoodOpsPaymentSplit[]
  total: number
  items: Array<{
    product_name?: string
    quantity?: number
    price?: number
    portion?: string
    menu_item_id?: string | null
  }>
  shipping_address?: {
    full_name?: string
    phone?: string
    city?: string
  }
  customer_details?: {
    name?: string
    phone?: string
    email?: string
    city?: string
    birthday?: string
    anniversary?: string
  }
  table_id?: string | null
  table_number?: string
  waiter_id?: string | null
  waiter_name?: string
  cashier_id?: string | null
  cashier_name?: string
  createdAt?: string
}

const getRows = async <T,>(url: string) => {
  const response = await api.get(url)
  return (response?.data?.rows || []) as T[]
}

export const foodOpsApi = {
  getTables: () => getRows<FoodOpsTable>('/food/tables'),
  createTable: (payload: Partial<FoodOpsTable>) => api.post('/food/tables', payload),
  updateTable: (id: string, payload: Partial<FoodOpsTable>) => api.put(`/food/tables/${id}`, payload),
  deleteTable: (id: string) => api.delete(`/food/tables/${id}`),

  getWaiters: () => getRows<FoodOpsWaiter>('/food/waiters'),
  createWaiter: (payload: Partial<FoodOpsWaiter>) => api.post('/food/waiters', payload),
  updateWaiter: (id: string, payload: Partial<FoodOpsWaiter>) => api.put(`/food/waiters/${id}`, payload),
  deleteWaiter: (id: string) => api.delete(`/food/waiters/${id}`),

  getCashiers: () => getRows<FoodOpsCashier>('/food/cashiers'),
  createCashier: (payload: Partial<FoodOpsCashier>) => api.post('/food/cashiers', payload),
  updateCashier: (id: string, payload: Partial<FoodOpsCashier>) => api.put(`/food/cashiers/${id}`, payload),
  deleteCashier: (id: string) => api.delete(`/food/cashiers/${id}`),

  getCustomers: () => getRows<FoodOpsCustomer>('/food/customers'),
  createCustomer: (payload: Partial<FoodOpsCustomer>) => api.post('/food/customers', payload),
  updateCustomer: (id: string, payload: Partial<FoodOpsCustomer>) => api.put(`/food/customers/${id}`, payload),
  deleteCustomer: (id: string) => api.delete(`/food/customers/${id}`),

  getInventory: () => getRows<FoodOpsInventoryItem>('/food/inventory'),
  createInventoryItem: (payload: Partial<FoodOpsInventoryItem>) => api.post('/food/inventory', payload),
  updateInventoryItem: (id: string, payload: Partial<FoodOpsInventoryItem>) => api.put(`/food/inventory/${id}`, payload),
  deleteInventoryItem: (id: string) => api.delete(`/food/inventory/${id}`),
  getInventoryAlertSettings: async () => {
    const response = await api.get('/food/inventory-alert-settings')
    return (response?.data?.settings || {
      contacts: [],
      whatsapp_enabled: true,
      dashboard_enabled: true,
    }) as FoodOpsInventoryAlertSettings
  },
  updateInventoryAlertSettings: async (
    payload: Partial<FoodOpsInventoryAlertSettings>
  ) => {
    const response = await api.put('/food/inventory-alert-settings', payload)
    return response?.data as {
      settings?: FoodOpsInventoryAlertSettings
      low_stock_alerts_sent?: number
      whatsapp_results?: Array<{
        whatsapp?: string
        success?: boolean
        message?: string
      }>
    }
  },

  getRecipes: () => getRows<FoodOpsRecipe>('/food/recipes'),
  saveRecipe: (payload: unknown) => api.post('/food/recipes', payload),

  getReservations: () => getRows<FoodOpsReservation>('/food/reservations'),
  createReservation: (payload: unknown) => api.post('/food/reservations', payload),
  updateReservation: (id: string, payload: unknown) => api.put(`/food/reservations/${id}`, payload),

  getPosOrders: () => getRows<FoodOpsPosOrder>('/food/pos-orders'),
  getPosOrder: async (id: string) => {
    const response = await api.get(`/food/pos-orders/${id}`)
    return (response?.data?.row || null) as FoodOpsPosOrder | null
  },
  createPosOrder: async (payload: unknown) => {
    const response = await api.post('/food/pos-orders', payload)
    return (response?.data?.row || null) as FoodOpsPosOrder | null
  },
  updatePosOrder: async (id: string, payload: unknown) => {
    const response = await api.put(`/food/pos-orders/${id}`, payload)
    return (response?.data?.row || null) as FoodOpsPosOrder | null
  },
}
