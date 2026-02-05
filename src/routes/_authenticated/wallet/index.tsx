import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

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

export const Route = createFileRoute('/_authenticated/wallet/')({
  component: WalletPage,
})

function WalletPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<AdminWalletResponse['summary'] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await api.get('/wallet/frontend')
      const data = res.data as AdminWalletResponse | VendorWalletResponse
      setSummary(!isVendor ? (data as AdminWalletResponse).summary || null : null)
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

  const formatMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString()}`
  const derivedBalance = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      const amount = Number(tx.amount || 0)
      return tx.direction === 'debit' ? sum - amount : sum + amount
    }, 0)
  }, [transactions])

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
        .some((val) => String(val).toLowerCase().includes(query)),
    )
  }, [search, transactions])

  const selectedTx = useMemo(
    () => filtered.find((tx) => tx._id === selectedId) || null,
    [filtered, selectedId],
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>
            {isVendor ? 'Vendor Wallet' : 'Admin Wallet'}
          </h1>
          <p className='text-sm text-muted-foreground'>
            Track commissions and payout credits from storefront orders.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search order or vendor'
            className='w-64'
          />
          <Button onClick={fetchWallet} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-muted-foreground'>Wallet balance</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold'>
            {formatMoney(derivedBalance)}
          </CardContent>
        </Card>
        {!isVendor && (
          <>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm text-muted-foreground'>Total commission</CardTitle>
              </CardHeader>
              <CardContent className='text-2xl font-semibold'>
                {formatMoney(summary?.commissionTotal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm text-muted-foreground'>Vendor payouts</CardTitle>
              </CardHeader>
              <CardContent className='text-2xl font-semibold'>
                {formatMoney(summary?.vendorPayoutTotal)}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className='grid gap-6 xl:grid-cols-[360px_1fr]'>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle className='text-base'>Transaction history</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <p className='text-sm text-muted-foreground'>Loading transactions...</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className='text-sm text-muted-foreground'>No transactions found.</p>
            )}
            <div className='space-y-3 max-h-[560px] overflow-y-auto pr-2'>
              {filtered.map((tx) => (
                <button
                  key={tx._id}
                  onClick={() => setSelectedId(tx._id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === tx._id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>
                        {tx.meta?.order_number ? `#${tx.meta.order_number}` : 'Order credit'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {tx.meta?.source || 'ophmate-frontend'} •{' '}
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-emerald-600'>
                        +{formatMoney(tx.amount)}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Bal: {formatMoney(tx.balance_after)}
                      </p>
                    </div>
                  </div>
                  <div className='mt-2 text-xs text-muted-foreground'>
                    {tx.meta?.product_name || 'Product'} •{' '}
                    {tx.meta?.commission_percent
                      ? `Commission ${tx.meta.commission_percent}%`
                      : 'Wallet credit'}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Transaction details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTx ? (
              <p className='text-sm text-muted-foreground'>Select a transaction to view details.</p>
            ) : (
              <div className='space-y-5'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Order number</p>
                    <p className='text-sm font-semibold text-slate-900'>
                      {selectedTx.meta?.order_number
                        ? `#${selectedTx.meta.order_number}`
                        : 'Order credit'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {selectedTx.meta?.source || 'ophmate-frontend'} •{' '}
                      {new Date(selectedTx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-muted-foreground'>Amount credited</p>
                    <p className='text-lg font-semibold text-emerald-600'>
                      +{formatMoney(selectedTx.amount)}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='h-20 w-20 overflow-hidden rounded-lg bg-white'>
                    <img
                      src={
                        selectedTx.meta?.image_url ||
                        'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80'
                      }
                      alt={selectedTx.meta?.product_name || 'Product'}
                      className='h-full w-full object-cover'
                    />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold text-slate-900'>
                      {selectedTx.meta?.product_name || 'Product'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Qty: {selectedTx.meta?.quantity || 0}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Unit price: {formatMoney(selectedTx.meta?.unit_price)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Item total: {formatMoney(selectedTx.meta?.total_price)}
                    </p>
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <div className='rounded-lg border border-slate-200 p-3 text-sm'>
                    <p className='text-xs text-muted-foreground'>Gross amount</p>
                    <p className='font-semibold text-slate-900'>
                      {formatMoney(selectedTx.meta?.gross_amount)}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 p-3 text-sm'>
                    <p className='text-xs text-muted-foreground'>Commission</p>
                    <p className='font-semibold text-slate-900'>
                      {selectedTx.meta?.commission_percent ?? 0}% •{' '}
                      {formatMoney(selectedTx.meta?.commission_amount)}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 p-3 text-sm'>
                    <p className='text-xs text-muted-foreground'>Vendor payout</p>
                    <p className='font-semibold text-slate-900'>
                      {formatMoney(selectedTx.meta?.net_amount)}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 p-3 text-sm'>
                    <p className='text-xs text-muted-foreground'>Balance after</p>
                    <p className='font-semibold text-slate-900'>
                      {formatMoney(selectedTx.balance_after)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
