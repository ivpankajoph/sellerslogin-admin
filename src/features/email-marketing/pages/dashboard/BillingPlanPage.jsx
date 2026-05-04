import { useContext, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, RefreshCw, WalletCards } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { api } from '../../lib/api.js'

const numberFormat = new Intl.NumberFormat('en-IN')

const formatNumber = (value = 0) => numberFormat.format(value || 0)

const formatCurrency = (value = 0, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value || 0)

const formatRateCurrency = (value = 0, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
    style: 'currency',
  }).format(value || 0)

const formatDate = (value) => {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Checkout is available only in browser'))
      return
    }

    if (window.Razorpay) {
      resolve(window.Razorpay)
      return
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Razorpay), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'))
    document.body.appendChild(script)
  })

function CreditPackCard({ busyPackId, isCurrentPack, isLastPurchased, onCheckout, pack }) {
  const isBusy = busyPackId === pack._id
  const effectiveRate = pack.effectiveRate ?? Number(pack.price || 0) / Number(pack.credits || 1)
  const packBadgeLabel = isLastPurchased ? 'Last purchased' : isCurrentPack ? 'Current pack' : ''

  return (
    <article
      className={`relative flex min-h-[340px] flex-col overflow-hidden border bg-white p-5 transition ${
        isCurrentPack
          ? 'border-[#7c3aed] shadow-[0_10px_24px_rgba(124,58,237,0.10)]'
          : 'border-[#ded7ef] hover:border-[#bdaee2] hover:shadow-[0_8px_20px_rgba(80,62,110,0.07)]'
      }`}
    >
      {isCurrentPack ? <div className="absolute inset-x-0 top-0 h-1 bg-[#7c3aed]" /> : null}
      <div className="flex min-h-[74px] items-start justify-between gap-3">
        <div className="min-w-0">
          {packBadgeLabel ? (
            <span className="mb-2 inline-flex items-center gap-1 bg-[#f0eaff] px-2 py-1 text-[11px] font-semibold text-[#5b21b6]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {packBadgeLabel}
            </span>
          ) : null}
          <h3 className="text-[18px] font-semibold leading-tight text-[#21192d]">{pack.name}</h3>
          <p className="mt-1 text-sm text-[#7b7592]">{formatNumber(pack.credits)} email credits</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#eee9f8] bg-[#fbf9ff] text-[#8338ec]">
          <WalletCards className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-6 border-y border-[#eee9f8] py-5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">Pack price</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-[#21192d]">{formatCurrency(pack.price, pack.currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">Per email</p>
            <p className="mt-1 text-[15px] font-semibold text-[#5a4380]">{formatRateCurrency(effectiveRate, pack.currency)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 bg-[#fbf9ff] px-3 py-3 text-sm">
        <span className="text-[#7b7592]">Best for</span>
        <span className="text-right text-[13px] font-semibold text-[#21192d]">
          {Number(pack.credits || 0) >= 100000 ? 'high volume sends' : 'regular campaigns'} 
        </span>
      </div>

      <button
        type="button"
        disabled={Boolean(busyPackId)}
        onClick={() => onCheckout(pack)}
        className={`mt-auto w-full border px-4 py-3 text-sm font-semibold hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 ${
          isCurrentPack
            ? 'border-[#21192d] bg-[#21192d] text-white'
            : 'border-[#8338ec] bg-[#8338ec] text-white'
        }`}
      >
        {isBusy ? 'Opening...' : isCurrentPack ? 'Buy again' : 'Buy credits'}
      </button>
    </article>
  )
}

function BillingPlanPage() {
  const toast = useContext(ToastContext)
  const [snapshot, setSnapshot] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyPackId, setBusyPackId] = useState('')
  const [invoiceBusyKey, setInvoiceBusyKey] = useState('')

  const loadBilling = async () => {
    setIsLoading(true)
    try {
      const [creditsResponse, invoicesResponse] = await Promise.all([
        api.get('/billing/me/credits'),
        api.get('/billing/me/invoices'),
      ])

      setSnapshot(creditsResponse.data)
      setInvoices(invoicesResponse.data.invoices || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load credit wallet')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBilling()
  }, [])

  const startCheckout = async (selectedPack) => {
    setBusyPackId(selectedPack._id)

    try {
      const Razorpay = await loadRazorpayCheckout()
      const { data } = await api.post('/billing/razorpay/credit-orders', {
        packId: selectedPack._id,
      })

      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'SellersLogin Email Marketing',
        description: `${data.pack.name} - email credits`,
        order_id: data.order.id,
        prefill: data.prefill,
        theme: {
          color: '#8338ec',
        },
        handler: async (response) => {
          try {
            await api.post('/billing/razorpay/credit-verify', response)
            toast.success('Payment verified. Credits added to your wallet.')
            await loadBilling()
          } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to verify payment')
          } finally {
            setBusyPackId('')
          }
        },
        modal: {
          ondismiss: () => {
            setBusyPackId('')
          },
        },
      })

      checkout.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setBusyPackId('')
      })

      checkout.open()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to start payment')
      setBusyPackId('')
    }
  }

  const downloadInvoice = async (invoice) => {
    const key = `${invoice._id}:download`
    setInvoiceBusyKey(key)

    try {
      const response = await api.get(`/billing/me/invoices/${invoice._id}/download`, {
        responseType: 'blob',
      })
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = `SellersLogin-${invoice.invoiceNumber}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to download invoice')
    } finally {
      setInvoiceBusyKey('')
    }
  }

  const wallet = snapshot?.wallet || {}
  const controls = snapshot?.controls || {}
  const usage = snapshot?.usage || {}
  const transactions = snapshot?.recentTransactions || []
  const packs = snapshot?.packs || []
  const lastPurchasedPack = snapshot?.lastPurchasedPack || null
  const lastPurchasedPackId = lastPurchasedPack?.packId ? String(lastPurchasedPack.packId) : ''
  const inferredCurrentPack = useMemo(() => {
    if (!packs.length) {
      return null
    }

    if (lastPurchasedPackId) {
      return packs.find((pack) => String(pack._id) === lastPurchasedPackId) || null
    }

    const availableCredits = Number(wallet.availableCredits || 0)
    if (!availableCredits) {
      return null
    }

    return packs.find((pack) => Number(pack.credits || 0) === availableCredits) || null
  }, [lastPurchasedPackId, packs, wallet.availableCredits])
  const currentPackId = inferredCurrentPack?._id ? String(inferredCurrentPack._id) : ''
  const currentPackName = lastPurchasedPack?.packName || inferredCurrentPack?.name || ''

  const alert = useMemo(() => {
    if (!snapshot) {
      return null
    }

    if (wallet.isFrozen || wallet.sendingFrozen) {
      return {
        tone: 'danger',
        title: 'Sending is currently frozen',
        message: 'Please contact support before starting campaigns or automations.',
      }
    }

    if (usage.isLowBalance) {
      return {
        tone: 'warning',
        title: 'Low credit balance',
        message: 'Buy credits before your next campaign to avoid send interruptions.',
      }
    }

    return {
      tone: 'success',
      title: 'Wallet is ready',
      message: 'Credits are available and campaign sending can continue.',
    }
  }, [snapshot, usage.isLowBalance, wallet.isFrozen, wallet.sendingFrozen])

  if (isLoading && !snapshot) {
    return (
      <div className="shell-card-strong p-8 text-center text-sm font-semibold text-[#7b7592]">
        Loading billing and credit details...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Billing / Credits"
          description="1 credit = 1 email sent to 1 contact. Pay only for what you send."
        />
        <button
          type="button"
          onClick={loadBilling}
          className="inline-flex items-center gap-2 border border-[#ded7ef] bg-white px-4 py-3 text-sm font-semibold text-[#5a4380]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {alert ? (
        <section
          className={`border px-5 py-4 ${
            alert.tone === 'danger'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : alert.tone === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-1 text-sm">{alert.message}</p>
        </section>
      ) : null}

      <section className="dashboard-grid md:grid-cols-3">
        <StatCard
          label="Available Credits"
          value={formatNumber(wallet.availableCredits)}
          hint={currentPackName ? `Current pack: ${currentPackName}` : 'Ready for campaigns'}
        />
        <StatCard label="Reserved Credits" value={formatNumber(wallet.reservedCredits)} hint="Locked for active sends" accent="info" />
        <StatCard label="Used This Month" value={formatNumber(usage.creditsUsedThisMonth)} hint="Credits deducted after send" accent="warning" />
      </section>

      <section className="shell-card-strong p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Credit Rule</p>
            <p className="mt-1 text-sm font-semibold text-[#21192d]">1 credit = 1 email sent to 1 contact</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Deduction</p>
            <p className="mt-1 text-sm font-semibold text-[#21192d]">Credits are deducted only for emails submitted for sending</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Limits</p>
            <p className="mt-1 text-sm font-semibold text-[#21192d]">
              {formatNumber(usage.dailyRemaining)} daily sends left / {formatNumber(controls.maxRecipientsPerCampaign)} max recipients
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-[20px] font-semibold text-[#21192d]">Buy Email Credits</h3>
            <p className="mt-1 text-sm text-[#7b7592]">Choose a credit pack and complete payment through Razorpay.</p>
          </div>
          {currentPackName ? (
            <div className="border border-[#ded7ef] bg-white px-4 py-3 text-sm text-[#7b7592]">
              <span className="font-semibold text-[#21192d]">Current pack:</span> {currentPackName}
              {lastPurchasedPack?.purchasedAt ? ` bought on ${formatDate(lastPurchasedPack.purchasedAt)}` : ''}
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {packs.map((item) => (
            <CreditPackCard
              key={item._id}
              busyPackId={busyPackId}
              isCurrentPack={currentPackId === String(item._id)}
              isLastPurchased={lastPurchasedPackId === String(item._id)}
              onCheckout={startCheckout}
              pack={item}
            />
          ))}
        </div>
      </section>

      <section className="shell-card-strong overflow-hidden">
        <div className="border-b border-[#eee9f8] px-5 py-4">
          <h3 className="text-[18px] font-semibold text-[#21192d]">Recent Credit Transactions</h3>
        </div>
        {transactions.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fbf9ff] text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Credits</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="px-5 py-4 text-[#7b7592]">{formatDate(transaction.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{transaction.type.replaceAll('_', ' ')}</td>
                    <td className="px-5 py-4 text-[#7b7592]">{formatNumber(transaction.credits)}</td>
                    <td className="px-5 py-4 text-[#7b7592]">
                      {transaction.amount ? formatCurrency(transaction.amount, transaction.currency) : '-'}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{formatNumber(transaction.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-[#7b7592]">Credit transactions will appear after purchases or sends.</div>
        )}
      </section>

      <section className="shell-card-strong overflow-hidden">
        <div className="border-b border-[#eee9f8] px-5 py-4">
          <h3 className="text-[18px] font-semibold text-[#21192d]">Invoices</h3>
        </div>
        {invoices.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fbf9ff] text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">GST</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{invoice.invoiceNumber}</td>
                    <td className="px-5 py-4 text-[#7b7592]">{formatCurrency(invoice.gstAmount, invoice.currency)}</td>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{formatCurrency(invoice.total, invoice.currency)}</td>
                    <td className="px-5 py-4 text-[#7b7592]">{invoice.status}</td>
                    <td className="px-5 py-4 text-[#7b7592]">{formatDate(invoice.issuedAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        title="Download invoice"
                        disabled={Boolean(invoiceBusyKey)}
                        onClick={() => downloadInvoice(invoice)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-[#8338ec] bg-[#8338ec] text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-[#7b7592]">Invoices will appear after a credit purchase is completed.</div>
        )}
      </section>
    </div>
  )
}

export default BillingPlanPage
