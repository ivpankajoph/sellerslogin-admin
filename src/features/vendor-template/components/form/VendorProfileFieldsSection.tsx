import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type VendorProfileFieldsSectionProps = {
  vendorProfile?: Record<string, unknown>
  updateField: (path: string[], value: unknown) => void
}

const CORE_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'name', label: 'Store Name', placeholder: 'Ophmate Store' },
  { key: 'registrar_name', label: 'Registrar Name', placeholder: 'Registrar name' },
  { key: 'business_name', label: 'Business Name', placeholder: 'Business name' },
  { key: 'email', label: 'Email', placeholder: 'support@yourstore.com' },
  { key: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
  {
    key: 'alternate_contact_phone',
    label: 'Alternate Phone',
    placeholder: '+91 9000000000',
  },
  { key: 'address', label: 'Address', placeholder: 'Full address' },
  { key: 'street', label: 'Street', placeholder: 'Street / area' },
  { key: 'city', label: 'City', placeholder: 'City' },
  { key: 'state', label: 'State', placeholder: 'State' },
  { key: 'pincode', label: 'Pincode', placeholder: '400001' },
  { key: 'country', label: 'Country', placeholder: 'India' },
  { key: 'business_type', label: 'Business Type', placeholder: 'Retail' },
  {
    key: 'business_nature',
    label: 'Business Nature',
    placeholder: 'Manufacturer / Trader',
  },
  { key: 'categories', label: 'Categories', placeholder: 'Medicines, Devices' },
  {
    key: 'established_year',
    label: 'Established Year',
    placeholder: '2018',
  },
  {
    key: 'operating_hours',
    label: 'Operating Hours',
    placeholder: 'Mon-Sat: 9AM - 7PM',
  },
  {
    key: 'return_policy',
    label: 'Return Policy',
    placeholder: '7-day easy return',
  },
  {
    key: 'annual_turnover',
    label: 'Annual Turnover',
    placeholder: '5-10 Cr',
  },
  {
    key: 'dealing_area',
    label: 'Dealing Area',
    placeholder: 'Pan India',
  },
  {
    key: 'office_employees',
    label: 'Office Employees',
    placeholder: '25',
  },
]

const CORE_FIELD_KEYS = new Set(CORE_FIELDS.map((field) => field.key))

const normalizeLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const readString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.join(', ')
  return ''
}

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

export function VendorProfileFieldsSection({
  vendorProfile,
  updateField,
}: VendorProfileFieldsSectionProps) {
  const profile =
    vendorProfile && typeof vendorProfile === 'object'
      ? (vendorProfile as Record<string, unknown>)
      : {}
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const customKeys = useMemo(
    () =>
      Object.keys(profile)
        .filter((key) => !CORE_FIELD_KEYS.has(key))
        .sort((a, b) => a.localeCompare(b)),
    [profile]
  )

  const setValue = (key: string, value: string) => {
    updateField(['components', 'vendor_profile', key], value)
  }

  const handleAddField = () => {
    const normalized = normalizeKey(newKey)
    if (!normalized) return
    setValue(normalized, newValue.trim())
    setNewKey('')
    setNewValue('')
  }

  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
      <div className='mb-4'>
        <h3 className='text-lg font-semibold text-slate-900'>Vendor Profile Overrides</h3>
        <p className='text-sm text-slate-500'>
          These values override vendor profile details shown in About and Contact pages.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        {CORE_FIELDS.map((field) => (
          <div key={field.key} className='space-y-2'>
            <Label>{field.label}</Label>
            <Input
              value={readString(profile[field.key])}
              onChange={(event) => setValue(field.key, event.target.value)}
              placeholder={field.placeholder}
              data-editor-component={`components.vendor_profile.${field.key}`}
            />
          </div>
        ))}
      </div>

      <div className='mt-6 space-y-3'>
        <h4 className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-500'>
          Custom Fields
        </h4>
        {customKeys.length ? (
          <div className='space-y-3'>
            {customKeys.map((key) => (
              <div key={key} className='grid gap-2 md:grid-cols-[minmax(120px,0.5fr)_1fr_auto]'>
                <Input value={normalizeLabel(key)} disabled />
                <Input
                  value={readString(profile[key])}
                  onChange={(event) => setValue(key, event.target.value)}
                  data-editor-component={`components.vendor_profile.${key}`}
                />
                <Button type='button' variant='outline' onClick={() => setValue(key, '')}>
                  Clear
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-sm text-slate-500'>No custom fields yet.</p>
        )}
      </div>

      <div className='mt-4 grid gap-2 md:grid-cols-[minmax(120px,0.5fr)_1fr_auto]'>
        <Input
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          placeholder='custom_field_key'
        />
        <Input
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          placeholder='Custom value'
        />
        <Button type='button' onClick={handleAddField}>
          Add Field
        </Button>
      </div>
    </div>
  )
}
