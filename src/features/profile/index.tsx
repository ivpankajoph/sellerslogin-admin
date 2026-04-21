import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { type AppDispatch } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Camera,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
  UserRound,
  X,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { uploadImage } from '@/lib/upload-image'
import { PASSWORD_REQUIREMENTS, isStrongPassword } from '@/lib/password-rules'
import { cn, getImageUrl } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { PasswordInput } from '@/components/password-input'

type EditableField = {
  key: string
  label: string
  placeholder: string
  type?: 'text' | 'email' | 'tel' | 'textarea'
  control?: 'input' | 'textarea' | 'select' | 'multiselect' | 'country' | 'state' | 'city'
  options?: string[]
}

type EditableSection = {
  title: string
  description: string
  icon: typeof Store
  fields: EditableField[]
}

type CountryOption = {
  name: string
  code?: string
  flagUrl?: string
}

const ADMIN_PROFILE_SECTIONS: EditableSection[] = [
  {
    title: 'Account Details',
    description: 'Keep your primary account details up to date.',
    icon: UserRound,
    fields: [
      { key: 'name', label: 'Full Name', placeholder: 'Your name' },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'name@example.com',
        type: 'email',
      },
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+91 9876543210',
        type: 'tel',
      },
    ],
  },
]

const VENDOR_PROFILE_SECTIONS: EditableSection[] = [
  {
    title: 'Business Details',
    description: 'Core business identity details from your onboarding flow.',
    icon: Store,
    fields: [
      { key: 'name', label: 'Store Name', placeholder: 'Store name' },
      {
        key: 'registrar_name',
        label: 'Registrar Name',
        placeholder: 'Owner or registrar name',
      },
      {
        key: 'designation',
        label: 'Designation',
        placeholder: 'Owner, Founder, Director',
        control: 'select',
      },
      {
        key: 'business_type',
        label: 'Business Type',
        placeholder: 'Manufacturer, Wholesaler, Retailer',
        control: 'multiselect',
      },
      {
        key: 'established_year',
        label: 'Established Year',
        placeholder: '2024',
        control: 'select',
      },
    ],
  },
  {
    title: 'Contact Details',
    description: 'Primary contact details for this account.',
    icon: MapPin,
    fields: [
      {
        key: 'email',
        label: 'Email',
        placeholder: 'support@store.com',
        type: 'email',
      },
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+91 9876543210',
        type: 'tel',
      },
      {
        key: 'alternate_contact_phone',
        label: 'Alternate Phone',
        placeholder: '+91 9000000000',
        type: 'tel',
      },
    ],
  },
  {
    title: 'Address',
    description: 'Business address and location from the skipped registration steps.',
    icon: MapPin,
    fields: [
      {
        key: 'address',
        label: 'Address',
        placeholder: 'Full business address',
        type: 'textarea',
      },
      { key: 'country', label: 'Country', placeholder: 'India', control: 'country' },
      { key: 'state', label: 'State', placeholder: 'State', control: 'state' },
      { key: 'city', label: 'City', placeholder: 'City', control: 'city' },
      { key: 'pincode', label: 'Pincode', placeholder: '400001' },
      { key: 'street', label: 'Street', placeholder: 'Street or locality' },
    ],
  },
  {
    title: 'Business Profile',
    description: 'Finish the profile information that was previously collected during registration.',
    icon: Store,
    fields: [
      {
        key: 'business_nature',
        label: 'Business Nature',
        placeholder: 'Exporter, Manufacturer, Trader',
        control: 'multiselect',
      },
      {
        key: 'categories',
        label: 'Categories',
        placeholder: 'Category names separated by commas',
        control: 'multiselect',
      },
      {
        key: 'dealing_area',
        label: 'Dealing Area',
        placeholder: 'India, UAE, Global',
        control: 'multiselect',
      },
      {
        key: 'annual_turnover',
        label: 'Annual Turnover',
        placeholder: '0 - 25 Lakh',
        control: 'select',
      },
      {
        key: 'office_employees',
        label: 'Employees',
        placeholder: '1 - 10',
        control: 'select',
      },
      {
        key: 'return_policy',
        label: 'Return Policy',
        placeholder: '7 days replacement',
        control: 'select',
      },
    ],
  },
]

const normalizeRole = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
const extractProfile = (payload: any) =>
  payload?.vendor ||
  payload?.data ||
  payload?.user ||
  payload?.admin ||
  payload ||
  null
const readString = (value: unknown) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'number') return String(value)
  return typeof value === 'string' ? value : ''
}
const formatRoleLabel = (value: unknown) => {
  const normalized = normalizeRole(value)
  if (!normalized) return '-'
  if (normalized === 'superadmin') return 'Admin'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}
const toBoolean = (value: unknown) =>
  value === true ||
  value === 1 ||
  String(value || '')
    .trim()
    .toLowerCase() === 'true'
const toArray = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter(Boolean).map((item) => String(item))
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed
      ? trimmed
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  }
  return []
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

const currentYear = new Date().getFullYear()

const MULTI_SELECT_FIELD_KEYS = new Set([
  'business_type',
  'business_nature',
  'categories',
  'dealing_area',
])

const FIELD_OPTIONS: Record<string, string[]> = {
  designation: [
    'Owner',
    'Founder',
    'Co-Founder',
    'Director',
    'Managing Director',
    'CEO',
    'Partner',
    'Manager',
    'Sales Head',
    'Operations Head',
    'Authorized Representative',
  ],
  business_type: [
    'Manufacturer',
    'Wholesaler',
    'Retailer',
    'Distributor',
    'Exporter',
    'Importer',
    'Trader',
    'Service Provider',
    'Marketplace Seller',
  ],
  established_year: Array.from({ length: 80 }, (_, index) =>
    String(currentYear - index)
  ),
  business_nature: [
    'Manufacturer',
    'Wholesaler',
    'Retailer',
    'Exporter',
    'Importer',
    'Trader',
    'Distributor',
    'Service Provider',
    'Supplier',
  ],
  categories: [
    'Electronics',
    'Fashion',
    'Home & Kitchen',
    'Beauty & Personal Care',
    'Health & Wellness',
    'Grocery',
    'Sports & Fitness',
    'Toys & Baby Products',
    'Automotive',
    'Industrial Supplies',
    'Food & Beverages',
  ],
  dealing_area: [
    'Local',
    'City-wide',
    'State-wide',
    'Pan India',
    'International',
    'Wholesale Market',
    'Retail Market',
    'Online Only',
  ],
  annual_turnover: [
    'Below 10 Lakh',
    '10 Lakh - 25 Lakh',
    '25 Lakh - 50 Lakh',
    '50 Lakh - 1 Crore',
    '1 Crore - 5 Crore',
    '5 Crore - 10 Crore',
    'Above 10 Crore',
  ],
  office_employees: [
    '1 - 5',
    '6 - 10',
    '11 - 25',
    '26 - 50',
    '51 - 100',
    '101 - 250',
    '250+',
  ],
  return_policy: [
    'No return',
    'Replacement only',
    '3 days return',
    '7 days return',
    '10 days return',
    '15 days return',
    '30 days return',
  ],
}

const FALLBACK_COUNTRIES = [
  { name: 'India', code: 'IN', flagUrl: '' },
  { name: 'United Arab Emirates', code: 'AE', flagUrl: '' },
  { name: 'United States', code: 'US', flagUrl: '' },
  { name: 'United Kingdom', code: 'GB', flagUrl: '' },
  { name: 'Canada', code: 'CA', flagUrl: '' },
  { name: 'Australia', code: 'AU', flagUrl: '' },
]

const getProfileImageValue = (source: Record<string, unknown> | null, fallback: any) =>
  source?.avatar ||
  source?.profile_pic ||
  source?.profilePic ||
  source?.profile_image ||
  source?.profileImage ||
  source?.logo ||
  fallback?.avatar ||
  fallback?.profile_pic ||
  fallback?.profilePic ||
  fallback?.profile_image ||
  fallback?.profileImage ||
  fallback?.logo

function ProfileCompletionRing({ value }: { value: number }) {
  const safeValue = clampPercent(value)
  return (
    <div className='relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-inner'>
      <div
        className='absolute inset-0 rounded-full transition-all duration-1000 ease-in-out shadow-sm'
        style={{
          background: `conic-gradient(from 0deg, #8b5cf6, #6d28d9 ${safeValue}%, #f1f5f9 ${safeValue}% 100%)`,
        }}
      />
      <div className='absolute inset-[6px] rounded-full bg-white shadow-sm flex items-center justify-center'>
        <div className='text-lg font-bold bg-gradient-to-br from-violet-700 to-indigo-700 bg-clip-text text-transparent'>
          {safeValue}%
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()

  const user = useSelector((state: any) => state.auth.user)
  const token = useSelector((state: any) => state.auth.token)
  const isVendor = normalizeRole(user?.role) === 'vendor'

  const profileSections = isVendor
    ? VENDOR_PROFILE_SECTIONS
    : ADMIN_PROFILE_SECTIONS
  const editableFieldKeys = useMemo(
    () => profileSections.flatMap((s) => s.fields.map((f) => f.key)),
    [profileSections]
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const passwordSectionRef = useRef<HTMLDivElement | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [countries, setCountries] = useState<CountryOption[]>(FALLBACK_COUNTRIES)
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [customSelectFields, setCustomSelectFields] = useState<Record<string, boolean>>({})
  const [customSelectValues, setCustomSelectValues] = useState<Record<string, string>>({})
  const [locationLoading, setLocationLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  })

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)
  const [passwordOtp, setPasswordOtp] = useState('')
  const [passwordOtpSending, setPasswordOtpSending] = useState(false)
  const [passwordOtpVerifying, setPasswordOtpVerifying] = useState(false)

  useEffect(() => {
    const scrollToPasswordSection = () => {
      if (typeof window === 'undefined') return
      if (window.location.hash !== '#change-password') return

      window.requestAnimationFrame(() => {
        passwordSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }

    scrollToPasswordSection()
    window.addEventListener('hashchange', scrollToPasswordSection)

    return () => {
      window.removeEventListener('hashchange', scrollToPasswordSection)
    }
  }, [])

  const summaryFields = useMemo(
    () => [
      {
        label: 'Business type',
        value: readString(profile?.business_type || form.business_type),
      },
      {
        label: 'Established year',
        value: readString(profile?.established_year || form.established_year),
      },
      {
        label: 'Annual turnover',
        value: readString(profile?.annual_turnover || form.annual_turnover),
      },
      {
        label: 'Employees',
        value: readString(profile?.office_employees || form.office_employees),
      },
      {
        label: 'Return policy',
        value: readString(profile?.return_policy || form.return_policy),
      },
    ],
    [profile, form]
  )

  const [activeSummary, setActiveSummary] = useState(
    summaryFields[0]?.label ?? ''
  )
  const activeSummaryField = useMemo(
    () =>
      summaryFields.find((f) => f.label === activeSummary) ?? summaryFields[0],
    [activeSummary, summaryFields]
  )

  const businessNatureChips = toArray(
    profile?.business_nature || form.business_nature
  )
  const categoryChips = toArray(profile?.categories || form.categories)
  const dealingAreaChips = toArray(profile?.dealing_area || form.dealing_area)
  const selectedCountry = countries.find(
    (country) =>
      country.name.toLowerCase() === String(form.country || '').trim().toLowerCase()
  )
  const profileEndpoint = isVendor ? '/vendor/profile' : '/admin/profile'
  const passwordEndpoint = isVendor ? '/vendor/profile/password' : '/profile/admin'

  const fetchCatalog = async (path: string) => {
    const baseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!response.ok) throw new Error('Catalog request failed')
    return response.json()
  }

  const syncLocalState = (source: Record<string, unknown> | null) => {
    const nextProfile = source && typeof source === 'object' ? source : {}
    const nextForm = editableFieldKeys.reduce<Record<string, string>>(
      (acc, key) => {
        acc[key] = readString(nextProfile[key] ?? user?.[key])
        return acc
      },
      {}
    )
    setProfile(nextProfile)
    setForm(nextForm)
    setCustomSelectFields({})
    setCustomSelectValues({})
    const nextAvatar = getImageUrl(getProfileImageValue(nextProfile, user)) || ''
    setAvatarUrl(nextAvatar)
    setAvatarPreview(nextAvatar || null)
  }

  useEffect(() => {
    if (!user?.id && !user?._id && !user?.vendor_id) return
    const loadProfile = async () => {
      try {
        setLoading(true)
        setErrorMessage('')
        const res = await api.get(profileEndpoint).catch((firstError) => {
          if (!isVendor) throw firstError
          return api.get('/vendors/profile')
        })
        const fetched = extractProfile(res.data)
        if (fetched) {
          dispatch(setUser({ ...user, ...fetched }))
          syncLocalState(fetched)
          if (isVendor) void dispatch(fetchVendorProfile())
        }
      } catch (error: any) {
        setErrorMessage(
          error?.response?.data?.message || 'Failed to load profile.'
        )
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [dispatch, isVendor, profileEndpoint, user?.id, user?._id, user?.vendor_id])

  useEffect(() => {
    if (!isVendor || !token) return

    const loadCountries = async () => {
      try {
        setLocationLoading((prev) => ({ ...prev, countries: true }))
        const payload = await fetchCatalog('/cities/countries')
        const nextCountries = Array.isArray(payload?.data)
          ? payload.data
              .map((country: any) => ({
                name: String(country?.name || '').trim(),
                code: String(country?.code || '').trim(),
                flagUrl: String(country?.flagUrl || '').trim(),
              }))
              .filter((country: CountryOption) => country.name)
          : []

        if (nextCountries.length) setCountries(nextCountries)
      } catch {
        setCountries(FALLBACK_COUNTRIES)
      } finally {
        setLocationLoading((prev) => ({ ...prev, countries: false }))
      }
    }

    void loadCountries()
  }, [isVendor, token])

  useEffect(() => {
    if (!isVendor || !token || !form.country) {
      setStates([])
      return
    }

    const loadStates = async () => {
      try {
        setLocationLoading((prev) => ({ ...prev, states: true }))
        const payload = await fetchCatalog(
          `/cities/states?country=${encodeURIComponent(form.country)}`
        )
        setStates(Array.isArray(payload?.states) ? payload.states : [])
      } catch {
        setStates([])
      } finally {
        setLocationLoading((prev) => ({ ...prev, states: false }))
      }
    }

    void loadStates()
  }, [form.country, isVendor, token])

  useEffect(() => {
    if (!isVendor || !token || !form.country || !form.state) {
      setCities([])
      return
    }

    const loadCities = async () => {
      try {
        setLocationLoading((prev) => ({ ...prev, cities: true }))
        const payload = await fetchCatalog(
          `/cities/discover?country=${encodeURIComponent(form.country)}&state=${encodeURIComponent(form.state)}`
        )
        setCities(Array.isArray(payload?.cities) ? payload.cities : [])
      } catch {
        setCities([])
      } finally {
        setLocationLoading((prev) => ({ ...prev, cities: false }))
      }
    }

    void loadCities()
  }, [form.country, form.state, isVendor, token])

  const displayName =
    readString(profile?.name || user?.name || user?.business_name) || 'Profile'
  const displayEmail = readString(profile?.email || user?.email) || '-'
  const displayPhone = readString(profile?.phone || user?.phone) || '-'
  const registeredEmail = readString(profile?.email || user?.email).trim()
  const completionPercent = clampPercent(
    Number(profile?.profile_complete_level || user?.profile_complete_level || 0)
  )
  const completionLabel =
    completionPercent >= 100
      ? 'Profile complete'
      : completionPercent >= 60
        ? 'Almost there'
        : 'Needs attention'
  const avatarInitials =
    displayName
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'PR'

  const handleInputChange =
    (key: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleFieldValueChange = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'country') {
        next.state = ''
        next.city = ''
      }
      if (key === 'state') {
        next.city = ''
      }
      return next
    })
  }

  const setSelectValues = (
    key: string,
    values: string[],
    allowsMultiple: boolean
  ) => {
    handleFieldValueChange(key, allowsMultiple ? values.join(', ') : values[0] || '')
  }

  const toggleManualField = (key: string, visible: boolean) => {
    setCustomSelectFields((prev) => ({ ...prev, [key]: visible }))
    if (!visible) {
      setCustomSelectValues((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const addManualSelectValue = (field: EditableField, allowsMultiple: boolean) => {
    const manualValue = String(customSelectValues[field.key] || '').trim()
    if (!manualValue) return

    const currentValues = toArray(form[field.key])
    const exists = currentValues.some(
      (item) => item.toLowerCase() === manualValue.toLowerCase()
    )

    const nextValues = allowsMultiple
      ? exists
        ? currentValues
        : [...currentValues, manualValue]
      : [manualValue]

    setSelectValues(field.key, nextValues, allowsMultiple)
    toggleManualField(field.key, false)
  }

  const handleSelectOptionToggle = (
    field: EditableField,
    value: string,
    allowsMultiple: boolean
  ) => {
    const currentValues = toArray(form[field.key])
    const exists = currentValues.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    )
    const nextValues = allowsMultiple
      ? exists
        ? currentValues.filter((item) => item.toLowerCase() !== value.toLowerCase())
        : [...currentValues, value]
      : [value]

    setSelectValues(field.key, nextValues, allowsMultiple)
  }

  const removeSelectValue = (
    field: EditableField,
    value: string,
    allowsMultiple: boolean
  ) => {
    const nextValues = toArray(form[field.key]).filter(
      (item) => item.toLowerCase() !== value.toLowerCase()
    )
    setSelectValues(field.key, nextValues, allowsMultiple)
  }

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/image\/(jpeg|png|webp|jpg)/i.test(file.type)) {
      setErrorMessage('Please upload a valid image.')
      return
    }

    const localPreviewUrl = URL.createObjectURL(file)
    setAvatarPreview(localPreviewUrl)
    setAvatarUploading(true)
    setErrorMessage('')

    try {
      const uploadedUrl = await uploadImage(file, 'ophmart/profile')
      if (!uploadedUrl) {
        throw new Error('Image upload failed')
      }
      setAvatarUrl(uploadedUrl)
      setAvatarPreview(uploadedUrl)
      toast.success('Profile photo uploaded. Click Save Changes to apply it.')
    } catch {
      setAvatarPreview(avatarUrl || null)
      setErrorMessage('Profile photo upload failed. Please try again.')
    } finally {
      URL.revokeObjectURL(localPreviewUrl)
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = editableFieldKeys.reduce<Record<string, string>>(
        (acc, key) => {
          acc[key] = form[key] || ''
          return acc
        },
        {}
      )
      if (avatarUrl) payload.avatar = avatarUrl

      const res = await api.put(profileEndpoint, payload)
      const updated = extractProfile(res.data)
      if (updated) {
        dispatch(setUser({ ...user, ...updated }))
        syncLocalState(updated)
        if (isVendor) void dispatch(fetchVendorProfile())
      }
      setSuccessMessage('Profile updated successfully.')
      setIsEditing(false)
    } catch (error: any) {
      setErrorMessage('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const isPasswordValid = (password: string) => {
    return isStrongPassword(password)
  }

  const handlePasswordUpdate = async () => {
    if (!isVendor) {
      setPasswordError('Password update OTP flow is only available for vendors.')
      return
    }

    if (!registeredEmail) {
      setPasswordError('Registered email not found.')
      return
    }

    try {
      setPasswordOtpSending(true)
      setPasswordError('')
      setPasswordMessage('')
      await api.post('/send-email-otp', {
        email: registeredEmail,
        purpose: 'password_change',
      })
      setPasswordOtp('')
      setOtpDialogOpen(true)
      setPasswordMessage('We have sent a code to your registered email.')
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || 'Failed to send verification code.'
      )
    } finally {
      setPasswordOtpSending(false)
    }
  }

  const handleVerifyAndUpdatePassword = async () => {
    if (!registeredEmail) {
      setPasswordError('Registered email not found.')
      return
    }

    try {
      setPasswordOtpVerifying(true)
      setPasswordError('')
      setPasswordMessage('')
      await api.post('/verify-email-otp', {
        email: registeredEmail,
        otp: passwordOtp,
        purpose: 'password_change',
      })
      await api.put(passwordEndpoint, {
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
      dispatch(
        setUser({
          ...user,
          must_change_password: false,
          temp_password_issued_at: null,
          temp_password_expires_at: null,
          hours_left_to_change_password: null,
          show_password_change_reminder: false,
        })
      )
      setOtpDialogOpen(false)
      setPasswordOtp('')
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage('')
      toast.success('Password updated successfully.')
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || 'Password update failed.'
      )
    } finally {
      setPasswordOtpVerifying(false)
    }
  }

  const renderEditableField = (field: EditableField) => {
    const value = form[field.key] || ''
    const selectOptions =
      field.key === 'country'
        ? countries.map((country) => country.name)
        : field.key === 'state'
          ? states
          : field.key === 'city'
            ? cities
            : field.options || FIELD_OPTIONS[field.key] || []
    const isTextarea = field.type === 'textarea' || field.control === 'textarea'
    const isSelect =
      field.control === 'select' ||
      field.control === 'country' ||
      field.control === 'state' ||
      field.control === 'city'

    if (field.control === 'multiselect' || isSelect) {
      const allowsMultiple = MULTI_SELECT_FIELD_KEYS.has(field.key)
      const selectedValues = toArray(value)
      const options = Array.from(new Set([...selectOptions, ...selectedValues]))
      const hasSelections = selectedValues.length > 0
      const triggerLabel = hasSelections
        ? selectedValues.length === 1
          ? selectedValues[0]
          : `${selectedValues.slice(0, 2).join(', ')}${selectedValues.length > 2 ? ` +${selectedValues.length - 2}` : ''}`
        : `Select ${field.label.toLowerCase()}`
      const loadingText =
        field.control === 'country' && locationLoading.countries
          ? 'Loading countries...'
          : field.control === 'state' && locationLoading.states
            ? 'Loading states...'
            : field.control === 'city' && locationLoading.cities
              ? 'Loading cities...'
              : ''

      return (
        <div className='space-y-2'>
          {field.control === 'country' && selectedCountry?.flagUrl ? (
            <div className='flex items-center gap-2 text-xs font-medium text-slate-500'>
              <img
                src={selectedCountry.flagUrl}
                alt={selectedCountry.name}
                className='h-4 w-6 rounded-sm object-cover ring-1 ring-slate-200'
              />
              <span>{selectedCountry.name}</span>
            </div>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='outline'
                disabled={!isEditing}
                className={cn(
                  'h-11 w-full justify-between rounded-none border-slate-200 bg-white/80 px-4 text-left text-sm font-normal shadow-sm hover:bg-white',
                  !hasSelections && 'text-slate-500'
                )}
              >
                <span className='truncate'>{loadingText || triggerLabel}</span>
                <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-60' />
              </Button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-[--radix-popover-trigger-width] p-0'>
              <div className='max-h-72 overflow-y-auto p-2'>
                <div className='mb-2 rounded-lg border border-dashed border-violet-200 bg-violet-50/60 p-2'>
                  {customSelectFields[field.key] ? (
                    <div className='flex gap-2'>
                      <Input
                        className='h-9 bg-white'
                        value={customSelectValues[field.key] || ''}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        onChange={(event) =>
                          setCustomSelectValues((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addManualSelectValue(field, allowsMultiple)
                          }
                        }}
                      />
                      <Button
                        type='button'
                        size='sm'
                        className='h-9 shrink-0'
                        onClick={() => addManualSelectValue(field, allowsMultiple)}
                      >
                        Add
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='h-9 w-9 shrink-0 bg-white'
                        aria-label={`Remove manual ${field.label}`}
                        onClick={() => toggleManualField(field.key, false)}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type='button'
                      className='flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-violet-800 hover:bg-violet-100'
                      onClick={() => toggleManualField(field.key, true)}
                    >
                      <span>Other / add manually</span>
                      <span className='text-lg leading-none'>+</span>
                    </button>
                  )}
                </div>
                {options.map((option) => {
                  const checked = selectedValues.some(
                    (item) => item.toLowerCase() === option.toLowerCase()
                  )

                  return (
                    <label
                      key={`${field.key}-${option}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition',
                        checked
                          ? 'bg-violet-50 text-violet-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type={allowsMultiple ? 'checkbox' : 'radio'}
                        name={`${field.key}-option`}
                        className='h-4 w-4 accent-violet-700'
                        checked={checked}
                        onChange={() =>
                          handleSelectOptionToggle(field, option, allowsMultiple)
                        }
                      />
                      <span>{option}</span>
                    </label>
                  )
                })}
                {!options.length ? (
                  <div className='px-2 py-3 text-sm text-slate-500'>
                    {loadingText || 'No options available'}
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
          {selectedValues.length ? (
            <div className='flex flex-wrap gap-2'>
              {selectedValues.map((selected) => (
                <Badge
                  key={`${field.key}-${selected}`}
                  variant='secondary'
                  className='gap-1 border-violet-100 bg-violet-50 text-violet-700'
                >
                  <span>{selected}</span>
                  {isEditing ? (
                    <button
                      type='button'
                      className='rounded-full p-0.5 hover:bg-violet-100'
                      aria-label={`Remove ${selected}`}
                      onClick={() =>
                        removeSelectValue(field, selected, allowsMultiple)
                      }
                    >
                      <X className='h-3 w-3' />
                    </button>
                  ) : null}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      )
    }

    if (isTextarea) {
      return (
        <Textarea
          className='resize-none bg-white/80 backdrop-blur-sm transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-violet-500/20 shadow-sm border-slate-200'
          value={value}
          onChange={handleInputChange(field.key)}
          disabled={!isEditing}
          placeholder={field.placeholder}
        />
      )
    }

    return (
      <Input
        className='h-11 bg-white/80 backdrop-blur-sm transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-violet-500/20 shadow-sm border-slate-200'
        value={value}
        onChange={handleInputChange(field.key)}
        type={field.type}
        disabled={!isEditing}
        placeholder={field.placeholder}
      />
    )
  }

  return (
    <>
      <Main className='flex flex-col gap-6 pb-8'>
        {errorMessage && (
          <div className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm'>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm'>
            {successMessage}
          </div>
        )}

        <div className='grid gap-6 xl:grid-cols-[320px_1fr] flex-1'>
          {/* Sidebar */}
          <aside className='sticky top-24 space-y-6 self-start'>
            <Card className='overflow-hidden border-0 shadow-xl ring-1 ring-slate-900/5 bg-white'>
              <CardContent className='relative space-y-6 pt-8 text-center'>
                <div className='relative mx-auto h-28 w-28 rounded-full p-1.5 bg-slate-50 shadow-sm ring-1 ring-slate-100'>
                  <Avatar className='h-full w-full rounded-full border-4 border-white object-cover bg-white'>
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-2xl font-bold bg-slate-50 text-slate-400">{avatarInitials}</AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleAvatarSelect}
                  />
                </div>
                <div className="space-y-1">
                  <h2 className='text-2xl font-bold tracking-tight text-slate-900'>{displayName}</h2>
                  <p className='text-sm font-medium text-slate-500'>{displayEmail}</p>
                </div>
                <div className='flex justify-center gap-2'>
                  <Badge variant='outline' className='bg-white/80 backdrop-blur shadow-sm hover:scale-105 transition-transform'>{formatRoleLabel(user?.role)}</Badge>
                  {isVendor && toBoolean(profile?.is_active) && (
                    <Badge className='border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:scale-105 transition-transform'>
                      Active
                    </Badge>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full bg-white/50 backdrop-blur hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-all border-dashed shadow-sm'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    <Camera className='mr-2 h-4 w-4' />
                    {avatarUploading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                )}
                {isVendor && completionPercent < 100 && (
                  <div className='group rounded-2xl border border-violet-100/60 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:border-violet-200'>
                    <div className='flex items-center gap-5'>
                      <ProfileCompletionRing value={completionPercent} />
                      <div className='space-y-1.5'>
                        <p className='text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-700/80'>
                          Profile Completion
                        </p>
                        <p className='text-sm font-bold text-slate-900'>
                          {completionLabel}
                        </p>
                        <p className='text-xs leading-relaxed text-slate-600'>
                          Finish the skipped registration details from this profile page.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className='space-y-3 border-t border-slate-100 pt-5 text-left text-sm'>
                  <div className='flex items-center gap-3 text-slate-600 rounded-lg p-2 hover:bg-slate-50 transition-colors'>
                    <div className='p-2 bg-slate-100 rounded-md text-slate-500'><Mail className='h-4 w-4' /></div>
                    <span className='font-medium'>{displayEmail}</span>
                  </div>
                  <div className='flex items-center gap-3 text-slate-600 rounded-lg p-2 hover:bg-slate-50 transition-colors'>
                    <div className='p-2 bg-slate-100 rounded-md text-slate-500'><Phone className='h-4 w-4' /></div>
                    <span className='font-medium'>{displayPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className='flex-1 min-w-0 space-y-6 flex flex-col h-full'>
            <div className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm'>
              <div>
                <h2 className='text-lg font-bold text-slate-800'>Profile Settings</h2>
                <p className='text-xs text-slate-500'>Manage your personal and business information</p>
              </div>
              <div className='flex items-center gap-2'>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant='outline' className="h-9 shadow-sm hover:bg-slate-50 relative group">
                    <span className="relative z-10 text-slate-700 font-medium">Edit Profile</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setIsEditing(false)
                        syncLocalState(profile)
                      }}
                      variant='outline'
                      disabled={saving || avatarUploading}
                      className="h-9"
                    >
                      <X className='mr-2 h-4 w-4' /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || avatarUploading} className="h-9 bg-violet-700 hover:bg-violet-800 shadow-md">
                      <Save className='mr-2 h-4 w-4' />{' '}
                      {saving ? 'Saving...' : avatarUploading ? 'Uploading...' : 'Save Changes'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className='flex-1 space-y-6 pb-4'>
              <Card className='border-0 shadow-xl ring-1 ring-slate-900/5 bg-white/80 backdrop-blur-xl'>
                <CardHeader className='pb-4 border-b border-slate-100/60'>
                  <CardTitle className='text-2xl font-bold bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text text-transparent'>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className='space-y-10 pt-8'>
                  {loading ? (
                    <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div></div>
                  ) : (
                    profileSections.map((section, idx) => (
                      <div key={section.title} className='group space-y-6'>
                        <div className='flex items-center gap-4'>
                          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50/80 text-violet-600 shadow-sm ring-1 ring-violet-100/50 transition-all group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-md group-hover:scale-105'>
                            <section.icon className='h-5 w-5' />
                          </div>
                          <div>
                            <h3 className='text-lg font-semibold tracking-tight text-slate-900'>{section.title}</h3>
                            <p className='text-sm text-slate-500'>
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <div className='grid gap-5 md:grid-cols-2 rounded-2xl bg-slate-50/50 p-6 ring-1 ring-slate-100'>
                          {section.fields.map((field) => (
                            <div
                              key={field.key}
                              className={cn(
                                'space-y-2',
                                (field.type === 'textarea' ||
                                  field.control === 'textarea' ||
                                  field.control === 'multiselect') &&
                                  'md:col-span-2'
                              )}
                            >
                              <Label className='text-slate-700 font-medium ml-1'>{field.label}</Label>
                              {renderEditableField(field)}
                            </div>
                          ))}
                        </div>
                        {idx < profileSections.length - 1 && (
                          <div className='border-b border-slate-100 pt-2' />
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Registration Snapshot (Vendor Only) */}
              {isVendor && (
                <Card className='border-0 shadow-xl ring-1 ring-slate-900/5 bg-white/80 backdrop-blur-xl'>
                  <CardHeader className='pb-4 border-b border-slate-100/60'>
                    <CardTitle className='text-2xl font-bold tracking-tight text-slate-900'>Registration Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-8 pt-8'>
                    <div className='grid gap-4 md:grid-cols-3'>
                      {summaryFields.map((f) => (
                        <button
                          key={f.label}
                          onClick={() => setActiveSummary(f.label)}
                          className={cn(
                            'relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5',
                            activeSummary === f.label
                              ? 'border-violet-200 bg-violet-50/80 shadow-sm ring-1 ring-violet-500/20'
                              : 'border-slate-200 bg-white shadow-sm'
                          )}
                        >
                          {activeSummary === f.label && (
                            <div className="absolute top-0 right-0 p-2 text-violet-600 opacity-50">
                              <div className="h-16 w-16 rounded-full bg-violet-200/50 blur-xl absolute -top-8 -right-8"></div>
                            </div>
                          )}
                          <span className='relative z-10 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest'>
                            {f.label}
                          </span>
                          <div className='relative z-10 mt-2 truncate font-semibold text-slate-900 text-lg'>
                            {f.value || '-'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className='relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600/5 to-indigo-600/5 p-6 shadow-sm'>
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500 rounded-l-2xl"></div>
                      <span className='text-[10px] font-extrabold tracking-[0.2em] text-violet-700 uppercase'>
                        Focused Insight
                      </span>
                      <p className='mt-2 text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
                        {activeSummaryField?.value || 'No data provided'}
                      </p>
                    </div>
                    <div className='grid gap-6 md:grid-cols-3 rounded-2xl bg-slate-50/80 p-6 border border-slate-100'>
                      <div>
                        <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
                          Business Nature
                        </Label>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {businessNatureChips.length > 0 ? businessNatureChips.map((c) => (
                            <Badge key={c} variant='secondary' className="bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50">
                              {c}
                            </Badge>
                          )) : <span className="text-sm text-slate-400 font-medium">None specified</span>}
                        </div>
                      </div>
                      <div>
                        <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
                          Categories
                        </Label>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {categoryChips.length > 0 ? categoryChips.map((c) => (
                            <Badge key={c} variant='secondary' className="bg-violet-50 text-violet-700 border-violet-100 shadow-sm hover:bg-violet-100">
                              {c}
                            </Badge>
                          )) : <span className="text-sm text-slate-400 font-medium">None specified</span>}
                        </div>
                      </div>
                      <div>
                        <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
                          Dealing Area
                        </Label>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {dealingAreaChips.length > 0 ? dealingAreaChips.map((c) => (
                            <Badge key={c} variant='secondary' className="bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50">
                              {c}
                            </Badge>
                          )) : <span className="text-sm text-slate-400 font-medium">None specified</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Section */}
              <div id='change-password' ref={passwordSectionRef}>
              <Card className='border-0 shadow-xl ring-1 ring-slate-900/5 bg-white/80 backdrop-blur-xl mb-8'>
                <CardHeader className='pb-4 border-b border-slate-100/60'>
                  <CardTitle className='text-2xl font-bold tracking-tight text-slate-900'>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6 pt-8'>
                  <div className='grid gap-6 md:grid-cols-2 rounded-2xl bg-slate-50/50 p-6 ring-1 ring-slate-100'>
                    <div className='space-y-2'>
                      <Label className='text-slate-700 font-medium'>New Password</Label>
                      <PasswordInput
                        className='bg-white shadow-sm'
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((p) => ({
                            ...p,
                            newPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label className='text-slate-700 font-medium'>Confirm Password</Label>
                      <PasswordInput
                        className='bg-white shadow-sm'
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((p) => ({
                            ...p,
                            confirmPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className='space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
                    <p className='text-[10px] font-extrabold tracking-[0.2em] text-slate-500 uppercase'>
                      Strong password rules
                    </p>
                    <ul className='grid gap-3 sm:grid-cols-2'>
                      {PASSWORD_REQUIREMENTS.map((requirement) => (
                        <li
                          key={requirement.key}
                          className={cn(
                            'flex items-center gap-2 transition-colors',
                            requirement.test(passwordForm.newPassword)
                              ? 'text-emerald-600 font-medium'
                              : 'text-slate-500'
                          )}
                        >
                          <div className={cn('h-1.5 w-1.5 rounded-full', requirement.test(passwordForm.newPassword) ? 'bg-emerald-500' : 'bg-slate-300')} />
                          <span className='text-sm'>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className='flex justify-end pt-2'>
                    <Button
                      onClick={handlePasswordUpdate}
                      disabled={
                        passwordOtpSending ||
                        !isPasswordValid(passwordForm.newPassword) ||
                        passwordForm.newPassword !==
                          passwordForm.confirmPassword ||
                        !registeredEmail
                      }
                      className='bg-violet-700 hover:bg-violet-800 shadow-md hover:shadow-lg transition-all h-11 px-8'
                    >
                      {passwordOtpSending ? 'Sending Code...' : 'Update Password'}
                    </Button>
                  </div>
                  {passwordError && (
                    <div className='rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2'>
                      <div className='h-2 w-2 rounded-full bg-red-500' />
                      {passwordError}
                    </div>
                  )}
                  {passwordMessage && (
                    <div className='rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100 flex items-center gap-2'>
                      <div className='h-2 w-2 rounded-full bg-emerald-500' />
                      {passwordMessage}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        </div>
      </Main>
      <Dialog
        open={otpDialogOpen}
        onOpenChange={(open) => {
          if (!passwordOtpVerifying) {
            setOtpDialogOpen(open)
            if (!open) setPasswordOtp('')
          }
        }}
      >
        <DialogContent className='sm:max-w-[440px] p-6 border-0 shadow-2xl rounded-2xl'>
          <DialogHeader className="space-y-3">
            <div className="mx-auto bg-violet-100 text-violet-700 w-16 h-16 rounded-full flex items-center justify-center mb-2 ring-4 ring-violet-50">
              <span className="text-2xl">🔐</span>
            </div>
            <DialogTitle className="text-center text-2xl font-bold tracking-tight text-slate-900">
              Verification Required
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 px-4">
              We've sent a 6-digit security code to 
              <span className="font-semibold text-slate-900 block mt-1">
                {registeredEmail || "your registered email"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className='py-6 flex flex-col items-center space-y-6'>
            <div className='space-y-4 w-full flex flex-col items-center'>
              <InputOTP
                maxLength={6}
                value={passwordOtp}
                onChange={setPasswordOtp}
                containerClassName='group'
              >
                <InputOTPGroup className="gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index} 
                      index={index} 
                      className="h-12 w-12 rounded-xl text-lg font-bold border-2 border-slate-200 transition-all focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 shadow-sm"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <div className="flex items-center gap-2 text-sm mt-4">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type='button'
                  onClick={handlePasswordUpdate}
                  disabled={passwordOtpSending || passwordOtpVerifying}
                  className='text-violet-700 font-semibold hover:text-violet-800 transition-colors disabled:opacity-50 underline underline-offset-2'
                >
                  {passwordOtpSending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-3 pt-2">
            <Button
              type='button'
              variant='outline'
              className="flex-1 h-11 border-slate-200"
              onClick={() => setOtpDialogOpen(false)}
              disabled={passwordOtpVerifying}
            >
              Cancel
            </Button>
            <Button
              type='button'
              className="flex-1 h-11 bg-violet-700 hover:bg-violet-800 shadow-md transition-all active:scale-[0.98]"
              onClick={handleVerifyAndUpdatePassword}
              disabled={passwordOtpVerifying || passwordOtp.length !== 6}
            >
              {passwordOtpVerifying ? 'Verifying...' : 'Verify & Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
