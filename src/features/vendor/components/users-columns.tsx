'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileBadge,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { DataTableRowActions } from './data-table-row-actions'
import { VITE_PUBLIC_API_URL_BANNERS } from '@/config'
import Swal from 'sweetalert2'
import { toast } from 'sonner'
import { useDispatch } from 'react-redux'
import api from '@/lib/axios'
import { fetchAllVendors } from '@/store/slices/admin/vendorSlice'
import type { AppDispatch } from '@/store'

// Base file path for vendor files
const BASE_URL = VITE_PUBLIC_API_URL_BANNERS


// 🧾 Vendor Type Definition
export type Vendor = {
  id: string
  name: string
  business_type: string
  business_nature: string;
  established_year: string;
  country: string;
  avatar: string;
  dealing_area: string;
  annual_turnover: string;
  office_employees: string;
  certificates: {
    name: string;
    issuedBy: string;
    issuedDate: string;
  }[];
  gst_number: string
  pan_number: string
  alternate_contact_name: string
  alternate_contact_phone: string
  address: string
  street: string
  city: string
  state: string
  pincode: string
  bank_name: string
  bank_account: string
  ifsc_code: string
  branch: string
  upi_id: string
  categories: string[]
  return_policy: string
  operating_hours: string
  gst_cert: string
  pan_card: string
  email: string
  phone: string
  role: string
  is_email_verified: boolean
  is_profile_completed: boolean
  profile_complete_level: number
  is_active: boolean
  is_verified: boolean
  createdAt: string
  updatedAt: string
}

type VendorDetailsDialogProps = {
  vendor: Vendor & { _id?: string }
}

const VendorDetailsDialog = ({ vendor }: VendorDetailsDialogProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const [processingAction, setProcessingAction] = useState<'verify' | 'reject' | null>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const vendorId = vendor._id || vendor.id

  const handleAction = async (type: 'verify' | 'reject') => {
    if (!vendorId) return
    const actionMeta = {
      verify: {
        title: 'Verify Vendor?',
        text: `Are you sure you want to verify ${vendor.name}?`,
        success: 'Vendor verified successfully!',
        confirmButtonColor: '#16a34a',
        endpoint: `/vendors/verify/${vendorId}`,
      },
      reject: {
        title: 'Reject Vendor?',
        text: `Are you sure you want to reject ${vendor.name}?`,
        success: 'Vendor rejected successfully!',
        confirmButtonColor: '#dc2626',
        endpoint: `/vendors/reject/${vendorId}`,
      },
    }[type]

    const result = await Swal.fire({
      title: actionMeta.title,
      text: actionMeta.text,
      icon: type === 'verify' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: type === 'verify' ? 'Yes, Verify' : 'Yes, Reject',
      cancelButtonText: 'Cancel',
      confirmButtonColor: actionMeta.confirmButtonColor,
    })

    if (!result.isConfirmed) return

    setProcessingAction(type)

    try {
      const response = await api.put(actionMeta.endpoint)
      if (response.status >= 200 && response.status < 300) {
        toast.success(response.data.message || actionMeta.success)
        Swal.fire(
          type === 'verify' ? 'Verified!' : 'Rejected!',
          `${vendor.name} has been ${type === 'verify' ? 'verified' : 'rejected'}.`,
          type === 'verify' ? 'success' : 'success'
        )
        dispatch(fetchAllVendors())
      } else {
        throw new Error(response.data?.message || 'Action failed')
      }
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Something went wrong.', 'error')
    } finally {
      setProcessingAction(null)
    }
  }

  const categories = Array.isArray(vendor.categories)
    ? vendor.categories
    : []

  const statusBadges = [
    {
      label: 'Verified',
      value: vendor.is_verified ? 'Verified' : 'Pending',
      color: vendor.is_verified ? 'success' : 'warning',
      icon: <ShieldCheck className='h-4 w-4' />,
    },
    {
      label: 'Active',
      value: vendor.is_active ? 'Active' : 'Inactive',
      color: vendor.is_active ? 'success' : 'destructive',
      icon: <Users className='h-4 w-4' />,
    },
    {
      label: 'Email Verified',
      value: vendor.is_email_verified ? 'Yes' : 'No',
      color: vendor.is_email_verified ? 'success' : 'destructive',
      icon: <Mail className='h-4 w-4' />,
    },
  ]

  const heroItems = [
    {
      label: 'Business Type',
      value: vendor.business_type,
      icon: <Building2 className='h-4 w-4 text-white/70' />,
    },
    {
      label: 'Business Nature',
      value: vendor.business_nature,
      icon: <Globe2 className='h-4 w-4 text-white/70' />,
    },
    {
      label: 'Established',
      value: vendor.established_year,
      icon: <Clock3 className='h-4 w-4 text-white/70' />,
    },
  ]

  const detailRows = [
    { label: 'Email', value: vendor.email, icon: <Mail className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Phone', value: vendor.phone, icon: <Phone className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Alternate Contact', value: vendor.alternate_contact_name, icon: <Users className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Alternate Phone', value: vendor.alternate_contact_phone, icon: <Phone className='h-4 w-4 text-muted-foreground' /> },
    { label: 'GST Number', value: vendor.gst_number, icon: <BadgeCheck className='h-4 w-4 text-muted-foreground' /> },
    { label: 'PAN Number', value: vendor.pan_number, icon: <FileBadge className='h-4 w-4 text-muted-foreground' /> },
    { label: 'UPI ID', value: vendor.upi_id, icon: <CreditCard className='h-4 w-4 text-muted-foreground' /> },
  ]

  const locationRows = [
    { label: 'Address', value: vendor.address, icon: <MapPin className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Street', value: vendor.street, icon: <MapPin className='h-4 w-4 text-muted-foreground' /> },
    { label: 'City', value: vendor.city, icon: <MapPin className='h-4 w-4 text-muted-foreground' /> },
    { label: 'State', value: vendor.state, icon: <MapPin className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Pincode', value: vendor.pincode, icon: <MapPin className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Country', value: vendor.country, icon: <Globe2 className='h-4 w-4 text-muted-foreground' /> },
  ]

  const bankRows = [
    { label: 'Bank Name', value: vendor.bank_name, icon: <CreditCard className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Account Number', value: vendor.bank_account, icon: <CreditCard className='h-4 w-4 text-muted-foreground' /> },
    { label: 'IFSC', value: vendor.ifsc_code, icon: <CreditCard className='h-4 w-4 text-muted-foreground' /> },
    { label: 'Branch', value: vendor.branch, icon: <CreditCard className='h-4 w-4 text-muted-foreground' /> },
  ]

  const handleActionClick = (type: 'verify' | 'reject') => {
    setDialogOpen(false)
    handleAction(type)
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon' aria-label='View vendor details'>
          <Eye className='h-4 w-4' />
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-5xl w-[min(95vw,56rem)] max-h-[90vh] overflow-hidden p-0'>
        <div className='flex flex-col h-[90vh]'>
          <DialogHeader className='p-0'>
            <DialogTitle className='text-2xl font-semibold'>{vendor.name}</DialogTitle>
            <DialogDescription>
              All data captured for {vendor.name}. Use the buttons below to verify or reject this vendor.
            </DialogDescription>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-5 pb-6 pt-4 sm:px-6'>
            <div className='rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-600 p-6 text-white shadow-lg'>
              <div className='flex flex-col gap-4 md:flex-row md:items-center'>
                <div className='h-24 w-24 overflow-hidden rounded-2xl border border-white/40 bg-white/10'>
                  {vendor.avatar ? (
                    <img
                      src={vendor.avatar}
                      alt={`${vendor.name} avatar`}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center text-2xl font-semibold text-white/60'>
                      {vendor.name?.charAt(0) || 'V'}
                    </div>
                  )}
                </div>
                <div className='flex-1 min-w-[200px]'>
                  <p className='text-sm uppercase tracking-[0.3em] text-white/80'>Vendor Overview</p>
                  <p className='text-2xl font-bold leading-tight break-words'>{vendor.name}</p>
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    {statusBadges.map((status) => (
                      <Badge
                        key={status.label}
                        variant='outline'
                        className={cn(
                          'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase',
                          status.color === 'success'
                            ? 'border-white/80 text-white'
                            : status.color === 'warning'
                            ? 'border-amber-300 text-amber-100'
                            : 'border-red-400 text-red-100'
                        )}
                      >
                        {status.icon}
                        {status.label}: {status.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className='mt-6 grid gap-4 sm:grid-cols-3'>
                {heroItems.map((item) => (
                  <div
                    key={item.label}
                    className='rounded-2xl border border-white/30 bg-white/10 p-3 text-sm'
                  >
                    <div className='flex items-center gap-2 text-white/70'>
                      {item.icon}
                      <p>{item.label}</p>
                    </div>
                    <p className='mt-2 text-lg font-semibold'>{item.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <Separator className='my-6' />
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Contact Details
                </p>
                <div className='grid gap-3'>
                  {detailRows.map((row) => (
                    <div key={row.label} className='flex items-center gap-3'>
                      <span className='text-muted-foreground'>{row.icon}</span>
                      <div>
                        <p className='text-xs uppercase text-muted-foreground'>{row.label}</p>
                        <p className='text-base font-medium'>{row.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Location
                </p>
                <div className='grid gap-3'>
                  {locationRows.map((row) => (
                    <div key={row.label} className='flex items-center gap-3'>
                      <span className='text-muted-foreground'>{row.icon}</span>
                      <div>
                        <p className='text-xs uppercase text-muted-foreground'>{row.label}</p>
                        <p className='text-base font-medium'>{row.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Business Highlights
                </p>
                <div className='grid gap-3'>
                  <div className='flex items-center gap-3'>
                    <ShieldCheck className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-xs uppercase text-muted-foreground'>Categories</p>
                      <div className='mt-1 flex flex-wrap gap-2'>
                        {categories.length ? (
                          categories.map((category) => (
                            <Badge
                              key={category}
                              variant='outline'
                              className='rounded-full px-3 py-1 text-xs uppercase text-muted-foreground'
                            >
                              {category}
                            </Badge>
                          ))
                        ) : (
                          <p className='text-sm text-muted-foreground'>No categories</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Globe2 className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-xs uppercase text-muted-foreground'>Dealing Area</p>
                      <p className='text-base font-medium'>{vendor.dealing_area || '—'}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Clock3 className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-xs uppercase text-muted-foreground'>Operating Hours</p>
                      <p className='text-base font-medium'>{vendor.operating_hours || '—'}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <BadgeCheck className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-xs uppercase text-muted-foreground'>Profile Completion</p>
                      <p className='text-base font-medium'>
                        {vendor.is_profile_completed ? `${vendor.profile_complete_level}%` : 'Incomplete'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Banking
                </p>
                <div className='grid gap-3'>
                  {bankRows.map((row) => (
                    <div key={row.label} className='flex items-center gap-3'>
                      <span className='text-muted-foreground'>{row.icon}</span>
                      <div>
                        <p className='text-xs uppercase text-muted-foreground'>{row.label}</p>
                        <p className='text-base font-medium'>{row.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Documents
                </p>
                <div className='space-y-2'>
                  <p className='text-xs uppercase text-muted-foreground'>GST Certificate</p>
                  {vendor.gst_cert ? (
                    <a
                      href={`${BASE_URL}${vendor.gst_cert}`}
                      className='flex items-center gap-2 text-blue-600 hover:underline'
                      target='_blank'
                      rel='noreferrer'
                    >
                      <FileBadge className='h-4 w-4' />
                      View GST (PDF)
                    </a>
                  ) : (
                    <p className='text-sm text-muted-foreground italic'>Not uploaded</p>
                  )}
                  <p className='text-xs uppercase text-muted-foreground'>PAN Card</p>
                  {vendor.pan_card ? (
                    <a
                      href={`${BASE_URL}${vendor.pan_card}`}
                      className='flex items-center gap-2 text-blue-600 hover:underline'
                      target='_blank'
                      rel='noreferrer'
                    >
                      <FileBadge className='h-4 w-4' />
                      View PAN (PDF)
                    </a>
                  ) : (
                    <p className='text-sm text-muted-foreground italic'>Not uploaded</p>
                  )}
                </div>
              </section>

              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Meta
                </p>
                <div className='grid gap-2 text-sm text-muted-foreground'>
                  <p>Created: {vendor.createdAt ? new Date(vendor.createdAt).toLocaleString() : '—'}</p>
                  <p>Updated: {vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleString() : '—'}</p>
                  <p>Return Policy: {vendor.return_policy || '—'}</p>
                  <p>Annual Turnover: {vendor.annual_turnover || '—'}</p>
                  <p>Office Strength: {vendor.office_employees || '—'}</p>
                </div>
              </section>
            </div>

            {vendor.certificates && vendor.certificates.length > 0 && (
              <section className='space-y-3 rounded-2xl border border-border bg-background/80 p-4 shadow-sm'>
                <p className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Certificates
                </p>
                <div className='grid gap-2'>
                  {vendor.certificates.map((cert, index) => (
                    <div key={`${cert.name}-${index}`} className='flex items-center gap-3 text-sm'>
                      <FileBadge className='h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='font-medium'>{cert.name}</p>
                        <p className='text-xs text-muted-foreground'>
                          Issued by {cert.issuedBy} on{' '}
                          {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          <DialogFooter className='flex flex-wrap gap-3 pt-4 pb-4 px-5 sm:px-6'>
            <Button
              onClick={() => handleActionClick('verify')}
              disabled={processingAction === 'verify'}
              className='flex items-center gap-2'
            >
              <CheckCircle2 className='h-4 w-4' />
              {vendor.is_verified ? 'Re-verify' : 'Verify'} Vendor
            </Button>
            <Button
              onClick={() => handleActionClick('reject')}
              variant='outline'
              disabled={processingAction === 'reject'}
              className='flex items-center gap-2'
            >
              <XCircle className='h-4 w-4' />
              Reject Vendor
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 🧱 Table Columns
export const vendorColumns: ColumnDef<Vendor>[] = [
  // ✅ Checkbox select
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: 'w-10' },
  },

  // 🧍 Vendor Name
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Vendor Name' />
    ),
    cell: ({ row }) => <LongText className='font-medium'>{row.getValue('name')}</LongText>,
  },

  // 📧 Email
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
    cell: ({ row }) => <div className='text-muted-foreground'>{row.getValue('email')}</div>,
  },

  // 📱 Phone
  {
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Phone' />,
    cell: ({ row }) => <div>{row.getValue('phone')}</div>,
  },

  // 🏢 Business Type
  {
    accessorKey: 'business_type',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Business Type' />,
    cell: ({ row }) => <div>{row.getValue('business_type')}</div>,
  },

  // ✅ Verification Status
  {
    accessorKey: 'is_verified',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Verified' />,
    cell: ({ row }) => {
      const isVerified = row.getValue('is_verified')
      return (
        <Badge
          variant='outline'
          className={cn(
            'capitalize',
            isVerified
              ? 'border-green-400 text-green-600'
              : 'border-amber-400 text-amber-600'
          )}
        >
          {isVerified ? 'Verified' : 'Unverified'}
        </Badge>
      )
    },
  },

  // ✅ Active Status
  {
    accessorKey: 'is_active',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
    cell: ({ row }) => {
      const isActive = row.getValue('is_active')
      return (
        <Badge
          variant='outline'
          className={cn(
            'capitalize',
            isActive
              ? 'border-green-400 text-green-600'
              : 'border-red-400 text-red-600'
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },

  // 📅 Created At
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Created At' />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt')).toLocaleDateString()
      return <div className='text-muted-foreground'>{date}</div>
    },
  },

  // 👁️ View / ⚙️ Actions
  {
    id: 'actions',
    cell: ({ row }) => {
      const data = row.original
      return (
        <div className='flex items-center gap-2'>
        <VendorDetailsDialog vendor={data} />

          {/* ⚙️ Edit/Delete Actions */}
          <DataTableRowActions row={row} />
        </div>
      )
    },
    meta: { className: 'w-10' },
  },
]
