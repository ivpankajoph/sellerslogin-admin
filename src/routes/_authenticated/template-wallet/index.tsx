import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import axios from 'axios'
import { formatINR } from '@/lib/currency'


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

export const Route = createFileRoute('/_authenticated/template-wallet/')({
  component: TemplateWalletPage,
})

function TemplateWalletPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const token = useSelector((state: RootState) => state.auth?.token)
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const vendorId = useMemo(() => authUser?._id || authUser?.id || '', [authUser])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<AdminWalletResponse['summary'] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all')

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await api.get('/wallet/template')
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
        const res = await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendors/getall`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        setVendors(res.data?.vendors || res.data?.data || [])
      } catch {
        setVendors([])
      }
    }
    fetchVendors()
  }, [authUser, isVendor, token, vendorId])

  useEffect(() => {
    const fetchTemplates = async () => {
      if (selectedVendor === 'all') {
        setTemplates([])
        setSelectedTemplate('all')
        return
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`, {
          params: { vendor_id: selectedVendor },
        })
        setTemplates(res.data?.data || [])
      } catch {
        setTemplates([])
      }
    }
    fetchTemplates()
  }, [selectedVendor])

  const formatMoney = (value?: number) => formatINR(value)
  const sourceFiltered = useMemo(
    () =>
      transactions.filter(
        (tx) => String(tx.meta?.source || '') === 'template-storefront'
      ),
    [transactions]
  )

  const vendorFiltered = useMemo(() => {
    if (selectedVendor === 'all') return sourceFiltered
    return sourceFiltered.filter(
      (tx) => String(tx.meta?.vendor_id || '') === selectedVendor
    )
  }, [sourceFiltered, selectedVendor])

  const templateFiltered = useMemo(() => {
    if (selectedTemplate === 'all') return vendorFiltered
    return vendorFiltered.filter((tx) => {
      const templateId = String(tx.meta?.template_id || '')
      const templateKey = String(tx.meta?.template_key || '')
      return templateId === selectedTemplate || templateKey === selectedTemplate
    })
  }, [vendorFiltered, selectedTemplate])

  const filtered = useMemo(() => {
    if (!search.trim()) return templateFiltered
    const query = search.toLowerCase()
    return templateFiltered.filter((tx) =>
      [
        tx.meta?.order_number,
        tx.meta?.vendor_id,
        tx.meta?.source,
        tx.meta?.product_name,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query)),
    )
  }, [search, templateFiltered])

  const selectedTx = useMemo(
    () => filtered.find((tx) => tx._id === selectedId) || null,
    [filtered, selectedId],
  )

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!filtered.some((tx) => tx._id === selectedId)) {
      setSelectedId(filtered[0]._id)
    }
  }, [filtered, selectedId])

  const derivedBalance = useMemo(() => {
    return templateFiltered.reduce((sum, tx) => {
      const amount = Number(tx.amount || 0)
      return tx.direction === 'debit' ? sum - amount : sum + amount
    }, 0)
  }, [templateFiltered])

  const derivedSummary = useMemo(() => {
    if (selectedVendor === 'all' && selectedTemplate === 'all') return summary
    const commissionTotal = templateFiltered.reduce(
      (sum, tx) => sum + Number(tx.meta?.commission_amount || 0),
      0
    )
    const vendorPayoutTotal = templateFiltered.reduce(
      (sum, tx) => sum + Number(tx.meta?.net_amount || 0),
      0
    )
    return { commissionTotal, vendorPayoutTotal }
  }, [selectedVendor, selectedTemplate, summary, templateFiltered])

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
      transactions
        .map((tx) => String(tx.meta?.vendor_id || ''))
        .filter(Boolean)
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
  }, [authUser, isVendor, vendorId, vendors, transactions])

  const templateOptions = useMemo(() => {
    return templates.map((template) => ({
      id: String(template?._id || template?.id || ''),
      key: String(template?.template_key || ''),
      label:
        template?.template_name ||
        template?.name ||
        template?.business_name ||
        template?.template_key ||
        'Template',
    }))
  }, [templates])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Template Wallet</h1>
          <p className='text-sm text-muted-foreground'>
            Track commissions and payouts from vendor template storefront orders.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Select
            value={selectedVendor}
            onValueChange={(value) => {
              setSelectedVendor(value)
              setSelectedTemplate('all')
            }}
            disabled={isVendor}
          >
            <SelectTrigger className='h-10 w-52'>
              <SelectValue placeholder='All vendors' />
            </SelectTrigger>
            <SelectContent>
              {!isVendor && <SelectItem value='all'>All vendors</SelectItem>}
              {vendorOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            disabled={selectedVendor === 'all'}
          >
            <SelectTrigger className='h-10 w-52'>
              <SelectValue placeholder='All templates' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All templates</SelectItem>
              {templateOptions.map((option) => (
                <SelectItem key={option.id || option.key} value={option.id || option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {formatMoney(derivedSummary?.commissionTotal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm text-muted-foreground'>Vendor payouts</CardTitle>
              </CardHeader>
              <CardContent className='text-2xl font-semibold'>
                {formatMoney(derivedSummary?.vendorPayoutTotal)}
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
            {loading && <p className='text-sm text-muted-foreground'>Loading transactions...</p>}
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
                        {tx.meta?.source || 'template-storefront'} •{' '}
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
                      {selectedTx.meta?.source || 'template-storefront'} •{' '}
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
