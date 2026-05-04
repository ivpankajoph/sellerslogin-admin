import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Box,
  ClipboardList,
  ListChecks,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  type FoodOpsInventoryItem,
  type FoodOpsPosOrder,
  type FoodOpsRecipe,
} from '@/features/food-ops/api'
import {
  FoodModuleShell,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

type InventoryTab = 'materials' | 'recipes'

type RecipeMaterialForm = {
  inventory_item_id: string
  quantity_used: string
}

const emptyMaterialForm = () => ({
  name: '',
  unit: 'piece',
  stock: '',
  minimum_stock: '',
})

const emptyRecipeForm = () => ({
  menu_item_id: 'none',
  materials: [
    { inventory_item_id: 'none', quantity_used: '' },
  ] as RecipeMaterialForm[],
})

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseError = error as {
    response?: { data?: { message?: string } }
  }
  return responseError.response?.data?.message || fallback
}

const parseQuantity = (value: string) => {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const formatStock = (value?: number, unit?: string) =>
  `${Number(value || 0).toLocaleString('en-IN')} ${String(unit || '').toUpperCase()}`

const normalizeWhatsAppNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `91${digits}` : digits
}

const getRecipeMaterialDetails = (
  material: RecipeMaterialForm,
  inventoryItems: FoodOpsInventoryItem[]
) => {
  const inventoryItem = inventoryItems.find(
    (item) => item._id === material.inventory_item_id
  )
  const quantity = parseQuantity(material.quantity_used)
  const available = Number(inventoryItem?.stock || 0)
  const remaining = available - quantity

  return {
    inventoryItem,
    quantity,
    available,
    remaining,
    exceedsStock: Boolean(inventoryItem && quantity > available),
  }
}

export default function FoodInventoryPage() {
  const { menuItems, restaurant } = useFoodOperationsData()
  const [activeTab, setActiveTab] = useState<InventoryTab>('materials')
  const [inventoryItems, setInventoryItems] = useState<FoodOpsInventoryItem[]>(
    []
  )
  const [recipes, setRecipes] = useState<FoodOpsRecipe[]>([])
  const [recentOrders, setRecentOrders] = useState<FoodOpsPosOrder[]>([])
  const [saving, setSaving] = useState(false)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null
  )
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm)
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm)
  const [alertWhatsAppNumber, setAlertWhatsAppNumber] = useState('')
  const [hasLoadedDefaultAlertContact, setHasLoadedDefaultAlertContact] =
    useState(false)

  const loadData = async () => {
    try {
      const [inventoryData, recipeData, orderData, alertSettings] =
        await Promise.all([
          foodOpsApi.getInventory(),
          foodOpsApi.getRecipes(),
          foodOpsApi.getPosOrders(),
          foodOpsApi.getInventoryAlertSettings(),
        ])
      setInventoryItems(inventoryData)
      setRecipes(recipeData)
      setRecentOrders(orderData)
      const primaryContact = alertSettings.contacts?.[0]?.whatsapp || ''
      if (primaryContact) {
        setAlertWhatsAppNumber(primaryContact)
        setHasLoadedDefaultAlertContact(true)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load inventory data'))
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!hasLoadedDefaultAlertContact && restaurant?.mobile) {
      setAlertWhatsAppNumber(restaurant.mobile)
      setHasLoadedDefaultAlertContact(true)
    }
  }, [hasLoadedDefaultAlertContact, restaurant?.mobile])

  const saveMaterial = async () => {
    if (!materialForm.name.trim()) {
      toast.error('Material name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: materialForm.name.trim(),
        unit: materialForm.unit,
        stock: Number(materialForm.stock || 0),
        minimum_stock: Number(materialForm.minimum_stock || 0),
      }
      if (editingMaterialId) {
        await foodOpsApi.updateInventoryItem(editingMaterialId, payload)
        toast.success('Inventory item updated')
      } else {
        await foodOpsApi.createInventoryItem(payload)
        toast.success('Inventory item added')
      }
      setEditingMaterialId(null)
      setMaterialForm(emptyMaterialForm())
      await loadData()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save inventory item'))
    } finally {
      setSaving(false)
    }
  }

  const editMaterial = (item: FoodOpsInventoryItem) => {
    setActiveTab('materials')
    setEditingMaterialId(item._id)
    setMaterialForm({
      name: item.name,
      unit: item.unit,
      stock: String(item.stock),
      minimum_stock: String(item.minimum_stock),
    })
  }

  const deleteMaterial = async (itemId: string) => {
    try {
      await foodOpsApi.deleteInventoryItem(itemId)
      toast.success('Inventory item deleted')
      if (editingMaterialId === itemId) {
        setEditingMaterialId(null)
        setMaterialForm(emptyMaterialForm())
      }
      await loadData()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete inventory item'))
    }
  }

  const saveRecipe = async () => {
    const filteredMaterials = recipeForm.materials
      .map((material) => ({
        inventory_item_id: material.inventory_item_id,
        quantity_used: parseQuantity(material.quantity_used),
      }))
      .filter(
        (material) =>
          material.inventory_item_id !== 'none' &&
          Number(material.quantity_used) > 0
      )

    if (recipeForm.menu_item_id === 'none' || !filteredMaterials.length) {
      toast.error('Select a menu item and at least one material')
      return
    }
    if (recipeStockErrors.length) {
      const firstError = recipeStockErrors[0]
      toast.error(
        `${firstError.inventoryItem?.name || 'Material'} stock is only ${formatStock(
          firstError.available,
          firstError.inventoryItem?.unit
        )}`
      )
      return
    }
    setSaving(true)
    try {
      await foodOpsApi.saveRecipe({
        menu_item_id: recipeForm.menu_item_id,
        materials: filteredMaterials,
      })
      toast.success('Recipe mapping saved')
      setRecipeForm(emptyRecipeForm())
      await loadData()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save recipe mapping'))
    } finally {
      setSaving(false)
    }
  }

  const filteredMaterials = useMemo(() => {
    const value = materialSearch.trim().toLowerCase()
    if (!value) return inventoryItems
    return inventoryItems.filter((item) =>
      [item.name, item.unit].some((field) =>
        String(field || '')
          .toLowerCase()
          .includes(value)
      )
    )
  }, [inventoryItems, materialSearch])

  const inventoryStats = useMemo(() => {
    const lowStock = inventoryItems.filter(
      (item) =>
        Number(item.minimum_stock || 0) > 0 &&
        Number(item.stock || 0) <= Number(item.minimum_stock || 0)
    )
    return {
      total: inventoryItems.length,
      lowStock: lowStock.length,
      recipes: recipes.length,
    }
  }, [inventoryItems, recipes])

  const lowStockItems = useMemo(
    () =>
      inventoryItems.filter(
        (item) =>
          Number(item.minimum_stock || 0) > 0 &&
          Number(item.stock || 0) <= Number(item.minimum_stock || 0)
      ),
    [inventoryItems]
  )

  const saveInventoryAlertContacts = async () => {
    const whatsappNumber = normalizeWhatsAppNumber(alertWhatsAppNumber)
    if (!whatsappNumber) {
      toast.error('Enter manager or incharge WhatsApp number')
      return
    }

    setSaving(true)
    try {
      const response = await foodOpsApi.updateInventoryAlertSettings({
        contacts: [{ name: 'Manager / Incharge', whatsapp: whatsappNumber }],
        whatsapp_enabled: true,
        dashboard_enabled: true,
      })
      const sentCount = Number(response?.low_stock_alerts_sent || 0)
      const whatsappResults = response?.whatsapp_results || []
      const whatsappFailed = whatsappResults.filter((result) => !result.success)
      const whatsappSent = whatsappResults.filter((result) => result.success)
      if (whatsappFailed.length) {
        toast.warning(
          `Contact saved, but WhatsApp failed: ${whatsappFailed
            .map((result) => result.message || result.whatsapp || 'failed')
            .join(', ')}`
        )
      } else {
        toast.success(
          sentCount
            ? `Alert contact saved. ${sentCount} low-stock alert sent.`
            : whatsappSent.length
              ? 'Alert contact saved. Test WhatsApp sent.'
              : 'Alert contact saved. Automatic alerts are active.'
        )
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save alert contact'))
    } finally {
      setSaving(false)
    }
  }

  const recentStockUsage = useMemo(() => {
    const recipeByMenuItemId = new Map(
      recipes
        .map((recipe) => {
          const menuItemId =
            typeof recipe.menu_item_id === 'object'
              ? recipe.menu_item_id?._id
              : recipe.menu_item_id
          return menuItemId ? [menuItemId, recipe] : null
        })
        .filter(Boolean) as Array<[string, FoodOpsRecipe]>
    )

    return recentOrders
      .map((order) => {
        const usageByMaterialId = new Map<
          string,
          { name: string; unit: string; quantity: number }
        >()

        ;(order.items || []).forEach((orderItem) => {
          const menuItemId = String(orderItem.menu_item_id || '')
          const recipe = recipeByMenuItemId.get(menuItemId)
          if (!recipe) return

          ;(recipe.materials || []).forEach((material) => {
            const inventoryItem =
              typeof material.inventory_item_id === 'object'
                ? material.inventory_item_id
                : null
            if (!inventoryItem?._id) return

            const current = usageByMaterialId.get(inventoryItem._id) || {
              name: inventoryItem.name || 'Material',
              unit: inventoryItem.unit || '',
              quantity: 0,
            }
            usageByMaterialId.set(inventoryItem._id, {
              ...current,
              quantity:
                current.quantity +
                Number(material.quantity_used || 0) *
                  Number(orderItem.quantity || 0),
            })
          })
        })

        return {
          id: order._id,
          number: order.order_number,
          total: order.total,
          materials: Array.from(usageByMaterialId.values()),
        }
      })
      .filter((entry) => entry.materials.length > 0)
      .slice(0, 5)
  }, [recentOrders, recipes])

  const selectedMenuItemName =
    menuItems.find((item) => item._id === recipeForm.menu_item_id)?.item_name ||
    'Select item'

  const recipeStockErrors = recipeForm.materials
    .map((material) => getRecipeMaterialDetails(material, inventoryItems))
    .filter((details) => details.exceedsStock)

  const recipeHasValidMaterials = recipeForm.materials.some(
    (material) =>
      material.inventory_item_id !== 'none' &&
      parseQuantity(material.quantity_used) > 0
  )

  const isRecipeSaveDisabled =
    saving ||
    recipeForm.menu_item_id === 'none' ||
    !recipeHasValidMaterials ||
    recipeStockErrors.length > 0

  return (
    <FoodModuleShell
      title='Inventory'
      description='Track kitchen stock, manage raw materials, and map recipes for POS billing.'
      moduleLabel='Inventory'
      showModuleCard={false}
    >
      <div className='flex justify-start xl:justify-end'>
        <div className='grid w-full grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-[440px]'>
          {[
            { value: 'materials', label: 'Materials', icon: Box },
            { value: 'recipes', label: 'Recipe Mapping', icon: ListChecks },
          ].map((tab) => (
            <button
              key={tab.value}
              type='button'
              onClick={() => setActiveTab(tab.value as InventoryTab)}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                activeTab === tab.value
                  ? 'bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.25)]'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon className='h-4 w-4' />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        {[
          {
            label: 'Materials',
            value: String(inventoryStats.total),
            helper: 'Raw stock items',
            icon: Package,
          },
          {
            label: 'Low Stock',
            value: String(inventoryStats.lowStock),
            helper: 'Need attention',
            icon: AlertTriangle,
          },
          {
            label: 'Recipes',
            value: String(inventoryStats.recipes),
            helper: 'Mapped menu items',
            icon: ClipboardList,
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'
          >
            <CardContent className='flex items-center justify-between gap-4 p-5'>
              <div>
                <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  {stat.label}
                </p>
                <p className='mt-2 text-2xl font-black text-slate-950'>
                  {stat.value}
                </p>
                <p className='mt-1 text-sm font-semibold text-slate-500'>
                  {stat.helper}
                </p>
              </div>
              <span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700'>
                <stat.icon className='h-5 w-5' />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className={`rounded-[28px] border py-0 shadow-sm ${
          lowStockItems.length
            ? 'border-rose-200 bg-rose-50'
            : 'border-emerald-200 bg-emerald-50'
        }`}
      >
        <CardContent className='p-5 sm:p-6'>
          <div className='flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-3'>
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                    lowStockItems.length
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <AlertTriangle className='h-5 w-5' />
                </span>
                <div>
                  <p className='text-lg font-black text-slate-950'>
                    Material Stock Alert
                  </p>
                  <p className='text-sm font-semibold text-slate-600'>
                    {lowStockItems.length
                      ? `${lowStockItems.length} material needs restocking`
                      : 'All configured materials are above minimum stock'}
                  </p>
                </div>
              </div>

              {lowStockItems.length ? (
                <div className='mt-4 flex flex-wrap gap-2'>
                  {lowStockItems.map((item) => (
                    <span
                      key={item._id}
                      className='rounded-full bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm'
                    >
                      {item.name}: {formatStock(item.stock, item.unit)} left
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className='w-full max-w-xl rounded-2xl bg-white p-3 shadow-sm'>
              <p className='mb-2 text-xs font-black tracking-[0.14em] text-slate-400 uppercase'>
                Manager / Incharge WhatsApp
              </p>
              <p className='mb-3 text-xs font-semibold text-slate-500'>
                Save once. Low-stock alerts will go to dashboard and WhatsApp
                automatically.
              </p>
              <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
                <div className='relative'>
                  <MessageCircle className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <Input
                    className='h-12 rounded-xl bg-slate-50 pl-9 font-semibold'
                    placeholder='Enter WhatsApp number'
                    value={alertWhatsAppNumber}
                    onChange={(event) =>
                      setAlertWhatsAppNumber(event.target.value)
                    }
                  />
                </div>
                <Button
                  className='h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-black'
                  onClick={() => void saveInventoryAlertContacts()}
                  disabled={saving}
                >
                  Save Contact
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'materials' ? (
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
          <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
            <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
              <div className='flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between'>
                <div>
                  <CardTitle className='text-2xl font-black text-slate-950'>
                    Raw Materials
                  </CardTitle>
                  <p className='mt-1 text-sm font-medium text-slate-500'>
                    Monitor units, current stock, minimum stock, and health.
                  </p>
                </div>
                <div className='relative w-full 2xl:w-80'>
                  <Search className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <Input
                    className='h-12 rounded-2xl bg-slate-50 pl-11 font-semibold'
                    placeholder='Search material...'
                    value={materialSearch}
                    onChange={(event) => setMaterialSearch(event.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className='bg-slate-50/70 p-4 sm:p-6'>
              {filteredMaterials.length ? (
                <div className='grid gap-3'>
                  {filteredMaterials.map((item) => {
                    const isLow =
                      Number(item.stock || 0) <= Number(item.minimum_stock || 0)
                    return (
                      <article
                        key={item._id}
                        className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md'
                      >
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                          <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <p className='text-lg font-black text-slate-950'>
                                {item.name}
                              </p>
                              <Badge
                                variant='outline'
                                className='rounded-full px-3 py-1 text-[10px] font-black uppercase'
                              >
                                {item.unit}
                              </Badge>
                              <Badge
                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase shadow-none ${
                                  isLow
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isLow ? 'Low Stock' : 'Healthy'}
                              </Badge>
                            </div>
                            <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                              <div className='min-w-0 rounded-xl bg-slate-50 px-3 py-2.5'>
                                <p className='text-[10px] font-black tracking-[0.12em] text-slate-400 uppercase'>
                                  Current Stock
                                </p>
                                <p className='mt-1 truncate text-base font-black text-slate-950 sm:text-lg'>
                                  {formatStock(item.stock, item.unit)}
                                </p>
                              </div>
                              <div className='min-w-0 rounded-xl bg-slate-50 px-3 py-2.5'>
                                <p className='text-[10px] font-black tracking-[0.12em] text-slate-400 uppercase'>
                                  Minimum Alert
                                </p>
                                <p className='mt-1 truncate text-base font-black text-slate-950 sm:text-lg'>
                                  {formatStock(item.minimum_stock, item.unit)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className='flex flex-wrap gap-2 lg:justify-end'>
                            <Button
                              variant='outline'
                              className='rounded-xl'
                              onClick={() => editMaterial(item)}
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Edit
                            </Button>
                            <Button
                              variant='ghost'
                              className='rounded-xl text-rose-600'
                              onClick={() => void deleteMaterial(item._id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm'>
                  <Package className='h-12 w-12 text-slate-300' />
                  <p className='mt-4 text-lg font-black text-slate-950'>
                    No materials added yet
                  </p>
                  <p className='mt-1 max-w-md text-sm text-slate-500'>
                    Add raw materials from the form to start tracking kitchen
                    stock.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
            <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
              <div className='flex items-center gap-3'>
                <Plus className='h-6 w-6 text-indigo-600' />
                <CardTitle className='text-2xl font-black text-slate-950'>
                  {editingMaterialId ? 'Edit Material' : 'New Material'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-5 bg-white p-5 sm:p-6'>
              <div>
                <p className='mb-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  Material Name
                </p>
                <Input
                  className='h-12 rounded-2xl bg-slate-50 font-semibold'
                  placeholder='Example: Paneer'
                  value={materialForm.name}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <p className='mb-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                    Unit
                  </p>
                  <Select
                    value={materialForm.unit}
                    onValueChange={(value) =>
                      setMaterialForm((current) => ({
                        ...current,
                        unit: value,
                      }))
                    }
                  >
                    <SelectTrigger className='h-12 rounded-2xl bg-slate-50 font-semibold'>
                      <SelectValue placeholder='Unit' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='piece'>Piece</SelectItem>
                      <SelectItem value='kg'>KG</SelectItem>
                      <SelectItem value='gram'>Gram</SelectItem>
                      <SelectItem value='litre'>Litre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className='mb-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                    Current Stock
                  </p>
                  <Input
                    className='h-12 rounded-2xl bg-slate-50 font-semibold'
                    placeholder='0'
                    value={materialForm.stock}
                    onChange={(event) =>
                      setMaterialForm((current) => ({
                        ...current,
                        stock: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <p className='mb-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  Minimum Stock Alert
                </p>
                <Input
                  className='h-12 rounded-2xl bg-slate-50 font-semibold'
                  placeholder='0'
                  value={materialForm.minimum_stock}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      minimum_stock: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='flex gap-3'>
                <Button
                  className='h-14 w-full rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-black'
                  onClick={() => void saveMaterial()}
                  disabled={saving}
                >
                  {editingMaterialId ? 'Update Material' : 'Add Material'}
                </Button>
                {editingMaterialId ? (
                  <Button
                    variant='outline'
                    className='h-14 rounded-2xl'
                    onClick={() => {
                      setEditingMaterialId(null)
                      setMaterialForm(emptyMaterialForm())
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
          <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
            <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
              <div className='flex items-center gap-3'>
                <Plus className='h-6 w-6 text-indigo-600' />
                <div>
                  <CardTitle className='text-2xl font-black text-slate-950'>
                    Map Item to Recipe
                  </CardTitle>
                  <p className='mt-1 text-sm font-medium text-slate-500'>
                    Select one menu item and add material requirements.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-6 bg-white p-5 sm:p-6'>
              <div className='max-w-xl'>
                <p className='mb-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  Menu Item
                </p>
                <Select
                  value={recipeForm.menu_item_id}
                  onValueChange={(value) =>
                    setRecipeForm((current) => ({
                      ...current,
                      menu_item_id: value,
                    }))
                  }
                >
                  <SelectTrigger className='h-14 rounded-2xl bg-slate-50 font-semibold'>
                    <SelectValue placeholder='Select menu item' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Select menu item</SelectItem>
                    {menuItems.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.item_name || 'Item'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className='mb-3 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  Required Materials
                </p>
                <div className='space-y-3'>
                  {recipeForm.materials.map((material, index) => {
                    const details = getRecipeMaterialDetails(
                      material,
                      inventoryItems
                    )
                    return (
                      <div
                        key={`${material.inventory_item_id}-${index}`}
                        className={`rounded-2xl border p-3 ${
                          details.exceedsStock
                            ? 'border-rose-200 bg-rose-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(160px,0.85fr)_44px]'>
                          <div className='min-w-0'>
                            <p className='mb-1.5 text-[10px] font-black tracking-[0.12em] text-slate-400 uppercase'>
                              Material
                            </p>
                            <Select
                              value={material.inventory_item_id}
                              onValueChange={(value) =>
                                setRecipeForm((current) => ({
                                  ...current,
                                  materials: current.materials.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, inventory_item_id: value }
                                        : item
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger className='h-12 w-full rounded-xl bg-white font-semibold'>
                                <SelectValue placeholder='Select material' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='none'>
                                  Select material
                                </SelectItem>
                                {inventoryItems.map((item) => (
                                  <SelectItem key={item._id} value={item._id}>
                                    {item.name} ({item.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className='min-w-0'>
                            <p className='mb-1.5 text-[10px] font-black tracking-[0.12em] text-slate-400 uppercase'>
                              Qty per item
                            </p>
                            <Input
                              className='h-12 w-full rounded-xl bg-white font-semibold'
                              placeholder='e.g. 200'
                              value={material.quantity_used}
                              onChange={(event) =>
                                setRecipeForm((current) => ({
                                  ...current,
                                  materials: current.materials.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            quantity_used: event.target.value,
                                          }
                                        : item
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className='flex items-end'>
                          <Button
                            type='button'
                            variant='ghost'
                            className='h-12 w-12 rounded-xl text-rose-600'
                            onClick={() =>
                              setRecipeForm((current) => ({
                                ...current,
                                materials:
                                  current.materials.length > 1
                                    ? current.materials.filter(
                                        (_, itemIndex) => itemIndex !== index
                                      )
                                    : current.materials,
                              }))
                            }
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                          </div>
                        </div>
                        {details.inventoryItem ? (
                          <div className='mt-3 flex flex-wrap gap-2 text-xs font-bold'>
                            <span className='rounded-full bg-white px-3 py-1 text-slate-600'>
                              Available:{' '}
                              {formatStock(
                                details.available,
                                details.inventoryItem.unit
                              )}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 ${
                                details.exceedsStock
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              Remaining after 1 order:{' '}
                              {formatStock(
                                Math.max(details.remaining, 0),
                                details.inventoryItem.unit
                              )}
                            </span>
                            {details.exceedsStock ? (
                              <span className='rounded-full bg-rose-600 px-3 py-1 text-white'>
                                Not enough stock
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                <Button
                  type='button'
                  variant='outline'
                  className='mt-4 h-12 w-full rounded-2xl text-sm font-black text-indigo-600'
                  onClick={() =>
                    setRecipeForm((current) => ({
                      ...current,
                      materials: [
                        ...current.materials,
                        { inventory_item_id: 'none', quantity_used: '' },
                      ],
                    }))
                  }
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add Material Requirement
                </Button>
              </div>

              {recipeStockErrors.length ? (
                <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700'>
                  Recipe stock is higher than available inventory. Reduce the
                  quantity before saving.
                </div>
              ) : null}

              <Button
                className='h-14 w-full rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.25)] hover:bg-indigo-700'
                onClick={() => void saveRecipe()}
                disabled={isRecipeSaveDisabled}
              >
                Save Recipe Mapping
              </Button>
            </CardContent>
          </Card>

          <div className='space-y-6'>
            <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
              <CardHeader className='px-5 py-5 sm:px-6'>
                <CardTitle className='text-xl font-black text-slate-950'>
                  Current Mapping
                </CardTitle>
                <p className='text-sm font-medium text-slate-500'>
                  {selectedMenuItemName}
                </p>
              </CardHeader>
              <CardContent className='space-y-3 px-5 pb-6 sm:px-6'>
                {recipes.length ? (
                  recipes.map((recipe) => (
                    <div
                      key={recipe._id}
                      className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                    >
                      <p className='font-black text-slate-950'>
                        {typeof recipe.menu_item_id === 'object'
                          ? recipe.menu_item_id?.item_name
                          : 'Mapped item'}
                      </p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {(recipe.materials || [])
                          .map((material) => {
                            const inventoryItem =
                              typeof material.inventory_item_id === 'object'
                                ? material.inventory_item_id
                                : null
                            const label = inventoryItem?.name || 'Material'
                            const unit = inventoryItem?.unit || ''
                            return `${label}: ${material.quantity_used || 0} ${String(
                              unit
                            ).toUpperCase()} per item`
                          })
                          .join(', ')}
                      </p>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {(recipe.materials || []).map((material, index) => {
                          const inventoryItem =
                            typeof material.inventory_item_id === 'object'
                              ? material.inventory_item_id
                              : null
                          if (!inventoryItem) return null
                          const remaining =
                            Number(inventoryItem.stock || 0) -
                            Number(material.quantity_used || 0)
                          return (
                            <span
                              key={`${recipe._id}-${inventoryItem._id}-${index}`}
                              className={`rounded-full px-3 py-1 text-[11px] font-black ${
                                remaining < 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-white text-slate-600'
                              }`}
                            >
                              {inventoryItem.name} left after 1 order:{' '}
                              {formatStock(
                                Math.max(remaining, 0),
                                inventoryItem.unit
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
                    No recipe mappings yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
              <CardHeader className='px-5 py-5 sm:px-6'>
                <CardTitle className='text-xl font-black text-slate-950'>
                  Recent POS Stock Usage
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 px-5 pb-6 sm:px-6'>
                {recentStockUsage.length ? (
                  recentStockUsage.map((entry) => (
                    <div
                      key={entry.id}
                      className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'
                    >
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                          <p className='text-sm font-black text-slate-950'>
                            {entry.number}
                          </p>
                          <div className='mt-2 flex flex-wrap gap-2'>
                            {entry.materials.map((material) => (
                              <span
                                key={`${entry.id}-${material.name}`}
                                className='rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700'
                              >
                                -{formatStock(material.quantity, material.unit)}{' '}
                                {material.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className='text-sm font-black text-slate-950'>
                          {money(entry.total)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
                    No POS bills yet, so no stock deductions have happened.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </FoodModuleShell>
  )
}
