import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Main } from '@/components/layout/main'
import { uploadImage } from '@/lib/upload-image'
import {
  getVendorTemplatePreviewUrl,
  getVendorTemplateProductUrl,
} from '@/lib/storefront-url'
import { getStoredActiveWebsite } from '@/features/vendor-template/components/websiteStudioStorage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

type Summary = {
  restaurant_name: string
  menu_count: number
  active_offer_count: number
  pending_order_count: number
  live_order_count: number
}

type RestaurantProfile = {
  restaurant_name: string
  logo_url: string
  cover_image_url: string
  mobile: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  veg_nonveg_type: string
  fssai_license_number: string
  gst_number: string
  delivery_radius_km: number
  minimum_order_amount: number
  default_preparation_time_minutes: number
  opening_hours: Array<{ day: string; open: string; close: string; is_closed: boolean }>
  is_active: boolean
}

type MenuItem = {
  _id: string
  item_name: string
  category: string
  price: number
  offer_price: number
  description: string
  image_url: string
  gallery_images: string[]
  food_type: string
  is_available: boolean
  prep_time_minutes: number
  addons: Array<{ name: string; price: number; is_free: boolean }>
  variants: Array<{ name: string; price: number; offer_price: number; is_default: boolean; is_available: boolean }>
}

type Offer = {
  _id: string
  offer_title: string
  offer_type: string
  combo_price: number
  discount_percent: number
  flat_discount: number
  free_item_name: string
  coupon_code: string
  min_cart_value: number
  max_discount: number
  start_date?: string
  end_date?: string
  combo_items: Array<{ menu_item_id?: string; item_name: string; quantity: number }>
  is_active: boolean
}

type Order = {
  _id: string
  order_number: string
  status: string
  refund_status?: string
  payment_method?: string
  payment_status?: string
  total?: number
  shipping_address?: {
    full_name?: string
    phone?: string
    line1?: string
    city?: string
    state?: string
    pincode?: string
    landmark?: string
  }
  items: Array<{ product_name?: string; quantity?: number }>
}

type TemplateWebsiteLite = {
  _id?: string
  id?: string
  template_key?: string
  templateKey?: string
  website_slug?: string
}

type OpeningHour = RestaurantProfile['opening_hours'][number]
type MenuAddon = MenuItem['addons'][number]
type MenuVariant = MenuItem['variants'][number]
type OfferComboItem = Offer['combo_items'][number]
type RestaurantFoodTypeValue = 'veg' | 'non_veg'

type MenuFormState = {
  id: string
  item_name: string
  category: string
  price: string
  offer_price: string
  description: string
  image_url: string
  gallery_images: string[]
  food_type: string
  is_available: boolean
  prep_time_minutes: string
  addons: MenuAddon[]
  variants: MenuVariant[]
}

type OfferFormState = {
  id: string
  offer_title: string
  offer_type: string
  combo_price: string
  discount_percent: string
  flat_discount: string
  free_item_name: string
  coupon_code: string
  min_cart_value: string
  max_discount: string
  start_date: string
  end_date: string
  is_active: boolean
  combo_items: OfferComboItem[]
}

const DEFAULT_RESTAURANT: RestaurantProfile = {
  restaurant_name: '',
  logo_url: '',
  cover_image_url: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  veg_nonveg_type: 'both',
  fssai_license_number: '',
  gst_number: '',
  delivery_radius_km: 5,
  minimum_order_amount: 0,
  default_preparation_time_minutes: 20,
  opening_hours: [
    { day: 'Monday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Tuesday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Wednesday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Thursday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Friday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Saturday', open: '09:00', close: '22:00', is_closed: false },
    { day: 'Sunday', open: '09:00', close: '22:00', is_closed: false },
  ],
  is_active: true,
}

const money = (value?: number) => `Rs. ${Number(value || 0).toFixed(2)}`
const parseFormNumber = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
const isValidAmount = (value: number) => Number.isFinite(value) && value >= 0
const emptyWhenZero = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return ''
  return Number(value) === 0 ? '' : String(value)
}
const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback
const ORDER_STATUSES = [
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
] as const
const REFUND_STATUSES = [
  { label: 'refund requested', value: 'requested' },
  { label: 'refund done', value: 'processed' },
] as const
const formatLabel = (value?: string) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-'
const RESTAURANT_FOOD_TYPE_OPTIONS: Array<{
  label: string
  value: RestaurantFoodTypeValue
}> = [
  { label: 'Veg', value: 'veg' },
  { label: 'Non veg', value: 'non_veg' },
]
const getRestaurantFoodTypeSelections = (
  value?: string
): RestaurantFoodTypeValue[] => {
  const normalized = String(value || 'both')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (normalized === 'both') return ['veg', 'non_veg']
  if (normalized === 'non_veg' || normalized === 'nonveg') return ['non_veg']
  return ['veg']
}
const getRestaurantFoodTypeValue = (
  selections: RestaurantFoodTypeValue[]
) => {
  const uniqueSelections = Array.from(new Set(selections))
  const hasVeg = uniqueSelections.includes('veg')
  const hasNonVeg = uniqueSelections.includes('non_veg')
  if (hasVeg && hasNonVeg) return 'both'
  if (hasNonVeg) return 'non_veg'
  return 'veg'
}
const getRestaurantFoodTypeLabels = (value?: string) => {
  const selections = getRestaurantFoodTypeSelections(value)
  return RESTAURANT_FOOD_TYPE_OPTIONS.filter((option) =>
    selections.includes(option.value)
  ).map((option) => option.label)
}
const getOrderAddress = (order: Order) =>
  [
    order.shipping_address?.line1,
    order.shipping_address?.city,
    order.shipping_address?.state,
    order.shipping_address?.pincode,
  ]
    .filter(Boolean)
    .join(', ')
const getOrderAddressLines = (order: Order) =>
  [
    order.shipping_address?.line1,
    order.shipping_address?.city,
    order.shipping_address?.state,
    order.shipping_address?.pincode,
    order.shipping_address?.landmark
      ? `Landmark: ${order.shipping_address.landmark}`
      : '',
  ].filter(Boolean)
const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
const formatOpeningHours = (hours: RestaurantProfile['opening_hours']) =>
  (hours || []).map((slot) =>
    slot.is_closed ? `${slot.day}: Closed` : `${slot.day}: ${slot.open} - ${slot.close}`
  )
const getMenuItemImage = (item?: MenuItem | null) =>
  item?.image_url || item?.gallery_images?.find((image) => image?.trim()) || ''
const getMenuItemPrice = (item?: MenuItem | null) => {
  if (!item) return 0
  const variants = Array.isArray(item.variants) ? item.variants : []
  const variant =
    variants.find((entry) => entry.is_default && entry.is_available !== false) ||
    variants.find((entry) => entry.is_available !== false) ||
    variants[0]
  return Number(variant?.offer_price || item.offer_price || variant?.price || item.price || 0)
}

const createEmptyAddon = (): MenuAddon => ({ name: '', price: 0, is_free: false })
const createEmptyVariant = (): MenuVariant => ({
  name: '',
  price: 0,
  offer_price: 0,
  is_default: false,
  is_available: true,
})
const createEmptyComboItem = (): OfferComboItem => ({ menu_item_id: '', item_name: '', quantity: 1 })

const DEFAULT_MENU_FORM = (): MenuFormState => ({
  id: '',
  item_name: '',
  category: '',
  price: '0',
  offer_price: '0',
  description: '',
  image_url: '',
  gallery_images: [],
  food_type: 'veg',
  is_available: true,
  prep_time_minutes: '20',
  addons: [createEmptyAddon()],
  variants: [createEmptyVariant()],
})

const DEFAULT_OFFER_FORM = (): OfferFormState => ({
  id: '',
  offer_title: '',
  offer_type: 'combo_price',
  combo_price: '0',
  discount_percent: '0',
  flat_discount: '0',
  free_item_name: '',
  coupon_code: '',
  min_cart_value: '0',
  max_discount: '0',
  start_date: '',
  end_date: '',
  is_active: true,
  combo_items: [createEmptyComboItem()],
})

function FieldLabel({
  label,
}: {
  label: string
  helper?: string
}) {
  return (
    <p className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-700'>
      {label}
    </p>
  )
}

function FoodTypeMark({ type }: { type?: string }) {
  const normalized = String(type || 'veg').toLowerCase().replace(/[\s-]+/g, '_')
  const isNonVeg = normalized === 'non_veg' || normalized === 'nonveg'

  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border bg-white ${
        isNonVeg ? 'border-red-600' : 'border-green-600'
      }`}
      title={isNonVeg ? 'Non veg' : 'Veg'}
    >
      <span
        className={`h-2 w-2 rounded-full ${isNonVeg ? 'bg-red-600' : 'bg-green-600'}`}
      />
    </span>
  )
}

const FOOD_HUB_SECTION_IDS = [
  'restaurant-setup',
  'food-items',
  'all-items',
  'offer-form',
  'all-offers',
  'orders',
] as const

type FoodHubSectionId = (typeof FOOD_HUB_SECTION_IDS)[number]

const getFoodHubSectionFromHash = (): FoodHubSectionId => {
  if (typeof window === 'undefined') return 'restaurant-setup'
  const section = window.location.hash.replace('#', '') as FoodHubSectionId
  return FOOD_HUB_SECTION_IDS.includes(section) ? section : 'restaurant-setup'
}

export default function FoodHubPage() {
  const routerHash = useLocation({ select: (location) => location.hash })
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const authToken = useSelector((state: any) => state.auth?.token || '')
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const vendorId = String(authUser?.id || authUser?._id || '')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantProfile>(DEFAULT_RESTAURANT)
  const [restaurantDraft, setRestaurantDraft] = useState<RestaurantProfile>(DEFAULT_RESTAURANT)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [savingMenu, setSavingMenu] = useState(false)
  const [savingOffer, setSavingOffer] = useState(false)
  const [uploadingField, setUploadingField] = useState('')
  const [menuForm, setMenuForm] = useState<MenuFormState>(DEFAULT_MENU_FORM)
  const [offerForm, setOfferForm] = useState<OfferFormState>(DEFAULT_OFFER_FORM)
  const [expandedAddressOrderId, setExpandedAddressOrderId] = useState('')
  const [addressModalOrder, setAddressModalOrder] = useState<Order | null>(null)
  const [restaurantEditorOpen, setRestaurantEditorOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<FoodHubSectionId>(
    getFoodHubSectionFromHash
  )

  useEffect(() => {
    const section = String(routerHash || '').replace('#', '') as FoodHubSectionId
    setActiveSection(
      FOOD_HUB_SECTION_IDS.includes(section) ? section : 'restaurant-setup'
    )
  }, [routerHash])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [summaryRes, restaurantRes, menuRes, offerRes, orderRes] = await Promise.all([
        api.get('/food/summary'),
        api.get('/food/restaurant'),
        api.get('/food/menu'),
        api.get('/food/offers'),
        api.get('/food/orders'),
      ])
      setSummary(summaryRes.data?.summary || null)
      const nextRestaurant = restaurantRes.data?.profile
        ? { ...DEFAULT_RESTAURANT, ...restaurantRes.data.profile }
        : DEFAULT_RESTAURANT
      setRestaurant(nextRestaurant)
      setRestaurantDraft(nextRestaurant)
      setMenuItems(menuRes.data?.items || [])
      setOffers(offerRes.data?.offers || [])
      setOrders(orderRes.data?.orders || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load food hub')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const syncSection = () => setActiveSection(getFoodHubSectionFromHash())
    window.addEventListener('hashchange', syncSection)
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  const copyOrderAddress = async (order: Order) => {
    const fullAddress = getOrderAddressLines(order).join(', ')
    if (!fullAddress) {
      toast.error('Address not available')
      return
    }

    try {
      await navigator.clipboard.writeText(fullAddress)
      toast.success('Address copied')
    } catch {
      toast.error('Failed to copy address')
    }
  }

  const previewMenuItem = (item: MenuItem) => {
    const previewCity =
      String(vendorProfile?.default_city_slug || authUser?.default_city_slug || '').trim() ||
      'all'
    const websiteId = String(
      vendorProfile?.default_website_id ||
        vendorProfile?.defaultWebsiteId ||
        authUser?.default_website_id ||
        ''
    ).trim()
    const url = getVendorTemplateProductUrl(
      vendorId,
      item._id,
      previewCity,
      websiteId || undefined,
      'pocofood'
    )

    if (!url) {
      toast.error('Storefront preview URL is not ready yet.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const resolvePocoFoodWebsiteId = async () => {
    const activeWebsite = getStoredActiveWebsite(vendorId)
    if (
      activeWebsite?.id &&
      String(activeWebsite.templateKey || '').trim().toLowerCase() === 'pocofood'
    ) {
      return activeWebsite.id
    }

    try {
      const apiBase = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/+$/, '')
      if (!apiBase || !vendorId) return ''
      const response = await fetch(
        `${apiBase}/v1/templates/by-vendor?vendor_id=${encodeURIComponent(vendorId)}&_ts=${Date.now()}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        }
      )
      const payload = await response.json().catch(() => null)
      const websites = Array.isArray(payload?.data)
        ? (payload.data as TemplateWebsiteLite[])
        : []
      const pocoFoodWebsite = websites.find((website) => {
        const key = String(website?.template_key || website?.templateKey || '')
          .trim()
          .toLowerCase()
        return key === 'pocofood' || key.includes('pocofood')
      })
      return String(pocoFoodWebsite?._id || pocoFoodWebsite?.id || '').trim()
    } catch {
      return ''
    }
  }

  const previewFoodTemplate = async () => {
    const previewCity =
      String(vendorProfile?.default_city_slug || authUser?.default_city_slug || '').trim() ||
      'all'
    const websiteId =
      (await resolvePocoFoodWebsiteId()) ||
      String(
        vendorProfile?.default_website_id ||
          vendorProfile?.defaultWebsiteId ||
          authUser?.default_website_id ||
          ''
      ).trim()
    const url = getVendorTemplatePreviewUrl(
      vendorId,
      'pocofood',
      previewCity,
      websiteId || undefined
    )

    if (!url) {
      toast.error('Storefront preview URL is not ready yet.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const previewFoodOffers = async () => {
    const previewCity =
      String(vendorProfile?.default_city_slug || authUser?.default_city_slug || '').trim() ||
      'all'
    const websiteId =
      (await resolvePocoFoodWebsiteId()) ||
      String(
        vendorProfile?.default_website_id ||
          vendorProfile?.defaultWebsiteId ||
          authUser?.default_website_id ||
          ''
      ).trim()
    const baseUrl = getVendorTemplatePreviewUrl(
      vendorId,
      'pocofood',
      previewCity,
      websiteId || undefined
    )

    if (!baseUrl) {
      toast.error('Storefront preview URL is not ready yet.')
      return
    }

    window.open(`${baseUrl}/combo`, '_blank', 'noopener,noreferrer')
  }

  const categoryOptions = Array.from(
    new Set(
      menuItems
        .map((item) => String(item.category || '').trim())
        .filter(Boolean)
    )
  )

  const handleUpload = async (
    file: File | undefined,
    field: 'logo_url' | 'cover_image_url' | 'menu_image'
  ) => {
    if (!file) return
    try {
      setUploadingField(field)
      const url = await uploadImage(file, 'food_hub')
      if (!url) return
      if (field === 'menu_image') {
        setMenuForm((current) => ({ ...current, image_url: url }))
      } else {
        setRestaurantDraft((current) => ({ ...current, [field]: url }))
      }
      toast.success('Image uploaded')
    } finally {
      setUploadingField('')
    }
  }

  const handleMenuGalleryUpload = async (files: FileList | null) => {
    const imageFiles = Array.from(files || []).filter(Boolean)
    if (!imageFiles.length) return
    try {
      setUploadingField('menu_gallery')
      const urls = await Promise.all(imageFiles.map((file) => uploadImage(file, 'food_hub')))
      const validUrls = urls.filter(Boolean) as string[]
      if (!validUrls.length) return
      setMenuForm((current) => ({
        ...current,
        image_url: current.image_url || validUrls[0],
        gallery_images: Array.from(new Set([...current.gallery_images, ...validUrls])),
      }))
      toast.success('Gallery images uploaded')
    } finally {
      setUploadingField('')
    }
  }

  const saveRestaurant = async () => {
    try {
      setSavingRestaurant(true)
      await api.put('/food/restaurant', restaurantDraft)
      toast.success('Restaurant setup saved')
      setRestaurantEditorOpen(false)
      await loadAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save restaurant')
    } finally {
      setSavingRestaurant(false)
    }
  }

  const resetMenuForm = () => setMenuForm(DEFAULT_MENU_FORM())

  const saveMenuItem = async () => {
    const itemName = menuForm.item_name.trim()
    const category = menuForm.category.trim()
    const price = parseFormNumber(menuForm.price)
    const offerPrice = parseFormNumber(menuForm.offer_price)
    const foodType = menuForm.food_type.trim().toLowerCase().replace(/[\s-]+/g, '_')

    if (!itemName) {
      toast.error('Item name is required')
      return
    }
    if (!category) {
      toast.error('Category is required')
      return
    }
    if (!isValidAmount(price) || price <= 0) {
      toast.error('Item price valid number hona chahiye')
      return
    }
    if (!isValidAmount(offerPrice)) {
      toast.error('Offer price me sirf number dalo')
      return
    }
    if (!['veg', 'non_veg', 'egg'].includes(foodType)) {
      toast.error('Food type must be veg or non_veg')
      return
    }

    const addons = menuForm.addons
      .filter((addon) => String(addon.name || '').trim())
      .map((addon) => ({
        ...addon,
        name: String(addon.name || '').trim(),
        price: parseFormNumber(addon.price),
      }))
    const invalidAddon = addons.find((addon) => !isValidAmount(addon.price))
    if (invalidAddon) {
      toast.error(`Addon "${invalidAddon.name}" ka price valid number hona chahiye`)
      return
    }

    const variants = menuForm.variants
      .filter((variant) => String(variant.name || '').trim())
      .map((variant) => ({
        ...variant,
        name: String(variant.name || '').trim(),
        price: parseFormNumber(variant.price),
        offer_price: parseFormNumber(variant.offer_price),
      }))
    const invalidVariant = variants.find(
      (variant) => !isValidAmount(variant.price) || !isValidAmount(variant.offer_price)
    )
    if (invalidVariant) {
      toast.error(`Variant "${invalidVariant.name}" me price/offer price sirf number hona chahiye`)
      return
    }

    const payload = {
      item_name: itemName,
      category,
      price,
      offer_price: offerPrice,
      description: menuForm.description,
      image_url: menuForm.image_url,
      gallery_images: menuForm.gallery_images.filter((image) => image.trim()),
      food_type: foodType,
      is_available: menuForm.is_available,
      prep_time_minutes: parseFormNumber(menuForm.prep_time_minutes) || 20,
      addons,
      variants,
    }
    try {
      setSavingMenu(true)
      if (menuForm.id) await api.put(`/food/menu/${menuForm.id}`, payload)
      else await api.post('/food/menu', payload)
      toast.success(menuForm.id ? 'Menu item updated' : 'Menu item created')
      resetMenuForm()
      await loadAll()
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to save menu item'))
    } finally {
      setSavingMenu(false)
    }
  }

  const resetOfferForm = () => setOfferForm(DEFAULT_OFFER_FORM())

  const saveOffer = async () => {
    if (offerForm.offer_type === 'combo_price') {
      const selectedComboItems = offerForm.combo_items.filter(
        (item) => item.item_name.trim() || item.menu_item_id
      )
      if (!selectedComboItems.length) {
        toast.error('Select at least one food item from the combo builder')
        return
      }
      if (Number(offerForm.combo_price || 0) <= 0) {
        toast.error('Add a combo price')
        return
      }
    }

    const payload = {
      offer_title: offerForm.offer_title.trim() || comboAutoTitle || 'Food combo',
      offer_type: offerForm.offer_type,
      combo_price: Number(offerForm.combo_price || 0),
      discount_percent: Number(offerForm.discount_percent || 0),
      flat_discount: Number(offerForm.flat_discount || 0),
      free_item_name: offerForm.free_item_name,
      coupon_code: offerForm.coupon_code,
      min_cart_value: Number(offerForm.min_cart_value || 0),
      max_discount: Number(offerForm.max_discount || 0),
      start_date: offerForm.start_date || null,
      end_date: offerForm.end_date || null,
      is_active: offerForm.is_active,
      combo_items: offerForm.combo_items
        .filter((item) => item.item_name.trim() || item.menu_item_id)
        .map((item) => ({
          menu_item_id: item.menu_item_id || null,
          item_name: item.item_name.trim(),
          quantity: Math.max(1, Number(item.quantity || 1)),
        })),
    }
    try {
      setSavingOffer(true)
      if (offerForm.id) await api.put(`/food/offers/${offerForm.id}`, payload)
      else await api.post('/food/offers', payload)
      toast.success(offerForm.id ? 'Offer updated' : 'Offer created')
      resetOfferForm()
      await loadAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save offer')
    } finally {
      setSavingOffer(false)
    }
  }

  const removeMenuItem = async (id: string) => {
    try {
      await api.delete(`/food/menu/${id}`)
      toast.success('Menu item deleted')
      await loadAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete menu item')
    }
  }

  const removeOffer = async (id: string) => {
    try {
      await api.delete(`/food/offers/${id}`)
      toast.success('Offer deleted')
      await loadAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete offer')
    }
  }

  const updateOrder = async (id: string, status: string, refundStatus?: string) => {
    try {
      await api.put(`/food/orders/${id}/status`, {
        status,
        refund_status: refundStatus,
      })
      toast.success('Order updated')
      await loadAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update order')
    }
  }

  const updateOpeningHour = (
    index: number,
    field: keyof OpeningHour,
    value: string | boolean
  ) => {
    setRestaurantDraft((current) => ({
      ...current,
      opening_hours: current.opening_hours.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const updateAddon = (
    index: number,
    field: keyof MenuAddon,
    value: string | number | boolean
  ) => {
    setMenuForm((current) => ({
      ...current,
      addons: current.addons.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const updateVariant = (
    index: number,
    field: keyof MenuVariant,
    value: string | number | boolean
  ) => {
    setMenuForm((current) => ({
      ...current,
      variants: current.variants.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const updateComboItem = (
    index: number,
    field: keyof OfferComboItem,
    value: string | number
  ) => {
    setOfferForm((current) => ({
      ...current,
      combo_items: current.combo_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const selectComboMenuItem = (index: number, menuItemId: string) => {
    const selectedItem = menuItems.find((item) => item._id === menuItemId)
    setOfferForm((current) => ({
      ...current,
      combo_items: current.combo_items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              menu_item_id: menuItemId,
              item_name: selectedItem?.item_name || '',
              quantity: item.quantity || 1,
            }
          : item
      ),
    }))
  }

  const startEditOffer = (offer: Offer) => {
    setOfferForm({
      id: offer._id,
      offer_title: offer.offer_title,
      offer_type: offer.offer_type,
      combo_price: String(offer.combo_price || 0),
      discount_percent: String(offer.discount_percent || 0),
      flat_discount: String(offer.flat_discount || 0),
      free_item_name: offer.free_item_name || '',
      coupon_code: offer.coupon_code || '',
      min_cart_value: String(offer.min_cart_value || 0),
      max_discount: String(offer.max_discount || 0),
      start_date: offer.start_date ? String(offer.start_date).slice(0, 10) : '',
      end_date: offer.end_date ? String(offer.end_date).slice(0, 10) : '',
      is_active: offer.is_active !== false,
      combo_items: offer.combo_items?.length
        ? offer.combo_items.map((comboItem) => {
            const matchedMenuItem =
              menuItems.find((item) => item._id === comboItem.menu_item_id) ||
              menuItems.find(
                (item) =>
                  item.item_name.trim().toLowerCase() ===
                  String(comboItem.item_name || '').trim().toLowerCase()
              )
            return {
              menu_item_id: matchedMenuItem?._id || comboItem.menu_item_id || '',
              item_name: matchedMenuItem?.item_name || comboItem.item_name || '',
              quantity: comboItem.quantity || 1,
            }
          })
        : [createEmptyComboItem()],
    })
  }

  const comboPreviewItems = offerForm.combo_items
    .filter((comboItem) => comboItem.menu_item_id || comboItem.item_name.trim())
    .map((comboItem, index) => {
      const menuItem =
        menuItems.find((item) => item._id === comboItem.menu_item_id) ||
        menuItems.find(
          (item) =>
            item.item_name.trim().toLowerCase() ===
            String(comboItem.item_name || '').trim().toLowerCase()
        ) ||
        null
      const name = menuItem?.item_name || comboItem.item_name
      const quantity = Math.max(1, Number(comboItem.quantity || 1))
      const unitPrice = getMenuItemPrice(menuItem)

      return {
        key: comboItem.menu_item_id || `${name}-${index}`,
        name,
        category: menuItem?.category || '',
        quantity,
        image: getMenuItemImage(menuItem),
        lineTotal: unitPrice * quantity,
      }
    })
    .filter((item) => item.name.trim())
  const comboAutoTitle = comboPreviewItems
    .map((item) => `${item.quantity > 1 ? `${item.quantity} ` : ''}${item.name}`)
    .join(' + ')
  const comboWorth = comboPreviewItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const comboPrice = Number(offerForm.combo_price || 0)
  const comboSavings = comboWorth > comboPrice && comboPrice > 0 ? comboWorth - comboPrice : 0
  const restaurantFoodTypeSelections = getRestaurantFoodTypeSelections(
    restaurantDraft.veg_nonveg_type
  )
  const updateRestaurantFoodType = (
    value: RestaurantFoodTypeValue,
    checked: boolean
  ) => {
    setRestaurantDraft((current) => {
      const currentSelections = getRestaurantFoodTypeSelections(
        current.veg_nonveg_type
      )
      const nextSelections = checked
        ? [...currentSelections, value]
        : currentSelections.filter((selection) => selection !== value)

      if (!nextSelections.length) return current

      return {
        ...current,
        veg_nonveg_type: getRestaurantFoodTypeValue(nextSelections),
      }
    })
  }

  return (
    <Main className='flex flex-1 flex-col gap-6'>
      <div className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-slate-900'>Food Hub</h1>
        <p className='text-sm text-slate-600'>
          Separate food dashboard for your food template. Core sellerslogin modules remain unchanged.
        </p>
      </div>

      {activeSection === 'restaurant-setup' ? (
        <div className='grid gap-4 md:grid-cols-4'>
          {[
            ['Restaurant', summary?.restaurant_name || 'Not configured'],
            ['Menu Items', String(summary?.menu_count || 0)],
            ['Active Offers', String(summary?.active_offer_count || 0)],
            [
              'Live Orders',
              String(
                (summary?.pending_order_count || 0) +
                  (summary?.live_order_count || 0)
              ),
            ],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader>
                <CardTitle className='text-sm font-medium'>{label}</CardTitle>
              </CardHeader>
              <CardContent className='text-2xl font-semibold'>
                {value}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className='space-y-6'>
        {activeSection === 'restaurant-setup' ? (
        <section id='restaurant-setup'>
          <div className='space-y-4'>
            <Card>
              <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle className='text-2xl'>
                    {restaurant.restaurant_name || 'Restaurant profile'}
                  </CardTitle>
                  <p className='mt-2 text-sm text-slate-600'>
                    Saved restaurant details are shown here. Use edit mode only when you need to update something.
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='outline'>
                    {restaurant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant='outline'
                    onClick={() => void previewFoodTemplate()}
                  >
                    Preview Template
                  </Button>
                  <Button
                    onClick={() => {
                      setRestaurantDraft(restaurant)
                      setRestaurantEditorOpen(true)
                    }}
                  >
                    {restaurant.restaurant_name ? 'Edit Restaurant' : 'Create Restaurant'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]'>
                  <div className='rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
                      <div className='h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-white'>
                        {restaurant.logo_url ? (
                          <img src={restaurant.logo_url} alt={restaurant.restaurant_name || 'Restaurant logo'} className='h-full w-full object-cover' />
                        ) : (
                          <div className='flex h-full w-full items-center justify-center text-xl font-semibold text-slate-400'>
                            {(restaurant.restaurant_name || 'R').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='text-xs font-medium uppercase tracking-[0.12em] text-slate-500'>Restaurant overview</p>
                        <h3 className='mt-1 text-2xl font-semibold text-slate-900'>
                          {restaurant.restaurant_name || 'Not configured'}
                        </h3>
                        <p className='mt-2 text-sm text-slate-600'>
                          {restaurant.address || 'No address added yet.'}
                        </p>
                        <div className='mt-4 flex flex-wrap gap-2'>
                          {getRestaurantFoodTypeLabels(
                            restaurant.veg_nonveg_type || 'both'
                          ).map((label) => (
                            <Badge key={label} variant='secondary'>
                              {label}
                            </Badge>
                          ))}
                          <Badge variant='outline'>Min order {money(restaurant.minimum_order_amount)}</Badge>
                          <Badge variant='outline'>Radius {restaurant.delivery_radius_km || 0} km</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
                    <div className='rounded-xl border border-slate-200 bg-white p-4'>
                      <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Contact</p>
                      <p className='mt-2 text-sm font-medium text-slate-900'>{restaurant.mobile || '-'}</p>
                      <p className='mt-1 break-all text-sm text-slate-600'>{restaurant.email || '-'}</p>
                    </div>
                    <div className='rounded-xl border border-slate-200 bg-white p-4'>
                      <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Compliance</p>
                      <p className='mt-2 text-sm text-slate-700'>FSSAI: {restaurant.fssai_license_number || '-'}</p>
                      <p className='mt-1 text-sm text-slate-700'>GST: {restaurant.gst_number || '-'}</p>
                      <p className='mt-1 text-sm text-slate-700'>State: {restaurant.state || '-'} {restaurant.pincode ? `- ${restaurant.pincode}` : ''}</p>
                    </div>
                  </div>
                </div>

                <div className='grid gap-4'>
                  <div className='rounded-xl border border-slate-200 bg-white p-5'>
                    <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Opening hours</p>
                    <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                      {formatOpeningHours(restaurant.opening_hours).map((line) => (
                        <div key={line} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        ) : null}

        {activeSection === 'food-items' || activeSection === 'all-items' ? (
        <section id={activeSection}>
          <div className='space-y-4'>
            {activeSection === 'food-items' ? (
            <Card>
              <CardHeader>
                <CardTitle>Food Item Form</CardTitle>
                <p className='text-sm text-slate-600'>
                  Create or update food items here. Saved items are listed below/alongside this form.
                </p>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='space-y-2'>
                  <FieldLabel label='Food item name' helper='This name appears on the menu card.' />
                  <Input placeholder='Example: Crispy Veg Burger' value={menuForm.item_name} onChange={(e) => setMenuForm((c) => ({ ...c, item_name: e.target.value }))} />
                </div>
                <div className='space-y-2'>
                  <FieldLabel label='Category' helper='Group the item, such as Burger, Drinks, or Wrap.' />
                  <Input
                    placeholder='Example: Burger'
                    list='food-category-options'
                    value={menuForm.category}
                    onChange={(e) => setMenuForm((c) => ({ ...c, category: e.target.value }))}
                  />
                </div>
                <datalist id='food-category-options'>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-2'>
                    <FieldLabel label='Regular price' helper='Original item price.' />
                    <Input
                      type='number'
                      placeholder='Example: 159'
                      value={emptyWhenZero(menuForm.price)}
                      onChange={(e) => setMenuForm((c) => ({ ...c, price: e.target.value }))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <FieldLabel label='Offer / sale price' helper='Discounted price. Use 0 if there is no discount.' />
                    <Input
                      type='number'
                      placeholder='Example: 119'
                      value={emptyWhenZero(menuForm.offer_price)}
                      onChange={(e) => setMenuForm((c) => ({ ...c, offer_price: e.target.value }))}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                      Item images
                    </p>
                    <Input
                      type='file'
                      accept='image/*'
                      multiple
                      onChange={(e) => void handleMenuGalleryUpload(e.target.files)}
                    />
                    <p className='text-xs text-slate-500'>
                      Select one or more images. The first image becomes the primary image automatically.
                    </p>
                  </div>
                  {uploadingField === 'menu_gallery' ? (
                    <p className='text-xs text-slate-500'>Uploading gallery images...</p>
                  ) : null}
                  <div className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <p className='text-sm font-medium text-slate-700'>Gallery images</p>
                        <p className='text-xs text-slate-500'>
                          For the product detail page and gallery thumbnails.
                        </p>
                      </div>
                      <Badge variant='secondary'>{menuForm.gallery_images.length} images</Badge>
                    </div>
                    {menuForm.gallery_images.length > 0 ? (
                      <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3'>
                        {menuForm.gallery_images.map((image, index) => (
                          <div
                            key={`${image}-${index}`}
                            className='overflow-hidden rounded-lg border border-slate-200 bg-white'
                          >
                            <div className='aspect-square overflow-hidden bg-slate-100'>
                              <img
                                src={image}
                                alt={`Gallery ${index + 1}`}
                                className='h-full w-full object-cover'
                              />
                            </div>
                            <div className='space-y-2 p-2'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='w-full'
                                onClick={() =>
                                  setMenuForm((current) => ({
                                    ...current,
                                    image_url: image,
                                  }))
                                }
                              >
                                Make Primary
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='w-full'
                                onClick={() =>
                                  setMenuForm((current) => {
                                    const nextGallery = current.gallery_images.filter(
                                      (_, itemIndex) => itemIndex !== index
                                    )
                                    const nextPrimary =
                                      current.image_url === image ? nextGallery[0] || '' : current.image_url
                                    return {
                                      ...current,
                                      image_url: nextPrimary,
                                      gallery_images: nextGallery,
                                    }
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-3 text-xs text-slate-500'>No gallery images have been added yet.</p>
                    )}
                  </div>
                </div>
                <div className='space-y-2'>
                  <FieldLabel label='Food type' helper='Select whether this item is veg or non-veg.' />
                  <select
                    className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    value={menuForm.food_type}
                    onChange={(e) => setMenuForm((c) => ({ ...c, food_type: e.target.value }))}
                  >
                    <option value='veg'>Veg</option>
                    <option value='non_veg'>Non veg</option>
                  </select>
                </div>
                <div className='space-y-2'>
                  <FieldLabel label='Item description' helper='Add taste, ingredients, serving size, or short details.' />
                  <Textarea className='min-h-[88px]' placeholder='Example: Crispy veg patty with cheese, lettuce, mayo, and fresh bun.' value={menuForm.description} onChange={(e) => setMenuForm((c) => ({ ...c, description: e.target.value }))} />
                </div>
                {offerForm.offer_type === 'combo_price' ? (
                <div className='space-y-3 rounded-lg border border-slate-200 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-medium text-slate-700'>Addons</p>
                      <p className='text-xs text-slate-500'>
                        Example: Extra Cheese, Fries, Cold Drink
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() =>
                        setMenuForm((current) => ({
                          ...current,
                          addons: [...current.addons, createEmptyAddon()],
                        }))
                      }
                    >
                      Add Addon
                    </Button>
                  </div>
                  {menuForm.addons.map((addon, index) => (
                    <div
                      key={`addon-${index}`}
                      className='space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4'
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-slate-900'>Addon {index + 1}</p>
                          <p className='text-xs text-slate-500'>Extra item customers can select with the main food item.</p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          className='shrink-0'
                          onClick={() =>
                            setMenuForm((current) => ({
                              ...current,
                              addons:
                                current.addons.length === 1
                                  ? [createEmptyAddon()]
                                  : current.addons.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                            Addon name
                          </p>
                          <Input
                            placeholder='Example: Extra Cheese'
                            value={addon.name}
                            onChange={(e) => updateAddon(index, 'name', e.target.value)}
                            className='min-w-0 bg-white'
                          />
                        </div>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                            Price
                          </p>
                          <Input
                            type='number'
                            placeholder='Addon price, e.g. 30'
                            value={emptyWhenZero(addon.price)}
                            onChange={(e) =>
                              updateAddon(index, 'price', Number(e.target.value || 0))
                            }
                            className='min-w-0 bg-white'
                          />
                        </div>
                      </div>
                      <div className='space-y-1 md:max-w-[220px]'>
                        <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                          Free addon?
                        </p>
                        <div className='flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2'>
                          <Switch
                            checked={addon.is_free}
                            onCheckedChange={(checked) =>
                              updateAddon(index, 'is_free', checked)
                            }
                          />
                          <span className='text-sm text-slate-700'>Free</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : null}
                <div className='space-y-3 rounded-lg border border-slate-200 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-medium text-slate-700'>Variants</p>
                      <p className='text-xs text-slate-500'>
                        Example: Regular, Medium, Large
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() =>
                        setMenuForm((current) => ({
                          ...current,
                          variants: [...current.variants, createEmptyVariant()],
                        }))
                      }
                    >
                      Add Variant
                    </Button>
                  </div>
                  {menuForm.variants.map((variant, index) => (
                    <div
                      key={`variant-${index}`}
                      className='space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
                    >
                      <div className='flex items-start justify-between gap-3 border-b border-slate-100 pb-3'>
                        <div className='space-y-1'>
                          <span className='inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                            Variant {index + 1}
                          </span>
                          <p className='text-xs text-slate-500'>
                            Add a size or option, such as `Regular`, `Medium`, or `Large`.
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          className='shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                          onClick={() =>
                            setMenuForm((current) => ({
                              ...current,
                              variants:
                                current.variants.length === 1
                                  ? [createEmptyVariant()]
                                  : current.variants.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <div className='grid gap-3 md:grid-cols-3'>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium text-slate-500'>
                            Variant name
                          </p>
                          <Input
                            placeholder='Example: Regular'
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                            className='min-w-0 bg-white'
                          />
                        </div>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium text-slate-500'>
                            Price
                          </p>
                          <Input
                            type='number'
                            placeholder='Variant price, e.g. 129'
                            value={emptyWhenZero(variant.price)}
                            onChange={(e) =>
                              updateVariant(index, 'price', Number(e.target.value || 0))
                            }
                            className='min-w-0 bg-white'
                          />
                        </div>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium text-slate-500'>
                            Offer price
                          </p>
                          <Input
                            type='number'
                            placeholder='Offer price, e.g. 99'
                            value={emptyWhenZero(variant.offer_price)}
                            onChange={(e) =>
                              updateVariant(index, 'offer_price', Number(e.target.value || 0))
                            }
                            className='min-w-0 bg-white'
                          />
                        </div>
                      </div>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='flex items-center justify-between gap-3'>
                            <div>
                              <p className='text-sm font-medium text-slate-900'>Default variant</p>
                              <p className='text-xs text-slate-500'>Selected by default for customers.</p>
                            </div>
                            <Switch
                              checked={variant.is_default}
                              onCheckedChange={(checked) =>
                                setMenuForm((current) => ({
                                  ...current,
                                  variants: current.variants.map((item, itemIndex) => ({
                                    ...item,
                                    is_default: itemIndex === index ? checked : false,
                                  })),
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='flex items-center justify-between gap-3'>
                            <div>
                              <p className='text-sm font-medium text-slate-900'>Available</p>
                              <p className='text-xs text-slate-500'>Show this option to customers.</p>
                            </div>
                            <Switch
                              checked={variant.is_available}
                              onCheckedChange={(checked) =>
                                updateVariant(index, 'is_available', checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='flex items-center gap-3'>
                  <Switch checked={menuForm.is_available} onCheckedChange={(checked) => setMenuForm((c) => ({ ...c, is_available: checked }))} />
                  <span className='text-sm text-slate-700'>Available</span>
                </div>
                <div className='flex gap-2'>
                  <Button onClick={saveMenuItem} disabled={savingMenu}>{savingMenu ? 'Saving...' : menuForm.id ? 'Update Item' : 'Create Item'}</Button>
                  <Button variant='outline' onClick={resetMenuForm}>Reset</Button>
                </div>
              </CardContent>
            </Card>
            ) : null}
            {activeSection === 'all-items' ? (
            <Card>
              <CardHeader><CardTitle>All Food Items</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead className='text-right'>Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className='flex items-start gap-2'>
                            <FoodTypeMark type={item.food_type} />
                            <div>
                              <p className='font-medium'>{item.item_name}</p>
                              <p className='text-xs text-slate-500'>{item.category || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{money(item.offer_price || item.price)}</TableCell>
                        <TableCell><Badge variant='outline'>{item.is_available ? 'available' : 'unavailable'}</Badge></TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button variant='outline' onClick={() => previewMenuItem(item)}>Preview</Button>
                            <Button variant='outline' onClick={() => setMenuForm({ id: item._id, item_name: item.item_name, category: item.category, price: String(item.price || 0), offer_price: String(item.offer_price || 0), description: item.description || '', image_url: item.image_url || '', gallery_images: item.gallery_images?.length ? item.gallery_images : item.image_url ? [item.image_url] : [], food_type: item.food_type || 'veg', is_available: item.is_available !== false, prep_time_minutes: String(item.prep_time_minutes || 20), addons: item.addons?.length ? item.addons : [createEmptyAddon()], variants: item.variants?.length ? item.variants : [createEmptyVariant()] })}>Edit</Button>
                            <Button variant='outline' onClick={() => removeMenuItem(item._id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && !menuItems.length ? <TableRow><TableCell colSpan={4} className='text-center text-sm text-slate-500'>No food items yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            ) : null}
          </div>
        </section>
        ) : null}

        {activeSection === 'offer-form' || activeSection === 'all-offers' ? (
        <section id={activeSection}>
          <div className='space-y-4'>
            {activeSection === 'offer-form' ? (
            <Card>
              <CardHeader><CardTitle>Combo / Offer Form</CardTitle></CardHeader>
              <CardContent className='space-y-3'>
                <div className='space-y-2'>
                  <FieldLabel label='Offer title' helper='This name appears in the deals/combo section.' />
                  <Input placeholder='Example: Coke + Crispy Veg Burger' value={offerForm.offer_title} onChange={(e) => setOfferForm((c) => ({ ...c, offer_title: e.target.value }))} />
                  {offerForm.offer_type === 'combo_price' && comboAutoTitle ? (
                    <Button
                      type='button'
                      variant='outline'
                      className='h-auto whitespace-normal py-2 text-left text-xs'
                      onClick={() => setOfferForm((current) => ({ ...current, offer_title: comboAutoTitle }))}
                    >
                      Use combo title: {comboAutoTitle}
                    </Button>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <FieldLabel label='Offer type' helper='Select how the discount should be applied.' />
                  <select
                    className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    value={offerForm.offer_type}
                    onChange={(e) => setOfferForm((c) => ({ ...c, offer_type: e.target.value }))}
                  >
                    <option value='combo_price'>Combo price</option>
                    <option value='buy_x_get_y'>Buy X Get Y</option>
                    <option value='free_item'>Free item</option>
                    <option value='flat_discount'>Flat discount</option>
                    <option value='percentage_discount'>Percentage discount</option>
                    <option value='coupon'>Coupon</option>
                  </select>
                </div>
                {offerForm.offer_type === 'combo_price' ? (
                  <div className='space-y-2'>
                    <FieldLabel label='Final combo price' helper='Combo me selected items ka final selling price.' />
                    <Input
                      type='number'
                      placeholder='Example: 249'
                      value={emptyWhenZero(offerForm.combo_price)}
                      onChange={(e) => setOfferForm((c) => ({ ...c, combo_price: e.target.value }))}
                    />
                    <div className='grid grid-cols-3 gap-2'>
                      <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                        <p className='text-[11px] font-semibold uppercase text-slate-500'>Worth</p>
                        <p className='text-sm font-bold text-slate-900'>{money(comboWorth)}</p>
                      </div>
                      <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                        <p className='text-[11px] font-semibold uppercase text-slate-500'>Combo</p>
                        <p className='text-sm font-bold text-slate-900'>{money(comboPrice)}</p>
                      </div>
                      <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2'>
                        <p className='text-[11px] font-semibold uppercase text-emerald-700'>Save</p>
                        <p className='text-sm font-bold text-emerald-700'>{money(comboSavings)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {offerForm.offer_type === 'percentage_discount' ? (
                  <div className='space-y-2'>
                    <FieldLabel label='Discount percentage' helper='Percentage discount customers will receive.' />
                    <Input
                      type='number'
                      placeholder='Example: 20'
                      value={emptyWhenZero(offerForm.discount_percent)}
                      onChange={(e) => setOfferForm((c) => ({ ...c, discount_percent: e.target.value }))}
                    />
                  </div>
                ) : null}
                {offerForm.offer_type === 'flat_discount' ? (
                  <div className='space-y-2'>
                    <FieldLabel label='Flat discount amount' helper='Cart/order par fixed rupee discount.' />
                    <Input
                      type='number'
                      placeholder='Example: 50'
                      value={emptyWhenZero(offerForm.flat_discount)}
                      onChange={(e) => setOfferForm((c) => ({ ...c, flat_discount: e.target.value }))}
                    />
                  </div>
                ) : null}
                {offerForm.offer_type === 'free_item' || offerForm.offer_type === 'buy_x_get_y' ? (
                  <div className='space-y-2'>
                    <FieldLabel label='Free item name' helper='Free item customers will receive with the offer.' />
                    <Input placeholder='Example: Coke Can' value={offerForm.free_item_name} onChange={(e) => setOfferForm((c) => ({ ...c, free_item_name: e.target.value }))} />
                  </div>
                ) : null}
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-2'>
                    <FieldLabel label='Offer start date' helper='Is date se offer active maana jayega.' />
                    <Input type='date' value={offerForm.start_date} onChange={(e) => setOfferForm((c) => ({ ...c, start_date: e.target.value }))} />
                  </div>
                  <div className='space-y-2'>
                    <FieldLabel label='Offer end date' helper='Is date ke baad offer expire ho jayega.' />
                    <Input type='date' value={offerForm.end_date} onChange={(e) => setOfferForm((c) => ({ ...c, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className='space-y-3 rounded-lg border border-slate-200 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-medium text-slate-700'>Combo builder</p>
                      <p className='text-xs text-slate-500'>Select items from the dropdown, add quantity, then set the final combo price.</p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() =>
                        setOfferForm((current) => ({
                          ...current,
                          combo_items: [...current.combo_items, createEmptyComboItem()],
                        }))
                      }
                    >
                      Add Combo Item
                    </Button>
                  </div>

                  {comboPreviewItems.length ? (
                    <div className='rounded-xl border border-amber-200 bg-amber-50 p-3'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-amber-700'>Storefront preview</p>
                      <div className='mt-3 flex items-center gap-3 overflow-x-auto pb-2'>
                        {comboPreviewItems.map((item) => (
                          <div key={`${item.key}-preview`} className='min-w-[120px] rounded-xl bg-white p-3 text-center shadow-sm'>
                            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50'>
                              {item.image ? (
                                <img src={item.image} alt={item.name} className='h-14 w-14 object-contain' />
                              ) : (
                                <span className='text-[10px] font-semibold uppercase text-slate-400'>No image</span>
                              )}
                            </div>
                            <p className='mt-2 line-clamp-2 text-xs font-semibold text-slate-900'>
                              {item.quantity} x {item.name}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className='mt-2 text-sm font-bold text-slate-900'>
                        {comboAutoTitle || 'Combo title will appear here'}
                      </p>
                      <p className='mt-1 text-xs font-semibold text-slate-600'>
                        Worth {money(comboWorth)} | Combo {money(comboPrice)} | Save {money(comboSavings)}
                      </p>
                    </div>
                  ) : null}

                  <div className='max-h-[320px] space-y-3 overflow-y-auto pr-2'>
                    {offerForm.combo_items.map((item, index) => {
                      const selectedMenuItem = menuItems.find((menuItem) => menuItem._id === item.menu_item_id)
                      return (
                        <div
                          key={`combo-${index}`}
                          className='rounded-xl border border-slate-200 bg-slate-50/70 p-3'
                        >
                          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            Combo item {index + 1}
                          </p>
                          <div className='grid gap-3 sm:grid-cols-[70px_minmax(0,1fr)]'>
                            <div className='flex h-[70px] w-[70px] items-center justify-center rounded-xl border border-slate-200 bg-white'>
                              {getMenuItemImage(selectedMenuItem) ? (
                                <img
                                  src={getMenuItemImage(selectedMenuItem)}
                                  alt={selectedMenuItem?.item_name || 'Selected item'}
                                  className='h-14 w-14 object-contain'
                                />
                              ) : (
                                <span className='px-2 text-center text-[10px] font-semibold uppercase text-slate-400'>Select item</span>
                              )}
                            </div>
                            <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_104px]'>
                              <div className='space-y-1'>
                                <FieldLabel label='Combo item' helper='Select an item from the menu.' />
                                <select
                                  value={item.menu_item_id || ''}
                                  onChange={(e) => selectComboMenuItem(index, e.target.value)}
                                  className='min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring'
                                >
                                  <option value=''>Select food item</option>
                                  {menuItems.map((menuItem) => (
                                    <option key={menuItem._id} value={menuItem._id}>
                                      {menuItem.item_name} {menuItem.category ? `(${menuItem.category})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className='space-y-1'>
                                <FieldLabel label='Quantity' helper='Kitni quantity.' />
                                <Input
                                  type='number'
                                  min={1}
                                  placeholder='Example: 1'
                                  value={emptyWhenZero(item.quantity)}
                                  onChange={(e) =>
                                    updateComboItem(index, 'quantity', Number(e.target.value || 1))
                                  }
                                  className='min-w-0 bg-white'
                                />
                              </div>
                              <div className='space-y-1'>
                                <FieldLabel label='Action' helper='Remove this item.' />
                                <Button
                                  type='button'
                                  variant='outline'
                                  className='w-full'
                                  onClick={() =>
                                    setOfferForm((current) => ({
                                      ...current,
                                      combo_items:
                                        current.combo_items.length === 1
                                          ? [createEmptyComboItem()]
                                          : current.combo_items.filter((_, itemIndex) => itemIndex !== index),
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            {selectedMenuItem ? (
                              <p className='sm:col-start-2 text-xs text-slate-500'>
                                Unit price {money(getMenuItemPrice(selectedMenuItem))} | Line total {money(getMenuItemPrice(selectedMenuItem) * Math.max(1, Number(item.quantity || 1)))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Switch checked={offerForm.is_active} onCheckedChange={(checked) => setOfferForm((c) => ({ ...c, is_active: checked }))} />
                  <span className='text-sm text-slate-700'>Offer active</span>
                </div>
                <div className='flex gap-2'>
                  <Button onClick={saveOffer} disabled={savingOffer}>{savingOffer ? 'Saving...' : offerForm.id ? 'Update Offer' : 'Create Offer'}</Button>
                  <Button variant='outline' onClick={resetOfferForm}>Reset</Button>
                </div>
              </CardContent>
            </Card>
            ) : null}
            {activeSection === 'all-offers' ? (
            <Card>
              <CardHeader><CardTitle>Offers</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Offer</TableHead><TableHead>Benefit</TableHead><TableHead>Status</TableHead><TableHead className='text-right'>Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer._id}>
                        <TableCell><div><p className='font-medium'>{offer.offer_title}</p><p className='text-xs text-slate-500'>{offer.offer_type}</p></div></TableCell>
                        <TableCell>{offer.combo_price ? money(offer.combo_price) : offer.discount_percent ? `${offer.discount_percent}%` : offer.flat_discount ? money(offer.flat_discount) : offer.free_item_name || '-'}</TableCell>
                        <TableCell><Badge variant='outline'>{offer.is_active ? 'active' : 'inactive'}</Badge></TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button variant='outline' onClick={() => void previewFoodOffers()}>Preview</Button>
                            <Button variant='outline' onClick={() => startEditOffer(offer)}>Edit</Button>
                            <Button variant='outline' onClick={() => removeOffer(offer._id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && !offers.length ? <TableRow><TableCell colSpan={4} className='text-center text-sm text-slate-500'>No offers yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            ) : null}
          </div>
        </section>
        ) : null}

        {activeSection === 'orders' ? (
        <section id='orders'>
          <Card>
            <CardHeader><CardTitle>Order Management Form / Panel</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-4 md:hidden'>
                {orders.map((order) => (
                  <div key={order._id} className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                    <div className='flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3'>
                      <div className='min-w-0'>
                        <p className='text-sm font-semibold text-slate-900 break-all'>{order.order_number}</p>
                        <p className='mt-1 text-sm text-slate-500'>{money(order.total)}</p>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Badge variant='outline'>{formatLabel(order.payment_method || 'cod')}</Badge>
                        <Badge variant='outline'>{formatLabel(order.payment_status || 'pending')}</Badge>
                        <Badge variant='outline'>{formatLabel(order.status)}</Badge>
                        <Badge variant='outline'>{formatLabel(order.refund_status || 'none')}</Badge>
                      </div>
                    </div>

                    <div className='mt-3 space-y-3'>
                      <div>
                        <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Items</p>
                        <p className='mt-1 text-sm text-slate-700'>
                          {order.items.map((item) => `${item.product_name} x${item.quantity}`).join(', ') || 'No items'}
                        </p>
                      </div>
                      <div>
                        {(() => {
                          const address = getOrderAddress(order)
                          const isExpanded = expandedAddressOrderId === order._id
                          const previewAddress = truncateText(address, 72)

                          return (
                            <>
                        <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Customer</p>
                        <p className='mt-1 text-sm font-medium text-slate-900'>{order.shipping_address?.full_name || 'Customer'}</p>
                        <p className='text-sm text-slate-600'>{order.shipping_address?.phone || '-'}</p>
                        <p className='text-sm text-slate-600'>
                          {(isExpanded ? address : previewAddress) || '-'}
                        </p>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {address.length > 72 ? (
                            <button
                              type='button'
                              onClick={() =>
                                setExpandedAddressOrderId(isExpanded ? '' : order._id)
                              }
                              className='text-xs font-medium text-slate-700 underline underline-offset-4'
                            >
                              {isExpanded ? 'Collapse address' : 'See more'}
                            </button>
                          ) : null}
                          <button
                            type='button'
                            onClick={() => copyOrderAddress(order)}
                            className='text-xs font-medium text-slate-700 underline underline-offset-4'
                          >
                            Copy address
                          </button>
                        </div>
                        {order.shipping_address?.landmark ? (
                          <p className='text-sm text-slate-500'>Landmark: {order.shipping_address.landmark}</p>
                        ) : null}
                            </>
                          )
                        })()}
                      </div>
                      <div className='space-y-2'>
                        <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Update Status</p>
                        <div className='grid grid-cols-2 gap-2'>
                          {ORDER_STATUSES.map((status) => (
                            <Button key={status} variant='outline' className='h-auto whitespace-normal py-2 text-xs' onClick={() => updateOrder(order._id, status)}>
                              {formatLabel(status)}
                            </Button>
                          ))}
                          <Button variant='outline' className='h-auto whitespace-normal py-2 text-xs' onClick={() => updateOrder(order._id, 'cancelled')}>
                            Cancelled
                          </Button>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>Refund Actions</p>
                        <div className='grid grid-cols-2 gap-2'>
                          {REFUND_STATUSES.map((refund) => (
                            <Button
                              key={refund.value}
                              variant='outline'
                              className='h-auto whitespace-normal py-2 text-xs'
                              onClick={() => updateOrder(order._id, order.status, refund.value)}
                            >
                              {formatLabel(refund.label)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && !orders.length ? (
                  <div className='rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500'>
                    No food orders yet.
                  </div>
                ) : null}
              </div>

              <div className='hidden md:block'>
                <div className='overflow-x-auto rounded-xl border border-slate-200'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[240px] min-w-[240px]'>Order</TableHead>
                        <TableHead className='w-[280px] min-w-[280px]'>Customer</TableHead>
                        <TableHead className='w-[170px] min-w-[170px]'>Payment</TableHead>
                        <TableHead className='min-w-[120px]'>Status</TableHead>
                        <TableHead className='min-w-[120px]'>Refund</TableHead>
                        <TableHead className='min-w-[320px] text-right'>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order._id} className='align-top'>
                          <TableCell>
                            <div className='max-w-[220px] space-y-1'>
                              <p className='font-medium break-all'>{order.order_number}</p>
                              <p className='text-xs text-slate-500'>{order.items.map((item) => `${item.product_name} x${item.quantity}`).join(', ')}</p>
                              <p className='text-xs font-medium text-slate-700'>{money(order.total)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='max-w-[260px] space-y-1'>
                              {(() => {
                                const address = getOrderAddress(order)
                                const previewAddress = truncateText(address, 42)

                                return (
                                  <>
                              <p className='font-medium'>{order.shipping_address?.full_name || 'Customer'}</p>
                              <p className='text-xs text-slate-500'>{order.shipping_address?.phone || '-'}</p>
                              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                                <p className='text-xs leading-5 text-slate-500'>
                                {previewAddress || '-'}
                                </p>
                              </div>
                              <div className='flex flex-wrap gap-2 pt-1'>
                                {address.length > 58 ? (
                                  <button
                                    type='button'
                                    onClick={() => setAddressModalOrder(order)}
                                    className='w-fit text-xs font-medium text-slate-700 underline underline-offset-4'
                                  >
                                    View full address
                                  </button>
                                ) : null}
                                <button
                                  type='button'
                                  onClick={() => copyOrderAddress(order)}
                                  className='w-fit text-xs font-medium text-slate-700 underline underline-offset-4'
                                >
                                  Copy address
                                </button>
                              </div>
                              {order.shipping_address?.landmark ? <p className='text-xs text-slate-500'>Landmark: {truncateText(order.shipping_address.landmark, 28)}</p> : null}
                                  </>
                                )
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='min-w-[150px] space-y-2'>
                              <p className='text-sm font-medium'>{formatLabel(order.payment_method || 'cod')}</p>
                              <Badge variant='outline'>{formatLabel(order.payment_status || 'pending')}</Badge>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant='outline'>{formatLabel(order.status)}</Badge></TableCell>
                          <TableCell><Badge variant='outline'>{formatLabel(order.refund_status || 'none')}</Badge></TableCell>
                          <TableCell className='text-right'>
                            <div className='flex flex-wrap justify-end gap-2'>
                              {ORDER_STATUSES.map((status) => (
                                <Button key={status} variant='outline' className='h-auto whitespace-normal py-2 text-xs' onClick={() => updateOrder(order._id, status)}>
                                  {formatLabel(status)}
                                </Button>
                              ))}
                              <Button variant='outline' className='h-auto whitespace-normal py-2 text-xs' onClick={() => updateOrder(order._id, 'cancelled')}>
                                Cancelled
                              </Button>
                              {REFUND_STATUSES.map((refund) => (
                                <Button
                                  key={refund.value}
                                  variant='outline'
                                  className='h-auto whitespace-normal py-2 text-xs'
                                  onClick={() => updateOrder(order._id, order.status, refund.value)}
                                >
                                  {formatLabel(refund.label)}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && !orders.length ? <TableRow><TableCell colSpan={6} className='text-center text-sm text-slate-500'>No food orders yet.</TableCell></TableRow> : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        ) : null}
      </div>

      <Dialog open={restaurantEditorOpen} onOpenChange={setRestaurantEditorOpen}>
        <DialogContent className='w-[min(96vw,1100px)] max-h-[92vh] overflow-y-auto rounded-xl p-0'>
          <div className='border-b border-slate-200 bg-slate-50 px-6 py-5'>
            <DialogHeader className='text-left'>
              <DialogTitle>
                {restaurant.restaurant_name ? 'Edit restaurant setup' : 'Create restaurant setup'}
              </DialogTitle>
              <DialogDescription>
                Update the saved restaurant profile without mixing live data into the main dashboard view.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className='grid gap-3 px-6 py-5 md:grid-cols-2'>
            <div className='space-y-2'>
              <FieldLabel label='Restaurant name' helper='This name appears in the storefront header, hero, and profile.' />
              <Input placeholder='Example: Spice Route Kitchen' value={restaurantDraft.restaurant_name} onChange={(e) => setRestaurantDraft((c) => ({ ...c, restaurant_name: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Mobile number' helper='Customers use this number for calls and orders.' />
              <Input placeholder='Example: 9876543210' value={restaurantDraft.mobile} onChange={(e) => setRestaurantDraft((c) => ({ ...c, mobile: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Email address' helper='Restaurant support/contact email.' />
              <Input placeholder='Example: hello@spiceroutekitchen.com' value={restaurantDraft.email} onChange={(e) => setRestaurantDraft((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Restaurant logo URL' helper='Paste a logo URL or upload an image below.' />
              <Input placeholder='Example: https://res.cloudinary.com/.../logo.png' value={restaurantDraft.logo_url} onChange={(e) => setRestaurantDraft((c) => ({ ...c, logo_url: e.target.value }))} />
              <FieldLabel label='Upload logo' helper='Square logo best rahega, jaise 512 x 512 px.' />
              <Input
                type='file'
                accept='image/*'
                onChange={(e) =>
                  void handleUpload(e.target.files?.[0], 'logo_url')
                }
              />
              {uploadingField === 'logo_url' ? (
                <p className='text-xs text-slate-500'>Uploading logo...</p>
              ) : null}
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Food type' helper='Select what type of food the restaurant serves.' />
              <div className='grid gap-2 sm:grid-cols-2'>
                {RESTAURANT_FOOD_TYPE_OPTIONS.map((option) => {
                  const checked = restaurantFoodTypeSelections.includes(
                    option.value
                  )

                  return (
                    <label
                      key={option.value}
                      className='flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-input bg-background px-3 text-sm text-slate-800'
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          updateRestaurantFoodType(
                            option.value,
                            nextChecked === true
                          )
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className='space-y-2'>
              <FieldLabel label='FSSAI / license number' helper='Restaurant ka food license number.' />
              <Input placeholder='Example: FSSAI-22724567000123' value={restaurantDraft.fssai_license_number} onChange={(e) => setRestaurantDraft((c) => ({ ...c, fssai_license_number: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='GST number' helper='Add the GST number if available.' />
              <Input placeholder='Example: 09ABCDE1234F1Z5' value={restaurantDraft.gst_number} onChange={(e) => setRestaurantDraft((c) => ({ ...c, gst_number: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='City' />
              <Input placeholder='Example: Greater Noida' value={restaurantDraft.city} onChange={(e) => setRestaurantDraft((c) => ({ ...c, city: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='State' />
              <Input placeholder='Example: Uttar Pradesh' value={restaurantDraft.state} onChange={(e) => setRestaurantDraft((c) => ({ ...c, state: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Pincode' />
              <Input placeholder='Example: 201309' value={restaurantDraft.pincode} onChange={(e) => setRestaurantDraft((c) => ({ ...c, pincode: e.target.value }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Delivery radius (KM)' helper='Restaurant kitne KM tak delivery karega.' />
              <Input type='number' placeholder='Example: 5' value={restaurantDraft.delivery_radius_km} onChange={(e) => setRestaurantDraft((c) => ({ ...c, delivery_radius_km: Number(e.target.value || 0) }))} />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Minimum order amount' helper='Minimum cart value. 0 rakhenge to no minimum.' />
              <Input type='number' placeholder='Example: 199' value={restaurantDraft.minimum_order_amount} onChange={(e) => setRestaurantDraft((c) => ({ ...c, minimum_order_amount: Number(e.target.value || 0) }))} />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <FieldLabel label='Full restaurant address' helper='Complete address shown in the storefront contact section.' />
              <Textarea className='min-h-[88px]' placeholder='Example: Shop No. 12, Food Street Plaza, Sector 62, Noida, Uttar Pradesh, 201309' value={restaurantDraft.address} onChange={(e) => setRestaurantDraft((c) => ({ ...c, address: e.target.value }))} />
            </div>
            <div className='space-y-3 md:col-span-2'>
              <p className='text-sm font-medium text-slate-700'>Opening hours</p>
              <div className='rounded-lg border border-slate-200 p-4'>
                <div className='space-y-3 md:overflow-x-auto md:pb-2'>
                  <div className='space-y-3 md:min-w-[760px]'>
                    {restaurantDraft.opening_hours.map((slot, index) => (
                      <div
                        key={slot.day}
                        className='rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid md:grid-cols-[180px_160px_160px_140px] md:items-center md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0'
                      >
                        <div className='grid gap-3 md:contents'>
                          <div className='space-y-1'>
                            <FieldLabel label='Day' />
                            <Input value={slot.day} readOnly className='w-full bg-white' />
                          </div>
                          <div className='grid gap-3 sm:grid-cols-2 md:contents'>
                            <div className='space-y-1'>
                              <FieldLabel label='Opening time' />
                              <Input
                                type='time'
                                value={slot.open}
                                className='w-full bg-white'
                                disabled={slot.is_closed}
                                onChange={(e) => updateOpeningHour(index, 'open', e.target.value)}
                              />
                            </div>
                            <div className='space-y-1'>
                              <FieldLabel label='Closing time' />
                              <Input
                                type='time'
                                value={slot.close}
                                className='w-full bg-white'
                                disabled={slot.is_closed}
                                onChange={(e) => updateOpeningHour(index, 'close', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className='mt-3 flex w-full items-center gap-3 md:mt-0 md:min-w-[140px]'>
                          <Switch
                            checked={slot.is_closed}
                            onCheckedChange={(checked) =>
                              updateOpeningHour(index, 'is_closed', checked)
                            }
                          />
                          <span className='text-sm text-slate-700'>Closed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className='mt-2 hidden text-xs text-slate-500 md:block'>
                  Scroll horizontally if timings are not fully visible.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Switch checked={restaurantDraft.is_active} onCheckedChange={(checked) => setRestaurantDraft((c) => ({ ...c, is_active: checked }))} />
              <span className='text-sm text-slate-700'>Restaurant active</span>
            </div>
            <div className='flex flex-col gap-3 md:col-span-2 md:flex-row md:justify-end'>
              <Button
                variant='outline'
                onClick={() => {
                  setRestaurantDraft(restaurant)
                  setRestaurantEditorOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveRestaurant} disabled={savingRestaurant}>
                {savingRestaurant ? 'Saving...' : 'Save Restaurant Setup'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(addressModalOrder)} onOpenChange={(open) => !open && setAddressModalOrder(null)}>
        <DialogContent className='w-[min(96vw,560px)] rounded-xl p-0'>
          <div className='border-b border-slate-200 bg-slate-50 px-6 py-5'>
            <DialogHeader className='text-left'>
              <DialogTitle>Customer address</DialogTitle>
              <DialogDescription>
                {addressModalOrder?.order_number || 'Order details'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className='space-y-4 px-6 py-5'>
            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <p className='text-sm font-semibold text-slate-900'>
                {addressModalOrder?.shipping_address?.full_name || 'Customer'}
              </p>
              <p className='mt-1 text-sm text-slate-600'>
                {addressModalOrder?.shipping_address?.phone || '-'}
              </p>
              <div className='mt-3 space-y-2 text-sm text-slate-700'>
                {addressModalOrder ? (
                  getOrderAddressLines(addressModalOrder).length ? (
                    getOrderAddressLines(addressModalOrder).map((line) => (
                      <p key={line}>{line}</p>
                    ))
                  ) : (
                    <p>-</p>
                  )
                ) : null}
              </div>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={() => addressModalOrder && void copyOrderAddress(addressModalOrder)}
              >
                Copy address
              </Button>
              <Button variant='outline' onClick={() => setAddressModalOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
