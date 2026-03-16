import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'
import type { RootState } from '@/store'
import { useSelector } from 'react-redux'
import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  productId?: { _id: string; productName?: string; slug?: string }
  issueType: string
  source?: 'support' | 'product_enquiry'
  message: string
  userId: any
  vendorId?: any
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  replies: Reply[]
  createdAt: string
  updatedAt: string
}

const DEFAULT_PAGE_SIZE = 10

function CustomerQueriesPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = user?.role
  const isAdmin = role === 'superadmin' || role === 'admin'

  const [queries, setQueries] = useState<CustomerQuery[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedQuery, setSelectedQuery] = useState<CustomerQuery | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const filtersRef = useRef({ status: 'all', search: '' })

  const loadQueries = async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin
        ? '/users/support/queries/admin/all'
        : '/users/support/queries/vendor/all'

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(DEFAULT_PAGE_SIZE))
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      const response = await api.get(`${endpoint}?${params.toString()}`)
      if (response.data.success) {
        const payload = response.data
        const pagination = payload.pagination || {}
        const total = Number(pagination.total ?? payload.data?.length ?? 0)
        const resolvedTotalPages =
          Number(pagination.totalPages) > 0
            ? Number(pagination.totalPages)
            : Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

        setQueries(payload.data || [])
        setTotalItems(Number.isFinite(total) ? total : 0)
        setTotalPages(resolvedTotalPages)

        if (page > resolvedTotalPages) {
          setPage(resolvedTotalPages)
        }
      }
    } catch (error) {
      console.error('Error loading queries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const nextFilters = { status: statusFilter, search: debouncedSearch }
    const filtersChanged =
      nextFilters.status !== filtersRef.current.status ||
      nextFilters.search !== filtersRef.current.search

    if (filtersChanged) {
      filtersRef.current = nextFilters
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    loadQueries()
  }, [page, statusFilter, debouncedSearch])

  const openDetails = (query: CustomerQuery) => {
    setSelectedQuery(query)
    setReplyText('')
    setDetailsOpen(true)
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const response = await api.patch(`/users/support/queries/status/${id}`, {
        status: newStatus,
      })
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
      const response = await api.post(
        `/users/support/queries/${selectedQuery._id}/reply`,
        {
          message: replyText,
        }
      )

      if (response.data.success) {
        setReplyText('')
        const updatedQuery = response.data.data
        setQueries((prev) =>
          prev.map((q) => (q._id === updatedQuery._id ? updatedQuery : q))
        )
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

  const supportQueries = queries.filter(
    (query) => query.source !== 'product_enquiry'
  ).length
  const productEnquiries = queries.filter(
    (query) => query.source === 'product_enquiry'
  ).length
  const statsItems = [
    {
      label: 'Total Queries',
      value: totalItems,
      helper: 'Rows returned for the current filters.',
    },
    {
      label: 'Pending',
      value: queries.filter((query) => query.status === 'pending').length,
      helper: 'Visible rows awaiting action.',
    },
    {
      label: 'In Progress',
      value: queries.filter((query) => query.status === 'in-progress').length,
      helper: 'Visible rows being handled.',
    },
    {
      label: 'Resolved',
      value: queries.filter((query) => query.status === 'resolved').length,
      helper: 'Visible rows already resolved.',
    },
    {
      label: 'Closed',
      value: queries.filter((query) => query.status === 'closed').length,
      helper: 'Visible rows closed out.',
    },
    {
      label: 'Support Queries',
      value: supportQueries,
      helper: 'Visible customer support tickets.',
    },
    {
      label: 'Product Enquiries',
      value: productEnquiries,
      helper: 'Visible product enquiry threads.',
    },
  ]

  return (
    <>
      <TablePageHeader title='Customer Queries'>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search...'
          className='h-10 w-56 shrink-0'
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-36 shrink-0'>
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
        <Button
          variant='outline'
          className='shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          className='shrink-0'
          onClick={loadQueries}
          disabled={loading}
          variant='outline'
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <TableShell
          className='flex-1'
      
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[160px]'>Customer</TableHead>
                <TableHead className='min-w-[180px]'>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='min-w-[140px]'>Submitted</TableHead>
                <TableHead className='min-w-[140px]'>Order / Product</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && queries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center'>
                    Loading queries...
                  </TableCell>
                </TableRow>
              ) : queries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No queries found.
                  </TableCell>
                </TableRow>
              ) : (
                queries.map((query) => (
                  <TableRow key={query._id}>
                    <TableCell>
                      <div className='text-sm font-medium'>
                        {query.fullName}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {query.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>{query.issueType}</div>
                      {query.source === 'product_enquiry' && (
                        <div className='text-muted-foreground text-xs'>
                          Product enquiry
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={getStatusBadge(query.status)}
                      >
                        {query.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {query.createdAt
                        ? format(new Date(query.createdAt), 'MMM dd, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {query.orderId ? (
                        <span>Order: {query.orderId}</span>
                      ) : query.productId?.productName ? (
                        <span>Product: {query.productId.productName}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openDetails(query)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='max-h-[90vh] w-[min(96vw,900px)] overflow-y-auto rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Query Details</DialogTitle>
            <DialogDescription>
              Review the full message, replies, and update status.
            </DialogDescription>
          </DialogHeader>
          {selectedQuery ? (
            <div className='space-y-6'>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='space-y-4'>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Customer Name
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedQuery.fullName}
                    </p>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Email Address
                    </Label>
                    <p className='text-sm font-medium'>{selectedQuery.email}</p>
                  </div>
                  {selectedQuery.productId && (
                    <div>
                      <Label className='text-muted-foreground text-xs'>
                        Product
                      </Label>
                      <p className='text-sm font-medium'>
                        {selectedQuery.productId.productName}
                      </p>
                    </div>
                  )}
                  {selectedQuery.phone && (
                    <div>
                      <Label className='text-muted-foreground text-xs'>
                        Phone Number
                      </Label>
                      <p className='text-sm font-medium'>
                        {selectedQuery.phone}
                      </p>
                    </div>
                  )}
                </div>
                <div className='space-y-4'>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Issue Type
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedQuery.issueType}
                    </p>
                  </div>
                  {selectedQuery.orderId && (
                    <div>
                      <Label className='text-muted-foreground text-xs'>
                        Order ID
                      </Label>
                      <p className='text-sm font-medium'>
                        {selectedQuery.orderId}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Submitted On
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedQuery.createdAt
                        ? format(new Date(selectedQuery.createdAt), 'PPPP p')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className='border-t pt-4'>
                <Label className='text-muted-foreground text-xs'>Message</Label>
                <div className='bg-muted/50 mt-2 rounded-none p-4 text-sm leading-relaxed whitespace-pre-wrap'>
                  {selectedQuery.message}
                </div>
              </div>

              <div className='border-t pt-6'>
                <Label className='mb-4 block text-sm font-medium'>
                  Reply History
                </Label>
                <div className='max-h-[300px] space-y-4 overflow-y-auto pr-2'>
                  {selectedQuery.replies && selectedQuery.replies.length > 0 ? (
                    selectedQuery.replies.map((reply, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${reply.senderRole !== 'Vendor' ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-none p-3 text-sm ${
                            reply.senderRole === 'Vendor'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-blue-100 dark:bg-blue-900'
                          }`}
                        >
                          <p className='mb-1 text-[10px] font-semibold opacity-70'>
                            {reply.senderRole ?? reply.senderModel} |{' '}
                            {format(new Date(reply.createdAt), 'MMM dd, p')}
                          </p>
                          {reply.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className='text-muted-foreground py-4 text-center text-xs'>
                      No replies yet.
                    </p>
                  )}
                </div>
              </div>

              <div className='space-y-4 border-t pt-6'>
                <Label htmlFor='reply' className='text-sm font-medium'>
                  Send a Reply
                </Label>
                <div className='flex flex-col gap-2'>
                  <textarea
                    id='reply'
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder='Type your response here...'
                    className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[100px] w-full rounded-none border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
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

              <div className='flex items-center gap-4 border-t pt-6'>
                <div className='max-w-xs flex-grow space-y-1.5'>
                  <Label htmlFor='status'>Update Status</Label>
                  <Select
                    value={selectedQuery.status}
                    onValueChange={(val) =>
                      handleStatusUpdate(selectedQuery._id, val)
                    }
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
            <div className='text-muted-foreground py-6 text-sm'>
              Select a query to view details.
            </div>
          )}
        </DialogContent>
      </Dialog>
      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Customer query statistics'
        description='Summary for the current query list.'
        items={statsItems}
      />
    </>
  )
}
