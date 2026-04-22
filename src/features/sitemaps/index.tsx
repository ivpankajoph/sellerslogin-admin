import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Copy, ExternalLink, RefreshCcw, Search } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { getVendorTemplatePreviewUrl, peekStoredTemplatePreviewCity } from '@/lib/storefront-url'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { RootState } from '@/store'

type WebsiteCard = {
  _id: string
  vendor_id?: string
  template_key?: string
  template_name?: string
  name?: string
  business_name?: string
  website_slug?: string
  createdAt?: string
  vendor_name?: string
  vendor_business_name?: string
  vendor_email?: string
  custom_domain?: {
    hostname?: string
    status?: string
    ssl_status?: string
  }
}

type SitemapRow = {
  id: string
  websiteName: string
  vendorName: string
  templateName: string
  websiteSlug: string
  accessLabel: string
  previewUrl: string
  sitemapUrl: string
  createdAt: string
}

const REQUEST_TIMEOUT_MS = 10000

const normalizeCitySlug = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'all'

const formatCityLabel = (slug?: string) => {
  const normalized = normalizeCitySlug(slug)
  if (normalized === 'all') return 'All Cities'
  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const formatDate = (value?: string) => {
  if (!value) return 'Recently created'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently created'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getWebsiteName = (website: WebsiteCard) =>
  String(website.name || website.business_name || website.website_slug || 'Untitled website').trim()

const getVendorName = (website: WebsiteCard, fallbackUser?: RootState['auth']['user']) =>
  String(
    website.vendor_business_name ||
      website.vendor_name ||
      website.business_name ||
      fallbackUser?.business_name ||
      fallbackUser?.storeName ||
      fallbackUser?.name ||
      fallbackUser?.email ||
      website.vendor_email ||
      'Vendor'
  ).trim()

const getReadyCustomDomain = (customDomain?: WebsiteCard['custom_domain']) => {
  const hostname = String(customDomain?.hostname || '').trim()
  const status = String(customDomain?.status || '').trim().toLowerCase()
  const sslStatus = String(customDomain?.ssl_status || '').trim().toLowerCase()

  if (hostname && status === 'active' && sslStatus === 'active') {
    return hostname
  }

  return ''
}

const buildSitemapUrl = (previewUrl?: string) => {
  if (!previewUrl) return ''

  try {
    const url = new URL(previewUrl)
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/sitemap.xml`
    url.search = ''
    return url.toString()
  } catch {
    return ''
  }
}

export default function SitemapsPage() {
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const role = authUser?.role
  const vendorId =
    authUser?.vendor_id || authUser?.vendorId || authUser?._id || authUser?.id || ''
  const isAdmin = role === 'admin' || role === 'superadmin'

  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [websites, setWebsites] = useState<WebsiteCard[]>([])

  const previewCitySlug = useMemo(
    () => normalizeCitySlug(peekStoredTemplatePreviewCity() || 'all'),
    []
  )
  const previewCityLabel = useMemo(
    () => formatCityLabel(previewCitySlug),
    [previewCitySlug]
  )

  const loadSitemaps = async () => {
    if (!vendorId && !isAdmin) {
      setWebsites([])
      return
    }

    setLoading(true)

    try {
      const requestConfig = {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: REQUEST_TIMEOUT_MS,
      }

      const response = await axios.get(
        isAdmin
          ? `${BASE_URL}/v1/templates/by-vendor`
          : `${BASE_URL}/v1/templates/by-vendor?vendor_id=${vendorId}`,
        requestConfig
      )

      setWebsites(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error: any) {
      setWebsites([])
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to load sitemap records'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSitemaps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, isAdmin, token])

  const rows = useMemo<SitemapRow[]>(() => {
    return websites.map((website) => {
      const resolvedVendorId = String(website.vendor_id || vendorId).trim()
      const resolvedTemplateKey = String(website.template_key || '').trim()
      const resolvedWebsiteSlug = String(website.website_slug || website._id || '').trim()
      const previewUrl =
        getVendorTemplatePreviewUrl(
          resolvedVendorId,
          resolvedTemplateKey,
          previewCitySlug,
          resolvedWebsiteSlug
        ) || ''
      const readyCustomDomain = getReadyCustomDomain(website.custom_domain)

      return {
        id: website._id,
        websiteName: getWebsiteName(website),
        vendorName: getVendorName(website, authUser),
        templateName: String(website.template_name || website.template_key || 'Template').trim(),
        websiteSlug: resolvedWebsiteSlug || 'Not available',
        accessLabel: readyCustomDomain || `Preview route • ${previewCityLabel}`,
        previewUrl,
        sitemapUrl: buildSitemapUrl(previewUrl),
        createdAt: formatDate(website.createdAt),
      }
    })
  }, [authUser, previewCityLabel, previewCitySlug, vendorId, websites])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((row) =>
      [
        row.websiteName,
        row.vendorName,
        row.templateName,
        row.websiteSlug,
        row.accessLabel,
        row.previewUrl,
        row.sitemapUrl,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [rows, search])

  const copyValue = async (value: string, label: string) => {
    if (!value) return
    await navigator.clipboard?.writeText(value)
    toast.success(`${label} copied`)
  }

  return (
    <>
      <TablePageHeader title='Sitemap' stackOnMobile>
        <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search websites, vendor, slug, or URL...'
            className='h-10 w-full sm:w-80'
          />
          <Button variant='outline' onClick={loadSitemaps} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        {isAdmin ? (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight'>
                Website Sitemaps
              </h1>
              <p className='text-muted-foreground text-sm'>
                Each new template website appears here automatically with its sitemap.
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Badge variant='secondary'>{filteredRows.length} websites</Badge>
              <Badge variant='outline'>Preview city: {previewCityLabel}</Badge>
            </div>
          </div>
        ) : (
          <div className='flex flex-wrap gap-2'>
            <Badge variant='secondary'>{filteredRows.length} websites</Badge>
            <Badge variant='outline'>Preview city: {previewCityLabel}</Badge>
          </div>
        )}

        <Card>
          <CardHeader className='pb-4'>
            <CardTitle>Sitemap Records</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRows.length === 0 ? (
              <div className='text-muted-foreground flex min-h-40 items-center justify-center text-sm'>
                {loading ? 'Loading sitemap records...' : 'No website sitemap records found yet.'}
              </div>
            ) : (
              <div className='overflow-x-auto rounded-md border'>
                <Table className='min-w-[1180px]'>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[220px]'>Website</TableHead>
                      <TableHead className='w-[180px]'>Vendor</TableHead>
                      <TableHead className='w-[160px]'>Template</TableHead>
                      <TableHead className='w-[190px]'>Access</TableHead>
                      <TableHead className='w-[220px]'>Preview URL</TableHead>
                      <TableHead className='w-[220px]'>Sitemap URL</TableHead>
                      <TableHead className='w-[120px]'>Created</TableHead>
                      <TableHead className='w-[180px] text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className='align-top'>
                          <div className='space-y-1'>
                            <div className='font-medium text-slate-900'>{row.websiteName}</div>
                            <div className='text-muted-foreground text-xs'>
                              Slug: <span className='font-mono'>{row.websiteSlug}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='align-top text-sm'>{row.vendorName}</TableCell>
                        <TableCell className='align-top text-sm'>{row.templateName}</TableCell>
                        <TableCell className='align-top'>
                          <div className='space-y-2'>
                            <Badge variant='outline' className='max-w-full truncate'>
                              {row.accessLabel}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className='align-top'>
                          <div className='max-w-[220px] space-y-2'>
                            <p
                              className='truncate font-mono text-xs text-slate-600'
                              title={row.previewUrl}
                            >
                              {row.previewUrl || 'Preview not available'}
                            </p>
                            {row.previewUrl ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 px-2 text-xs'
                                onClick={() => void copyValue(row.previewUrl, 'Preview URL')}
                              >
                                <Copy className='mr-1 h-3.5 w-3.5' />
                                Copy
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className='align-top'>
                          <div className='max-w-[220px] space-y-2'>
                            <p
                              className='truncate font-mono text-xs text-slate-600'
                              title={row.sitemapUrl}
                            >
                              {row.sitemapUrl || 'Sitemap not available'}
                            </p>
                            {row.sitemapUrl ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 px-2 text-xs'
                                onClick={() => void copyValue(row.sitemapUrl, 'Sitemap URL')}
                              >
                                <Copy className='mr-1 h-3.5 w-3.5' />
                                Copy
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className='align-top text-sm'>{row.createdAt}</TableCell>
                        <TableCell className='align-top text-right'>
                          <div className='flex justify-end gap-2'>
                            {row.previewUrl ? (
                              <Button asChild variant='outline' size='sm'>
                                <a href={row.previewUrl} target='_blank' rel='noreferrer'>
                                  <ExternalLink className='mr-2 h-4 w-4' />
                                  Open
                                </a>
                              </Button>
                            ) : null}

                            {row.sitemapUrl ? (
                              <Button asChild variant='outline' size='sm'>
                                <a href={row.sitemapUrl} target='_blank' rel='noreferrer'>
                                  <Search className='mr-2 h-4 w-4' />
                                  Sitemap
                                </a>
                              </Button>
                            ) : null}
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
      </Main>
    </>
  )
}
