import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { getStoredActiveWebsiteId } from './websiteStudioStorage'

type DomainRecord = {
  hostname?: string
  status?: string
  ssl_status?: string
  connected_at?: string | null
  last_checked_at?: string | null
  last_error?: string
}

type DnsInstruction = {
  type?: string
  name?: string
  value?: string
}

type DomainConfigResponse = {
  success?: boolean
  message?: string
  websiteId?: string
  domain?: DomainRecord | null
  dnsInstructions?: {
    apex?: DnsInstruction
    www?: DnsInstruction
  }
}

interface Type {
  open: boolean
  setOpen: (v: boolean) => void
}

const statusLabel: Record<string, string> = {
  unconfigured: 'Not connected',
  pending_dns: 'Waiting for DNS',
  active: 'Live',
  error: 'Error',
}

const sslStatusLabel: Record<string, string> = {
  pending: 'Pending',
  provisioning: 'Provisioning',
  active: 'Active',
  error: 'Error',
}

export function DomainModal({ open, setOpen }: Type) {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [config, setConfig] = useState<DomainConfigResponse | null>(null)

  const token = useSelector((state: any) => state?.auth?.token)
  const authUser = useSelector((state: any) => state?.auth?.user || null)
  const vendorId = String(
    authUser?.id || authUser?._id || authUser?.vendor_id || authUser?.vendorId || ''
  ).trim()
  const activeWebsiteId = getStoredActiveWebsiteId(vendorId)

  const requestConfig = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get(`${BASE_URL}/v1/templates/domains`, {
        params: activeWebsiteId
          ? { website_id: activeWebsiteId }
          : undefined,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = response.data as DomainConfigResponse
      setConfig(payload)
      setDomain(payload?.domain?.hostname || '')
      setMessage(payload?.message || '')
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load domain settings'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !token) return
    requestConfig()
  }, [open, token])

  const handleSubmit = async () => {
    const normalized = domain.trim().toLowerCase()

    if (!normalized) {
      setError('Domain is required.')
      return
    }

    if (normalized.includes('http://') || normalized.includes('https://')) {
      setError('Only domain name enter karo, http/https mat do.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await axios.post(
        `${BASE_URL}/v1/templates/domains`,
        {
          domain: normalized,
          ...(activeWebsiteId ? { website_id: activeWebsiteId } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const payload = response.data as DomainConfigResponse
      setConfig(payload)
      setDomain(payload?.domain?.hostname || normalized)
      setMessage(payload?.message || 'Domain saved successfully')
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to save domain'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setError('')
    setMessage('')

    try {
      const response = await axios.delete(`${BASE_URL}/v1/templates/domains`, {
        data: activeWebsiteId ? { website_id: activeWebsiteId } : {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setConfig(null)
      setDomain('')
      setMessage(response?.data?.message || 'Domain removed')
      await requestConfig()
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to remove domain'
      )
    } finally {
      setRemoving(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
    setMessage('')
  }

  const apex = config?.dnsInstructions?.apex
  const www = config?.dnsInstructions?.www
  const currentDomain = config?.domain
  const currentStatus = String(currentDomain?.status || 'unconfigured')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className='max-w-2xl space-y-4 rounded-2xl border p-6 shadow-lg'
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>
            Connect Custom Domain
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900'>
            Domain dashboard me save karne ke baad vendor ko bas DNS records update
            karne hain. DNS server par point hote hi site live ho jayegi.
          </div>

          <div className='flex flex-col space-y-1'>
            <label className='text-sm font-medium'>Domain</label>
            <input
              type='text'
              className='w-full rounded-md border px-3 py-2 focus:ring focus:ring-blue-300 focus:outline-none'
              placeholder='example.com'
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className='text-xs text-gray-500'>
              Example: `example.com` ya `shop.example.com`
            </p>
          </div>

          <div className='flex flex-wrap gap-3 pt-1'>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Domain'}
            </Button>
            <Button variant='outline' onClick={requestConfig} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            {currentDomain?.hostname ? (
              <Button
                variant='outline'
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? 'Removing...' : 'Remove Domain'}
              </Button>
            ) : null}
            <Button variant='outline' onClick={handleClose}>
              Close
            </Button>
          </div>

          {error ? (
            <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
              {error}
            </div>
          ) : null}

          {message ? (
            <div className='rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>
              {message}
            </div>
          ) : null}

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-xl border p-4'>
              <h3 className='text-sm font-semibold text-gray-900'>Connection Status</h3>
              <div className='mt-3 space-y-2 text-sm text-gray-700'>
                <p>
                  <span className='font-medium'>Domain:</span>{' '}
                  {currentDomain?.hostname || 'Not set'}
                </p>
                <p>
                  <span className='font-medium'>Status:</span>{' '}
                  {statusLabel[currentStatus] || currentStatus}
                </p>
                <p>
                  <span className='font-medium'>SSL:</span>{' '}
                  {sslStatusLabel[String(currentDomain?.ssl_status || 'pending')] ||
                    currentDomain?.ssl_status ||
                    'pending'}
                </p>
                {currentDomain?.last_checked_at ? (
                  <p>
                    <span className='font-medium'>Last checked:</span>{' '}
                    {new Date(currentDomain.last_checked_at).toLocaleString()}
                  </p>
                ) : null}
                {currentDomain?.last_error ? (
                  <p className='text-red-600'>{currentDomain.last_error}</p>
                ) : null}
              </div>
            </div>

            <div className='rounded-xl border p-4'>
              <h3 className='text-sm font-semibold text-gray-900'>DNS Records</h3>
              <div className='mt-3 space-y-3 text-sm text-gray-700'>
                <div className='rounded-lg bg-gray-50 p-3'>
                  <p className='font-medium'>Apex Record</p>
                  <p>Type: {apex?.type || 'A'}</p>
                  <p>Name: {apex?.name || '@'}</p>
                  <p>Value: {apex?.value || '-'}</p>
                </div>
                <div className='rounded-lg bg-gray-50 p-3'>
                  <p className='font-medium'>WWW Record</p>
                  <p>Type: {www?.type || 'CNAME'}</p>
                  <p>Name: {www?.name || 'www'}</p>
                  <p>Value: {www?.value || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
            DNS update ke baad propagation me 5 minute se 24 ghante tak lag sakte
            hain. DNS detect hone ke baad HTTPS certificate automatically provision
            ho jayega.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
