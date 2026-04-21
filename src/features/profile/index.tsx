import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { type AppDispatch } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Camera,
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
import { PASSWORD_REQUIREMENTS, isStrongPassword } from '@/lib/password-rules'
import { cn } from '@/lib/utils'
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
import { Textarea } from '@/components/ui/textarea'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { PasswordInput } from '@/components/password-input'

// ... (EditableField, EditableSection, ADMIN_PROFILE_SECTIONS, VENDOR_PROFILE_SECTIONS types/configs remain the same)

type EditableField = {
  key: string
  label: string
  placeholder: string
  type?: 'text' | 'email' | 'tel' | 'textarea'
}

type EditableSection = {
  title: string
  description: string
  icon: typeof Store
  fields: EditableField[]
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
      },
      {
        key: 'business_type',
        label: 'Business Type',
        placeholder: 'Manufacturer, Wholesaler, Retailer',
      },
      {
        key: 'established_year',
        label: 'Established Year',
        placeholder: '2024',
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
      {
        key: 'upi_id',
        label: 'UPI ID',
        placeholder: 'your-store@upi',
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
      { key: 'city', label: 'City', placeholder: 'City' },
      { key: 'state', label: 'State', placeholder: 'State' },
      { key: 'pincode', label: 'Pincode', placeholder: '400001' },
      { key: 'country', label: 'Country', placeholder: 'India' },
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
        type: 'textarea',
      },
      {
        key: 'categories',
        label: 'Categories',
        placeholder: 'Category names separated by commas',
        type: 'textarea',
      },
      {
        key: 'dealing_area',
        label: 'Dealing Area',
        placeholder: 'India, UAE, Global',
        type: 'textarea',
      },
      {
        key: 'annual_turnover',
        label: 'Annual Turnover',
        placeholder: '0 - 25 Lakh',
      },
      {
        key: 'office_employees',
        label: 'Employees',
        placeholder: '1 - 10',
      },
      {
        key: 'return_policy',
        label: 'Return Policy',
        placeholder: '7 days replacement',
      },
    ],
  },
]

// ... (Helpers: normalizeRole, extractProfile, readString, formatRoleLabel, toBoolean, toArray remain the same)

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

function ProfileCompletionRing({ value }: { value: number }) {
  const safeValue = clampPercent(value)
  return (
    <div className='relative flex h-20 w-20 items-center justify-center rounded-full bg-white'>
      <div
        className='absolute inset-0 rounded-full'
        style={{
          background: `conic-gradient(rgb(109 40 217) ${safeValue}%, rgb(226 232 240) ${safeValue}% 100%)`,
        }}
      />
      <div className='absolute inset-[6px] rounded-full bg-white' />
      <div className='relative text-center'>
        <div className='text-lg font-bold text-slate-950'>{safeValue}%</div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()

  const user = useSelector((state: any) => state.auth.user)
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

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
      { label: 'UPI ID', value: readString(profile?.upi_id) },
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
    setAvatarPreview(readString(nextProfile.avatar || user?.avatar) || null)
  }

  useEffect(() => {
    if (!user?.id && !user?._id) return
    const loadProfile = async () => {
      try {
        setLoading(true)
        const res = await api.get('/profile')
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
  }, [user?.id, user?._id])

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

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/image\/(jpeg|png|webp|jpg)/i.test(file.type)) {
      setErrorMessage('Please upload a valid image.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = new FormData()
      editableFieldKeys.forEach((key) => payload.append(key, form[key] || ''))
      if (avatarFile) payload.append('avatar', avatarFile)

      const res = await api.put('/profile', payload)
      const updated = extractProfile(res.data)
      if (updated) {
        dispatch(setUser({ ...user, ...updated }))
        syncLocalState(updated)
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
      await api.put('/password', {
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

  return (
    <>
      <TablePageHeader title='Profile'>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant='outline'>
            Edit Profile
          </Button>
        ) : (
          <div className='flex gap-2'>
            <Button
              onClick={() => {
                setIsEditing(false)
                syncLocalState(profile)
              }}
              variant='outline'
              disabled={saving}
            >
              <X className='mr-2 h-4 w-4' /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className='mr-2 h-4 w-4' />{' '}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </TablePageHeader>

      <Main className='flex flex-col gap-6 pb-8'>
        {errorMessage && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700'>
            {successMessage}
          </div>
        )}

        <div className='grid gap-6 xl:grid-cols-[320px_1fr]'>
          {/* Sidebar */}
          <aside className='sticky top-24 space-y-6 self-start'>
            <Card>
              <CardContent className='space-y-4 pt-6 text-center'>
                <div className='relative mx-auto h-24 w-24'>
                  <Avatar className='h-24 w-24'>
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback>{avatarInitials}</AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type='file'
                    className='hidden'
                    onChange={handleAvatarSelect}
                  />
                </div>
                <div>
                  <h2 className='text-xl font-bold'>{displayName}</h2>
                  <p className='text-sm text-slate-500'>{displayEmail}</p>
                </div>
                <div className='flex justify-center gap-2'>
                  <Badge variant='outline'>{formatRoleLabel(user?.role)}</Badge>
                  {isVendor && toBoolean(profile?.is_active) && (
                    <Badge className='border-emerald-200 bg-emerald-50 text-emerald-700'>
                      Active
                    </Badge>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className='mr-2 h-4 w-4' /> Change Photo
                  </Button>
                )}
                {isVendor && (
                  <div className='rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-left'>
                    <div className='flex items-center gap-4'>
                      <ProfileCompletionRing value={completionPercent} />
                      <div className='space-y-1'>
                        <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700'>
                          Profile Completion
                        </p>
                        <p className='text-sm font-semibold text-slate-900'>
                          {completionLabel}
                        </p>
                        <p className='text-xs leading-5 text-slate-600'>
                          Finish the skipped registration details from this profile page.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className='space-y-2 border-t pt-4 text-left text-sm'>
                  <div className='flex items-center gap-2 text-slate-600'>
                    <Mail className='h-4 w-4' /> {displayEmail}
                  </div>
                  <div className='flex items-center gap-2 text-slate-600'>
                    <Phone className='h-4 w-4' /> {displayPhone}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className='space-y-6 overflow-hidden'>
            <div className='max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto pr-1'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className='space-y-8'>
                  {loading ? (
                    <p>Loading...</p>
                  ) : (
                    profileSections.map((section, idx) => (
                      <div key={section.title} className='space-y-4'>
                        <div className='flex items-center gap-3'>
                          <div className='rounded-lg bg-slate-100 p-2'>
                            <section.icon className='h-5 w-5' />
                          </div>
                          <div>
                            <h3 className='font-semibold'>{section.title}</h3>
                            <p className='text-sm text-slate-500'>
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                          {section.fields.map((field) => (
                            <div
                              key={field.key}
                              className={cn(
                                field.type === 'textarea' && 'md:col-span-2'
                              )}
                            >
                              <Label>{field.label}</Label>
                              {field.type === 'textarea' ? (
                                <Textarea
                                  value={form[field.key] || ''}
                                  onChange={handleInputChange(field.key)}
                                  disabled={!isEditing}
                                />
                              ) : (
                                <Input
                                  value={form[field.key] || ''}
                                  onChange={handleInputChange(field.key)}
                                  type={field.type}
                                  disabled={!isEditing}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        {idx < profileSections.length - 1 && (
                          <div className='border-b pt-4' />
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Registration Snapshot (Vendor Only) */}
              {isVendor && (
                <Card>
                  <CardHeader>
                    <CardTitle>Registration Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    <div className='grid gap-3 md:grid-cols-3'>
                      {summaryFields.map((f) => (
                        <button
                          key={f.label}
                          onClick={() => setActiveSummary(f.label)}
                          className={cn(
                            'rounded-lg border p-3 text-left transition',
                            activeSummary === f.label
                              ? 'border-violet-600 bg-violet-50'
                              : 'bg-slate-50'
                          )}
                        >
                          <span className='text-[10px] font-bold text-slate-500 uppercase'>
                            {f.label}
                          </span>
                          <div className='truncate font-semibold'>
                            {f.value || '-'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className='rounded-lg border border-dashed bg-slate-50 p-4'>
                      <span className='text-[10px] font-bold text-slate-500 uppercase'>
                        Focused Insight
                      </span>
                      <p className='text-lg font-semibold'>
                        {activeSummaryField?.value || 'No data'}
                      </p>
                    </div>
                    <div className='grid gap-6 md:grid-cols-3'>
                      <div>
                        <Label className='text-[10px] text-slate-500 uppercase'>
                          Business Nature
                        </Label>
                        <div className='mt-1 flex flex-wrap gap-1'>
                          {businessNatureChips.map((c) => (
                            <Badge key={c} variant='secondary'>
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className='text-[10px] text-slate-500 uppercase'>
                          Categories
                        </Label>
                        <div className='mt-1 flex flex-wrap gap-1'>
                          {categoryChips.map((c) => (
                            <Badge key={c} variant='secondary'>
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className='text-[10px] text-slate-500 uppercase'>
                          Countries
                        </Label>
                        <div className='mt-1 flex flex-wrap gap-1'>
                          {dealingAreaChips.map((c) => (
                            <Badge key={c} variant='secondary'>
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Section */}
              <div id='change-password' ref={passwordSectionRef}>
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label>New Password</Label>
                      <PasswordInput
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
                      <Label>Confirm Password</Label>
                      <PasswordInput
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

                  <div className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm'>
                    <p className='font-bold tracking-[0.16em] text-slate-500 uppercase'>
                      Strong password rules
                    </p>
                    <ul className='grid gap-2 sm:grid-cols-2'>
                      {PASSWORD_REQUIREMENTS.map((requirement) => (
                        <li
                          key={requirement.key}
                          className={cn(
                            'flex items-center gap-2',
                            requirement.test(passwordForm.newPassword)
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          )}
                        >
                          <span className='text-base leading-none'>•</span>
                          <span>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className='flex justify-right'>
                    <Button
                      onClick={handlePasswordUpdate}
                      disabled={
                        passwordOtpSending ||
                        !isPasswordValid(passwordForm.newPassword) ||
                        passwordForm.newPassword !==
                          passwordForm.confirmPassword ||
                        !registeredEmail
                      }
                      className='bg-violet-700 hover:bg-violet-800'
                    >
                      {passwordOtpSending ? 'Sending Code...' : 'Update Password'}
                    </Button>
                  </div>
                  {passwordError && (
                    <p className='text-sm text-red-600'>{passwordError}</p>
                  )}
                  {passwordMessage && (
                    <p className='text-sm text-emerald-600'>
                      {passwordMessage}
                    </p>
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
        {/* <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Update Your Password</DialogTitle>
            <DialogDescription>
              We have sent a code to your registered email{registeredEmail ? ` ${registeredEmail}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Enter Otp</Label>
              <InputOTP
                maxLength={6}
                value={passwordOtp}
                onChange={setPasswordOtp}
                containerClassName='justify-center'
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type='button'
              variant='outline'
              onClick={handlePasswordUpdate}
              disabled={passwordOtpSending || passwordOtpVerifying}
              className='w-15'
            >
              {passwordOtpSending ? 'Resending...' : 'Resend Code'}
            </Button>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOtpDialogOpen(false)}
              disabled={passwordOtpVerifying}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleVerifyAndUpdatePassword}
              disabled={passwordOtpVerifying || passwordOtp.length !== 6}
            >
              {passwordOtpVerifying ? 'Verifying...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent> */}

        <DialogContent className='sm:max-w-[440px] p-6'>
  <DialogHeader className="space-y-3">
    <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
      <span className="text-xl">🔐</span>
    </div>
    <DialogTitle className="text-center text-2xl font-semibold tracking-tight">
      Verification Required
    </DialogTitle>
    <DialogDescription className="text-center text-muted-foreground px-4">
      We've sent a 6-digit security code to 
      <span className="font-medium text-foreground block">
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
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <InputOTPSlot 
              key={index} 
              index={index} 
              className="rounded-md border-2 border-muted transition-all focus:border-primary"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Didn't receive the code?</span>
        <button
          type='button'
          onClick={handlePasswordUpdate}
          disabled={passwordOtpSending || passwordOtpVerifying}
          className='text-primary font-semibold hover:underline disabled:opacity-50'
        >
          {passwordOtpSending ? 'Sending...' : 'Resend Code'}
        </button>
      </div>
    </div>
  </div>

  <DialogFooter className="sm:justify-between gap-3">
    <Button
      type='button'
      variant='ghost'
      className="flex-1"
      onClick={() => setOtpDialogOpen(false)}
      disabled={passwordOtpVerifying}
    >
      Cancel
    </Button>
    <Button
      type='button'
      className="flex-1 shadow-md transition-all active:scale-95"
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
