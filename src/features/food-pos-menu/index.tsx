import { useEffect, useMemo, useState } from 'react'
import { ImageIcon, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
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
import api from '@/lib/axios'
import { uploadImage } from '@/lib/upload-image'
import {
  FoodModuleShell,
  getFoodResponseArray,
  money,
  type FoodMenuItem,
} from '@/features/food-ops/shared'

type PosMenuForm = {
  id: string
  item_name: string
  category: string
  full_price: string
  half_price: string
  image_url: string
  is_available: boolean
}

const defaultCategories = [
  'Chinese',
  'South Indian',
  'Main Course',
  'Starters',
  'Beverages',
  'Desserts',
  'Breads',
]

const defaultForm = (): PosMenuForm => ({
  id: '',
  item_name: '',
  category: '',
  full_price: '',
  half_price: '',
  image_url: '',
  is_available: true,
})

const toPositiveAmount = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

const getItemImage = (item: FoodMenuItem & { image_url?: string; gallery_images?: string[] }) =>
  item.image_url || item.gallery_images?.find(Boolean) || ''

export default function FoodPosMenuPage() {
  const [items, setItems] = useState<Array<FoodMenuItem & {
    image_url?: string
    gallery_images?: string[]
    variants?: Array<{ name?: string; price?: number }>
  }>>([])
  const [form, setForm] = useState<PosMenuForm>(defaultForm)
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing')
  const [newCategory, setNewCategory] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const categories = useMemo(() => {
    const fromItems = items
      .map((item) => String(item.category || '').trim())
      .filter(Boolean)
    return Array.from(new Set([...defaultCategories, ...fromItems]))
  }, [items])

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return items
    return items.filter((item) =>
      [item.item_name, item.category].some((field) =>
        String(field || '').toLowerCase().includes(value)
      )
    )
  }, [items, search])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.is_available !== false).length,
    categories: new Set(items.map((item) => item.category).filter(Boolean)).size,
  }), [items])

  const loadItems = async () => {
    setLoading(true)
    try {
      const response = await api.get('/food/menu')
      setItems(getFoodResponseArray(response?.data, 'items'))
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load POS menu items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const resetForm = () => {
    setForm(defaultForm())
    setCategoryMode('existing')
    setNewCategory('')
  }

  const editItem = (item: typeof items[number]) => {
    const halfVariant = item.variants?.find((variant) =>
      String(variant.name || '').toLowerCase().includes('half')
    )
    setForm({
      id: item._id,
      item_name: item.item_name || '',
      category: item.category || '',
      full_price: String(item.price || ''),
      half_price: halfVariant?.price ? String(halfVariant.price) : '',
      image_url: getItemImage(item),
      is_available: item.is_available !== false,
    })
    setCategoryMode('existing')
    setNewCategory('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUpload = async (file?: File | null) => {
    if (!file) return
    if (file.size > 200 * 1024) {
      toast.error('Image must be 200KB or smaller')
      return
    }
    setUploading(true)
    try {
      const url = await uploadImage(file, 'restaurant_pos_menu')
      if (url) setForm((current) => ({ ...current, image_url: url }))
    } finally {
      setUploading(false)
    }
  }

  const saveItem = async () => {
    const itemName = form.item_name.trim()
    const category = categoryMode === 'new' ? newCategory.trim() : form.category.trim()
    const fullPrice = toPositiveAmount(form.full_price)
    const halfPrice = toPositiveAmount(form.half_price)

    if (!itemName) return toast.error('Item name is required')
    if (!category) return toast.error('Category is required')
    if (!fullPrice) return toast.error('Full plate price is required')

    const payload = {
      item_name: itemName,
      category,
      price: fullPrice,
      offer_price: 0,
      image_url: form.image_url.trim(),
      gallery_images: form.image_url.trim() ? [form.image_url.trim()] : [],
      food_type: 'veg',
      is_available: form.is_available,
      prep_time_minutes: 20,
      variants: [
        { name: 'Full Plate', price: fullPrice, offer_price: 0, is_default: true, is_available: true },
        ...(halfPrice
          ? [{ name: 'Half Plate', price: halfPrice, offer_price: 0, is_default: false, is_available: true }]
          : []),
      ],
    }

    setSaving(true)
    try {
      if (form.id) {
        await api.put(`/food/menu/${form.id}`, payload)
        toast.success('Menu item updated')
      } else {
        await api.post('/food/menu', payload)
        toast.success('Menu item created')
      }
      resetForm()
      await loadItems()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save menu item')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/food/menu/${id}`)
      toast.success('Menu item deleted')
      if (form.id === id) resetForm()
      await loadItems()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete menu item')
    }
  }

  return (
    <FoodModuleShell
      title='Menu Items'
      description='Create POS-ready restaurant menu items with category, plate pricing, and an item image.'
      moduleLabel='Menu Items'
      showModuleCard={false}
    >
      <div className='grid gap-4 md:grid-cols-3'>
        {[
          ['Menu Items', stats.total],
          ['Active Items', stats.active],
          ['Categories', stats.categories],
        ].map(([label, value]) => (
          <Card key={label} className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardContent className='p-5'>
              <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>{label}</p>
              <p className='mt-2 text-3xl font-black text-slate-900'>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-5'>
          <div>
            <p className='text-xs font-black uppercase tracking-[0.2em] text-sky-600'>Menu Management</p>
            <CardTitle className='mt-2 text-xl font-black text-slate-900'>
              {form.id ? 'Edit Menu Item' : 'Add New Menu Item'}
            </CardTitle>
          </div>
          {form.id ? <Button variant='outline' className='rounded-xl' onClick={resetForm}>Cancel Edit</Button> : null}
        </CardHeader>
        <CardContent className='grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(360px,0.65fr)]'>
          <div className='space-y-4'>
            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Item Name</p>
              <Input placeholder='Example: Crispy Veg Burger' value={form.item_name} onChange={(event) => setForm((current) => ({ ...current, item_name: event.target.value }))} />
            </div>

            <div className='grid gap-4 md:grid-cols-[1fr_1fr]'>
              <div>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Category</p>
                <Select
                  value={categoryMode === 'new' ? 'create_new' : form.category || 'none'}
                  onValueChange={(value) => {
                    if (value === 'create_new') {
                      setCategoryMode('new')
                      setForm((current) => ({ ...current, category: '' }))
                      return
                    }
                    setCategoryMode('existing')
                    setForm((current) => ({ ...current, category: value === 'none' ? '' : value }))
                  }}
                >
                  <SelectTrigger><SelectValue placeholder='Select category' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Select category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                    <SelectItem value='create_new'>
                      <span className='inline-flex items-center gap-2'><Plus className='h-3.5 w-3.5' /> Create New</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {categoryMode === 'new' ? (
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>New Category Name</p>
                  <Input placeholder='Example: Burger' value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
                </div>
              ) : null}
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Full Plate Price</p>
                <Input placeholder='Example: 159' value={form.full_price} onChange={(event) => setForm((current) => ({ ...current, full_price: event.target.value }))} />
              </div>
              <div>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Half Plate Price</p>
                <Input placeholder='Optional' value={form.half_price} onChange={(event) => setForm((current) => ({ ...current, half_price: event.target.value }))} />
              </div>
            </div>

            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Image</p>
              <div className='grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]'>
                <label className='flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-sky-400 hover:bg-sky-50'>
                  <Upload className='h-5 w-5 text-slate-400' />
                  <span className='mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </span>
                  <span className='mt-1 text-xs text-slate-400'>Max 200KB</span>
                  <input
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={(event) => void handleUpload(event.target.files?.[0])}
                  />
                </label>
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Or Image Link</p>
                  <Input placeholder='https://...' value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} />
                </div>
              </div>
              {form.image_url ? (
                <div className='mt-4 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-3'>
                  <img src={form.image_url} alt='' className='h-20 w-20 rounded-xl object-cover' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-black text-slate-900'>Image ready</p>
                    <p className='truncate text-xs text-slate-500'>{form.image_url}</p>
                  </div>
                  <Button variant='ghost' size='icon' className='rounded-xl text-rose-600' onClick={() => setForm((current) => ({ ...current, image_url: '' }))}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ) : null}
            </div>

            <Button className='h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700' onClick={() => void saveItem()} disabled={saving || uploading}>
              {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Menu Item'}
            </Button>
          </div>

          <div className='rounded-2xl border border-slate-100 bg-slate-50 p-5'>
            <p className='text-sm font-black text-slate-900'>Live Preview</p>
            <div className='mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex aspect-[16/10] items-center justify-center bg-slate-100'>
                {form.image_url ? (
                  <img src={form.image_url} alt='' className='h-full w-full object-cover' />
                ) : (
                  <ImageIcon className='h-10 w-10 text-slate-300' />
                )}
              </div>
              <div className='p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-lg font-black text-slate-900'>{form.item_name || 'Item name'}</p>
                    <p className='mt-1 text-sm text-slate-500'>{categoryMode === 'new' ? newCategory || 'New category' : form.category || 'Category'}</p>
                  </div>
                  <Badge className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 shadow-none'>Active</Badge>
                </div>
                <div className='mt-5 grid grid-cols-2 gap-3'>
                  <div className='rounded-xl bg-slate-50 p-3'>
                    <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Full</p>
                    <p className='mt-1 font-black text-slate-900'>{money(toPositiveAmount(form.full_price))}</p>
                  </div>
                  <div className='rounded-xl bg-slate-50 p-3'>
                    <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Half</p>
                    <p className='mt-1 font-black text-slate-900'>{form.half_price ? money(toPositiveAmount(form.half_price)) : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
          <CardTitle className='text-xl font-black text-slate-900'>POS Menu List</CardTitle>
          <div className='relative w-full lg:w-80'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <Input className='pl-9' placeholder='Search item or category' value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3'>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='h-56 animate-pulse rounded-2xl bg-slate-100' />
            ))
          ) : filteredItems.length ? (
            filteredItems.map((item) => {
              const image = getItemImage(item)
              const halfVariant = item.variants?.find((variant) =>
                String(variant.name || '').toLowerCase().includes('half')
              )
              return (
                <div key={item._id} className='overflow-hidden rounded-2xl border border-slate-100 bg-slate-50'>
                  <div className='flex aspect-[16/9] items-center justify-center bg-slate-100'>
                    {image ? <img src={image} alt='' className='h-full w-full object-cover' /> : <ImageIcon className='h-8 w-8 text-slate-300' />}
                  </div>
                  <div className='space-y-4 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-base font-black text-slate-900'>{item.item_name}</p>
                        <p className='mt-1 truncate text-sm text-slate-500'>{item.category || 'Food Item'}</p>
                      </div>
                      <Badge className={`rounded-full px-3 py-1 text-xs font-bold shadow-none ${item.is_available !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {item.is_available !== false ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className='grid grid-cols-2 gap-3 text-sm'>
                      <div>
                        <p className='text-xs font-bold text-slate-400'>Full</p>
                        <p className='font-black text-slate-900'>{money(Number(item.price || 0))}</p>
                      </div>
                      <div>
                        <p className='text-xs font-bold text-slate-400'>Half</p>
                        <p className='font-black text-slate-900'>{halfVariant?.price ? money(Number(halfVariant.price)) : '-'}</p>
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Button variant='outline' className='flex-1 rounded-xl' onClick={() => editItem(item)}>
                        <Pencil className='mr-2 h-4 w-4' />
                        Edit
                      </Button>
                      <Button variant='ghost' className='rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700' onClick={() => void deleteItem(item._id)}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className='col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
              No POS menu items found.
            </div>
          )}
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
