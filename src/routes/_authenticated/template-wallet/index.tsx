import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import type { RootState } from '@/store'
import { useSelector } from 'react-redux'
import api from '@/lib/axios'
import { formatINR } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'

type Wallet = {
  _id: string
  balance: number
  currency?: string
}

type Transaction = {
  _id: string
  direction: 'credit' | 'debit'
  amount: number
  balance_after: number
  createdAt: string
  meta?: {
    order_number?: string
    product_id?: string
    category_id?: string
    vendor_id?: string
    product_name?: string
    image_url?: string
    quantity?: number
    unit_price?: number
    total_price?: number
    commission_percent?: number
    commission_amount?: number
    gross_amount?: number
    net_amount?: number
    template_id?: string
    template_key?: string
    template_name?: string
    website_id?: string
    website_name?: string
    website_slug?: string
    source?: string
  }
}

type AdminWalletResponse = {
  wallet: Wallet
  summary?: {
    commissionTotal?: number
    vendorPayoutTotal?: number
  }
  transactions: Transaction[]
}

type VendorWalletResponse = {
  wallet: Wallet
  transactions: Transaction[]
}

type WebsiteOption = {
  id: string
  label: string
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" fill="#f1f5f9"/>
      <rect x="18" y="18" width="84" height="84" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M34 78l18-22 14 16 10-12 20 18" fill="none" stroke="#94a3b8" stroke-width="4"/>
      <circle cx="46" cy="46" r="6" fill="#94a3b8"/>
    </svg>`
  )

export const Route = createFileRoute('/_authenticated/template-wallet/')({
  component: TemplateWalletPage,
})

function TemplateWalletPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const token = useSelector((state: RootState) => state.auth?.token)
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const vendorId = useMemo(
    () => String(authUser?.vendor_id || authUser?._id || authUser?.id || ''),
    [authUser]
  )
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<AdminWalletResponse['summary'] | null>(
    null
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [vendors, setVendors] = useState<any[]>([])
  const [websites, setWebsites] = useState<WebsiteOption[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('all')
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await api.get('/wallet/template', {
        params: {
          limit: 500,
          ...(!isVendor && selectedVendor !== 'all'
            ? { vendor_id: selectedVendor }
            : {}),
          ...(selectedWebsite !== 'all'
            ? { website_id: selectedWebsite }
            : {}),
        },
      })
      const data = res.data as AdminWalletResponse | VendorWalletResponse
      setSummary(
        !isVendor ? (data as AdminWalletResponse).summary || null : null
      )
      setTransactions(data.transactions || [])
      if (!selectedId && data.transactions?.length) {
        setSelectedId(data.transactions[0]._id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendor, selectedVendor, selectedWebsite])

  useEffect(() => {
    if (search.trim()) {
      setSearchOpen(true)
    }
  }, [search])

  useEffect(() => {
    if (!searchOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (searchContainerRef.current?.contains(target)) return
      setSearchOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [searchOpen])

  useEffect(() => {
    const fetchVendors = async () => {
      if (isVendor) {
        if (vendorId) {
          setVendors([
            {
              _id: vendorId,
              business_name: authUser?.business_name,
              storeName: authUser?.storeName,
              name: authUser?.name,
              email: authUser?.email,
            },
          ])
          setSelectedVendor(vendorId)
        }
        return
      }
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendors/getall`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        setVendors(res.data?.vendors || res.data?.data || [])
      } catch {
        setVendors([])
      }
    }
    fetchVendors()
  }, [authUser, isVendor, token, vendorId])

  useEffect(() => {
    const fetchWebsites = async () => {
      if (!token) {
        setWebsites([])
        setSelectedWebsite('all')
        return
      }

      if (isVendor && !vendorId) {
        setWebsites([])
        setSelectedWebsite('all')
        return
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
          {
            params: {
              ...(!isVendor && selectedVendor !== 'all'
                ? { vendor_id: selectedVendor }
                : {}),
              ...(isVendor ? { vendor_id: vendorId } : {}),
            },
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : undefined,
          }
        )

        const options: WebsiteOption[] = (res.data?.data || [])
          .map((website: any) => {
            const websiteName = String(
              website?.name ||
                website?.business_name ||
                website?.website_slug ||
                website?.template_name ||
                website?.template_key ||
                'Website'
            ).trim()
            const vendorName = String(
              website?.vendor_name ||
                website?.vendor_business_name ||
                website?.vendor_email ||
                ''
            ).trim()

            return {
              id: String(website?._id || website?.id || ''),
              label:
                !isVendor && vendorName && selectedVendor === 'all'
                  ? `${websiteName} - ${vendorName}`
                  : websiteName,
            }
          })
          .filter((item: WebsiteOption) => item.id)

        setWebsites(options)
        setSelectedWebsite((current) =>
          current !== 'all' && !options.some((item) => item.id === current)
            ? 'all'
            : current
        )
      } catch {
        setWebsites([])
        setSelectedWebsite('all')
      }
    }
    fetchWebsites()
  }, [isVendor, selectedVendor, token, vendorId])

  const formatMoney = (value?: number) => formatINR(value)
  const getWebsiteLabel = (tx?: Transaction | null) =>
    String(
      tx?.meta?.website_name ||
        tx?.meta?.website_slug ||
        tx?.meta?.template_name ||
        tx?.meta?.template_key ||
        ''
    ).trim() || 'Unknown website'

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions
    const query = search.toLowerCase()
    return transactions.filter((tx) =>
      [
        tx.meta?.order_number,
        tx.meta?.source,
        tx.meta?.product_name,
        tx.meta?.vendor_id,
        getWebsiteLabel(tx),
        tx.meta?.template_name,
        tx.meta?.template_key,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [getWebsiteLabel, search, transactions])

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1)
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, selectedVendor, selectedWebsite, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!filtered.some((tx) => tx._id === selectedId)) {
      setSelectedId(filtered[0]._id)
    }
  }, [filtered, selectedId])

  const selectedTx = useMemo(
    () => filtered.find((tx) => tx._id === selectedId) || null,
    [filtered, selectedId]
  )

  const derivedBalance = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      const amount = Number(tx.amount || 0)
      return tx.direction === 'debit' ? sum - amount : sum + amount
    }, 0)
  }, [transactions])

  const derivedSummary = useMemo(() => {
    if (!isVendor && summary) return summary
    const commissionTotal = transactions.reduce(
      (sum, tx) => sum + Number(tx.meta?.commission_amount || 0),
      0
    )
    const vendorPayoutTotal = transactions.reduce(
      (sum, tx) => sum + Number(tx.meta?.net_amount || 0),
      0
    )
    return { commissionTotal, vendorPayoutTotal }
  }, [isVendor, summary, transactions])

  const vendorOptions = useMemo(() => {
    if (isVendor && vendorId) {
      return [
        {
          id: vendorId,
          label:
            authUser?.business_name ||
            authUser?.storeName ||
            authUser?.name ||
            authUser?.email ||
            `Vendor ${vendorId.slice(0, 6)}`,
        },
      ]
    }
    const byId = new Map<string, any>()
    vendors.forEach((vendor) => {
      if (vendor?._id) {
        byId.set(String(vendor._id), vendor)
      } else if (vendor?.id) {
        byId.set(String(vendor.id), vendor)
      }
    })
    const idsFromTx = new Set(
      transactions.map((tx) => String(tx.meta?.vendor_id || '')).filter(Boolean)
    )
    const combinedIds = new Set([...byId.keys(), ...idsFromTx])
    return Array.from(combinedIds).map((id) => {
      const vendor = byId.get(id)
      return {
        id,
        label:
          vendor?.business_name ||
          vendor?.storeName ||
          vendor?.name ||
          vendor?.email ||
          `Vendor ${id.slice(0, 6)}`,
      }
    })
  }, [authUser, isVendor, transactions, vendorId, vendors])

  const vendorLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    vendorOptions.forEach((option) => {
      map.set(option.id, option.label)
    })
    return map
  }, [vendorOptions])

  const statsItems = [
    {
      label: 'Wallet Balance',
      value: formatMoney(derivedBalance),
      helper: 'Balance for the selected vendor and website scope.',
    },
    {
      label: 'Visible Transactions',
      value: filtered.length,
      helper: 'Transactions matching the current table filters.',
    },
    {
      label: 'Credits',
      value: filtered.filter((tx) => tx.direction === 'credit').length,
      helper: 'Transactions that credited the wallet.',
    },
    {
      label: 'Debits',
      value: filtered.filter((tx) => tx.direction === 'debit').length,
      helper: 'Transactions that debited the wallet.',
    },
    {
      label: 'Total Commission',
      value: formatMoney(derivedSummary?.commissionTotal),
      helper: 'Commission across the selected website scope.',
    },
    {
      label: 'Vendor Payouts',
      value: formatMoney(derivedSummary?.vendorPayoutTotal),
      helper: 'Vendor payouts across the selected website scope.',
    },
    {
      label: 'Visible Credit Value',
      value: formatMoney(
        filtered
          .filter((tx) => tx.direction === 'credit')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      ),
      helper: 'Total credited in the current table result.',
    },
  ]

  const openDetails = (tx: Transaction) => {
    setSelectedId(tx._id)
    setDetailsOpen(true)
  }

  return (
    <>
      <TablePageHeader title='Website Wallet'>
        <div className='flex w-full flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-3'>
            {!isVendor && (
              <Select
                value={selectedVendor}
                onValueChange={(value) => {
                  setSelectedVendor(value)
                  setSelectedWebsite('all')
                }}
              >
                <SelectTrigger className='h-10 w-52 shrink-0'>
                  <SelectValue placeholder='All vendors' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All vendors</SelectItem>
                  {vendorOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={selectedWebsite}
              onValueChange={setSelectedWebsite}
            >
              <SelectTrigger className='h-10 w-52 shrink-0'>
                <SelectValue placeholder='All websites' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All websites</SelectItem>
                {websites.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='ml-auto flex flex-wrap items-center justify-end gap-3'>
            <div ref={searchContainerRef} className='flex items-center gap-2'>
              {searchOpen ? (
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      isVendor
                        ? 'Search order, product, or website'
                        : 'Search order, vendor, or website'
                    }
                    className='h-10 w-64 shrink-0 pl-9'
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-10 w-10 shrink-0 rounded-full text-[#183b63] hover:bg-transparent hover:text-[#183b63]'
                  onClick={() => setSearchOpen(true)}
                  aria-label='Open search'
                >
                  <Search className='h-6 w-6 stroke-[2.5]' />
                </Button>
              )}
            </div>
            <Button
              variant='outline'
              className='shrink-0'
              onClick={() => setStatsOpen(true)}
            >
              Statistics
            </Button>
            <Button className='shrink-0' onClick={fetchWallet} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <TableShell
          className='flex-1'
          title='Transaction history'
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[170px]'>Order</TableHead>
                {!isVendor && (
                  <TableHead className='min-w-[170px]'>Vendor</TableHead>
                )}
                <TableHead className='min-w-[180px]'>Website</TableHead>
                <TableHead className='min-w-[220px]'>Product</TableHead>
                <TableHead className='min-w-[140px]'>Amount</TableHead>
                <TableHead className='min-w-[140px]'>Balance After</TableHead>
                <TableHead className='min-w-[160px]'>Created</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isVendor ? 7 : 8}
                    className='h-24 text-center'
                  >
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isVendor ? 7 : 8}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isDebit = tx.direction === 'debit'
                  const vendorLabel = vendorLabelMap.get(
                    String(tx.meta?.vendor_id || '')
                  )
                  return (
                    <TableRow key={tx._id}>
                      <TableCell>
                        <div className='text-sm font-medium'>
                          {tx.meta?.order_number
                            ? `#${tx.meta.order_number}`
                            : 'Order credit'}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {tx.meta?.source || 'template-storefront'}
                        </div>
                      </TableCell>
                      {!isVendor && (
                        <TableCell className='text-muted-foreground text-sm'>
                          {vendorLabel || tx.meta?.vendor_id || 'Vendor'}
                        </TableCell>
                      )}
                      <TableCell className='text-muted-foreground text-sm'>
                        {getWebsiteLabel(tx)}
                      </TableCell>
                      <TableCell>
                        <div className='text-sm font-medium'>
                          {tx.meta?.product_name || 'Product'}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {tx.meta?.commission_percent
                            ? `Commission ${tx.meta.commission_percent}%`
                            : 'Wallet entry'}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-sm font-semibold ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {isDebit ? '-' : '+'}
                        {formatMoney(tx.amount)}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {formatMoney(tx.balance_after)}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openDetails(tx)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='max-h-[92vh] w-[min(96vw,960px)] overflow-y-auto rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Transaction details</DialogTitle>
            <DialogDescription>
              Review product, website, commission, and payout details.
            </DialogDescription>
          </DialogHeader>
          {!selectedTx ? (
            <p className='text-muted-foreground text-sm'>
              No transaction selected.
            </p>
          ) : (
            <div className='space-y-5'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='text-muted-foreground text-xs'>Order number</p>
                  <p className='text-sm font-semibold text-slate-900'>
                    {selectedTx.meta?.order_number
                      ? `#${selectedTx.meta.order_number}`
                      : 'Order credit'}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {selectedTx.meta?.source || 'template-storefront'} •{' '}
                    {new Date(selectedTx.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-muted-foreground text-xs'>
                    {selectedTx.direction === 'debit'
                      ? 'Amount debited'
                      : 'Amount credited'}
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      selectedTx.direction === 'debit'
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {selectedTx.direction === 'debit' ? '-' : '+'}
                    {formatMoney(selectedTx.amount)}
                  </p>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                {!isVendor && (
                  <div className='rounded-none border p-3 text-sm'>
                    <p className='text-muted-foreground text-xs'>Vendor</p>
                    <p className='mt-1 font-semibold text-slate-900'>
                      {vendorLabelMap.get(
                        String(selectedTx.meta?.vendor_id || '')
                      ) ||
                        selectedTx.meta?.vendor_id ||
                        'Vendor'}
                    </p>
                  </div>
                )}
                <div className='rounded-none border p-3 text-sm'>
                  <p className='text-muted-foreground text-xs'>Website</p>
                  <p className='mt-1 font-semibold text-slate-900'>
                    {getWebsiteLabel(selectedTx)}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4 rounded-none border border-slate-200 bg-slate-50 p-4'>
                <div className='h-20 w-20 overflow-hidden rounded-none bg-white'>
                  <img
                    src={selectedTx.meta?.image_url || FALLBACK_IMAGE}
                    alt={selectedTx.meta?.product_name || 'Product'}
                    className='h-full w-full object-cover'
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold text-slate-900'>
                    {selectedTx.meta?.product_name || 'Product'}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Qty: {selectedTx.meta?.quantity || 0}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Unit price: {formatMoney(selectedTx.meta?.unit_price)}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Item total: {formatMoney(selectedTx.meta?.total_price)}
                  </p>
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='rounded-none border border-slate-200 p-3 text-sm'>
                  <p className='text-muted-foreground text-xs'>Gross amount</p>
                  <p className='font-semibold text-slate-900'>
                    {formatMoney(selectedTx.meta?.gross_amount)}
                  </p>
                </div>
                <div className='rounded-none border border-slate-200 p-3 text-sm'>
                  <p className='text-muted-foreground text-xs'>Commission</p>
                  <p className='font-semibold text-slate-900'>
                    {selectedTx.meta?.commission_percent ?? 0}% •{' '}
                    {formatMoney(selectedTx.meta?.commission_amount)}
                  </p>
                </div>
                <div className='rounded-none border border-slate-200 p-3 text-sm'>
                  <p className='text-muted-foreground text-xs'>Vendor payout</p>
                  <p className='font-semibold text-slate-900'>
                    {formatMoney(selectedTx.meta?.net_amount)}
                  </p>
                </div>
                <div className='rounded-none border border-slate-200 p-3 text-sm'>
                  <p className='text-muted-foreground text-xs'>Balance after</p>
                  <p className='font-semibold text-slate-900'>
                    {formatMoney(selectedTx.balance_after)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Website wallet statistics'
        description='Summary for the current wallet filters.'
        items={statsItems}
      />
    </>
  )
}
