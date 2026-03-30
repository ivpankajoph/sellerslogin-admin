import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, Clock3, ExternalLink, Package2, RefreshCcw, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { formatINR } from '@/lib/currency'
import {
  COURIER_PARTNER_MAP,
  COURIER_PARTNERS,
  readCourierAssignments,
  type CourierPartnerId,
} from '@/features/courier/data'

const supportedPartners = COURIER_PARTNERS.map((partner) => partner.id)

export const Route = createFileRoute('/_authenticated/courier/$partner')({
  component: CourierPartnerPage,
})

function CourierPartnerPage() {
  const { partner } = Route.useParams()
  const partnerId = (supportedPartners.includes(partner as CourierPartnerId)
    ? partner
    : 'borzo') as CourierPartnerId
  const partnerMeta = COURIER_PARTNER_MAP[partnerId]
  const [refreshKey, setRefreshKey] = useState(0)

  const assignments = useMemo(
    () =>
      readCourierAssignments()
        .filter((assignment) => assignment.partnerId === partnerId)
        .sort((first, second) => {
          const a = new Date(first.assignedAt || 0).getTime()
          const b = new Date(second.assignedAt || 0).getTime()
          return b - a
        }),
    [partnerId, refreshKey]
  )

  const totalGMV = assignments.reduce((sum, assignment) => sum + Number(assignment.total || 0), 0)
  const totalCharges = assignments.reduce(
    (sum, assignment) => sum + Number(assignment.amount || 0),
    0
  )

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(248,250,252,0.95)_0%,rgba(239,246,255,0.95)_45%,rgba(255,247,237,0.92)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='flex items-start gap-4'>
                <div className={`flex h-20 w-20 items-center justify-center rounded-3xl border bg-white shadow-sm ${partnerMeta.themeClass}`}>
                  <img src={partnerMeta.imageSrc} alt={partnerMeta.title} className='max-h-12 max-w-14 object-contain' />
                </div>
                <div className='space-y-3'>
                  <Badge className='rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-700'>
                    Courier Page
                  </Badge>
                  <div>
                    <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>{partnerMeta.title}</h1>
                    <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base'>
                      Dedicated request board for {partnerMeta.title}. Assigned deliveries,
                      estimated charges, and tracking-oriented order references are listed here.
                    </p>
                  </div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className='border-slate-200 bg-white hover:bg-slate-50'
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  <RefreshCcw className='h-4 w-4' />
                  Refresh
                </Button>
                <Button
                  variant='outline'
                  className='border-slate-200 bg-white hover:bg-slate-50'
                  asChild
                >
                  <Link to='/courier'>
                    Courier desk
                    <ArrowUpRight className='h-4 w-4' />
                  </Link>
                </Button>
                {partnerId === 'borzo' && (
                  <Button className='bg-slate-950 text-white hover:bg-slate-800' asChild>
                    <Link to='/borzo-report'>
                      Open live Borzo report
                      <ExternalLink className='h-4 w-4' />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className='mt-6 grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Assigned requests</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{assignments.length}</p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Estimated charges</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{formatINR(totalCharges)}</p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Order value routed</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{formatINR(totalGMV)}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>Assigned delivery requests</CardTitle>
            <CardDescription>
              This page is powered by the courier desk assignment store for now. When API
              integration is added later, this table can switch to live courier records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
                No requests assigned to {partnerMeta.title} yet. Open the courier desk and assign
                an order first.
              </div>
            ) : (
              <div className='overflow-hidden rounded-2xl border border-slate-200'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Charge</TableHead>
                      <TableHead>ETA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={`${assignment.partnerId}-${assignment.orderId}`}>
                        <TableCell>
                          <div className='space-y-1'>
                            <p className='font-medium text-slate-950'>{assignment.orderNumber}</p>
                            <p className='text-xs text-slate-500'>
                              {assignment.customerName} | {assignment.websiteLabel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className='border-amber-200 bg-amber-50 text-amber-700'>
                            {assignment.trackingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <p className='text-sm font-medium text-slate-900'>{assignment.trackingCode}</p>
                            {assignment.trackingUrl ? (
                              <a
                                href={assignment.trackingUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline'
                              >
                                Open tracking
                                <ExternalLink className='h-3 w-3' />
                              </a>
                            ) : (
                              <p className='text-xs text-slate-500'>Static tracking reference</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='font-medium text-slate-900'>
                          {formatINR(assignment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className='inline-flex items-center gap-2 text-sm text-slate-700'>
                            <Clock3 className='h-4 w-4 text-slate-400' />
                            {assignment.etaLabel}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card className='border-slate-200 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-base'>Tracking snapshot</CardTitle>
              <CardDescription>
                Static tracking rows for now. This is the place where live webhook and courier API
                updates can be surfaced later.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {assignments.slice(0, 4).map((assignment) => (
                <div key={assignment.orderId} className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-medium text-slate-950'>{assignment.orderNumber}</p>
                      <p className='text-xs text-slate-500'>{assignment.customerName}</p>
                    </div>
                    <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                      {assignment.trackingStatus}
                    </Badge>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-4 text-sm text-slate-600'>
                    <span className='inline-flex items-center gap-2'>
                      <Truck className='h-4 w-4 text-slate-400' />
                      {assignment.trackingCode}
                    </span>
                    <span className='inline-flex items-center gap-2'>
                      <Package2 className='h-4 w-4 text-slate-400' />
                      {formatINR(assignment.total)}
                    </span>
                  </div>
                </div>
              ))}
              {!assignments.length && (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                  No tracking snapshot yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-slate-200 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-base'>Partner routing notes</CardTitle>
              <CardDescription>
                This partner page is ready for future API hooks, pricing sync, and dedicated status
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-6 text-slate-600'>
              <p>
                Use the courier desk to assign new orders to {partnerMeta.title}. Each assignment
                is shown here immediately with a quote and tracking reference.
              </p>
              <p>
                When you integrate the actual API later, this page can replace the local assignment
                store with live shipment creation, status polling, webhook events, and NDR actions.
              </p>
              <p className='font-medium text-slate-900'>Current ETA benchmark: {partnerMeta.etaLabel}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Main>
  )
}
