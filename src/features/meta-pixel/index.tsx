import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Activity,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  LayoutTemplate,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  setStoredActiveWebsite,
  useActiveWebsiteSelection,
} from '@/features/vendor-template/components/websiteStudioStorage'
import { getVendorTemplatePreviewUrl } from '@/lib/storefront-url'
import { cn } from '@/lib/utils'

type MetaPixelConfig = {
  pixel_id?: string
  is_active?: boolean
  installed_by_platform?: boolean
  updated_at?: string | null
}

type WebsiteRow = {
  _id?: string
  id?: string
  template_key?: string
  template_name?: string
  name?: string
  business_name?: string
  website_slug?: string
  meta_pixel?: MetaPixelConfig
  custom_domain?: {
    hostname?: string
    status?: string
    ssl_status?: string
  }
}

const cardClass = 'rounded-2xl border border-border bg-card shadow-sm'

const extractMetaPixelId = (value: string) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  const initMatch = rawValue.match(
    /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{5,25})['"]?\s*\)/i
  )
  if (initMatch?.[1]) return initMatch[1]

  const directMatch = rawValue.match(/^(\d{5,25})$/)
  if (directMatch?.[1]) return directMatch[1]

  const fallbackMatch = rawValue.match(/\b(\d{8,25})\b/)
  return fallbackMatch?.[1] || ''
}

const buildMetaPixelCodeExample = (pixelId: string) => {
  const safePixelId = extractMetaPixelId(pixelId)
  if (!safePixelId) return ''

  return [
    '<!-- Meta Pixel Code -->',
    '<script>',
    '  !function(f,b,e,v,n,t,s)',
    '  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?',
    '  n.callMethod.apply(n,arguments):n.queue.push(arguments)};',
    "  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
    '  n.queue=[];t=b.createElement(e);t.async=!0;',
    '  t.src=v;s=b.getElementsByTagName(e)[0];',
    "  s.parentNode.insertBefore(t,s)}(window, document,'script',",
    "  'https://connect.facebook.net/en_US/fbevents.js');",
    `  fbq('init', '${safePixelId}');`,
    "  fbq('track', 'PageView');",
    '</script>',
    '<noscript>',
    `  <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${safePixelId}&ev=PageView&noscript=1" />`,
    '</noscript>',
    '<!-- End Meta Pixel Code -->',
  ].join('\n')
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not saved yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not saved yet'
  return date.toLocaleString()
}

const resolveWebsiteId = (website?: WebsiteRow | null) =>
  String(website?._id || website?.id || '').trim()

const resolveWebsiteName = (website?: WebsiteRow | null) =>
  String(
    website?.name ||
      website?.business_name ||
      website?.website_slug ||
      website?.template_name ||
      'Untitled website'
  ).trim()

const getPixelStatusMeta = (website?: WebsiteRow | null) => {
  const hasPixel = Boolean(website?.meta_pixel?.pixel_id)
  const isActive = hasPixel && website?.meta_pixel?.is_active !== false

  if (isActive) {
    return {
      label: 'Active',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (hasPixel) {
    return {
      label: 'Paused',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'Not connected',
    className: 'border-border bg-muted/50 text-muted-foreground',
  }
}

export default function MetaPixelDashboard() {
  const navigate = useNavigate()
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const token = useSelector((state: any) => state.auth?.token)
  const role = String(authUser?.role || '').trim().toLowerCase()
  const vendorId = String(
    authUser?.vendor_id || authUser?.id || authUser?._id || ''
  ).trim()
  const vendorPublicIdentifier = String(
    authUser?.username || authUser?.vendor_username || vendorId
  ).trim()
  const { activeWebsiteId } = useActiveWebsiteSelection(vendorId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [websites, setWebsites] = useState<WebsiteRow[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorWebsiteId, setEditorWebsiteId] = useState('')
  const [editorPixelInput, setEditorPixelInput] = useState('')
  const [editorIsActive, setEditorIsActive] = useState(true)
  const [statisticsOpen, setStatisticsOpen] = useState(false)
  const [statisticsWebsiteId, setStatisticsWebsiteId] = useState('')

  const filteredWebsites = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return websites

    return websites.filter((website) => {
      const websiteName = resolveWebsiteName(website).toLowerCase()
      const websiteSlug = String(website?.website_slug || '').toLowerCase()
      const templateName = String(website?.template_name || '').toLowerCase()
      const pixelId = String(website?.meta_pixel?.pixel_id || '').toLowerCase()

      return (
        websiteName.includes(query) ||
        websiteSlug.includes(query) ||
        templateName.includes(query) ||
        pixelId.includes(query)
      )
    })
  }, [search, websites])

  const selectedWebsite = useMemo(
    () =>
      websites.find((website) => resolveWebsiteId(website) === selectedWebsiteId) ||
      null,
    [selectedWebsiteId, websites]
  )

  const editorWebsite = useMemo(
    () =>
      websites.find((website) => resolveWebsiteId(website) === editorWebsiteId) ||
      null,
    [editorWebsiteId, websites]
  )

  const statisticsWebsite = useMemo(
    () =>
      websites.find(
        (website) => resolveWebsiteId(website) === statisticsWebsiteId
      ) || selectedWebsite,
    [selectedWebsite, statisticsWebsiteId, websites]
  )

  const buildPreviewUrl = (website?: WebsiteRow | null) => {
    if (!website) return undefined

    return getVendorTemplatePreviewUrl(
      vendorPublicIdentifier || vendorId,
      website.template_key,
      undefined,
      resolveWebsiteId(website)
    )
  }

  const editorPreviewUrl = useMemo(
    () => buildPreviewUrl(editorWebsite),
    [editorWebsite, vendorId, vendorPublicIdentifier]
  )

  const extractedPixelId = useMemo(
    () => extractMetaPixelId(editorPixelInput),
    [editorPixelInput]
  )

  const generatedCodeExample = useMemo(
    () =>
      buildMetaPixelCodeExample(
        extractedPixelId || editorWebsite?.meta_pixel?.pixel_id || ''
      ),
    [editorWebsite?.meta_pixel?.pixel_id, extractedPixelId]
  )

  const activePixelsCount = useMemo(
    () =>
      websites.filter(
        (website) =>
          Boolean(website?.meta_pixel?.pixel_id) &&
          website?.meta_pixel?.is_active !== false
      ).length,
    [websites]
  )

  const configuredPixelsCount = useMemo(
    () =>
      websites.filter((website) => Boolean(website?.meta_pixel?.pixel_id)).length,
    [websites]
  )

  const pausedPixelsCount = configuredPixelsCount - activePixelsCount
  const notConnectedCount = Math.max(websites.length - configuredPixelsCount, 0)

  const statisticsItems = useMemo(() => {
    const website = statisticsWebsite
    const status = getPixelStatusMeta(website)

    return [
      {
        label: 'Total Websites',
        value: websites.length,
        helper: 'Vendor websites available for Meta Pixel setup.',
      },
      {
        label: 'Configured Pixels',
        value: configuredPixelsCount,
        helper: 'Websites with a saved Pixel ID.',
      },
      {
        label: 'Active Pixels',
        value: activePixelsCount,
        helper: 'Websites currently tracking with Meta Pixel.',
      },
      {
        label: 'Paused Pixels',
        value: pausedPixelsCount,
        helper: 'Pixel saved but tracking disabled.',
      },
      {
        label: 'Not Connected',
        value: notConnectedCount,
        helper: 'Websites that still need a Pixel ID.',
      },
      {
        label: 'Selected Website',
        value: website ? resolveWebsiteName(website) : 'No website selected',
        helper: website
          ? `/${website?.website_slug || resolveWebsiteId(website)}`
          : 'Choose a website from the dropdown or table.',
      },
      {
        label: 'Selected Status',
        value: website ? status.label : 'N/A',
        helper: website?.meta_pixel?.pixel_id
          ? `Pixel ID ${website.meta_pixel.pixel_id}`
          : 'Meta Pixel not saved yet.',
      },
      {
        label: 'Last Update',
        value: website ? formatDateTime(website?.meta_pixel?.updated_at) : 'N/A',
        helper: 'Latest saved configuration timestamp.',
      },
      {
        label: 'Template',
        value:
          website?.template_name || website?.template_key || 'Template unavailable',
        helper: 'Current template linked to the selected website.',
      },
      {
        label: 'Standard Events',
        value: '4',
        helper: 'PageView, AddToCart, InitiateCheckout, Purchase.',
      },
    ]
  }, [
    activePixelsCount,
    configuredPixelsCount,
    notConnectedCount,
    pausedPixelsCount,
    statisticsWebsite,
    websites.length,
  ])

  const fetchWebsites = async () => {
    if (!token || !vendorId) {
      setLoading(false)
      setWebsites([])
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
        {
          params: { vendor_id: vendorId },
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const nextWebsites = Array.isArray(response?.data?.data)
        ? response.data.data
        : []
      setWebsites(nextWebsites)
      setSelectedWebsiteId((current) => {
        if (
          current &&
          nextWebsites.some(
            (website: WebsiteRow) => resolveWebsiteId(website) === current
          )
        ) {
          return current
        }

        if (
          activeWebsiteId &&
          nextWebsites.some(
            (website: WebsiteRow) => resolveWebsiteId(website) === activeWebsiteId
          )
        ) {
          return activeWebsiteId
        }

        return resolveWebsiteId(nextWebsites[0]) || ''
      })
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load vendor websites'
      )
      setWebsites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchWebsites()
  }, [token, vendorId, activeWebsiteId])

  const openEditor = (websiteId = selectedWebsiteId) => {
    const website = websites.find(
      (item) => resolveWebsiteId(item) === String(websiteId || '').trim()
    )

    if (!website) {
      toast.error('Select a website first')
      return
    }

    const resolvedWebsiteId = resolveWebsiteId(website)
    setSelectedWebsiteId(resolvedWebsiteId)
    setEditorWebsiteId(resolvedWebsiteId)
    setEditorPixelInput(String(website?.meta_pixel?.pixel_id || ''))
    setEditorIsActive(website?.meta_pixel?.is_active !== false)
    setEditorOpen(true)
  }

  const openStatistics = (websiteId = selectedWebsiteId) => {
    const resolvedWebsiteId = String(websiteId || '').trim()

    if (resolvedWebsiteId) {
      setSelectedWebsiteId(resolvedWebsiteId)
      setStatisticsWebsiteId(resolvedWebsiteId)
    } else {
      setStatisticsWebsiteId('')
    }

    setStatisticsOpen(true)
  }

  const handleCopyCode = async () => {
    if (!generatedCodeExample) {
      toast.error('Paste a valid pixel first')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedCodeExample)
      toast.success('Meta Pixel example code copied')
    } catch {
      toast.error('Failed to copy code')
    }
  }

  const handleSave = async () => {
    const websiteId = resolveWebsiteId(editorWebsite)
    if (!websiteId) {
      toast.error('Select a website first')
      return
    }

    if (!editorPixelInput.trim()) {
      toast.error('Paste your Meta Pixel base code or pixel ID')
      return
    }

    setSaving(true)
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/meta-pixel`,
        {
          website_id: websiteId,
          pixel_id: editorPixelInput,
          is_active: editorIsActive,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const nextMetaPixel = response?.data?.data || {
        pixel_id: extractedPixelId,
        is_active: editorIsActive,
      }

      setWebsites((prev) =>
        prev.map((website) =>
          resolveWebsiteId(website) === websiteId
            ? {
                ...website,
                meta_pixel: nextMetaPixel,
              }
            : website
        )
      )
      setSelectedWebsiteId(websiteId)
      setEditorWebsiteId(websiteId)
      setEditorPixelInput(String(nextMetaPixel?.pixel_id || extractedPixelId || ''))
      setEditorIsActive(nextMetaPixel?.is_active !== false)
      setStatisticsWebsiteId(websiteId)
      setEditorOpen(false)
      toast.success('Meta Pixel saved to this website')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to save Meta Pixel'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    const websiteId = resolveWebsiteId(editorWebsite)
    if (!websiteId) {
      toast.error('Select a website first')
      return
    }

    setRemoving(true)
    try {
      await axios.delete(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/meta-pixel`,
        {
          params: { website_id: websiteId },
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const clearedMetaPixel = {
        pixel_id: '',
        is_active: false,
        installed_by_platform: true,
        updated_at: new Date().toISOString(),
      }

      setWebsites((prev) =>
        prev.map((website) =>
          resolveWebsiteId(website) === websiteId
            ? {
                ...website,
                meta_pixel: clearedMetaPixel,
              }
            : website
        )
      )
      setSelectedWebsiteId(websiteId)
      setEditorPixelInput('')
      setEditorIsActive(true)
      setStatisticsWebsiteId(websiteId)
      setEditorOpen(false)
      toast.success('Meta Pixel removed from this website')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to remove Meta Pixel'
      )
    } finally {
      setRemoving(false)
    }
  }

  if (role !== 'vendor') {
    return (
      <>
        <TablePageHeader title='Meta Pixel' stackOnMobile>
          <Button type='button' variant='outline' onClick={() => navigate({ to: '/' })}>
            Back to dashboard
          </Button>
        </TablePageHeader>
        <Main className='space-y-6'>
          <section className={`${cardClass} p-8`}>
            <h1 className='text-2xl font-semibold text-foreground'>
              Meta Pixel is available for vendor websites
            </h1>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
              Open this page with a vendor account to connect website-specific Meta
              Pixel tracking.
            </p>
          </section>
        </Main>
      </>
    )
  }

  return (
    <>
      <TablePageHeader title='Meta Pixel Dashboard' stackOnMobile>
        <div className='relative w-full max-w-sm shrink-0 sm:w-80'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search website, slug, template...'
            className='h-10 w-full rounded-xl pl-10'
          />
        </div>
        <Button
          type='button'
          variant='outline'
          className='h-10 rounded-xl'
          onClick={() => void fetchWebsites()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='h-4 w-4' />
          )}
          Refresh
        </Button>
      </TablePageHeader>

      <Main className='space-y-6'>
        {!loading && !websites.length ? (
          <section className='rounded-2xl border border-dashed border-border bg-card px-8 py-12 text-center shadow-sm'>
            <Globe className='mx-auto h-10 w-10 text-muted-foreground' />
            <h2 className='mt-4 text-2xl font-semibold text-foreground'>
              No vendor websites available yet
            </h2>
            <p className='mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
              Create your first website in My Websites, then connect its Meta
              Pixel from here.
            </p>
            <Button
              type='button'
              className='mt-6 rounded-2xl'
              onClick={() => navigate({ to: '/template-workspace' })}
            >
              Open My Websites
            </Button>
          </section>
        ) : (
          <>
            <section className={`${cardClass} overflow-hidden`}>
              <div className='flex flex-col gap-2 border-b border-border px-5 py-4'>
                <h2 className='text-lg font-semibold text-foreground'>
                  Website table
                </h2>
                <p className='text-sm text-muted-foreground'>
                  Click a row to select a website. Use actions to edit code,
                  open preview, or view statistics.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='px-4'>Website</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Pixel ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className='px-4 text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell className='px-4 py-5' colSpan={7}>
                            <div className='h-8 animate-pulse rounded-xl bg-muted/40' />
                          </TableCell>
                        </TableRow>
                      ))
                    : filteredWebsites.map((website) => {
                        const websiteId = resolveWebsiteId(website)
                        const status = getPixelStatusMeta(website)
                        const previewUrl = buildPreviewUrl(website)

                        return (
                          <TableRow
                            key={websiteId}
                            data-state={
                              websiteId === selectedWebsiteId ? 'selected' : undefined
                            }
                            className='cursor-pointer'
                            onClick={() => setSelectedWebsiteId(websiteId)}
                          >
                            <TableCell className='px-4 py-4'>
                              <div className='min-w-[180px]'>
                                <p className='font-medium text-foreground'>
                                  {resolveWebsiteName(website)}
                                </p>
                                <p className='mt-1 text-xs text-muted-foreground'>
                                  ID: {websiteId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className='py-4'>
                              /{website?.website_slug || websiteId}
                            </TableCell>
                            <TableCell className='py-4'>
                              {website?.template_name || website?.template_key || '-'}
                            </TableCell>
                            <TableCell className='py-4'>
                              {website?.meta_pixel?.pixel_id || '-'}
                            </TableCell>
                            <TableCell className='py-4'>
                              <Badge
                                variant='outline'
                                className={cn(
                                  'rounded-full px-3 py-1',
                                  status.className
                                )}
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className='py-4'>
                              {formatDateTime(website?.meta_pixel?.updated_at)}
                            </TableCell>
                            <TableCell className='px-4 py-4'>
                              <div className='flex items-center justify-end gap-2'>
                                {website?.custom_domain?.hostname && website?.custom_domain?.status === 'active' ? (
                                  <>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      className='rounded-lg'
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        openEditor(websiteId)
                                      }}
                                    >
                                      <Code2 className='h-4 w-4' />
                                      {website?.meta_pixel?.pixel_id ? 'Edit' : 'Add'}
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      className='rounded-lg'
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        openStatistics(websiteId)
                                      }}
                                    >
                                      <Activity className='h-4 w-4' />
                                      Statistics
                                    </Button>
                                    {previewUrl ? (
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='rounded-lg'
                                        asChild
                                      >
                                        <a
                                          href={previewUrl}
                                          target='_blank'
                                          rel='noreferrer'
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <ExternalLink className='h-4 w-4' />
                                          Preview
                                        </a>
                                      </Button>
                                    ) : null}
                                  </>
                                ) : (
                                  <Button
                                    type='button'
                                    size='sm'
                                    className='rounded-lg'
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      const templateKey = String(website.template_key || '').trim()
                                      if (!vendorId || !websiteId || !templateKey) return
                                      
                                      setStoredActiveWebsite(vendorId, {
                                        id: websiteId,
                                        name: resolveWebsiteName(website),
                                        templateKey,
                                        websiteSlug: website.website_slug || websiteId,
                                      })
                                      window.location.href = `/vendor-template/${templateKey}?domain=true`
                                    }}
                                  >
                                    <Globe className='mr-2 h-4 w-4' />
                                    Connect Domain First
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}

                  {!loading && !filteredWebsites.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='px-4 py-12 text-center text-sm text-muted-foreground'
                      >
                        No websites match this search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </section>
          </>
        )}
      </Main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className='w-[min(96vw,960px)] max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-4xl'>
          <div className='border-b border-border px-6 py-5'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-2xl'>
                {editorWebsite?.meta_pixel?.pixel_id
                  ? 'Edit Meta Pixel code'
                  : 'Add Meta Pixel code'}
              </DialogTitle>
              <DialogDescription className='leading-6'>
                {editorWebsite
                  ? `${resolveWebsiteName(editorWebsite)} | /${editorWebsite?.website_slug || resolveWebsiteId(editorWebsite)}`
                  : 'Select a website first.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between rounded-md border border-border bg-muted/20 p-4'>
                <span className='font-medium text-foreground'>
                  Tracking Active
                </span>
                <Switch
                  checked={editorIsActive}
                  onCheckedChange={setEditorIsActive}
                />
              </div>

              <div>
                <label className='font-medium text-foreground'>
                  Meta Pixel base code or Pixel ID
                </label>
                <Textarea
                  value={editorPixelInput}
                  onChange={(event) => setEditorPixelInput(event.target.value)}
                  placeholder="Example: fbq('init', '123456789012345'); or paste 123456789012345"
                  className='mt-2 min-h-[160px] rounded-md px-4 py-3 font-mono text-sm leading-6'
                />
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='rounded-md border border-border bg-background p-4'>
                  <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    Extracted Pixel ID
                  </p>
                  <p className='mt-2 text-lg font-semibold text-foreground'>
                    {extractedPixelId ||
                      editorWebsite?.meta_pixel?.pixel_id ||
                      'Waiting for code'}
                  </p>
                </div>

                <div className='rounded-md border border-border bg-background p-4'>
                  <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    Events Enabled
                  </p>
                  <p className='mt-2 text-sm font-medium text-foreground'>
                    Standard Standard Events
                  </p>
                </div>
              </div>

              <div className='rounded-md border border-border bg-background p-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-medium text-foreground'>
                      Website head code preview
                    </p>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      This is the base code format that gets injected into the
                      website.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='rounded-md'
                    disabled={!generatedCodeExample}
                    onClick={handleCopyCode}
                  >
                    <Copy className='mr-1.5 h-4 w-4' />
                    Copy Code
                  </Button>
                </div>

                <pre className='mt-4 max-h-[220px] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100'>
                  <code>
                    {generatedCodeExample ||
                      'Paste a valid Meta Pixel code or ID to generate the website head preview.'}
                  </code>
                </pre>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='rounded-md border border-border bg-muted/20 p-5'>
                <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Website Information
                </p>
                <h3 className='mt-2 truncate text-xl font-bold text-foreground'>
                  {editorWebsite
                    ? resolveWebsiteName(editorWebsite)
                    : 'No website selected'}
                </h3>

                <div className='mt-4 space-y-3'>
                  <div className='flex items-center gap-2 text-sm text-foreground'>
                    <Globe className='h-4 w-4 text-muted-foreground' />
                    {editorWebsite?.custom_domain?.hostname &&
                    editorWebsite?.custom_domain?.status === 'active' ? (
                      <a
                        href={`https://${editorWebsite.custom_domain.hostname}`}
                        target='_blank'
                        rel='noreferrer'
                        className='text-blue-600 transition hover:text-blue-800 hover:underline'
                      >
                        {editorWebsite.custom_domain.hostname}
                      </a>
                    ) : (
                      <span className='text-muted-foreground'>
                        No active custom domain
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <LayoutTemplate className='h-4 w-4' />
                    {editorWebsite?.template_name || editorWebsite?.template_key}
                  </div>
                </div>

                <div className='mt-5 flex flex-wrap gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(getPixelStatusMeta(editorWebsite).className)}
                  >
                    {getPixelStatusMeta(editorWebsite).label}
                  </Badge>
                </div>

                <p className='mt-4 text-[13px] text-muted-foreground'>
                  Last updated:{' '}
                  {formatDateTime(editorWebsite?.meta_pixel?.updated_at)}
                </p>
              </div>

              {editorPreviewUrl ? (
                <div className='rounded-md border border-border bg-muted/20 p-5'>
                  <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    Preview Storefront
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    className='mt-3 w-full rounded-md bg-white'
                    asChild
                  >
                    <a href={editorPreviewUrl} target='_blank' rel='noreferrer'>
                      <ExternalLink className='mr-2 h-4 w-4' />
                      Open Preview
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className='border-t border-border px-6 py-5 sm:justify-between'>
            <div className='flex flex-wrap gap-3'>
              <Button
                type='button'
                variant='outline'
                className='rounded-md'
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='outline'
                className='rounded-md border-destructive text-destructive hover:bg-destructive hover:text-white'
                disabled={removing || !editorWebsite?.meta_pixel?.pixel_id}
                onClick={handleRemove}
              >
                {removing ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='h-4 w-4' />
                )}
                Remove Pixel
              </Button>
            </div>

            <Button
              type='button'
              className='rounded-md'
              disabled={saving || !editorPixelInput.trim()}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <CheckCircle2 className='h-4 w-4' />
              )}
              Save Pixel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StatisticsDialog
        open={statisticsOpen}
        onOpenChange={setStatisticsOpen}
        title={
          statisticsWebsite
            ? `${resolveWebsiteName(statisticsWebsite)} statistics`
            : 'Meta Pixel statistics'
        }
        description='This dialog shows saved setup data inside SellersLogin. Live event counts still come from Meta Events Manager.'
        items={statisticsItems}
      />
    </>
  )
}
