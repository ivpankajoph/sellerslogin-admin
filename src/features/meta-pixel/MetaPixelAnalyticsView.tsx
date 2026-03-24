import type { ElementType } from 'react'
import { Clock3, Eye, MousePointerClick, RefreshCw, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'

type WebsiteRow = {
  website_slug?: string
  custom_domain?: {
    hostname?: string
  }
  meta_pixel?: {
    pixel_id?: string
  }
}

type PerformanceCard = {
  label: string
  value: string | number
  helper: string
  icon: ElementType
}

type TrafficItem = {
  count?: number
  source?: string
  device?: string
  browser?: string
}

type AnalyticsOverview = {
  totalUsers?: number
  newUsers?: number
  returningUsers?: number
  avgSessionDuration?: number
  bounceRate?: number
  totalSessions?: number
  totalOrders?: number
  funnel?: {
    addToCarts?: number
    checkouts?: number
    purchases?: number
  }
  topPages?: Array<{
    page?: string
    views?: number
    avgTime?: number
  }>
  topProducts?: Array<{
    productId?: string
    name?: string
    revenue?: number
    sales?: number
  }>
  trafficBySource?: TrafficItem[]
  trafficByDevice?: TrafficItem[]
  trafficByBrowser?: TrafficItem[]
}

type AnalyticsInsights = {
  totals?: {
    avgTimeOnPageMs?: number
  }
  timeline?: Array<{
    date?: string
    views?: number
  }>
  topReferrers?: Array<{
    referrer?: string
    visits?: number
  }>
  topCountries?: Array<{
    country?: string
    visits?: number
  }>
}

type AnalyticsEvent = {
  _id?: string
  eventType?: string
  path?: string
  fullUrl?: string
  title?: string
  productName?: string
  cartTotal?: number
  source?: string
  device?: string
  city?: string
  country?: string
  createdAt?: string
}

type AnalyticsVisitor = {
  key?: string
  type?: string
  visits?: number
  lastSeen?: string
  user?: {
    name?: string
    email?: string
    phone?: string
  }
}

type StatusMeta = {
  label: string
  className: string
}

type Props = {
  analyticsError: string
  analyticsLoading: boolean
  hasConnectedWebsite: boolean
  performanceCards: PerformanceCard[]
  selectedWebsite: WebsiteRow | null
  selectedWebsiteId: string
  selectedStatusMeta: StatusMeta
  analyticsOverview: AnalyticsOverview | null
  analyticsInsights: AnalyticsInsights | null
  analyticsEvents: AnalyticsEvent[]
  analyticsVisitors: AnalyticsVisitor[]
  activePages: Array<{
    page?: string | null
    users?: number | null
  }>
  resolveWebsiteName: (website?: WebsiteRow | null) => string
  formatDateTime: (value?: string | null) => string
  formatEventTypeLabel: (value?: string | null) => string
}

const formatDurationLabel = (seconds?: number | null) => {
  const safeSeconds = Math.max(Number(seconds) || 0, 0)
  if (!safeSeconds) return '0s'
  if (safeSeconds < 60) return `${safeSeconds}s`
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

const formatPercentage = (value?: number | null) =>
  `${Number(value || 0).toFixed(2)}%`

export function MetaPixelAnalyticsView({
  analyticsError,
  analyticsEvents,
  analyticsInsights,
  analyticsLoading,
  analyticsOverview,
  analyticsVisitors,
  activePages,
  formatDateTime,
  formatEventTypeLabel,
  hasConnectedWebsite,
  performanceCards,
  resolveWebsiteName,
  selectedStatusMeta,
  selectedWebsite,
  selectedWebsiteId,
}: Props) {
  if (!hasConnectedWebsite) {
    return (
      <section className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
        <div className='flex flex-col gap-2 border-b border-border px-5 py-4'>
          <h2 className='text-lg font-semibold text-foreground'>
            Storefront pixel analytics
          </h2>
          <p className='text-sm text-muted-foreground'>
            Analytics appears only for websites with an active Meta Pixel.
          </p>
        </div>
        <div className='px-5 py-10'>
          <div className='rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center'>
            <h3 className='text-lg font-semibold text-foreground'>
              No active Meta Pixel found
            </h3>
            <p className='mt-2 text-sm text-muted-foreground'>
              Connect and activate a Meta Pixel for a website first. This page
              will stay empty until a connected website is available.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
      <div className='flex flex-col gap-2 border-b border-border px-5 py-4'>
        <h2 className='text-lg font-semibold text-foreground'>
          Storefront pixel analytics
        </h2>
        <p className='text-sm text-muted-foreground'>
          Separate analytics page with deeper event, traffic, audience, and
          product detail for the selected website.
        </p>
      </div>

      <div className='space-y-6 px-5 py-5'>
        {analyticsError ? (
          <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            {analyticsError}
          </div>
        ) : null}

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {performanceCards.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'
              >
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                    {item.label}
                  </p>
                  <Icon className='h-4 w-4 text-muted-foreground' />
                </div>
                <div className='mt-3 text-2xl font-semibold tracking-tight text-foreground'>
                  {analyticsLoading ? '...' : item.value}
                </div>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {item.helper}
                </p>
              </div>
            )
          })}
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]'>
          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <h3 className='text-base font-semibold text-foreground'>Website focus</h3>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div className='rounded-xl border border-border px-4 py-4'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                  Website
                </p>
                <p className='mt-2 text-xl font-semibold text-foreground'>
                  {selectedWebsite
                    ? resolveWebsiteName(selectedWebsite)
                    : 'No website selected'}
                </p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  /{selectedWebsite?.website_slug || selectedWebsiteId || '-'}
                </p>
              </div>
              <div className='rounded-xl border border-border px-4 py-4'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                  Pixel and domain
                </p>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(selectedStatusMeta.className)}
                  >
                    {selectedStatusMeta.label}
                  </Badge>
                  {selectedWebsite?.meta_pixel?.pixel_id ? (
                    <Badge variant='outline'>
                      {selectedWebsite.meta_pixel.pixel_id}
                    </Badge>
                  ) : null}
                </div>
                <p className='mt-3 text-sm text-muted-foreground'>
                  {selectedWebsite?.custom_domain?.hostname || 'No active custom domain'}
                </p>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <h3 className='text-base font-semibold text-foreground'>
              Audience quality
            </h3>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              {[
                {
                  label: 'Total Users',
                  value: analyticsOverview?.totalUsers ?? 0,
                  icon: Users,
                },
                {
                  label: 'New Users',
                  value: analyticsOverview?.newUsers ?? 0,
                  icon: Eye,
                },
                {
                  label: 'Returning Users',
                  value: analyticsOverview?.returningUsers ?? 0,
                  icon: RefreshCw,
                },
                {
                  label: 'Avg Session',
                  value: formatDurationLabel(analyticsOverview?.avgSessionDuration),
                  icon: Clock3,
                },
                {
                  label: 'Avg Time On Page',
                  value: formatDurationLabel(
                    Math.round(
                      Number(analyticsInsights?.totals?.avgTimeOnPageMs || 0) / 1000
                    )
                  ),
                  icon: Clock3,
                },
                {
                  label: 'Bounce Rate',
                  value: formatPercentage(analyticsOverview?.bounceRate),
                  icon: MousePointerClick,
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className='rounded-xl border border-border px-4 py-3'
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                        {item.label}
                      </span>
                      <Icon className='h-4 w-4 text-muted-foreground' />
                    </div>
                    <div className='mt-2 text-xl font-semibold text-foreground'>
                      {analyticsLoading ? '...' : item.value}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]'>
          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h3 className='text-base font-semibold text-foreground'>
                  Recent tracked activity
                </h3>
                <p className='text-sm text-muted-foreground'>
                  Latest captured events for this website.
                </p>
              </div>
              <Badge variant='outline'>
                {analyticsLoading ? 'Loading' : `${analyticsEvents.length} events`}
              </Badge>
            </div>
            <div className='mt-4 space-y-3'>
              {analyticsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className='h-16 animate-pulse rounded-xl bg-muted/40'
                  />
                ))
              ) : analyticsEvents.length ? (
                analyticsEvents.map((event, index) => (
                  <div
                    key={event._id || `${event.eventType}-${index}`}
                    className='rounded-xl border border-border px-4 py-3'
                  >
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='font-medium text-foreground'>
                          {formatEventTypeLabel(event.eventType)}
                        </p>
                        <p className='truncate text-sm text-muted-foreground'>
                          {String(
                            event.productName ||
                              event.title ||
                              event.fullUrl ||
                              event.path ||
                              'Tracked activity'
                          ).trim()}
                        </p>
                      </div>
                      <div className='text-right text-xs text-muted-foreground'>
                        <p>{formatDateTime(event.createdAt)}</p>
                        <p>
                          {[event.city, event.country]
                            .filter(Boolean)
                            .join(', ') || 'Location unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                      {event.source ? (
                        <Badge variant='outline'>{event.source}</Badge>
                      ) : null}
                      {event.device ? (
                        <Badge variant='outline'>{event.device}</Badge>
                      ) : null}
                      {event.cartTotal ? (
                        <Badge variant='outline'>
                          {formatINR(event.cartTotal, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                  No storefront activity tracked yet for this website.
                </div>
              )}
            </div>
          </div>

          <div className='space-y-6'>
            <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
              <h3 className='text-base font-semibold text-foreground'>Top pages</h3>
              <div className='mt-4 space-y-3'>
                {analyticsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-12 animate-pulse rounded-xl bg-muted/40'
                    />
                  ))
                ) : analyticsOverview?.topPages?.length ? (
                  analyticsOverview.topPages.slice(0, 6).map((page, index) => (
                    <div
                      key={`${page.page || 'page'}-${index}`}
                      className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                    >
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-foreground'>
                          {page.page || '/'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Avg time {formatDurationLabel(page.avgTime)}
                        </p>
                      </div>
                      <Badge variant='outline'>{Number(page.views || 0)} views</Badge>
                    </div>
                  ))
                ) : (
                  <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                    Top pages will appear once traffic is tracked.
                  </div>
                )}
              </div>
            </div>

            <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
              <h3 className='text-base font-semibold text-foreground'>Funnel check</h3>
              <div className='mt-4 grid gap-3'>
                {[
                  {
                    label: 'Sessions',
                    value: analyticsOverview?.totalSessions ?? 0,
                  },
                  {
                    label: 'Add to Cart',
                    value: analyticsOverview?.funnel?.addToCarts ?? 0,
                  },
                  {
                    label: 'Checkouts',
                    value: analyticsOverview?.funnel?.checkouts ?? 0,
                  },
                  {
                    label: 'Purchases',
                    value:
                      analyticsOverview?.funnel?.purchases ??
                      analyticsOverview?.totalOrders ??
                      0,
                  },
                  {
                    label: 'Abandoned Carts',
                    value: Math.max(
                      0,
                      Number(analyticsOverview?.funnel?.addToCarts || 0) -
                        Number(analyticsOverview?.totalOrders || 0)
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                  >
                    <span className='text-sm text-muted-foreground'>
                      {item.label}
                    </span>
                    <span className='text-base font-semibold text-foreground'>
                      {analyticsLoading ? '...' : item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-3'>
          {[
            {
              title: 'Traffic Sources',
              items: analyticsOverview?.trafficBySource?.map((item) => ({
                label: item.source || 'Unknown',
                value: item.count || 0,
              })),
            },
            {
              title: 'Devices',
              items: analyticsOverview?.trafficByDevice?.map((item) => ({
                label: item.device || 'Unknown',
                value: item.count || 0,
              })),
            },
            {
              title: 'Browsers',
              items: analyticsOverview?.trafficByBrowser?.map((item) => ({
                label: item.browser || 'Unknown',
                value: item.count || 0,
              })),
            },
          ].map((section) => (
            <div
              key={section.title}
              className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'
            >
              <h3 className='text-base font-semibold text-foreground'>
                {section.title}
              </h3>
              <div className='mt-4 space-y-3'>
                {analyticsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-10 animate-pulse rounded-xl bg-muted/40'
                    />
                  ))
                ) : section.items?.length ? (
                  section.items.slice(0, 6).map((item) => (
                    <div
                      key={`${section.title}-${item.label}`}
                      className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                    >
                      <span className='truncate text-sm text-foreground'>
                        {item.label}
                      </span>
                      <Badge variant='outline'>{item.value}</Badge>
                    </div>
                  ))
                ) : (
                  <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                    No data available in this range.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]'>
          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <h3 className='text-base font-semibold text-foreground'>Top products</h3>
            <div className='mt-4 space-y-3'>
              {analyticsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className='h-14 animate-pulse rounded-xl bg-muted/40'
                  />
                ))
              ) : analyticsOverview?.topProducts?.length ? (
                analyticsOverview.topProducts.slice(0, 6).map((product, index) => (
                  <div
                    key={`${product.productId || product.name}-${index}`}
                    className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-foreground'>
                        {product.name || 'Unknown product'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {Number(product.sales || 0)} sales
                      </p>
                    </div>
                    <Badge variant='outline'>
                      {formatINR(product.revenue, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                  No purchase data tracked yet for this website.
                </div>
              )}
            </div>
          </div>

          <div className='space-y-6'>
            <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
              <h3 className='text-base font-semibold text-foreground'>Live pages</h3>
              <div className='mt-4 space-y-3'>
                {analyticsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-12 animate-pulse rounded-xl bg-muted/40'
                    />
                  ))
                ) : activePages.length ? (
                  activePages.slice(0, 5).map((page, index) => (
                    <div
                      key={`${page.page || 'live'}-${index}`}
                      className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                    >
                      <span className='truncate text-sm text-foreground'>
                        {page.page || '/'}
                      </span>
                      <Badge variant='outline'>
                        {Number(page.users || 0)} users
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                    No live page activity detected right now.
                  </div>
                )}
              </div>
            </div>

            <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
              <h3 className='text-base font-semibold text-foreground'>Top visitors</h3>
              <div className='mt-4 space-y-3'>
                {analyticsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-14 animate-pulse rounded-xl bg-muted/40'
                    />
                  ))
                ) : analyticsVisitors.length ? (
                  analyticsVisitors.map((visitor, index) => (
                    <div
                      key={`${visitor.key || 'visitor'}-${index}`}
                      className='rounded-xl border border-border px-4 py-3'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium text-foreground'>
                            {visitor.user?.name ||
                              visitor.user?.email ||
                              visitor.key ||
                              'Unknown visitor'}
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {visitor.user?.email ||
                              visitor.user?.phone ||
                              visitor.type ||
                              'Visitor'}
                          </p>
                        </div>
                        <Badge variant='outline'>
                          {Number(visitor.visits || 0)} visits
                        </Badge>
                      </div>
                      <p className='mt-2 text-xs text-muted-foreground'>
                        Last seen {formatDateTime(visitor.lastSeen)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                    Visitor summaries will appear once traffic is tracked.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]'>
          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <h3 className='text-base font-semibold text-foreground'>Timeline</h3>
            <div className='mt-4 space-y-3'>
              {analyticsLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className='h-10 animate-pulse rounded-xl bg-muted/40'
                  />
                ))
              ) : analyticsInsights?.timeline?.length ? (
                analyticsInsights.timeline.slice(-8).map((point, index) => (
                  <div
                    key={`${point.date || 'date'}-${index}`}
                    className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                  >
                    <span className='text-sm text-foreground'>
                      {point.date || 'Unknown date'}
                    </span>
                    <Badge variant='outline'>{Number(point.views || 0)} views</Badge>
                  </div>
                ))
              ) : (
                <div className='rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground'>
                  Timeline data will appear after page views are recorded.
                </div>
              )}
            </div>
          </div>

          <div className='rounded-xl border border-border bg-background px-4 py-4 shadow-sm'>
            <h3 className='text-base font-semibold text-foreground'>
              Referrers and countries
            </h3>
            <div className='mt-4 space-y-4'>
              <div className='space-y-3'>
                {(analyticsInsights?.topReferrers || []).slice(0, 4).map((item) => (
                  <div
                    key={item.referrer || 'referrer'}
                    className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                  >
                    <span className='truncate text-sm text-foreground'>
                      {item.referrer || 'Direct'}
                    </span>
                    <Badge variant='outline'>
                      {Number(item.visits || 0)} visits
                    </Badge>
                  </div>
                ))}
                {!analyticsLoading && !(analyticsInsights?.topReferrers || []).length ? (
                  <div className='rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground'>
                    No referrer data available.
                  </div>
                ) : null}
              </div>
              <div className='space-y-3'>
                {(analyticsInsights?.topCountries || []).slice(0, 4).map((item) => (
                  <div
                    key={item.country || 'country'}
                    className='flex items-center justify-between rounded-xl border border-border px-4 py-3'
                  >
                    <span className='truncate text-sm text-foreground'>
                      {item.country || 'Unknown'}
                    </span>
                    <Badge variant='outline'>
                      {Number(item.visits || 0)} visits
                    </Badge>
                  </div>
                ))}
                {!analyticsLoading && !(analyticsInsights?.topCountries || []).length ? (
                  <div className='rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground'>
                    No country data available.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
