import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { format } from 'date-fns'
import { HelpCircle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/customer-queries/')({
  component: CustomerQueriesPage,
})

type Reply = {
  senderId: string
  senderModel: 'User' | 'Vendor'
  senderRole: 'Admin' | 'Vendor'
  message: string
  createdAt: string
}

type CustomerQuery = {
  _id: string
  fullName: string
  email: string
  phone?: string
  orderId?: string
  issueType: string
  message: string
  userId: any
  vendorId?: any
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  replies: Reply[]
  createdAt: string
  updatedAt: string
}

function CustomerQueriesPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = user?.role
  const isAdmin = role === 'superadmin' || role === 'admin'

  const [queries, setQueries] = useState<CustomerQuery[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedQuery, setSelectedQuery] = useState<CustomerQuery | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  const loadQueries = async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin
        ? '/users/support/queries/admin/all'
        : '/users/support/queries/vendor/all'

      const response = await api.get(endpoint)
      if (response.data.success) {
        setQueries(response.data.data)
      }
    } catch (error) {
      console.error('Error loading queries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueries()
  }, [])

  const filteredQueries = (queries || []).filter(q => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter
    const matchesSearch = !search ||
      q.fullName.toLowerCase().includes(search.toLowerCase()) ||
      q.email.toLowerCase().includes(search.toLowerCase()) ||
      (q.orderId && q.orderId.toLowerCase().includes(search.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const response = await api.patch(`/users/support/queries/status/${id}`, { status: newStatus })
      if (response.data.success) {
        await loadQueries()
        if (selectedQuery?._id === id) {
          setSelectedQuery({ ...selectedQuery, status: newStatus as any })
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedQuery || !replyText.trim()) return

    setIsSendingReply(true)
    try {
      const response = await api.post(`/users/support/queries/${selectedQuery._id}/reply`, {
        message: replyText
      })

      if (response.data.success) {
        setReplyText('')
        // Update local state instead of full reload for better UX
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

  const getStatusBadge = (status: CustomerQuery['status']) => {
    const map = {
      pending: 'bg-amber-100 text-amber-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-slate-200 text-slate-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div className='flex flex-col gap-6 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Customer Queries</h1>
          <p className='text-sm text-muted-foreground'>
            Review and manage customer complaints and questions.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search...'
            className='w-64'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-40'>
              <SelectValue placeholder='All Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='in-progress'>In Progress</SelectItem>
              <SelectItem value='resolved'>Resolved</SelectItem>
              <SelectItem value='closed'>Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadQueries} disabled={loading} variant='outline'>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[380px_1fr]'>
        {/* Queries List */}
        <Card className='h-[calc(100vh-280px)] overflow-hidden flex flex-col'>
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
                    <span className='font-medium text-sm truncate'>{query.fullName}</span>
                    <Badge variant='outline' className={getStatusBadge(query.status)}>
                      {query.status}
                    </Badge>
                  </div>
                  <div className='text-xs text-muted-foreground mb-2 truncate'>{query.issueType}</div>
                  <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                    <span>{query.createdAt ? format(new Date(query.createdAt), 'MMM dd, yyyy') : ''}</span>
                    {query.orderId && <span>{query.orderId}</span>}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Query Details */}
        <Card className='h-[calc(100vh-280px)] overflow-y-auto'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>
              {selectedQuery ? 'Query Details' : 'Select a query to view details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedQuery ? (
              <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Customer Name</Label>
                      <p className='text-sm font-medium'>{selectedQuery.fullName}</p>
                    </div>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Email Address</Label>
                      <p className='text-sm font-medium'>{selectedQuery.email}</p>
                    </div>
                    {selectedQuery.phone && (
                      <div>
                        <Label className='text-xs text-muted-foreground'>Phone Number</Label>
                        <p className='text-sm font-medium'>{selectedQuery.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Issue Type</Label>
                      <p className='text-sm font-medium'>{selectedQuery.issueType}</p>
                    </div>
                    {selectedQuery.orderId && (
                      <div>
                        <Label className='text-xs text-muted-foreground'>Order ID</Label>
                        <p className='text-sm font-medium'>{selectedQuery.orderId}</p>
                      </div>
                    )}
                    <div>
                      <Label className='text-xs text-muted-foreground'>Submitted On</Label>
                      <p className='text-sm font-medium'>
                        {selectedQuery.createdAt ? format(new Date(selectedQuery.createdAt), 'PPPP p') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='pt-4 border-t'>
                  <Label className='text-xs text-muted-foreground'>Message</Label>
                  <div className='mt-2 p-4 rounded-lg bg-muted/50 text-sm leading-relaxed whitespace-pre-wrap'>
                    {selectedQuery.message}
                  </div>
                </div>

                <div className='pt-6 border-t'>
                  <Label className='text-sm font-medium mb-4 block'>Reply History</Label>
                  <div className='space-y-4 max-h-[300px] overflow-y-auto pr-2'>
                    {selectedQuery.replies && selectedQuery.replies.length > 0 ? (
                      selectedQuery.replies.map((reply, idx) => (
                        <div key={idx} className={`flex flex-col ${reply.senderRole !== 'Vendor' ? 'items-start' : 'items-end'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 text-sm ${reply.senderRole === 'Vendor' ? 'bg-primary text-primary-foreground' : 'bg-blue-100 dark:bg-blue-900'
                            }`}>
                            <p className='font-semibold text-[10px] mb-1 opacity-70'>
                              {reply.senderRole ?? reply.senderModel} • {format(new Date(reply.createdAt), 'MMM dd, p')}
                            </p>
                            {reply.message}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className='text-center text-xs text-muted-foreground py-4'>No replies yet.</p>
                    )}
                  </div>
                </div>

                <div className='pt-6 border-t space-y-4'>
                  <Label htmlFor='reply' className='text-sm font-medium'>Send a Reply</Label>
                  <div className='flex flex-col gap-2'>
                    <textarea
                      id='reply'
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder='Type your response here...'
                      className='min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                    />
                    <div className='flex justify-end'>
                      <Button
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                      >
                        {isSendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='pt-6 border-t flex items-center gap-4'>
                  <div className='space-y-1.5 flex-grow max-w-xs'>
                    <Label htmlFor='status'>Update Status</Label>
                    <Select
                      value={selectedQuery.status}
                      onValueChange={(val) => handleStatusUpdate(selectedQuery._id, val)}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger id='status'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='pending'>Pending</SelectItem>
                        <SelectItem value='in-progress'>In Progress</SelectItem>
                        <SelectItem value='resolved'>Resolved</SelectItem>
                        <SelectItem value='closed'>Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className='h-64 flex flex-col items-center justify-center text-muted-foreground'>
                <HelpCircle className='h-12 w-12 mb-4 opacity-20' />
                <p>Click on a query from the list to see full information</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
