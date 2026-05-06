import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
    source?: string
    notes?: string
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

export const Route = createFileRoute('/_authenticated/wallet/')({
  component: WalletPage,
})

function WalletPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<AdminWalletResponse['summary'] | null>(
    null
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await api.get('/wallet/frontend')
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
  }, [])

  const formatMoney = (value?: number) => formatINR(value)

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions
    const query = search.toLowerCase()
    return transactions.filter((tx) =>
      [
        tx.meta?.order_number,
        tx.meta?.vendor_id,
        tx.meta?.source,
        tx.meta?.product_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [search, transactions])

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1)
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

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

  const downloadCSV = () => {
    if (!filtered.length) return

    const headers = ['Order', 'Vendor/Source', 'Product', 'Commission', 'Amount', 'Type', 'Balance After', 'Date']
    const rows = filtered.map(tx => {
      const order = tx.meta?.order_number || 'Order credit'
      const source = tx.meta?.vendor_id || tx.meta?.source || 'Wallet entry'
      const product = tx.meta?.product_name || 'Product'
      const comm = tx.meta?.commission_percent ? `${tx.meta.commission_percent}%` : ''
      const amount = tx.amount
      const type = tx.direction
      const bal = tx.balance_after
      const date = new Date(tx.createdAt).toLocaleString()
      
      return [order, source, product, comm, amount, type, bal, date]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wallet_transactions_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const statsItems = [
    {
      label: 'Wallet Balance',
      value: formatMoney(derivedBalance),
      helper: 'Current computed wallet balance.',
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
      value: formatMoney(summary?.commissionTotal),
      helper: 'Commission total returned by the wallet summary.',
    },
    {
      label: 'Vendor Payouts',
      value: formatMoney(summary?.vendorPayoutTotal),
      helper: 'Payout total returned by the wallet summary.',
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
      <TablePageHeader title={isVendor ? 'Vendor Wallet' : 'Admin Wallet'}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search order or product'
          className='h-10 w-64 shrink-0'
        />
        <Button
          variant='outline'
          className='shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          variant='outline'
          className='shrink-0'
          onClick={downloadCSV}
          disabled={!filtered.length}
        >
          Export CSV
        </Button>
        <Button className='shrink-0' onClick={fetchWallet} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
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
                <TableHead className='min-w-[220px]'>Product</TableHead>
                <TableHead className='min-w-[160px]'>Source</TableHead>
                <TableHead className='min-w-[140px]'>Amount</TableHead>
                <TableHead className='min-w-[140px]'>Balance After</TableHead>
                <TableHead className='min-w-[160px]'>Created</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isDebit = tx.direction === 'debit'
                  return (
                    <TableRow key={tx._id}>
                      <TableCell>
                        <div className='text-sm font-medium'>
                          {tx.meta?.order_number
                            ? `#${tx.meta.order_number}`
                            : 'Order credit'}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {tx.meta?.vendor_id || 'Wallet entry'}
                        </div>
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
                      <TableCell className='text-muted-foreground text-sm'>
                        {tx.meta?.source || 'ophmate-frontend'}
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
              Review product, commission, and payout details.
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
                  <p className='text-muted-foreground text-xs'>
                    {selectedTx.meta?.source === 'wallet-topup' ? 'Transaction type' : 'Order number'}
                  </p>
                  <p className='text-sm font-semibold text-slate-900'>
                    {selectedTx.meta?.source === 'wallet-topup' 
                      ? 'Wallet Top-up'
                      : selectedTx.meta?.order_number
                      ? `#${selectedTx.meta.order_number}`
                      : 'Order credit'}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {selectedTx.meta?.source || 'ophmate-frontend'} •{' '}
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

              {selectedTx.meta?.source === 'wallet-topup' ? (
                <div className='space-y-4'>
                  <div className='rounded-none border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm font-semibold text-slate-900 mb-2'>Top-up Details</p>
                    <p className='text-sm text-slate-700 whitespace-pre-line'>
                      {selectedTx.meta?.notes || 'Processed via Razorpay Checkout'}
                    </p>
                  </div>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='rounded-none border border-slate-200 p-3 text-sm'>
                      <p className='text-muted-foreground text-xs'>Payment Method</p>
                      <p className='font-semibold text-slate-900'>Razorpay (Online)</p>
                    </div>
                    <div className='rounded-none border border-slate-200 p-3 text-sm'>
                      <p className='text-muted-foreground text-xs'>Balance after</p>
                      <p className='font-semibold text-slate-900'>
                        {formatMoney(selectedTx.balance_after)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedTx.meta?.source?.includes('shipment') ? (
                <div className='space-y-4'>
                  <div className='rounded-none border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm font-semibold text-slate-900 mb-2'>Shipment Details</p>
                    <p className='text-sm text-slate-700'>
                      {selectedTx.meta?.product_name || 'Courier Label'}
                    </p>
                  </div>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='rounded-none border border-slate-200 p-3 text-sm'>
                      <p className='text-muted-foreground text-xs'>Courier Fee</p>
                      <p className='font-semibold text-slate-900'>
                        {formatMoney(selectedTx.meta?.total_price || selectedTx.amount)}
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
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title={
          isVendor ? 'Vendor wallet statistics' : 'Admin wallet statistics'
        }
        description='Summary for the current wallet view.'
        items={statsItems}
      />
    </>
  )
}
