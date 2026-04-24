import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { FoodModuleShell, money, useFoodOperationsData } from '@/features/food-ops/shared'
import {
  foodOpsApi,
  type FoodOpsInventoryItem,
  type FoodOpsPosOrder,
  type FoodOpsRecipe,
} from '@/features/food-ops/api'

type RecipeMaterialForm = {
  inventory_item_id: string
  quantity_used: string
}

export default function FoodInventoryPage() {
  const { menuItems } = useFoodOperationsData()
  const [inventoryItems, setInventoryItems] = useState<FoodOpsInventoryItem[]>([])
  const [recipes, setRecipes] = useState<FoodOpsRecipe[]>([])
  const [recentOrders, setRecentOrders] = useState<FoodOpsPosOrder[]>([])
  const [saving, setSaving] = useState(false)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [materialForm, setMaterialForm] = useState({
    name: '',
    unit: 'piece',
    stock: '',
    minimum_stock: '',
  })
  const [recipeForm, setRecipeForm] = useState({
    menu_item_id: 'none',
    materials: [{ inventory_item_id: 'none', quantity_used: '' }] as RecipeMaterialForm[],
  })

  const loadData = async () => {
    try {
      const [inventoryData, recipeData, orderData] = await Promise.all([
        foodOpsApi.getInventory(),
        foodOpsApi.getRecipes(),
        foodOpsApi.getPosOrders(),
      ])
      setInventoryItems(inventoryData)
      setRecipes(recipeData)
      setRecentOrders(orderData)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load inventory data')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const saveMaterial = async () => {
    if (!materialForm.name.trim()) {
      toast.error('Material name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: materialForm.name,
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
      setMaterialForm({ name: '', unit: 'piece', stock: '', minimum_stock: '' })
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save inventory item')
    } finally {
      setSaving(false)
    }
  }

  const editMaterial = (item: FoodOpsInventoryItem) => {
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
        setMaterialForm({ name: '', unit: 'piece', stock: '', minimum_stock: '' })
      }
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete inventory item')
    }
  }

  const saveRecipe = async () => {
    const filteredMaterials = recipeForm.materials
      .map((material) => ({
        inventory_item_id: material.inventory_item_id,
        quantity_used: Number(material.quantity_used || 0),
      }))
      .filter(
        (material) =>
          material.inventory_item_id !== 'none' && Number(material.quantity_used) > 0
      )

    if (recipeForm.menu_item_id === 'none' || !filteredMaterials.length) {
      toast.error('Select a menu item and at least one material')
      return
    }
    setSaving(true)
    try {
      await foodOpsApi.saveRecipe({
        menu_item_id: recipeForm.menu_item_id,
        materials: filteredMaterials,
      })
      toast.success('Recipe mapping saved')
      setRecipeForm({
        menu_item_id: 'none',
        materials: [{ inventory_item_id: 'none', quantity_used: '' }],
      })
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save recipe mapping')
    } finally {
      setSaving(false)
    }
  }

  const recentBillingSummary = useMemo(() => {
    return recentOrders.slice(0, 5).map((order) => ({
      id: order._id,
      number: order.order_number,
      total: order.total,
      items: order.items.length,
    }))
  }, [recentOrders])

  return (
    <FoodModuleShell
      title='Inventory'
      description='Manage raw materials, update stock, and keep recipe usage linked to real POS billing.'
      moduleLabel='Inventory'
    >
      <div className='grid gap-6 xl:grid-cols-[1fr_0.9fr]'>
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <CardTitle className='text-xl font-black text-slate-900'>Raw Materials</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 px-6 pb-6'>
            {inventoryItems.length ? inventoryItems.map((item) => (
              <div key={item._id} className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center'>
                <div>
                  <p className='text-sm font-black text-slate-900'>{item.name}</p>
                  <p className='mt-1 text-xs text-slate-500 uppercase'>{item.unit}</p>
                </div>
                <div className='text-sm font-bold text-slate-700'>Stock {item.stock}</div>
                <div className='text-sm font-bold text-slate-700'>Min {item.minimum_stock}</div>
                <div className={`text-xs font-black uppercase ${item.stock <= item.minimum_stock ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {item.stock <= item.minimum_stock ? 'Low Stock' : 'Healthy'}
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' className='rounded-xl' onClick={() => editMaterial(item)}>
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </Button>
                  <Button variant='ghost' className='rounded-xl text-rose-600' onClick={() => void deleteMaterial(item._id)}>
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </Button>
                </div>
              </div>
            )) : <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>No materials added yet.</div>}
          </CardContent>
        </Card>

        <div className='space-y-6'>
          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>
                {editingMaterialId ? 'Edit Material' : 'Add Material'}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              <Input placeholder='Material name' value={materialForm.name} onChange={(event) => setMaterialForm((current) => ({ ...current, name: event.target.value }))} />
              <Select value={materialForm.unit} onValueChange={(value) => setMaterialForm((current) => ({ ...current, unit: value }))}>
                <SelectTrigger><SelectValue placeholder='Unit' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='piece'>Piece</SelectItem>
                  <SelectItem value='kg'>KG</SelectItem>
                  <SelectItem value='gram'>Gram</SelectItem>
                  <SelectItem value='litre'>Litre</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder='Current stock' value={materialForm.stock} onChange={(event) => setMaterialForm((current) => ({ ...current, stock: event.target.value }))} />
              <Input placeholder='Minimum stock' value={materialForm.minimum_stock} onChange={(event) => setMaterialForm((current) => ({ ...current, minimum_stock: event.target.value }))} />
              <div className='flex gap-3'>
                <Button className='w-full rounded-2xl' onClick={() => void saveMaterial()} disabled={saving}>
                  {editingMaterialId ? 'Update Material' : 'Save Material'}
                </Button>
                {editingMaterialId ? (
                  <Button
                    variant='outline'
                    className='rounded-2xl'
                    onClick={() => {
                      setEditingMaterialId(null)
                      setMaterialForm({ name: '', unit: 'piece', stock: '', minimum_stock: '' })
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>Recipe Mapping</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              <Select value={recipeForm.menu_item_id} onValueChange={(value) => setRecipeForm((current) => ({ ...current, menu_item_id: value }))}>
                <SelectTrigger><SelectValue placeholder='Select menu item' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Select menu item</SelectItem>
                  {menuItems.map((item) => (
                    <SelectItem key={item._id} value={item._id}>{item.item_name || 'Item'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recipeForm.materials.map((material, index) => (
                <div key={`${material.inventory_item_id}-${index}`} className='grid gap-3 md:grid-cols-[1fr_0.7fr_auto]'>
                  <Select
                    value={material.inventory_item_id}
                    onValueChange={(value) =>
                      setRecipeForm((current) => ({
                        ...current,
                        materials: current.materials.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, inventory_item_id: value } : item
                        ),
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder='Select material' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>Select material</SelectItem>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item._id} value={item._id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder='Qty used'
                    value={material.quantity_used}
                    onChange={(event) =>
                      setRecipeForm((current) => ({
                        ...current,
                        materials: current.materials.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, quantity_used: event.target.value }
                            : item
                        ),
                      }))
                    }
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    className='rounded-xl text-rose-600'
                    onClick={() =>
                      setRecipeForm((current) => ({
                        ...current,
                        materials:
                          current.materials.length > 1
                            ? current.materials.filter((_, itemIndex) => itemIndex !== index)
                            : current.materials,
                      }))
                    }
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                className='w-full rounded-2xl'
                onClick={() =>
                  setRecipeForm((current) => ({
                    ...current,
                    materials: [...current.materials, { inventory_item_id: 'none', quantity_used: '' }],
                  }))
                }
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Material Row
              </Button>
              <Button className='w-full rounded-2xl' onClick={() => void saveRecipe()} disabled={saving}>Save Recipe</Button>
              <div className='space-y-2 pt-2'>
                {recipes.map((recipe) => (
                  <div key={recipe._id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                    <p className='font-black text-slate-900'>
                      {typeof recipe.menu_item_id === 'object' ? recipe.menu_item_id?.item_name : 'Mapped item'}
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      {(recipe.materials || []).map((material) => {
                        const label =
                          typeof material.inventory_item_id === 'object'
                            ? material.inventory_item_id?.name
                            : 'Material'
                        return `${label} x ${material.quantity_used || 0}`
                      }).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>Recent POS Stock Usage</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              {recentBillingSummary.length ? recentBillingSummary.map((entry) => (
                <div key={entry.id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-black text-slate-900'>{entry.number}</p>
                      <p className='text-xs text-slate-500'>
                        {entry.items} billed items deducted through recipes
                      </p>
                    </div>
                    <div className='text-sm font-black text-slate-900'>{money(entry.total)}</div>
                  </div>
                </div>
              )) : (
                <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
                  No POS bills yet, so no stock deductions have happened.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FoodModuleShell>
  )
}
