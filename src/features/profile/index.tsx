import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type AppDispatch } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Camera,
  Check,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
  UserRound,
  X,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import api from '@/lib/axios'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { PasswordInput } from '@/components/password-input'

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
    description: 'Core business identity details.',
    icon: Store,
    fields: [
      { key: 'name', label: 'Store Name', placeholder: 'Dust Filter India' },
      {
        key: 'business_name',
        label: 'Business Name',
        placeholder: 'Registered business name',
      },
      {
        key: 'registrar_name',
        label: 'Registrar Name',
        placeholder: 'Owner or registrar name',
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
    description: 'Business address and location.',
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
  if (typeof value === 'string') return value
  return ''
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

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((state: any) => state.auth.user)
  const isVendor = normalizeRole(user?.role) === 'vendor'
  const profileSections = isVendor
    ? VENDOR_PROFILE_SECTIONS
    : ADMIN_PROFILE_SECTIONS
  const editableFieldKeys = useMemo(
    () =>
      profileSections.flatMap((section) =>
        section.fields.map((field) => field.key)
      ),
    [profileSections]
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

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
    setAvatarFile(null)
  }

  useEffect(() => {
    if (!user?.id && !user?._id) return

    let mounted = true

    const loadProfile = async () => {
      try {
        setLoading(true)
        setErrorMessage('')
        const res = await api.get('/profile')
        const fetched = extractProfile(res.data)
        if (!mounted) return

        const normalizedProfile =
          fetched && typeof fetched === 'object'
            ? (fetched as Record<string, unknown>)
            : null

        if (normalizedProfile) {
          dispatch(setUser({ ...user, ...normalizedProfile }))
          syncLocalState(normalizedProfile)
          if (isVendor) {
            void dispatch(fetchVendorProfile())
          }
        } else {
          syncLocalState((user as Record<string, unknown>) || null)
        }
      } catch (error: any) {
        if (!mounted) return
        syncLocalState((user as Record<string, unknown>) || null)
        setErrorMessage(
          error?.response?.data?.message ||
            'Failed to load profile details. Please try again.'
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [dispatch, isVendor, user?.id, user?._id])

  const displayName =
    readString(profile?.name || user?.name || user?.business_name) || 'Profile'
  const displayEmail = readString(profile?.email || user?.email) || '-'
  const displayPhone = readString(profile?.phone || user?.phone) || '-'
  const avatarInitials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'PR'

  const handleInputChange =
    (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleTextareaChange =
    (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handlePasswordChange =
    (key: 'currentPassword' | 'newPassword' | 'confirmPassword') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    setSuccessMessage('')
    const file = event.target.files?.[0]
    if (!file) return

    const isValid = /image\/(jpeg|png|webp|jpg)/i.test(file.type)
    if (!isValid) {
      setErrorMessage('Please upload a JPG, PNG, or WEBP image.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleReset = () => {
    syncLocalState(profile)
    setIsEditing(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSave = async () => {
    const hasProfileChanges = editableFieldKeys.some((key) => {
      const currentValue = readString(profile?.[key] ?? user?.[key])
      return (form[key] || '') !== currentValue
    })

    if (!hasProfileChanges && !avatarFile) {
      setSuccessMessage('Nothing changed.')
      setErrorMessage('')
      setIsEditing(false)
      return
    }

    try {
      setSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const payload = new FormData()
      editableFieldKeys.forEach((key) => {
        payload.append(key, form[key] ?? '')
      })

      if (avatarFile) {
        payload.append('avatar', avatarFile)
      }

      const res = await api.put('/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const updatedProfile = extractProfile(res.data)
      const normalizedProfile =
        updatedProfile && typeof updatedProfile === 'object'
          ? (updatedProfile as Record<string, unknown>)
          : null

      if (normalizedProfile) {
        dispatch(setUser({ ...user, ...normalizedProfile }))
        syncLocalState(normalizedProfile)
        if (isVendor) {
          void dispatch(fetchVendorProfile())
        }
      }

      setSuccessMessage('Profile updated successfully.')
      setIsEditing(false)
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Failed to update profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setPasswordMessage('')
    setPasswordError('')

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Please enter your current and new password.')
      return
    }

    if (passwordForm.newPassword.length < 7) {
      setPasswordError('Password must be at least 7 characters long.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    try {
      setPasswordSaving(true)
      const res = await api.put('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })

      if (isVendor) {
        const vendorMeta = res.data?.vendor || {}
        const wasMandatoryChange = Boolean(user?.must_change_password)
        dispatch(
          setUser({
            ...user,
            must_change_password:
              typeof vendorMeta?.must_change_password === 'boolean'
                ? vendorMeta.must_change_password
                : false,
            temp_password_issued_at:
              vendorMeta?.temp_password_issued_at ?? null,
            temp_password_expires_at:
              vendorMeta?.temp_password_expires_at ?? null,
            password_changed_at:
              vendorMeta?.password_changed_at ?? new Date().toISOString(),
          })
        )

        if (wasMandatoryChange) {
          setPasswordMessage(
            'Password updated successfully. Redirecting to dashboard...'
          )
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
          navigate({ to: '/' })
          return
        }
      }

      setPasswordMessage('Password updated successfully.')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message ||
          'Failed to update password. Please try again.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <>
      <TablePageHeader title='Profile'>
        {!isEditing ? (
          <Button
            type='button'
            variant='outline'
            className='shrink-0'
            onClick={() => {
              setErrorMessage('')
              setSuccessMessage('')
              setIsEditing(true)
            }}
          >
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              type='button'
              variant='outline'
              className='shrink-0'
              onClick={handleReset}
              disabled={saving}
            >
              <X className='mr-2 h-4 w-4' />
              Cancel
            </Button>
            <Button
              type='button'
              className='shrink-0'
              onClick={handleSave}
              disabled={saving}
            >
              <Save className='mr-2 h-4 w-4' />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </TablePageHeader>

      <Main className='flex flex-col gap-6 pb-8'>
        {errorMessage ? (
          <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
            {successMessage}
          </div>
        ) : null}
        {isVendor && user?.must_change_password ? (
          <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            Temporary password detected. Change your password now to keep this
            account active.
          </div>
        ) : null}

        <div className='grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
          <div className='grid gap-6'>
            <Card className='border border-slate-200 bg-white shadow-sm'>
              <CardContent className='space-y-5 pt-6'>
                <div className='flex flex-col items-center gap-4 text-center'>
                  <div className='relative'>
                    <Avatar className='h-24 w-24 border border-slate-200'>
                      <AvatarImage
                        src={avatarPreview || undefined}
                        alt={displayName}
                      />
                      <AvatarFallback className='text-lg font-semibold'>
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={handleAvatarSelect}
                    />
                  </div>
                  <div className='space-y-2'>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                      {displayName}
                    </h1>
                    <p className='text-sm break-all text-slate-500'>
                      {displayEmail}
                    </p>
                    <div className='flex flex-wrap items-center justify-center gap-2'>
                      <Badge variant='outline'>
                        {formatRoleLabel(user?.role)}
                      </Badge>
                      {isVendor && toBoolean(profile?.is_active) ? (
                        <Badge
                          variant='outline'
                          className='border-emerald-200 bg-emerald-50 text-emerald-700'
                        >
                          Active
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {isEditing ? (
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className='mr-2 h-4 w-4' />
                      Change Photo
                    </Button>
                  ) : null}
                </div>

                <div className='space-y-3 border-t border-slate-100 pt-4 text-sm'>
                  <div className='flex items-start gap-3'>
                    <Mail className='mt-0.5 h-4 w-4 text-slate-400' />
                    <span className='break-all text-slate-600'>
                      {displayEmail}
                    </span>
                  </div>
                  <div className='flex items-start gap-3'>
                    <Phone className='mt-0.5 h-4 w-4 text-slate-400' />
                    <span className='break-all text-slate-600'>
                      {displayPhone}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-6'>
            <Card className='border border-slate-200 bg-white shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>Profile Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                {loading ? (
                  <p className='text-sm text-slate-500'>
                    Loading profile details...
                  </p>
                ) : (
                  profileSections.map((section, index) => (
                    <div key={section.title} className='space-y-4'>
                      <div className='flex items-start gap-3'>
                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700'>
                          <section.icon className='h-4 w-4' />
                        </span>
                        <div>
                          <h2 className='text-base font-semibold text-slate-900'>
                            {section.title}
                          </h2>
                          <p className='text-sm text-slate-500'>
                            {section.description}
                          </p>
                        </div>
                      </div>

                      <div className='grid gap-4 md:grid-cols-2'>
                        {section.fields.map((field) => (
                          <div
                            key={field.key}
                            className={
                              field.type === 'textarea'
                                ? 'space-y-2 md:col-span-2'
                                : 'space-y-2'
                            }
                          >
                            <Label htmlFor={field.key}>{field.label}</Label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={field.key}
                                value={form[field.key] || ''}
                                onChange={handleTextareaChange(field.key)}
                                placeholder={field.placeholder}
                                disabled={!isEditing}
                                className='min-h-[108px] resize-y'
                              />
                            ) : (
                              <Input
                                id={field.key}
                                value={form[field.key] || ''}
                                onChange={handleInputChange(field.key)}
                                placeholder={field.placeholder}
                                type={field.type || 'text'}
                                disabled={!isEditing}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {index < profileSections.length - 1 ? (
                        <div className='border-b border-slate-100' />
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className='border border-slate-200 bg-white shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>Security</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-sm text-slate-500'>
                  Update your password here. Use at least 7 characters.
                </p>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='currentPassword'>Current Password</Label>
                    <PasswordInput
                      id='currentPassword'
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange('currentPassword')}
                      placeholder='Current password'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='newPassword'>New Password</Label>
                    <PasswordInput
                      id='newPassword'
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange('newPassword')}
                      placeholder='New password'
                    />
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='confirmPassword'>Confirm Password</Label>
                    <PasswordInput
                      id='confirmPassword'
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange('confirmPassword')}
                      placeholder='Confirm new password'
                    />
                  </div>
                </div>
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    onClick={handlePasswordUpdate}
                    disabled={passwordSaving}
                  >
                    <Check className='mr-2 h-4 w-4' />
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
                {passwordError ? (
                  <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                    {passwordError}
                  </div>
                ) : null}
                {passwordMessage ? (
                  <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
                    {passwordMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
