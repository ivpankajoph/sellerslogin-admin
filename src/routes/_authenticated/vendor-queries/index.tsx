import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/vendor-queries/')({
  component: VendorQueriesPage,
})

type Reply = {
  senderId: string
  senderModel: 'User' | 'Vendor'
  senderRole: 'admin' | 'Vendor'
  message: string
  createdAt: string
}

type VendorQuery = {
  _id: string
  fullName: string
  email: string
  phone?: string
  issueType: string
  source?: 'vendor_onboarding'
  message: string
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  replies: Reply[]
  createdAt: string
  updatedAt: string
}

function VendorQueriesPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const roleKey = String(user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  const isAdmin = roleKey === 'admin' || roleKey === 'superadmin'

  const [queries, setQueries] = useState<VendorQuery[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedQuery, setSelectedQuery] = useState<VendorQuery | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  const loadQueries = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const response = await api.get('/support/queries/admin/vendor-onboarding')
      if (response.data.success) {
        setQueries(response.data.data)
      }
    } catch (error) {
      console.error('Error loading vendor queries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueries()
  }, [])

  const filteredQueries = (queries || []).filter(q => {
    const matchesSearch = !search ||
      q.fullName.toLowerCase().includes(search.toLowerCase()) ||
      q.email.toLowerCase().includes(search.toLowerCase()) ||
      q.issueType.toLowerCase().includes(search.toLowerCase()) ||
      q.message.toLowerCase().includes(search.toLowerCase()) ||
      (q.phone && q.phone.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch
  })

  const handleSendReply = async () => {
    if (!selectedQuery || !replyText.trim()) return

    setIsSendingReply(true)
    try {
      const response = await api.post(
        `/support/queries/admin/vendor-onboarding/${selectedQuery._id}/reply`,
        { message: replyText }
      )

      if (response.data.success) {
        setReplyText('')
        const updatedQuery = response.data.data
        setQueries(prev => prev.map(q => q._id === updatedQuery._id ? updatedQuery : q))
        setSelectedQuery(updatedQuery)
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsSendingReply(false)
    }
  }

  const getStatusBadge = (status: VendorQuery['status']) => {
    const map = {
      pending: 'bg-amber-100 text-amber-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-slate-200 text-slate-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  if (!isAdmin) {
    return (
      <div className='p-6'>
        <h1 className='text-2xl font-semibold text-slate-900'>Vendor Queries</h1>
        <p className='text-sm text-muted-foreground mt-2'>
          This section is available to Admins only.
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Vendor Queries</h1>
          <p className='text-sm text-muted-foreground'>
            Review vendor onboarding questions and reply directly to the vendor.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search...'
            className='w-64'
          />
          <Button onClick={loadQueries} disabled={loading} variant='outline'>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[380px_1fr]'>
        <Card className='h-[calc(100vh-260px)] overflow-hidden flex flex-col'>
          <CardHeader className='py-4'>
            <CardTitle className='text-base font-medium'>Recent Queries</CardTitle>
          </CardHeader>
          <CardContent className='overflow-y-auto p-4 space-y-3 flex-grow pt-0'>
            {loading && queries.length === 0 ? (
              <p className='text-center text-sm py-10'>Loading queries...</p>
            ) : filteredQueries.length === 0 ? (
              <p className='text-center text-sm py-10 text-muted-foreground'>No queries found.</p>
            ) : (
              filteredQueries.map((query) => (
                <button
                  key={query._id}
                  onClick={() => setSelectedQuery(query)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedQuery?._id === query._id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <div className='flex justify-between items-start mb-1'>
                    <div className='flex flex-col'>
                      <span className='font-medium text-sm truncate'>{query.fullName}</span>
                      <span className='text-xs text-muted-foreground truncate max-w-[160px]'>
                        {query.email}
                      </span>
                    </div>
                    <Badge variant='outline' className={getStatusBadge(query.status)}>
                      {query.status}
                    </Badge>
                  </div>
                  <div className='text-xs text-muted-foreground mb-2 truncate'>
                    {query.issueType}
                  </div>
                  <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                    <span>{query.createdAt ? format(new Date(query.createdAt), 'MMM dd, yyyy') : ''}</span>
                    {query.phone && <span>{query.phone}</span>}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='h-[calc(100vh-260px)] overflow-y-auto'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>
              {selectedQuery ? 'Query Details' : 'Select a query to view details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedQuery ? (
              <div className='space-y-6'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Full Name</Label>
                    <p className='text-sm font-medium text-slate-900'>{selectedQuery.fullName}</p>
                  </div>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Email</Label>
                    <p className='text-sm font-medium text-slate-900'>{selectedQuery.email}</p>
                  </div>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Phone</Label>
                    <p className='text-sm font-medium text-slate-900'>{selectedQuery.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Topic</Label>
                    <p className='text-sm font-medium text-slate-900'>{selectedQuery.issueType}</p>
                  </div>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Submitted</Label>
                    <p className='text-sm font-medium text-slate-900'>
                      {selectedQuery.createdAt
                        ? format(new Date(selectedQuery.createdAt), 'MMM dd, yyyy | hh:mm a')
                        : ''}
                    </p>
                  </div>
                  <div>
                    <Label className='text-xs text-muted-foreground'>Status</Label>
                    <Badge variant='outline' className={getStatusBadge(selectedQuery.status)}>
                      {selectedQuery.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className='text-xs text-muted-foreground'>Message</Label>
                  <p className='text-sm text-slate-800 mt-1 whitespace-pre-wrap'>
                    {selectedQuery.message}
                  </p>
                </div>

                <div>
                  <Label className='text-xs text-muted-foreground'>Replies</Label>
                  <div className='mt-2 space-y-3'>
                    {selectedQuery.replies?.length ? (
                      selectedQuery.replies.map((reply) => (
                        <div key={reply.createdAt} className='rounded-lg border p-3'>
                          <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                            <span>{reply.senderRole}</span>
                            <span>
                              {reply.createdAt
                                ? format(new Date(reply.createdAt), 'MMM dd, yyyy | hh:mm a')
                                : ''}
                            </span>
                          </div>
                          <p className='text-sm text-slate-800 whitespace-pre-wrap'>{reply.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground'>No replies yet.</p>
                    )}
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-muted-foreground'>Reply</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder='Type your reply...'
                    rows={4}
                  />
                  <Button onClick={handleSendReply} disabled={isSendingReply}>
                    {isSendingReply ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                Select a vendor query to view details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
