import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchExternalDelhiveryShipments,
  generateExternalDelhiveryShipmentLabel,
  importExternalDelhiveryShipments,
  refreshExternalDelhiveryShipment,
  type ExternalDelhiveryShipment,
} from '@/features/courier/api'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/delhivery')({
  component: DelhiveryOrdersPage,
})

const readText = (value: unknown) => String(value ?? '').trim()

const formatDateTime = (value: unknown) => {
  const text = readText(value)
  if (!text) return 'Not available'
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString('en-IN')
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  ) {
    return (
      readText(
        (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
      ) || fallback
    )
  }

  if (error instanceof Error) return error.message || fallback
  return fallback
}

const lifecycle = (status: unknown) => {
  const value = readText(status).toLowerCase()
  if (!value) return 'unknown'
  if (value.includes('deliver')) return 'delivered'
  if (value.includes('cancel')) return 'cancelled'
  if (value.includes('rto') || value.includes('dto')) return 'exception'
  if (
    value.includes('transit') ||
    value.includes('manifest') ||
    value.includes('pickup') ||
    value.includes('dispatch') ||
    value.includes('schedule')
  ) {
    return 'active'
  }
  return 'pending'
}

const statusClass = (status: unknown) => {
  const state = lifecycle(status)
  if (state === 'delivered') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (state === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (state === 'exception') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (state === 'active') return 'border-sky-200 bg-sky-50 text-sky-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function DelhiveryOrdersPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const isVendor = role === 'vendor'
  const [refreshKey, setRefreshKey] = useState(0)
  const [shipments, setShipments] = useState<ExternalDelhiveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [waybillInput, setWaybillInput] = useState('')
  const [refIdsInput, setRefIdsInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedShipmentId, setSelectedShipmentId] = useState('')
  const [busyShipmentId, setBusyShipmentId] = useState('')
  const [busyAction, setBusyAction] = useState<'track' | 'label' | ''>('')

  useEffect(() => {
    if (!isVendor) {
      setLoading(false)
      setShipments([])
      setError('')
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetchExternalDelhiveryShipments()
        if (cancelled) return
        setShipments(Array.isArray(response?.shipments) ? response.shipments : [])
      } catch (err: unknown) {
        if (cancelled) return
        setError(getErrorMessage(err, 'Failed to load imported Delhivery shipments'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isVendor, refreshKey])

  const filteredShipments = useMemo(() => {
    const query = readText(search).toLowerCase()
    if (!query) return shipments

    return shipments.filter((shipment) =>
      [
        shipment.waybill,
        shipment.order_id,
        shipment.status,
        shipment.status_description,
        shipment.origin,
        shipment.destination,
        ...(Array.isArray(shipment.requested_waybills) ? shipment.requested_waybills : []),
        ...(Array.isArray(shipment.requested_ref_ids) ? shipment.requested_ref_ids : []),
      ]
        .map((entry) => readText(entry).toLowerCase())
        .join(' ')
        .includes(query)
    )
  }, [search, shipments])

  const selectedShipment = useMemo(
    () => filteredShipments.find((shipment) => shipment.id === selectedShipmentId) || null,
    [filteredShipments, selectedShipmentId]
  )

  useEffect(() => {
    setSelectedShipmentId((current) =>
      current && filteredShipments.some((shipment) => shipment.id === current)
        ? current
        : filteredShipments[0]?.id || ''
    )
  }, [filteredShipments])

  const metrics = useMemo(
    () => ({
      total: shipments.length,
      active: shipments.filter((shipment) => lifecycle(shipment.status) === 'active').length,
      delivered: shipments.filter((shipment) => lifecycle(shipment.status) === 'delivered').length,
      exceptions: shipments.filter((shipment) => lifecycle(shipment.status) === 'exception').length,
    }),
    [shipments]
  )

  const handleImport = async () => {
    const waybill = readText(waybillInput)
    const ref_ids = readText(refIdsInput)

    if (!waybill && !ref_ids) {
      toast.error('Enter a Delhivery waybill or ref_ids to import')
      return
    }

    try {
      setImporting(true)
      const response = await importExternalDelhiveryShipments({
        waybill: waybill || undefined,
        ref_ids: ref_ids || undefined,
      })
      const imported = Array.isArray(response?.shipments) ? response.shipments : []
      toast.success(
        imported.length
          ? `Imported ${imported.length} Delhivery shipment(s)`
          : 'Import completed'
      )
      setWaybillInput('')
      setRefIdsInput('')
      setRefreshKey((current) => current + 1)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to import Delhivery shipment'))
    } finally {
      setImporting(false)
    }
  }

  const handleRefreshTracking = async (shipment: ExternalDelhiveryShipment | null) => {
    if (!shipment) return

    try {
      setBusyShipmentId(shipment.id)
      setBusyAction('track')
      await refreshExternalDelhiveryShipment(shipment.id)
      toast.success(`Tracking updated for ${shipment.waybill || shipment.order_id}`)
      setRefreshKey((current) => current + 1)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to refresh Delhivery tracking'))
    } finally {
      setBusyShipmentId('')
      setBusyAction('')
    }
  }

  const handleLabel = async (shipment: ExternalDelhiveryShipment | null) => {
    if (!shipment) return

    try {
      setBusyShipmentId(shipment.id)
      setBusyAction('label')
      const response = await generateExternalDelhiveryShipmentLabel(shipment.id, {
        pdf: true,
        pdf_size: '4R',
      })
      const labelUrl = readText(
        response?.label?.label_url || response?.shipment?.label_url || shipment.label_url
      )
      if (labelUrl && typeof window !== 'undefined') {
        window.open(labelUrl, '_blank', 'noopener,noreferrer')
      }
      toast.success(`Shipping label ready for ${shipment.waybill || shipment.order_id}`)
      setRefreshKey((current) => current + 1)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to generate shipping label'))
    } finally {
      setBusyShipmentId('')
      setBusyAction('')
    }
  }

  if (!isVendor) {
    return (
      <Main>
        <div className='space-y-6 p-4 md:p-6'>
          <Card className='border-border bg-card shadow-sm'>
            <CardHeader>
              <CardTitle>Delhivery Panel Sync</CardTitle>
              <CardDescription>
                External Delhivery imports use the logged-in vendor integration. Open this page from a
                vendor account to sync panel-created shipments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to='/courier/list'>
                  Back to Courier List
                  <ArrowUpRight className='h-4 w-4' />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-border bg-card shadow-sm'>
          <div className='bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_94%,#cbd5e1_6%)_0%,color-mix(in_srgb,var(--background)_92%,#67e8f9_8%)_45%,color-mix(in_srgb,var(--card)_92%,#fdba74_8%)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-2'>
                <Badge className='rounded-full border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground'>
                  Delhivery Panel Sync
                </Badge>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
                  External Delhivery Shipments
                </h1>
                <p className='max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
                  Orders created directly in Delhivery do not exist in your local order database.
                  Import them here by `waybill` or `ref_ids`, then track them from your dashboard.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  <RefreshCcw className='h-4 w-4' />
                  Refresh
                </Button>
                <Button
                  variant='outline'
                  className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                  asChild
                >
                  <Link to='/courier/list'>
                    Courier List
                    <ArrowUpRight className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
            </div>

            <div className='mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>Imported</p>
                <p className='mt-1 text-3xl font-semibold text-foreground'>{metrics.total}</p>
              </div>
              <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>Active</p>
                <p className='mt-1 text-3xl font-semibold text-foreground'>{metrics.active}</p>
              </div>
              <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                  Delivered
                </p>
                <p className='mt-1 text-3xl font-semibold text-foreground'>{metrics.delivered}</p>
              </div>
              <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                  Exceptions
                </p>
                <p className='mt-1 text-3xl font-semibold text-foreground'>{metrics.exceptions}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>Import From Delhivery</CardTitle>
            <CardDescription>
              Delhivery tracking API needs a `waybill` or `ref_ids`. Paste one or many values,
              separated by commas.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>Waybill</label>
                <Input
                  value={waybillInput}
                  onChange={(e) => setWaybillInput(e.target.value)}
                  placeholder='e.g. 12312321423423 or 123,456,789'
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>ref_ids / order reference</label>
                <Input
                  value={refIdsInput}
                  onChange={(e) => setRefIdsInput(e.target.value)}
                  placeholder='e.g. panel order reference'
                />
              </div>
            </div>
            <div className='flex flex-wrap items-start gap-3'>
              <Button
                className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                disabled={importing}
                onClick={() => {
                  void handleImport()
                }}
              >
                {importing ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
                {importing ? 'Importing' : 'Import shipment'}
              </Button>
              <div className='inline-flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                <ShieldAlert className='mt-0.5 h-4 w-4 shrink-0' />
                <span>
                  Delhivery does not expose a list-all-orders API in the integration endpoints used
                  here, so external panel orders must be pulled by identifier first.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <CardTitle className='text-lg'>Imported Shipments</CardTitle>
                <CardDescription>
                  Search imported Delhivery-panel shipments and inspect their scan history.
                </CardDescription>
              </div>
              <div className='relative w-full lg:max-w-sm'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search imported shipments'
                  className='pl-9'
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='rounded-2xl border border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                Loading imported Delhivery shipments...
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                No imported Delhivery shipments found yet.
              </div>
            ) : (
              <div className='grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]'>
                <div className='rounded-2xl border border-border bg-muted/20'>
                  <div className='max-h-[920px] overflow-y-auto p-3'>
                    <div className='space-y-3'>
                      {filteredShipments.map((shipment) => {
                        const selected = shipment.id === selectedShipmentId
                        const title = shipment.waybill || shipment.order_id || shipment.id
                        return (
                          <button
                            key={shipment.id}
                            type='button'
                            onClick={() => setSelectedShipmentId(shipment.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selected
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                : 'border-border bg-card hover:border-slate-300 hover:bg-accent/40'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p className={`font-semibold ${selected ? 'text-white' : 'text-foreground'}`}>
                                  {title}
                                </p>
                                <p className={`mt-1 text-sm ${selected ? 'text-slate-200' : 'text-muted-foreground'}`}>
                                  {shipment.order_id || 'No ref_ids'}
                                </p>
                              </div>
                              <Badge
                                className={
                                  selected
                                    ? 'border-white/20 bg-white/10 text-white'
                                    : statusClass(shipment.status)
                                }
                              >
                                {shipment.status || 'Pending'}
                              </Badge>
                            </div>
                            <div className={`mt-4 space-y-2 text-sm ${selected ? 'text-slate-200' : 'text-muted-foreground'}`}>
                              <p>
                                {shipment.origin || 'Unknown origin'} to{' '}
                                {shipment.destination || 'Unknown destination'}
                              </p>
                              <p>Synced: {formatDateTime(shipment.last_synced_at || shipment.updatedAt)}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {selectedShipment ? (
                  <div className='space-y-4'>
                    <Card className='border-border bg-card shadow-sm'>
                      <CardHeader>
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                          <div className='space-y-3'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <CardTitle className='text-2xl text-foreground'>
                                {selectedShipment.waybill || selectedShipment.order_id || selectedShipment.id}
                              </CardTitle>
                              <Badge className={statusClass(selectedShipment.status)}>
                                {selectedShipment.status || 'Pending'}
                              </Badge>
                            </div>
                            <CardDescription>
                              Ref IDs: {selectedShipment.order_id || 'Not available'}
                            </CardDescription>
                            {selectedShipment.status_description ? (
                              <p className='text-sm text-muted-foreground'>
                                {selectedShipment.status_description}
                              </p>
                            ) : null}
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              variant='outline'
                              className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                              disabled={busyShipmentId === selectedShipment.id}
                              onClick={() => {
                                void handleRefreshTracking(selectedShipment)
                              }}
                            >
                              {busyShipmentId === selectedShipment.id && busyAction === 'track' ? (
                                <LoaderCircle className='h-4 w-4 animate-spin' />
                              ) : (
                                <RefreshCcw className='h-4 w-4' />
                              )}
                              Track now
                            </Button>
                            <Button
                              variant='outline'
                              className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                              disabled={busyShipmentId === selectedShipment.id}
                              onClick={() => {
                                void handleLabel(selectedShipment)
                              }}
                            >
                              {busyShipmentId === selectedShipment.id && busyAction === 'label'
                                ? 'Generating'
                                : 'Label'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className='grid gap-4 lg:grid-cols-2'>
                        <div className='rounded-2xl border border-border bg-muted/30 p-4'>
                          <p className='text-sm font-medium text-foreground'>Shipment</p>
                          <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                            <p>Waybill: {selectedShipment.waybill || 'Not available'}</p>
                            <p>Ref IDs: {selectedShipment.order_id || 'Not available'}</p>
                            <p>Origin: {selectedShipment.origin || 'Not available'}</p>
                            <p>Destination: {selectedShipment.destination || 'Not available'}</p>
                            <p>
                              Last synced:{' '}
                              {formatDateTime(selectedShipment.last_synced_at || selectedShipment.updatedAt)}
                            </p>
                            {selectedShipment.label_url ? (
                              <a
                                href={selectedShipment.label_url}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline'
                              >
                                Open shipping label
                                <ExternalLink className='h-3.5 w-3.5' />
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className='rounded-2xl border border-border bg-muted/30 p-4'>
                          <p className='text-sm font-medium text-foreground'>Sync Meta</p>
                          <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                            <p>
                              Requested waybills:{' '}
                              {selectedShipment.requested_waybills?.join(', ') || 'Not available'}
                            </p>
                            <p>
                              Requested ref_ids:{' '}
                              {selectedShipment.requested_ref_ids?.join(', ') || 'Not available'}
                            </p>
                            <p>Created in dashboard: {formatDateTime(selectedShipment.createdAt)}</p>
                            <p>Updated in dashboard: {formatDateTime(selectedShipment.updatedAt)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='border-border bg-card shadow-sm'>
                      <CardHeader>
                        <CardTitle className='text-base'>Order Tracker</CardTitle>
                        <CardDescription>
                          Delhivery scan history stored for this imported shipment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedShipment.scans?.length ? (
                          <div className='space-y-3'>
                            {selectedShipment.scans.map((scan, index) => (
                              <div
                                key={`${selectedShipment.id}-scan-${index}-${readText(scan.time)}`}
                                className='rounded-2xl border border-border bg-muted/30 p-4'
                              >
                                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                                  <div className='space-y-2'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                      <Badge className={statusClass(scan.status || scan.status_type)}>
                                        {readText(scan.status || scan.status_type || 'Update')}
                                      </Badge>
                                      {scan.status_type ? (
                                        <span className='text-xs text-muted-foreground'>
                                          {scan.status_type}
                                        </span>
                                      ) : null}
                                    </div>
                                    {scan.description ? (
                                      <p className='text-sm text-foreground'>{scan.description}</p>
                                    ) : null}
                                    <div className='space-y-1 text-sm text-muted-foreground'>
                                      <p>Location: {scan.location || 'Not available'}</p>
                                      <p>Time: {formatDateTime(scan.time)}</p>
                                    </div>
                                  </div>
                                  <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                                    <Truck className='h-4 w-4 text-muted-foreground' />
                                    Step {index + 1}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground'>
                            No scan history stored yet. Use `Track now` to fetch it.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
