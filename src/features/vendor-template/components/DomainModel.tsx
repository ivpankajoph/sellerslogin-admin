import { useEffect, useState } from 'react'
import axios from 'axios'
import { Check, Copy } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LearnMore } from '@/components/learn-more'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import {
  setStoredActiveWebsite,
  useActiveWebsiteSelection,
} from './websiteStudioStorage'

type DomainRecord = {
  hostname?: string
  status?: string
  ssl_status?: string
  connected_at?: string | null
  last_checked_at?: string | null
  last_error?: string
}

type DnsInstruction = {
  label?: string
  type?: string
  name?: string
  value?: string
}

type DnsInstructions = {
  mode?: string
  records?: DnsInstruction[] | null
  apex?: DnsInstruction | null
  www?: DnsInstruction | null
}

type WebsiteSummary = {
  id?: string
  name?: string
  websiteSlug?: string
  templateKey?: string
  templateName?: string
  displayName?: string
}

type LiveProbeAttempt = {
  protocol?: string
  path?: string
  statusCode?: number
  finalUrl?: string
  endpointDetected?: boolean
  headerDetected?: boolean
  detectionSource?: string
  websiteId?: string
  vendorId?: string
  error?: string
}

type LiveProbe = {
  hostname?: string
  checkedAt?: string
  matched?: boolean
  reachable?: boolean
  endpointDetected?: boolean
  headerDetected?: boolean
  websiteMatched?: boolean
  vendorMatched?: boolean
  preferredUrl?: string
  protocol?: string
  finalUrl?: string
  statusCode?: number
  websiteId?: string
  vendorId?: string
  detectionSource?: string
  message?: string
  attempts?: LiveProbeAttempt[] | null
}

type DomainConfigResponse = {
  success?: boolean
  message?: string
  websiteId?: string
  website?: WebsiteSummary | null
  domain?: DomainRecord | null
  liveProbe?: LiveProbe | null
  dnsInstructions?: DnsInstructions
}

interface Type {
  open: boolean
  setOpen: (v: boolean) => void
  activeWebsiteName?: string
  initialDomain?: DomainRecord | null
}

const statusLabel: Record<string, string> = {
  checking: 'Checking...',
  unconfigured: 'Not connected',
  pending_dns: 'Waiting for DNS',
  active: 'DNS Connected',
  error: 'Error',
}

const sslStatusLabel: Record<string, string> = {
  checking: 'Checking...',
  pending: 'Pending',
  provisioning: 'Provisioning',
  active: 'Active',
  error: 'Error',
}

const getToneClassName = (
  tone: 'success' | 'warning' | 'error' | 'neutral'
) => {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

export function DomainModal({
  open,
  setOpen,
  activeWebsiteName,
  initialDomain = null,
}: Type) {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const [config, setConfig] = useState<DomainConfigResponse | null>(null)
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false)

  const token = useSelector((state: any) => state?.auth?.token)
  const authUser = useSelector((state: any) => state?.auth?.user || null)
  const vendorId = String(
    authUser?.id || authUser?._id || authUser?.vendor_id || authUser?.vendorId || ''
  ).trim()
  const { activeWebsite, activeWebsiteId } = useActiveWebsiteSelection(vendorId)

  useEffect(() => {
    if (!open) return
    setError('')
    setMessage('')
    setConfig(null)
    setHasLoadedConfig(false)
    setDomain(initialDomain?.hostname || '')
  }, [initialDomain?.hostname, open])

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
      setHasLoadedConfig(true)
      setConfig(payload)
      setDomain(
        payload?.domain?.hostname ||
          config?.domain?.hostname ||
          initialDomain?.hostname ||
          ''
      )
      setMessage(payload?.message || '')
      if (payload?.website?.id) {
        setStoredActiveWebsite(vendorId, {
          id: payload.website.id,
          name: payload.website.name || payload.website.displayName,
          templateKey: payload.website.templateKey,
          websiteSlug: payload.website.websiteSlug,
        })
      }
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
  }, [open, token, activeWebsiteId])

  useEffect(() => {
    if (!copiedKey) return
    const timeout = window.setTimeout(() => setCopiedKey(''), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedKey])

  const handleSubmit = async () => {
    const normalized = domain.trim().toLowerCase()

    if (!normalized) {
      setError('Domain is required.')
      return
    }

    if (normalized.includes('http://') || normalized.includes('https://')) {
      setError('Enter only the domain name, without http:// or https://.')
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
      setHasLoadedConfig(true)
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

      setHasLoadedConfig(true)
      setConfig((prev) => ({
        ...(prev || {}),
        domain: null,
        liveProbe: null,
      }))
      setDomain('')
      setMessage(response?.data?.message || 'Domain removed')
      await requestConfig()
      return true
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to remove domain'
      )
      return false
    } finally {
      setRemoving(false)
    }
  }

  const handleCopy = async (value: string, key: string, label: string) => {
    const safeValue = String(value || '').trim()
    if (!safeValue) {
      toast.error(`No ${label.toLowerCase()} available to copy.`)
      return
    }

    try {
      await navigator.clipboard.writeText(safeValue)
      setCopiedKey(key)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}.`)
    }
  }

  const apex = config?.dnsInstructions?.apex
  const www = config?.dnsInstructions?.www
  const currentDomain = hasLoadedConfig
    ? config?.domain || null
    : config?.domain || initialDomain
  const liveProbe = config?.liveProbe
  const isInitialStatusLoad = loading && !hasLoadedConfig
  const currentStatus = String(
    currentDomain?.status || (isInitialStatusLoad ? 'checking' : 'unconfigured')
  )
  const websiteLabel =
    config?.website?.displayName ||
    config?.website?.name ||
    config?.website?.websiteSlug ||
    activeWebsiteName ||
    activeWebsite?.name ||
    activeWebsite?.websiteSlug ||
    config?.website?.id ||
    activeWebsiteId ||
    ''
  const liveSiteUrl =
    String(liveProbe?.preferredUrl || '').trim() ||
    (currentDomain?.hostname ? `https://${currentDomain.hostname}` : '')
  const selectedWebsiteLive = Boolean(liveProbe?.matched)
  const liveStatusCode =
    typeof liveProbe?.statusCode === 'number' ? liveProbe.statusCode : 0
  const hasLiveServerError = liveStatusCode >= 500
  const liveCheckSummary = selectedWebsiteLive
    ? 'Selected website is responding on this domain right now.'
    : hasLiveServerError
      ? `The domain reached your server, but the live site returned HTTP ${liveStatusCode}. Check nginx/upstream on the VM and finish SSL provisioning for this hostname.`
    : String(liveProbe?.message || '').trim()
      ? String(liveProbe?.message || '').trim()
    : liveProbe?.endpointDetected
      ? 'This domain is serving a storefront, but it does not match the currently selected website.'
      : liveProbe?.headerDetected
        ? 'This domain is serving a storefront, but it does not match the currently selected website.'
      : liveProbe?.reachable && currentStatus === 'active'
        ? 'The domain is reaching your server, but the selected website could not be verified yet.'
      : currentStatus === 'active'
        ? 'DNS is pointed correctly, but the live storefront identity could not be verified yet.'
        : 'Save the domain and update DNS records to see live confirmation here.'
  const liveCheckLabel = selectedWebsiteLive
    ? 'Confirmed'
    : hasLiveServerError
      ? 'Error'
    : liveProbe?.endpointDetected || liveProbe?.headerDetected
      ? 'Mismatch'
    : liveProbe?.reachable && currentStatus === 'active'
      ? 'Reachable'
      : liveProbe?.reachable
        ? 'Detected'
        : 'Pending'
  const liveCheckMethodLabel =
    liveProbe?.detectionSource === 'status-endpoint'
      ? 'Storefront status endpoint'
      : liveProbe?.detectionSource === 'response-headers'
        ? 'Live storefront response headers'
        : ''
  const dnsRecords =
    config?.dnsInstructions?.records?.length
      ? config.dnsInstructions.records
      : [
          apex
            ? {
                label: 'Apex Record',
                ...apex,
              }
            : null,
          www
            ? {
                label: 'WWW Record',
                ...www,
              }
            : null,
        ].filter(Boolean) as DnsInstruction[]
  const statusTone =
    currentStatus === 'active'
      ? 'success'
      : currentStatus === 'error'
        ? 'error'
        : currentStatus === 'pending_dns'
          ? 'warning'
          : 'neutral'
  const sslTone =
    currentDomain?.ssl_status === 'active'
      ? 'success'
      : currentDomain?.ssl_status === 'error'
        ? 'error'
        : currentDomain?.ssl_status === 'provisioning' ||
            currentDomain?.ssl_status === 'pending'
          ? 'warning'
          : 'neutral'
  const liveCheckTone = selectedWebsiteLive
    ? 'success'
    : hasLiveServerError || currentDomain?.ssl_status === 'error'
      ? 'error'
    : liveProbe?.reachable
      ? 'warning'
      : 'neutral'

  const renderCopyButton = (value: string, key: string, label: string) => (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-8 rounded-full px-3 text-xs'
      onClick={() => void handleCopy(value, key, label)}
    >
      {copiedKey === key ? (
        <>
          <Check className='h-3.5 w-3.5' /> Copied
        </>
      ) : (
        <>
          <Copy className='h-3.5 w-3.5' /> Copy
        </>
      )}
    </Button>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className='w-[min(90vw,1080px)] max-w-none space-y-4 rounded-2xl border p-6 shadow-lg sm:max-w-none'
          style={{ maxHeight: '90vh', maxWidth: '1080px', overflowY: 'auto' }}
        >
          <DialogHeader>
            <DialogTitle className='text-lg font-semibold'>
              Connect Custom Domain
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-3'>
            <div className='rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900'>
              Save the domain here, then update the required DNS records. Once the
              domain points to your server, the site will go live automatically.
            </div>

            {websiteLabel ? (
              <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'>
                Selected website: <span className='font-semibold'>{websiteLabel}</span>
              </div>
            ) : null}

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
                Example: `example.com` or `shop.example.com`
              </p>
            </div>

            <div className='flex flex-wrap gap-3 pt-1'>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Domain'}
              </Button>
              <Button variant='outline' onClick={requestConfig} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh Status'}
              </Button>
              {liveSiteUrl ? (
                <Button
                  variant='outline'
                  onClick={() => window.open(liveSiteUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open Live Site
                </Button>
              ) : null}
              {currentDomain?.hostname ? (
                <Button
                  variant='outline'
                  onClick={() => setRemoveConfirmOpen(true)}
                  disabled={removing}
                >
                  {removing ? 'Removing...' : 'Remove Domain'}
                </Button>
              ) : null}
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

            <div className='space-y-4'>
              <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getToneClassName(
                        statusTone
                      )}`}
                    >
                      Status: {statusLabel[currentStatus] || currentStatus}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getToneClassName(
                        sslTone
                      )}`}
                    >
                      SSL:{' '}
                      {sslStatusLabel[
                        String(
                          currentDomain?.ssl_status ||
                            (isInitialStatusLoad ? 'checking' : 'pending')
                        )
                      ] ||
                        currentDomain?.ssl_status ||
                        (isInitialStatusLoad ? 'Checking...' : 'Pending')}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getToneClassName(
                        liveCheckTone
                      )}`}
                    >
                      Live Check: {liveCheckLabel}
                    </span>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        Connected Domain
                      </p>
                      <p className='mt-2 break-all text-sm font-semibold text-slate-900'>
                        {currentDomain?.hostname ||
                          (isInitialStatusLoad ? 'Checking latest status...' : 'Not set')}
                      </p>
                    </div>
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        Selected Website
                      </p>
                      <p className='mt-2 break-all text-sm font-semibold text-slate-900'>
                        {websiteLabel || 'Not selected'}
                      </p>
                    </div>
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        Last Checked
                      </p>
                      <p className='mt-2 text-sm font-semibold text-slate-900'>
                        {currentDomain?.last_checked_at
                          ? new Date(currentDomain.last_checked_at).toLocaleString()
                          : 'Not checked yet'}
                      </p>
                    </div>
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        Live Site
                      </p>
                      <div className='mt-2'>
                        {liveSiteUrl ? (
                          <Button
                            type='button'
                            variant='outline'
                            className='h-9 rounded-full px-4 text-xs'
                            onClick={() =>
                              window.open(liveSiteUrl, '_blank', 'noopener,noreferrer')
                            }
                          >
                            Open Live Site
                          </Button>
                        ) : (
                          <p className='text-sm font-semibold text-slate-900'>
                            Not available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold text-slate-900'>
                          Live storefront verification
                        </p>
                        <p
                          className={`mt-2 text-sm ${selectedWebsiteLive ? 'text-emerald-700' : 'text-slate-600'}`}
                        >
                          {liveCheckSummary}
                        </p>
                      </div>
                    </div>
                    <div className='mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600'>
                      {liveStatusCode ? (
                        <p>
                          <span className='font-medium'>HTTP status:</span>{' '}
                          {liveStatusCode}
                        </p>
                      ) : null}
                      {liveProbe?.protocol ? (
                        <p>
                          <span className='font-medium'>Detected via:</span>{' '}
                          {String(liveProbe.protocol || '').toUpperCase()}
                        </p>
                      ) : null}
                      {liveCheckMethodLabel ? (
                        <p>
                          <span className='font-medium'>Verified using:</span>{' '}
                          {liveCheckMethodLabel}
                        </p>
                      ) : null}
                      {liveProbe?.checkedAt ? (
                        <p>
                          <span className='font-medium'>Live checked:</span>{' '}
                          {new Date(liveProbe.checkedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    {currentDomain?.last_error ? (
                      <p className='mt-3 text-sm text-red-600'>{currentDomain.last_error}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold text-slate-900'>DNS Records</h3>
                  <LearnMore
                    contentProps={{ className: 'max-w-xs text-sm leading-6' }}
                  >
                    Add these records exactly in your DNS provider. Use the copy buttons
                    to avoid typos. The apex record connects the root domain and the
                    CNAME connects the `www` version.
                  </LearnMore>
                </div>
                <p className='mt-2 text-sm text-slate-500'>
                  Copy the values below and paste them into your DNS provider.
                </p>

                <div className='mt-4 space-y-4 text-sm text-slate-700'>
                  {dnsRecords.length ? (
                    <div className='grid gap-4 xl:grid-cols-2'>
                      {dnsRecords.map((record, index) => {
                        const recordLabel = record.label || `Record ${index + 1}`
                        const typeValue = record.type || '-'
                        const nameValue = record.name || '-'
                        const recordValue = record.value || '-'

                        return (
                          <div
                            key={`${record.name || 'record'}-${index}`}
                            className='rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm'
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p className='text-sm font-semibold text-slate-900'>
                                  {recordLabel}
                                </p>
                                <p className='text-xs text-slate-500'>
                                  Add this record exactly as shown below.
                                </p>
                              </div>
                              {renderCopyButton(
                                `${typeValue} | ${nameValue} | ${recordValue}`,
                                `${recordLabel}-full`,
                                `${recordLabel} details`
                              )}
                            </div>

                            <div className='mt-4 grid gap-3'>
                              <div className='rounded-xl border border-slate-200 bg-white p-4'>
                                <div className='flex items-center justify-between gap-3'>
                                  <div>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                                      Type
                                    </p>
                                    <p className='mt-2 text-base font-semibold text-slate-900'>
                                      {typeValue}
                                    </p>
                                  </div>
                                  {typeValue !== '-' ? (
                                    renderCopyButton(
                                      typeValue,
                                      `${recordLabel}-type`,
                                      `${recordLabel} type`
                                    )
                                  ) : null}
                                </div>
                              </div>

                              <div className='rounded-xl border border-slate-200 bg-white p-4'>
                                <div className='flex items-center justify-between gap-3'>
                                  <div>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                                      Host / Name
                                    </p>
                                    <p className='mt-2 text-base font-semibold text-slate-900'>
                                      {nameValue}
                                    </p>
                                  </div>
                                  {nameValue !== '-' ? (
                                    renderCopyButton(
                                      nameValue,
                                      `${recordLabel}-name`,
                                      `${recordLabel} host`
                                    )
                                  ) : null}
                                </div>
                              </div>

                              <div className='rounded-xl border border-slate-200 bg-white p-4'>
                                <div className='flex items-center justify-between gap-3'>
                                  <div className='min-w-0'>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                                      Value / Target
                                    </p>
                                    <p className='mt-2 break-all text-base font-semibold text-slate-900'>
                                      {recordValue}
                                    </p>
                                  </div>
                                  {recordValue !== '-' ? (
                                    renderCopyButton(
                                      recordValue,
                                      `${recordLabel}-value`,
                                      `${recordLabel} value`
                                    )
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='font-medium text-slate-900'>DNS Records</p>
                      <p className='mt-1 text-slate-600'>
                        {isInitialStatusLoad
                          ? 'Loading DNS records...'
                          : 'Save a domain first to see required records.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
              DNS propagation can take anywhere from 5 minutes to 24 hours. After
              DNS is detected, the HTTPS certificate will be provisioned
              automatically.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title='Remove connected domain?'
        desc={
          <div className='space-y-2'>
            <p>
              This will disconnect <span className='font-semibold'>{currentDomain?.hostname || domain}</span>{' '}
              from the selected website.
            </p>
            <p className='text-red-600'>
              Your live custom domain may stop working until it is connected again.
            </p>
          </div>
        }
        cancelBtnText='Cancel'
        confirmText={removing ? 'Removing...' : 'Confirm Remove'}
        destructive
        isLoading={removing}
        handleConfirm={() => {
          void handleRemove().then((removed) => {
            if (removed) setRemoveConfirmOpen(false)
          })
        }}
      />
    </>
  )
}
