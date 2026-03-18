// import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
// import { useNavigate } from '@tanstack/react-router'
// import { type AppDispatch } from '@/store'
// import { setUser } from '@/store/slices/authSlice'
// import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
// import {
//   Camera,
//   Check,
//   Mail,
//   MapPin,
//   Phone,
//   Save,
//   Store,
//   UserRound,
//   X,
// } from 'lucide-react'
// import { useDispatch, useSelector } from 'react-redux'
// import api from '@/lib/axios'
// import { cn } from '@/lib/utils'
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Textarea } from '@/components/ui/textarea'
// import { TablePageHeader } from '@/components/data-table/table-page-header'
// import { Main } from '@/components/layout/main'
// import { PasswordInput } from '@/components/password-input'

// type EditableField = {
//   key: string
//   label: string
//   placeholder: string
//   type?: 'text' | 'email' | 'tel' | 'textarea'
// }

// type EditableSection = {
//   title: string
//   description: string
//   icon: typeof Store
//   fields: EditableField[]
// }

// const ADMIN_PROFILE_SECTIONS: EditableSection[] = [
//   {
//     title: 'Account Details',
//     description: 'Keep your primary account details up to date.',
//     icon: UserRound,
//     fields: [
//       { key: 'name', label: 'Full Name', placeholder: 'Your name' },
//       {
//         key: 'email',
//         label: 'Email',
//         placeholder: 'name@example.com',
//         type: 'email',
//       },
//       {
//         key: 'phone',
//         label: 'Phone',
//         placeholder: '+91 9876543210',
//         type: 'tel',
//       },
//     ],
//   },
// ]

// const VENDOR_PROFILE_SECTIONS: EditableSection[] = [
//   {
//     title: 'Business Details',
//     description: 'Core business identity details.',
//     icon: Store,
//     fields: [
//       { key: 'name', label: 'Store Name', placeholder: 'Dust Filter India' },
//       {
//         key: 'business_name',
//         label: 'Business Name',
//         placeholder: 'Registered business name',
//       },
//       {
//         key: 'registrar_name',
//         label: 'Registrar Name',
//         placeholder: 'Owner or registrar name',
//       },
//     ],
//   },
//   {
//     title: 'Contact Details',
//     description: 'Primary contact details for this account.',
//     icon: MapPin,
//     fields: [
//       {
//         key: 'email',
//         label: 'Email',
//         placeholder: 'support@store.com',
//         type: 'email',
//       },
//       {
//         key: 'phone',
//         label: 'Phone',
//         placeholder: '+91 9876543210',
//         type: 'tel',
//       },
//       {
//         key: 'alternate_contact_phone',
//         label: 'Alternate Phone',
//         placeholder: '+91 9000000000',
//         type: 'tel',
//       },
//     ],
//   },
//   {
//     title: 'Address',
//     description: 'Business address and location.',
//     icon: MapPin,
//     fields: [
//       {
//         key: 'address',
//         label: 'Address',
//         placeholder: 'Full business address',
//         type: 'textarea',
//       },
//       { key: 'city', label: 'City', placeholder: 'City' },
//       { key: 'state', label: 'State', placeholder: 'State' },
//       { key: 'pincode', label: 'Pincode', placeholder: '400001' },
//       { key: 'country', label: 'Country', placeholder: 'India' },
//     ],
//   },
// ]

// const normalizeRole = (value: unknown) =>
//   String(value || '')
//     .trim()
//     .toLowerCase()
//     .replace(/[\s_-]/g, '')

// const extractProfile = (payload: any) =>
//   payload?.vendor ||
//   payload?.data ||
//   payload?.user ||
//   payload?.admin ||
//   payload ||
//   null

// const readString = (value: unknown) => {
//   if (Array.isArray(value)) return value.filter(Boolean).join(', ')
//   if (typeof value === 'number') return String(value)
//   if (typeof value === 'string') return value
//   return ''
// }

// const formatRoleLabel = (value: unknown) => {
//   const normalized = normalizeRole(value)
//   if (!normalized) return '-'
//   if (normalized === 'superadmin') return 'Admin'
//   return normalized.charAt(0).toUpperCase() + normalized.slice(1)
// }

// const toBoolean = (value: unknown) =>
//   value === true ||
//   value === 1 ||
//   String(value || '')
//     .trim()
//     .toLowerCase() === 'true'

// const toArray = (value: unknown): string[] => {
//   if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item))
//   if (typeof value === 'string') {
//     const trimmed = value.trim()
//     if (!trimmed) return []
//     return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
//   }
//   return []
// }

// export default function ProfilePage() {
//   const dispatch = useDispatch<AppDispatch>()
//   const navigate = useNavigate()
//   const user = useSelector((state: any) => state.auth.user)
//   const isVendor = normalizeRole(user?.role) === 'vendor'
//   const profileSections = isVendor
//     ? VENDOR_PROFILE_SECTIONS
//     : ADMIN_PROFILE_SECTIONS
//   const editableFieldKeys = useMemo(
//     () =>
//       profileSections.flatMap((section) =>
//         section.fields.map((field) => field.key)
//       ),
//     [profileSections]
//   )
//   const fileInputRef = useRef<HTMLInputElement | null>(null)
//   const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [isEditing, setIsEditing] = useState(false)
//   const [saving, setSaving] = useState(false)
//   const [errorMessage, setErrorMessage] = useState('')
//   const [successMessage, setSuccessMessage] = useState('')
//   const [form, setForm] = useState<Record<string, string>>({})
//   const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
//   const [avatarFile, setAvatarFile] = useState<File | null>(null)
//   const [passwordForm, setPasswordForm] = useState({
//     currentPassword: '',
//     newPassword: '',
//     confirmPassword: '',
//   })
//   const [passwordSaving, setPasswordSaving] = useState(false)
//   const [passwordMessage, setPasswordMessage] = useState('')
//   const [passwordError, setPasswordError] = useState('')
//   const summaryFields = useMemo(
//     () => [
//       {
//         label: 'Business type',
//         value: readString(profile?.business_type || form.business_type),
//       },
//       {
//         label: 'Established year',
//         value: readString(profile?.established_year || form.established_year),
//       },
//       {
//         label: 'Annual turnover',
//         value: readString(profile?.annual_turnover || form.annual_turnover),
//       },
//       {
//         label: 'Employees',
//         value: readString(profile?.office_employees || form.office_employees),
//       },
//       {
//         label: 'Return policy',
//         value: readString(profile?.return_policy || form.return_policy),
//       },
//       {
//         label: 'UPI ID',
//         value: readString(profile?.upi_id),
//       },
//     ],
//     [profile, form],
//   )
//   const [activeSummary, setActiveSummary] = useState(summaryFields[0]?.label ?? '')
//   useEffect(() => {
//     setActiveSummary(summaryFields[0]?.label ?? '')
//   }, [summaryFields])
//   const businessNatureChips = toArray(profile?.business_nature || form.business_nature)
//   const categoryChips = toArray(profile?.categories || form.categories)
//   const dealingAreaChips = toArray(profile?.dealing_area || form.dealing_area)
//   const complianceFields = [
//     {
//       label: 'GST number',
//       value: readString(profile?.gst_number || form.gst_number),
//     },
//     {
//       label: 'PAN number',
//       value: readString(profile?.pan_number || form.pan_number),
//     },
//     {
//       label: 'Business license',
//       value: readString(profile?.business_license_number),
//     },
//   ]
//   const activeSummaryField = useMemo(
//     () => summaryFields.find((field) => field.label === activeSummary) ?? summaryFields[0],
//     [activeSummary, summaryFields],
//   )

//   const syncLocalState = (source: Record<string, unknown> | null) => {
//     const nextProfile = source && typeof source === 'object' ? source : {}
//     const nextForm = editableFieldKeys.reduce<Record<string, string>>(
//       (acc, key) => {
//         acc[key] = readString(nextProfile[key] ?? user?.[key])
//         return acc
//       },
//       {}
//     )

//     setProfile(nextProfile)
//     setForm(nextForm)
//     setAvatarPreview(readString(nextProfile.avatar || user?.avatar) || null)
//     setAvatarFile(null)
//   }

//   useEffect(() => {
//     if (!user?.id && !user?._id) return

//     let mounted = true

//     const loadProfile = async () => {
//       try {
//         setLoading(true)
//         setErrorMessage('')
//         const res = await api.get('/profile')
//         const fetched = extractProfile(res.data)
//         if (!mounted) return

//         const normalizedProfile =
//           fetched && typeof fetched === 'object'
//             ? (fetched as Record<string, unknown>)
//             : null

//         if (normalizedProfile) {
//           dispatch(setUser({ ...user, ...normalizedProfile }))
//           syncLocalState(normalizedProfile)
//           if (isVendor) {
//             void dispatch(fetchVendorProfile())
//           }
//         } else {
//           syncLocalState((user as Record<string, unknown>) || null)
//         }
//       } catch (error: any) {
//         if (!mounted) return
//         syncLocalState((user as Record<string, unknown>) || null)
//         setErrorMessage(
//           error?.response?.data?.message ||
//           'Failed to load profile details. Please try again.'
//         )
//       } finally {
//         if (mounted) setLoading(false)
//       }
//     }

//     void loadProfile()

//     return () => {
//       mounted = false
//     }
//   }, [dispatch, isVendor, user?.id, user?._id])

//   const displayName =
//     readString(profile?.name || user?.name || user?.business_name) || 'Profile'
//   const displayEmail = readString(profile?.email || user?.email) || '-'
//   const displayPhone = readString(profile?.phone || user?.phone) || '-'
//   const avatarInitials =
//     displayName
//       .split(/[\s._-]+/)
//       .filter(Boolean)
//       .map((part) => part[0]?.toUpperCase())
//       .filter(Boolean)
//       .slice(0, 2)
//       .join('') || 'PR'

//   const handleInputChange =
//     (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
//       setForm((prev) => ({ ...prev, [key]: event.target.value }))
//     }

//   const handleTextareaChange =
//     (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
//       setForm((prev) => ({ ...prev, [key]: event.target.value }))
//     }

//   const handlePasswordChange =
//     (key: 'currentPassword' | 'newPassword' | 'confirmPassword') =>
//       (event: ChangeEvent<HTMLInputElement>) => {
//         setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }))
//       }

//   const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
//     setErrorMessage('')
//     setSuccessMessage('')
//     const file = event.target.files?.[0]
//     if (!file) return

//     const isValid = /image\/(jpeg|png|webp|jpg)/i.test(file.type)
//     if (!isValid) {
//       setErrorMessage('Please upload a JPG, PNG, or WEBP image.')
//       return
//     }

//     setAvatarFile(file)
//     setAvatarPreview(URL.createObjectURL(file))
//   }

//   const handleReset = () => {
//     syncLocalState(profile)
//     setIsEditing(false)
//     setErrorMessage('')
//     setSuccessMessage('')
//   }

//   const handleSave = async () => {
//     const hasProfileChanges = editableFieldKeys.some((key) => {
//       const currentValue = readString(profile?.[key] ?? user?.[key])
//       return (form[key] || '') !== currentValue
//     })

//     if (!hasProfileChanges && !avatarFile) {
//       setSuccessMessage('Nothing changed.')
//       setErrorMessage('')
//       setIsEditing(false)
//       return
//     }

//     try {
//       setSaving(true)
//       setErrorMessage('')
//       setSuccessMessage('')

//       const payload = new FormData()
//       editableFieldKeys.forEach((key) => {
//         payload.append(key, form[key] ?? '')
//       })

//       if (avatarFile) {
//         payload.append('avatar', avatarFile)
//       }

//       const res = await api.put('/profile', payload, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       })

//       const updatedProfile = extractProfile(res.data)
//       const normalizedProfile =
//         updatedProfile && typeof updatedProfile === 'object'
//           ? (updatedProfile as Record<string, unknown>)
//           : null

//       if (normalizedProfile) {
//         dispatch(setUser({ ...user, ...normalizedProfile }))
//         syncLocalState(normalizedProfile)
//         if (isVendor) {
//           void dispatch(fetchVendorProfile())
//         }
//       }

//       setSuccessMessage('Profile updated successfully.')
//       setIsEditing(false)
//     } catch (error: any) {
//       setErrorMessage(
//         error?.response?.data?.message ||
//         'Failed to update profile. Please try again.'
//       )
//     } finally {
//       setSaving(false)
//     }
//   }

//   const handlePasswordUpdate = async () => {
//     setPasswordMessage('')
//     setPasswordError('')

//     if (!passwordForm.currentPassword || !passwordForm.newPassword) {
//       setPasswordError('Please enter your current and new password.')
//       return
//     }

//     if (passwordForm.newPassword.length < 7) {
//       setPasswordError('Password must be at least 7 characters long.')
//       return
//     }

//     if (passwordForm.newPassword !== passwordForm.confirmPassword) {
//       setPasswordError('Passwords do not match.')
//       return
//     }

//     try {
//       setPasswordSaving(true)
//       const res = await api.put('/profile/password', {
//         currentPassword: passwordForm.currentPassword,
//         newPassword: passwordForm.newPassword,
//         confirmPassword: passwordForm.confirmPassword,
//       })

//       if (isVendor) {
//         const vendorMeta = res.data?.vendor || {}
//         const wasMandatoryChange = Boolean(user?.must_change_password)
//         dispatch(
//           setUser({
//             ...user,
//             must_change_password:
//               typeof vendorMeta?.must_change_password === 'boolean'
//                 ? vendorMeta.must_change_password
//                 : false,
//             temp_password_issued_at:
//               vendorMeta?.temp_password_issued_at ?? null,
//             temp_password_expires_at:
//               vendorMeta?.temp_password_expires_at ?? null,
//             password_changed_at:
//               vendorMeta?.password_changed_at ?? new Date().toISOString(),
//           })
//         )

//         if (wasMandatoryChange) {
//           setPasswordMessage(
//             'Password updated successfully. Redirecting to dashboard...'
//           )
//           setPasswordForm({
//             currentPassword: '',
//             newPassword: '',
//             confirmPassword: '',
//           })
//           navigate({ to: '/' })
//           return
//         }
//       }

//       setPasswordMessage('Password updated successfully.')
//       setPasswordForm({
//         currentPassword: '',
//         newPassword: '',
//         confirmPassword: '',
//       })
//     } catch (error: any) {
//       setPasswordError(
//         error?.response?.data?.message ||
//         'Failed to update password. Please try again.'
//       )
//     } finally {
//       setPasswordSaving(false)
//     }
//   }

//   const isPasswordValid = (password: any) => {
//     const hasMinLength = password.length >= 8;
//     const hasUpper = /[A-Z]/.test(password);
//     const hasNumber = /[0-9]/.test(password);
//     const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

//     return hasMinLength && hasUpper && hasNumber && hasSpecial;
//   };

//   return (
//     <>
//       <TablePageHeader title='Profile'>
//         {!isEditing ? (
//           <Button
//             type='button'
//             variant='outline'
//             className='shrink-0'
//             onClick={() => {
//               setErrorMessage('')
//               setSuccessMessage('')
//               setIsEditing(true)
//             }}
//           >
//             Edit Profile
//           </Button>
//         ) : (
//           <>
//             <Button
//               type='button'
//               variant='outline'
//               className='shrink-0'
//               onClick={handleReset}
//               disabled={saving}
//             >
//               <X className='mr-2 h-4 w-4' />
//               Cancel
//             </Button>
//             <Button
//               type='button'
//               className='shrink-0'
//               onClick={handleSave}
//               disabled={saving}
//             >
//               <Save className='mr-2 h-4 w-4' />
//               {saving ? 'Saving...' : 'Save Changes'}
//             </Button>
//           </>
//         )}
//       </TablePageHeader>

//       <Main className='flex flex-col gap-6 pb-8'>
//         {errorMessage ? (
//           <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
//             {errorMessage}
//           </div>
//         ) : null}
//         {successMessage ? (
//           <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
//             {successMessage}
//           </div>
//         ) : null}
//         {isVendor && user?.must_change_password ? (
//           <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
//             Temporary password detected. Change your password now to keep this
//             account active.
//           </div>
//         ) : null}

//         <div className='grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
//           <div className='grid gap-6'>
//             <div className='sticky top-20 space-y-6'>
//               <Card className='border border-slate-200 bg-white shadow-sm'>
//                 <CardContent className='space-y-5 pt-6'>
//                 <div className='flex flex-col items-center gap-4 text-center'>
//                   <div className='relative'>
//                     <Avatar className='h-24 w-24 border border-slate-200'>
//                       <AvatarImage
//                         src={avatarPreview || undefined}
//                         alt={displayName}
//                       />
//                       <AvatarFallback className='text-lg font-semibold'>
//                         {avatarInitials}
//                       </AvatarFallback>
//                     </Avatar>
//                     <input
//                       ref={fileInputRef}
//                       type='file'
//                       accept='image/*'
//                       className='hidden'
//                       onChange={handleAvatarSelect}
//                     />
//                   </div>
//                   <div className='space-y-2'>
//                     <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
//                       {displayName}
//                     </h1>
//                     <p className='text-sm break-all text-slate-500'>
//                       {displayEmail}
//                     </p>
//                     <div className='flex flex-wrap items-center justify-center gap-2'>
//                       <Badge variant='outline'>
//                         {formatRoleLabel(user?.role)}
//                       </Badge>
//                       {isVendor && toBoolean(profile?.is_active) ? (
//                         <Badge
//                           variant='outline'
//                           className='border-emerald-200 bg-emerald-50 text-emerald-700'
//                         >
//                           Active
//                         </Badge>
//                       ) : null}
//                     </div>
//                   </div>
//                   {isEditing ? (
//                     <Button
//                       type='button'
//                       variant='outline'
//                       className='w-full'
//                       onClick={() => fileInputRef.current?.click()}
//                     >
//                       <Camera className='mr-2 h-4 w-4' />
//                       Change Photo
//                     </Button>
//                   ) : null}
//                 </div>

//                 <div className='space-y-3 border-t border-slate-100 pt-4 text-sm'>
//                   <div className='flex items-start gap-3'>
//                     <Mail className='mt-0.5 h-4 w-4 text-slate-400' />
//                     <span className='break-all text-slate-600'>
//                       {displayEmail}
//                     </span>
//                   </div>
//                   <div className='flex items-start gap-3'>
//                     <Phone className='mt-0.5 h-4 w-4 text-slate-400' />
//                     <span className='break-all text-slate-600'>
//                       {displayPhone}
//                     </span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//             </div>
//           </div>

//           <div className='grid gap-6 overflow-hidden'>
//             <div className='grid gap-6 overflow-y-auto pr-1 max-h-[calc(100vh-240px)]'>
//               <Card className='border border-slate-200 bg-white shadow-sm'>
//               <CardHeader className='pb-3'>
//                 <CardTitle className='text-lg'>Profile Details</CardTitle>
//               </CardHeader>
//               <CardContent className='space-y-6'>
//                 {loading ? (
//                   <p className='text-sm text-slate-500'>
//                     Loading profile details...
//                   </p>
//                 ) : (
//                   profileSections.map((section, index) => (
//                     <div key={section.title} className='space-y-4'>
//                       <div className='flex items-start gap-3'>
//                         <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700'>
//                           <section.icon className='h-4 w-4' />
//                         </span>
//                         <div>
//                           <h2 className='text-base font-semibold text-slate-900'>
//                             {section.title}
//                           </h2>
//                           <p className='text-sm text-slate-500'>
//                             {section.description}
//                           </p>
//                         </div>
//                       </div>

//                       <div className='grid gap-4 md:grid-cols-2'>
//                         {section.fields.map((field) => (
//                           <div
//                             key={field.key}
//                             className={
//                               field.type === 'textarea'
//                                 ? 'space-y-2 md:col-span-2'
//                                 : 'space-y-2'
//                             }
//                           >
//                             <Label htmlFor={field.key}>{field.label}</Label>
//                             {field.type === 'textarea' ? (
//                               <Textarea
//                                 id={field.key}
//                                 value={form[field.key] || ''}
//                                 onChange={handleTextareaChange(field.key)}
//                                 placeholder={field.placeholder}
//                                 disabled={!isEditing}
//                                 className='min-h-[108px] resize-y'
//                               />
//                             ) : (
//                               <Input
//                                 id={field.key}
//                                 value={form[field.key] || ''}
//                                 onChange={handleInputChange(field.key)}
//                                 placeholder={field.placeholder}
//                                 type={field.type || 'text'}
//                                 disabled={!isEditing}
//                               />
//                             )}
//                           </div>
//                         ))}
//                       </div>

//                       {index < profileSections.length - 1 ? (
//                         <div className='border-b border-slate-100' />
//                       ) : null}
//                     </div>
//                   ))
//           )}
//         </CardContent>
//       </Card>

//       <Card className='border border-slate-200 bg-white shadow-sm'>
//         <CardHeader className='pb-3'>
//           <CardTitle className='text-lg'>Registration snapshot</CardTitle>
//           <p className='text-sm text-slate-500'>
//             A quick recap of the data you submitted during onboarding.
//           </p>
//         </CardHeader>
//         <CardContent className='space-y-6'>
//           <div className='grid gap-4 md:grid-cols-3'>
//             {summaryFields.map((field) => (
//               <button
//                 key={field.label}
//                 type='button'
//                 onClick={() => setActiveSummary(field.label)}
//                 className={cn(
//                   'rounded-lg border p-4 text-left transition',
//                   activeSummary === field.label
//                     ? 'border-violet-700 bg-white shadow-lg'
//                     : 'border-slate-200 bg-slate-50 hover:border-slate-300',
//                 )}
//               >
//                 <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>{field.label}</p>
//                 <p className='mt-2 text-base font-semibold text-slate-900'>{field.value || '-'}</p>
//               </button>
//             ))}
//           </div>
//           <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4'>
//             <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Focused insight</p>
//             <p className='mt-2 text-lg font-semibold text-slate-900'>
//               {activeSummaryField?.value || 'No data captured yet.'}
//             </p>
//             <p className='mt-1 text-sm text-slate-500'>
//               {activeSummaryField?.label
//                 ? `This value is sourced from the ${activeSummaryField.label.toLowerCase()} step.`
//                 : 'Select a tile to learn more.'}
//             </p>
//           </div>
//           <div className='grid gap-4 md:grid-cols-3'>
//             <div>
//               <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Business nature</p>
//               <div className='mt-2 flex flex-wrap gap-2'>
//                 {businessNatureChips.length ? (
//                   businessNatureChips.map((item) => (
//                     <Badge key={item} variant='outline'>
//                       {item}
//                     </Badge>
//                   ))
//                 ) : (
//                   <span className='text-xs text-slate-400'>Not specified</span>
//                 )}
//               </div>
//             </div>
//             <div>
//               <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Categories</p>
//               <div className='mt-2 flex flex-wrap gap-2'>
//                 {categoryChips.length ? (
//                   categoryChips.map((item) => (
//                     <Badge key={item} variant='outline'>
//                       {item}
//                     </Badge>
//                   ))
//                 ) : (
//                   <span className='text-xs text-slate-400'>Not specified</span>
//                 )}
//               </div>
//             </div>
//             <div>
//               <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Dealing countries</p>
//               <div className='mt-2 flex flex-wrap gap-2'>
//                 {dealingAreaChips.length ? (
//                   dealingAreaChips.map((item) => (
//                     <Badge key={item} variant='outline'>
//                       {item}
//                     </Badge>
//                   ))
//                 ) : (
//                   <span className='text-xs text-slate-400'>Not specified</span>
//                 )}
//               </div>
//             </div>
//           </div>
//           <div className='grid gap-4 md:grid-cols-3'>
//             {complianceFields.map((field) => (
//               <div key={field.label} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
//                 <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>{field.label}</p>
//                 <p className='mt-2 text-base font-semibold text-slate-900'>{field.value || '-'}</p>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>

//       <Card className='border border-slate-200 bg-white shadow-sm'>
//         <CardHeader className='pb-3'>
//           <CardTitle className='text-lg'>Security</CardTitle>
//               </CardHeader>
//               <CardContent className='space-y-6'>
//                 <div className='space-y-1'>
//                   <p className='text-sm font-medium text-slate-700'>Update your password</p>
//                   <p className='text-xs text-slate-500'>
//                     Changes will only be saved if all security requirements are met.
//                   </p>
//                 </div>

//                 <div className='grid gap-4 md:grid-cols-2'>
//                   {/* ... Current Password Input ... */}
//                   <div className='space-y-2'>
//                     <Label htmlFor='currentPassword'>Current Password</Label>
//                     <PasswordInput
//                       id='currentPassword'
//                       value={passwordForm.currentPassword}
//                       onChange={handlePasswordChange('currentPassword')}
//                       placeholder='Current password'
//                     />
//                   </div>

//                   {/* New Password Input */}
//                   <div className='space-y-2'>
//                     <Label htmlFor='newPassword'>New Password</Label>
//                     <PasswordInput
//                       id='newPassword'
//                       value={passwordForm.newPassword}
//                       onChange={handlePasswordChange('newPassword')}
//                       placeholder='New password'
//                     />
//                   </div>

//                   {/* Confirm Password Input */}
//                   <div className='space-y-2 md:col-span-2'>
//                     <Label htmlFor='confirmPassword'>Confirm Password</Label>
//                     <PasswordInput
//                       id='confirmPassword'
//                       value={passwordForm.confirmPassword}
//                       onChange={handlePasswordChange('confirmPassword')}
//                       placeholder='Confirm new password'
//                     />
//                   </div>
//                 </div>

//                 {/* Requirement Checklist with Real-time Colors */}
//                 <div className='rounded-lg bg-slate-50 p-4 border border-slate-100'>
//                   <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500'>
//                     Password Requirements:
//                   </p>
//                   <ul className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
//                     {[
//                       { label: '8+ Characters', met: passwordForm.newPassword.length >= 8 },
//                       { label: '1 Capital Letter', met: /[A-Z]/.test(passwordForm.newPassword) },
//                       { label: '1 Number', met: /[0-9]/.test(passwordForm.newPassword) },
//                       { label: '1 Special Character', met: /[!@#$%^&*]/.test(passwordForm.newPassword) },
//                     ].map((req, index) => (
//                       <li key={index} className={`flex items-center text-xs transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
//                         <div className={`mr-2 h-1.5 w-1.5 rounded-full ${req.met ? 'bg-emerald-500' : 'bg-slate-300'}`} />
//                         {req.label}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>

//                 <div className='flex justify-end'>
//                   <Button
//                     type='button'
//                     onClick={handlePasswordUpdate}
//                     // BUTTON IS DISABLED UNLESS VALID
//                     disabled={
//                       passwordSaving ||
//                       !isPasswordValid(passwordForm.newPassword) ||
//                       passwordForm.newPassword !== passwordForm.confirmPassword
//                     }
//                     className="bg-[#6d28d9] hover:bg-[#5b21b6] text-white disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {passwordSaving ? 'Updating...' : (
//                       <>
//                         <Check className='mr-2 h-4 w-4' />
//                         Update Password
//                       </>
//                     )}
//                   </Button>
//                 </div>

//                 {/* Error/Success Messages... */}
//                 {passwordError ? (
//                   <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
//                     {passwordError}
//                   </div>
//                 ) : null}

//                 {passwordMessage ? (
//                   <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
//                     {passwordMessage}
//                   </div>
//                 ) : null}
//               </CardContent>

//             </Card>
//           </div>
//         </div>
//       </Main>
//     </>
//   )
// }

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
import { cn } from '@/lib/utils'
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
      { key: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email' },
      { key: 'phone', label: 'Phone', placeholder: '+91 9876543210', type: 'tel' },
    ],
  },
]

const VENDOR_PROFILE_SECTIONS: EditableSection[] = [
  {
    title: 'Business Details',
    description: 'Core business identity details.',
    icon: Store,
    fields: [
      { key: 'name', label: 'Store Name', placeholder: 'Store name' },
      { key: 'business_name', label: 'Business Name', placeholder: 'Registered business name' },
      { key: 'registrar_name', label: 'Registrar Name', placeholder: 'Owner or registrar name' },
    ],
  },
  {
    title: 'Contact Details',
    description: 'Primary contact details for this account.',
    icon: MapPin,
    fields: [
      { key: 'email', label: 'Email', placeholder: 'support@store.com', type: 'email' },
      { key: 'phone', label: 'Phone', placeholder: '+91 9876543210', type: 'tel' },
      { key: 'alternate_contact_phone', label: 'Alternate Phone', placeholder: '+91 9000000000', type: 'tel' },
    ],
  },
  {
    title: 'Address',
    description: 'Business address and location.',
    icon: MapPin,
    fields: [
      { key: 'address', label: 'Address', placeholder: 'Full business address', type: 'textarea' },
      { key: 'city', label: 'City', placeholder: 'City' },
      { key: 'state', label: 'State', placeholder: 'State' },
      { key: 'pincode', label: 'Pincode', placeholder: '400001' },
      { key: 'country', label: 'Country', placeholder: 'India' },
    ],
  },
]

// ... (Helpers: normalizeRole, extractProfile, readString, formatRoleLabel, toBoolean, toArray remain the same)

const normalizeRole = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[\s_-]/g, '')
const extractProfile = (payload: any) => payload?.vendor || payload?.data || payload?.user || payload?.admin || payload || null
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
const toBoolean = (value: unknown) => value === true || value === 1 || String(value || '').trim().toLowerCase() === 'true'
const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item))
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed.split(',').map((item) => item.trim()).filter(Boolean) : []
  }
  return []
}

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((state: any) => state.auth.user)
  const isVendor = normalizeRole(user?.role) === 'vendor'

  const profileSections = isVendor ? VENDOR_PROFILE_SECTIONS : ADMIN_PROFILE_SECTIONS
  const editableFieldKeys = useMemo(() => profileSections.flatMap((s) => s.fields.map((f) => f.key)), [profileSections])

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

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const summaryFields = useMemo(() => [
    { label: 'Business type', value: readString(profile?.business_type || form.business_type) },
    { label: 'Established year', value: readString(profile?.established_year || form.established_year) },
    { label: 'Annual turnover', value: readString(profile?.annual_turnover || form.annual_turnover) },
    { label: 'Employees', value: readString(profile?.office_employees || form.office_employees) },
    { label: 'Return policy', value: readString(profile?.return_policy || form.return_policy) },
    { label: 'UPI ID', value: readString(profile?.upi_id) },
  ], [profile, form])

  const [activeSummary, setActiveSummary] = useState(summaryFields[0]?.label ?? '')
  const activeSummaryField = useMemo(() => summaryFields.find((f) => f.label === activeSummary) ?? summaryFields[0], [activeSummary, summaryFields])

  const businessNatureChips = toArray(profile?.business_nature || form.business_nature)
  const categoryChips = toArray(profile?.categories || form.categories)
  const dealingAreaChips = toArray(profile?.dealing_area || form.dealing_area)

  const complianceFields = [
    { label: 'GST number', value: readString(profile?.gst_number || form.gst_number) },
    { label: 'PAN number', value: readString(profile?.pan_number || form.pan_number) },
    { label: 'Business license', value: readString(profile?.business_license_number) },
  ]

  const syncLocalState = (source: Record<string, unknown> | null) => {
    const nextProfile = source && typeof source === 'object' ? source : {}
    const nextForm = editableFieldKeys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = readString(nextProfile[key] ?? user?.[key])
      return acc
    }, {})
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
        setErrorMessage(error?.response?.data?.message || 'Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user?.id, user?._id])

  const displayName = readString(profile?.name || user?.name || user?.business_name) || 'Profile'
  const displayEmail = readString(profile?.email || user?.email) || '-'
  const displayPhone = readString(profile?.phone || user?.phone) || '-'
  const avatarInitials = displayName.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PR'

  const handleInputChange = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
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
      editableFieldKeys.forEach(key => payload.append(key, form[key] || ''))
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
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)
  }

  const handlePasswordUpdate = async () => {
    try {
      setPasswordSaving(true)
      await api.put('/profile/password', passwordForm)
      setPasswordMessage('Password updated successfully.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      setPasswordError(error?.response?.data?.message || 'Password update failed.')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <>
      <TablePageHeader title='Profile'>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant='outline'>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => { setIsEditing(false); syncLocalState(profile) }} variant='outline' disabled={saving}>
              <X className='mr-2 h-4 w-4' /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className='mr-2 h-4 w-4' /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </TablePageHeader>

      <Main className='flex flex-col gap-6 pb-8'>
        {errorMessage && <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{errorMessage}</div>}
        {successMessage && <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700'>{successMessage}</div>}

        <div className='grid gap-6 xl:grid-cols-[320px_1fr]'>
          {/* Sidebar */}
          <aside className='space-y-6 sticky top-24 self-start'>
            <Card>
              <CardContent className='pt-6 text-center space-y-4'>
                <div className='relative mx-auto w-24 h-24'>
                  <Avatar className='h-24 w-24'>
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback>{avatarInitials}</AvatarFallback>
                  </Avatar>
                  <input ref={fileInputRef} type='file' className='hidden' onChange={handleAvatarSelect} />
                </div>
                <div>
                  <h2 className='text-xl font-bold'>{displayName}</h2>
                  <p className='text-sm text-slate-500'>{displayEmail}</p>
                </div>
                <div className='flex justify-center gap-2'>
                  <Badge variant="outline">{formatRoleLabel(user?.role)}</Badge>
                  {isVendor && toBoolean(profile?.is_active) && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>}
                </div>
                {isEditing && (
                  <Button variant='outline' size="sm" className='w-full' onClick={() => fileInputRef.current?.click()}>
                    <Camera className='mr-2 h-4 w-4' /> Change Photo
                  </Button>
                )}
                <div className='border-t pt-4 text-left space-y-2 text-sm'>
                  <div className='flex items-center gap-2 text-slate-600'><Mail className='h-4 w-4' /> {displayEmail}</div>
                  <div className='flex items-center gap-2 text-slate-600'><Phone className='h-4 w-4' /> {displayPhone}</div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className='space-y-6 overflow-hidden'>
            <div className='space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-1'>
            <Card>
              <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
              <CardContent className='space-y-8'>
                {loading ? <p>Loading...</p> : profileSections.map((section, idx) => (
                  <div key={section.title} className='space-y-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-slate-100 rounded-lg'><section.icon className='h-5 w-5' /></div>
                      <div>
                        <h3 className='font-semibold'>{section.title}</h3>
                        <p className='text-sm text-slate-500'>{section.description}</p>
                      </div>
                    </div>
                    <div className='grid gap-4 md:grid-cols-2'>
                      {section.fields.map(field => (
                        <div key={field.key} className={cn(field.type === 'textarea' && 'md:col-span-2')}>
                          <Label>{field.label}</Label>
                          {field.type === 'textarea' ? (
                            <Textarea value={form[field.key] || ''} onChange={handleInputChange(field.key)} disabled={!isEditing} />
                          ) : (
                            <Input value={form[field.key] || ''} onChange={handleInputChange(field.key)} type={field.type} disabled={!isEditing} />
                          )}
                        </div>
                      ))}
                    </div>
                    {idx < profileSections.length - 1 && <div className='border-b pt-4' />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Registration Snapshot (Vendor Only) */}
            {isVendor && (
              <Card>
                <CardHeader><CardTitle>Registration Snapshot</CardTitle></CardHeader>
                <CardContent className='space-y-6'>
                  <div className='grid gap-3 md:grid-cols-3'>
                    {summaryFields.map(f => (
                      <button key={f.label} onClick={() => setActiveSummary(f.label)} className={cn('p-3 border rounded-lg text-left transition', activeSummary === f.label ? 'border-violet-600 bg-violet-50' : 'bg-slate-50')}>
                        <span className='text-[10px] uppercase text-slate-500 font-bold'>{f.label}</span>
                        <div className='font-semibold truncate'>{f.value || '-'}</div>
                      </button>
                    ))}
                  </div>
                  <div className='p-4 bg-slate-50 border border-dashed rounded-lg'>
                    <span className='text-[10px] uppercase text-slate-500 font-bold'>Focused Insight</span>
                    <p className='text-lg font-semibold'>{activeSummaryField?.value || 'No data'}</p>
                  </div>
                  <div className='grid md:grid-cols-3 gap-6'>
                    <div><Label className='text-[10px] uppercase text-slate-500'>Business Nature</Label><div className='flex flex-wrap gap-1 mt-1'>{businessNatureChips.map(c => <Badge key={c} variant='secondary'>{c}</Badge>)}</div></div>
                    <div><Label className='text-[10px] uppercase text-slate-500'>Categories</Label><div className='flex flex-wrap gap-1 mt-1'>{categoryChips.map(c => <Badge key={c} variant='secondary'>{c}</Badge>)}</div></div>
                    <div><Label className='text-[10px] uppercase text-slate-500'>Countries</Label><div className='flex flex-wrap gap-1 mt-1'>{dealingAreaChips.map(c => <Badge key={c} variant='secondary'>{c}</Badge>)}</div></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            <Card>
              <CardHeader><CardTitle>Security</CardTitle></CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'><Label>Current Password</Label><PasswordInput value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} /></div>
                  <div className='space-y-2'><Label>New Password</Label><PasswordInput value={passwordForm.newPassword} onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))} /></div>
                  <div className='md:col-span-2 space-y-2'><Label>Confirm Password</Label><PasswordInput value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} /></div>
                </div>

                <div className='p-4 bg-slate-50 rounded-lg text-xs space-y-2'>
                  <p className='font-bold text-slate-500 uppercase'>Requirements:</p>
                  <ul className='grid grid-cols-2 gap-2'>
                    <li className={cn(passwordForm.newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-400')}>• 8+ Characters</li>
                    <li className={cn(/[A-Z]/.test(passwordForm.newPassword) ? 'text-emerald-600' : 'text-slate-400')}>• 1 Uppercase</li>
                    <li className={cn(/[0-9]/.test(passwordForm.newPassword) ? 'text-emerald-600' : 'text-slate-400')}>• 1 Number</li>
                    <li className={cn(/[!@#$%^&*]/.test(passwordForm.newPassword) ? 'text-emerald-600' : 'text-slate-400')}>• 1 Special Char</li>
                  </ul>
                </div>

                <div className='flex justify-end'>
                  <Button 
                    onClick={handlePasswordUpdate} 
                    disabled={passwordSaving || !isPasswordValid(passwordForm.newPassword) || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="bg-violet-700 hover:bg-violet-800"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
                {passwordError && <p className='text-sm text-red-600'>{passwordError}</p>}
                {passwordMessage && <p className='text-sm text-emerald-600'>{passwordMessage}</p>}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
