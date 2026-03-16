import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import axios from 'axios'
import { Loader2, Plus, RefreshCw, Send, Star, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/help-center/')({
  component: HelpCenterPage,
})

type TicketStatus = 'open' | 'in_progress' | 'solved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high'

type VendorSummary = {
  business_name?: string | null
  name?: string | null
  email?: string | null
}

type TicketReview = {
  rating: number
  comment?: string
}

type TicketMessage = {
  sender_role: 'vendor' | 'admin'
  sender_id: string
  message: string
  images?: string[]
  createdAt?: string
}

type Ticket = {
  _id: string
  vendor_id?: VendorSummary | string | null
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  images?: string[]
  messages?: TicketMessage[]
  unread_by_admin?: boolean
  unread_by_vendor?: boolean
  review?: TicketReview
  createdAt?: string
  updatedAt?: string
}

type CreateTicketForm = {
  subject: string
  description: string
  priority: TicketPriority
}

const DEFAULT_PAGE_SIZE = 10

const STATUS_OPTIONS: Array<{ value: 'all' | TicketStatus; label: string }> = [
  { value: 'all', label: 'All status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'solved', label: 'Solved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS: Array<{ value: TicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '')
const PUBLIC_BASE_URL = API_BASE.endsWith('/v1')
  ? API_BASE.replace(/\/v1$/, '')
  : API_BASE
const CLOUDINARY_API_BASE = API_BASE.endsWith('/v1')
  ? API_BASE
  : `${API_BASE}/v1`

const getEmptyCreateForm = (): CreateTicketForm => ({
  subject: '',
  description: '',
  priority: 'medium',
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = data.message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }

    return error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}

const formatStatusLabel = (status: TicketStatus) =>
  status === 'in_progress'
    ? 'In progress'
    : status[0].toUpperCase() + status.slice(1)

const formatPriorityLabel = (priority: TicketPriority) =>
  priority[0].toUpperCase() + priority.slice(1)

const formatTicketDate = (
  value?: string,
  formatString = 'MMM dd, yyyy'
) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return format(parsed, formatString)
}

const isVendorSummary = (
  value: Ticket['vendor_id']
): value is VendorSummary =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getVendorLabel = (value: Ticket['vendor_id']) => {
  if (isVendorSummary(value)) {
    return value.business_name || value.name || value.email || 'N/A'
  }

  return typeof value === 'string' && value.trim() ? value : 'N/A'
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const resolveImageUrl = (value: string) =>
  isAbsoluteUrl(value) ? value : `${PUBLIC_BASE_URL}${value}`

const uploadImagesToCloudinary = async (files: File[], folder: string) => {
  if (!files.length) return []

  const { data } = await axios.get<{
    apiKey: string
    timestamp: number | string
    signature: string
    folder: string
    cloudName: string
  }>(
    `${CLOUDINARY_API_BASE}/cloudinary/signature?folder=${encodeURIComponent(
      folder
    )}`
  )

  const uploads = files.map(async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', data.apiKey)
    formData.append('timestamp', String(data.timestamp))
    formData.append('signature', data.signature)
    formData.append('folder', data.folder)

    const uploadResponse = await axios.post<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`,
      formData
    )

    return uploadResponse.data.secure_url
  })

  return Promise.all(uploads)
}

const getStatusBadgeClassName = (status: TicketStatus) =>
  ({
    open: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
    solved: 'border-blue-200 bg-blue-50 text-blue-700',
    closed: 'border-slate-200 bg-slate-100 text-slate-600',
  })[status]

const getPriorityBadgeClassName = (priority: TicketPriority) =>
  ({
    low: 'border-slate-200 bg-slate-100 text-slate-600',
    medium: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    high: 'border-rose-200 bg-rose-50 text-rose-700',
  })[priority]

function MetaCard({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
      <p className='text-muted-foreground text-xs font-medium'>{label}</p>
      <div className='mt-1 text-sm font-semibold'>{value}</div>
    </div>
  )
}

function ImageGrid({
  images,
  altPrefix,
}: {
  images?: string[]
  altPrefix: string
}) {
  if (!images?.length) return null

  return (
    <div className='mt-3 flex flex-wrap gap-3'>
      {images.map((image, index) => (
        <img
          key={`${image}-${index}`}
          src={resolveImageUrl(image)}
          alt={`${altPrefix} ${index + 1}`}
          className='h-20 w-20 rounded-md border object-cover'
        />
      ))}
    </div>
  )
}

function HelpCenterPage() {
  const role = String(
    useSelector((state: RootState) => state.auth?.user?.role || '')
  ).toLowerCase()
  const isVendor = role === 'vendor'
  const isAdmin = role === 'admin' || role === 'superadmin'

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [statsOpen, setStatsOpen] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateTicketForm>(
    getEmptyCreateForm
  )
  const [createFiles, setCreateFiles] = useState<File[]>([])
  const [creating, setCreating] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [reply, setReply] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [replying, setReplying] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const resetCreateForm = useCallback(() => {
    setCreateForm(getEmptyCreateForm())
    setCreateFiles([])
  }, [])

  const resetDetailsState = useCallback(() => {
    setSelectedTicket(null)
    setSelectedTicketId('')
    setReply('')
    setReplyFiles([])
    setRating(0)
    setReviewComment('')
  }, [])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<{ tickets?: Ticket[] }>('/tickets')
      setTickets(
        Array.isArray(response.data?.tickets) ? response.data.tickets : []
      )
    } catch (loadError) {
      const message = getErrorMessage(loadError, 'Failed to load tickets.')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTicketById = useCallback(async (ticketId: string) => {
    setDetailsLoading(true)

    try {
      const response = await api.get<{ ticket?: Ticket }>(`/tickets/${ticketId}`)
      setSelectedTicket(response.data?.ticket || null)
    } catch (loadError) {
      const message = getErrorMessage(
        loadError,
        'Failed to load ticket details.'
      )
      toast.error(message)
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === 'all' || ticket.status === statusFilter

      if (!matchesStatus) return false
      if (!query) return true

      return [
        ticket._id,
        ticket.subject,
        ticket.description,
        getVendorLabel(ticket.vendor_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [search, statusFilter, tickets])

  useEffect(() => {
    setPage(1)
  }, [pageSize, search, statusFilter])

  const totalPages = Math.max(Math.ceil(filteredTickets.length / pageSize), 1)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, page, pageSize])

  const statsItems = useMemo(
    () => [
      {
        label: 'Visible Tickets',
        value: filteredTickets.length,
        helper: 'Rows matching the current search and status filter.',
      },
      {
        label: 'Open',
        value: filteredTickets.filter((ticket) => ticket.status === 'open').length,
        helper: 'Tickets waiting for active work.',
      },
      {
        label: 'In Progress',
        value: filteredTickets.filter((ticket) => ticket.status === 'in_progress')
          .length,
        helper: 'Tickets currently being handled.',
      },
      {
        label: 'Solved',
        value: filteredTickets.filter((ticket) => ticket.status === 'solved')
          .length,
        helper: 'Tickets already resolved.',
      },
      {
        label: 'Closed',
        value: filteredTickets.filter((ticket) => ticket.status === 'closed')
          .length,
        helper: 'Tickets fully closed.',
      },
      {
        label: 'Unread',
        value: filteredTickets.filter((ticket) =>
          isVendor ? ticket.unread_by_vendor : ticket.unread_by_admin
        ).length,
        helper: 'Threads with unread updates for the current role.',
      },
      {
        label: 'Reply Messages',
        value: filteredTickets.reduce(
          (count, ticket) => count + (ticket.messages?.length || 0),
          0
        ),
        helper: 'Visible replies across the current ticket list.',
      },
    ],
    [filteredTickets, isVendor]
  )

  const openTicketDetails = useCallback(
    (ticket: Ticket) => {
      setSelectedTicket(ticket)
      setSelectedTicketId(ticket._id)
      setDetailsOpen(true)
      setReply('')
      setReplyFiles([])
      setRating(0)
      setReviewComment('')
      void loadTicketById(ticket._id)
    },
    [loadTicketById]
  )

  const handleCreateFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCreateFiles(Array.from(event.target.files || []))
  }

  const handleReplyFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReplyFiles(Array.from(event.target.files || []))
  }

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isVendor) return
    if (!createForm.subject.trim() || !createForm.description.trim()) {
      toast.error('Subject and description are required.')
      return
    }

    setCreating(true)

    try {
      const images = await uploadImagesToCloudinary(
        createFiles,
        'support_tickets'
      )
      const response = await api.post<{ ticket?: Ticket; message?: string }>(
        '/tickets',
        {
          subject: createForm.subject.trim(),
          description: createForm.description.trim(),
          priority: createForm.priority,
          images,
        }
      )

      toast.success(response.data?.message || 'Ticket created.')
      resetCreateForm()
      setCreateOpen(false)
      await loadTickets()

      if (response.data?.ticket) {
        openTicketDetails(response.data.ticket)
      }
    } catch (createError) {
      toast.error(getErrorMessage(createError, 'Failed to create ticket.'))
    } finally {
      setCreating(false)
    }
  }

  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) {
      toast.error('Reply message is required.')
      return
    }

    setReplying(true)

    try {
      const images = await uploadImagesToCloudinary(
        replyFiles,
        'support_tickets'
      )
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        message: reply.trim(),
        images,
      })

      toast.success('Reply sent.')
      setReply('')
      setReplyFiles([])
      await Promise.all([loadTicketById(selectedTicket._id), loadTickets()])
    } catch (replyError) {
      toast.error(getErrorMessage(replyError, 'Failed to send reply.'))
    } finally {
      setReplying(false)
    }
  }

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    if (!selectedTicket) return

    setUpdatingStatus(true)

    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: nextStatus,
      })

      toast.success('Ticket status updated.')
      await Promise.all([loadTicketById(selectedTicket._id), loadTickets()])
    } catch (statusError) {
      toast.error(getErrorMessage(statusError, 'Failed to update ticket status.'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTicket || isVendor) return

    const confirmed = window.confirm(
      'Delete this ticket? This action cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)

    try {
      await api.delete(`/tickets/${selectedTicket._id}`)
      toast.success('Ticket deleted.')
      setDetailsOpen(false)
      resetDetailsState()
      await loadTickets()
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete ticket.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleReview = async () => {
    if (!selectedTicket) return
    if (rating < 1) {
      toast.error('Select a rating before submitting your review.')
      return
    }

    setReviewing(true)

    try {
      await api.post(`/tickets/${selectedTicket._id}/review`, {
        rating,
        comment: reviewComment.trim(),
      })

      toast.success('Review submitted.')
      setRating(0)
      setReviewComment('')
      await Promise.all([loadTicketById(selectedTicket._id), loadTickets()])
    } catch (reviewError) {
      toast.error(getErrorMessage(reviewError, 'Failed to submit review.'))
    } finally {
      setReviewing(false)
    }
  }

  const tableColSpan = isAdmin ? 7 : 6

  return (
    <>
      <TablePageHeader
        title='Help Center'
        stacked
        actionsClassName='gap-2'
        showHeaderChrome={false}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search subject, ticket ID, or vendor'
          className='h-10 w-[320px] shrink-0'
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | TicketStatus)}
        >
          <SelectTrigger className='h-10 w-[180px] shrink-0'>
            <SelectValue placeholder='All status' />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          variant='outline'
          className='h-10 shrink-0'
          onClick={() => void loadTickets()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='mr-2 h-4 w-4' />
          )}
          Refresh
        </Button>
        {isVendor ? (
          <Button
            className='h-10 shrink-0'
            onClick={() => {
              resetCreateForm()
              setCreateOpen(true)
            }}
          >
            <Plus className='mr-2 h-4 w-4' />
            Create Ticket
          </Button>
        ) : null}
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        <TableShell
          className='flex-1'
          description=''
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredTickets.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[260px]'>Subject</TableHead>
                {!isVendor ? (
                  <TableHead className='min-w-[180px]'>Vendor</TableHead>
                ) : null}
                <TableHead className='min-w-[120px]'>Status</TableHead>
                <TableHead className='min-w-[120px]'>Priority</TableHead>
                <TableHead className='min-w-[100px]'>Replies</TableHead>
                <TableHead className='min-w-[150px]'>Updated</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className='h-24 text-center'>
                    Loading tickets...
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={tableColSpan}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTickets.map((ticket) => {
                  const isUnread = isVendor
                    ? ticket.unread_by_vendor
                    : ticket.unread_by_admin

                  return (
                    <TableRow
                      key={ticket._id}
                      className={cn(
                        selectedTicketId === ticket._id &&
                          detailsOpen &&
                          'bg-muted/30'
                      )}
                    >
                      <TableCell>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <div className='truncate text-sm font-medium'>
                              {ticket.subject || 'Untitled ticket'}
                            </div>
                            <div className='text-muted-foreground mt-1 text-xs'>
                              Ticket ID: {ticket._id}
                            </div>
                            <div className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                              {ticket.description || 'No description provided.'}
                            </div>
                          </div>
                          {isUnread ? (
                            <span className='mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500' />
                          ) : null}
                        </div>
                      </TableCell>
                      {!isVendor ? (
                        <TableCell className='text-sm text-slate-700'>
                          {getVendorLabel(ticket.vendor_id)}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={cn(
                            'rounded-md',
                            getStatusBadgeClassName(ticket.status)
                          )}
                        >
                          {formatStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={cn(
                            'rounded-md',
                            getPriorityBadgeClassName(ticket.priority)
                          )}
                        >
                          {formatPriorityLabel(ticket.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-sm text-slate-700'>
                        {ticket.messages?.length || 0}
                      </TableCell>
                      <TableCell className='text-sm text-slate-600'>
                        {formatTicketDate(
                          ticket.updatedAt || ticket.createdAt,
                          'MMM dd, yyyy'
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openTicketDetails(ticket)}
                        >
                          Open
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

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            resetCreateForm()
          }
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-2xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>Create Ticket</SheetTitle>
            <SheetDescription>
              Submit a support request with subject, priority, description, and
              optional screenshots.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleCreateTicket}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='flex-1 overflow-y-auto px-5 py-5'>
              <div className='grid gap-3 sm:grid-cols-2'>
                <MetaCard
                  label='Priority'
                  value={formatPriorityLabel(createForm.priority)}
                />
                <MetaCard
                  label='Attachments'
                  value={`${createFiles.length} selected`}
                />
              </div>

              <div className='mt-5 space-y-4'>
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Subject</p>
                  <Input
                    value={createForm.subject}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    placeholder='Short summary of the issue'
                    className='h-11'
                  />
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Priority</p>
                  <Select
                    value={createForm.priority}
                    onValueChange={(value) =>
                      setCreateForm((current) => ({
                        ...current,
                        priority: value as TicketPriority,
                      }))
                    }
                  >
                    <SelectTrigger className='h-11'>
                      <SelectValue placeholder='Select priority' />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Description</p>
                  <Textarea
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder='Describe the issue, expected result, and what you already tried.'
                    className='min-h-36'
                  />
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Attachments</p>
                  <Input
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleCreateFilesChange}
                    className='h-11'
                  />
                  <p className='text-muted-foreground text-xs'>
                    Upload screenshots or reference images if needed.
                  </p>
                </div>
              </div>
            </div>

            <SheetFooter className='border-t px-5 py-4 sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={creating}>
                {creating ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : null}
                {creating ? 'Creating...' : 'Create Ticket'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            resetDetailsState()
          }
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-3xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>{selectedTicket?.subject || 'Ticket details'}</SheetTitle>
            <SheetDescription>
              Review the ticket thread, attachments, and follow-up actions.
            </SheetDescription>
          </SheetHeader>

          {selectedTicket ? (
            <div className='flex-1 overflow-y-auto px-5 py-5'>
              {detailsLoading ? (
                <div className='mb-4 flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Refreshing ticket details...
                </div>
              ) : null}

              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <MetaCard
                  label='Status'
                  value={
                    <Badge
                      variant='outline'
                      className={cn(
                        'rounded-md',
                        getStatusBadgeClassName(selectedTicket.status)
                      )}
                    >
                      {formatStatusLabel(selectedTicket.status)}
                    </Badge>
                  }
                />
                <MetaCard
                  label='Priority'
                  value={
                    <Badge
                      variant='outline'
                      className={cn(
                        'rounded-md',
                        getPriorityBadgeClassName(selectedTicket.priority)
                      )}
                    >
                      {formatPriorityLabel(selectedTicket.priority)}
                    </Badge>
                  }
                />
                <MetaCard
                  label='Created'
                  value={formatTicketDate(
                    selectedTicket.createdAt,
                    'MMM dd, yyyy p'
                  )}
                />
                <MetaCard
                  label='Updated'
                  value={formatTicketDate(
                    selectedTicket.updatedAt,
                    'MMM dd, yyyy p'
                  )}
                />
                {!isVendor ? (
                  <MetaCard
                    label='Vendor'
                    value={getVendorLabel(selectedTicket.vendor_id)}
                  />
                ) : null}
              </div>

              {!isVendor ? (
                <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                  <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                    <div>
                      <h3 className='text-sm font-semibold'>Admin actions</h3>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        Update the current ticket status or remove the ticket.
                      </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(value) =>
                          void handleStatusChange(value as TicketStatus)
                        }
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className='h-10 w-[180px]'>
                          <SelectValue placeholder='Update status' />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.filter(
                            (option) => option.value !== 'all'
                          ).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant='destructive'
                        onClick={() => void handleDelete()}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                          <Trash2 className='mr-2 h-4 w-4' />
                        )}
                        Delete Ticket
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                <h3 className='text-sm font-semibold'>Original ticket</h3>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Ticket ID: {selectedTicket._id}
                </p>
                <div className='bg-muted/20 mt-4 rounded-md border p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap'>
                  {selectedTicket.description || 'No description provided.'}
                </div>
                <ImageGrid
                  images={selectedTicket.images}
                  altPrefix='Ticket attachment'
                />
              </section>

              <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-sm font-semibold'>Conversation</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      Follow-up messages between vendor and admin.
                    </p>
                  </div>
                  <Badge variant='outline' className='rounded-md'>
                    {selectedTicket.messages?.length || 0} replies
                  </Badge>
                </div>

                {selectedTicket.messages?.length ? (
                  <div className='space-y-3'>
                    {selectedTicket.messages.map((message, index) => (
                      <div
                        key={`${message.sender_role}-${index}`}
                        className={cn(
                          'rounded-md border p-4',
                          message.sender_role === 'admin'
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-emerald-200 bg-emerald-50/50'
                        )}
                      >
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <span className='text-xs font-semibold uppercase tracking-[0.14em] text-slate-600'>
                            {message.sender_role === 'admin' ? 'Admin' : 'Vendor'}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            {formatTicketDate(
                              message.createdAt,
                              'MMM dd, yyyy p'
                            )}
                          </span>
                        </div>
                        <p className='mt-3 text-sm leading-6 whitespace-pre-wrap'>
                          {message.message}
                        </p>
                        <ImageGrid
                          images={message.images}
                          altPrefix='Reply attachment'
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground text-sm'>
                    No replies yet.
                  </p>
                )}
              </section>

              <section className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                <h3 className='text-sm font-semibold'>Send reply</h3>
                <div className='mt-4 space-y-3'>
                  <Textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder='Write your message here...'
                    className='min-h-32'
                  />
                  <Input
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleReplyFilesChange}
                    className='h-11'
                  />
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <p className='text-muted-foreground text-xs'>
                      {replyFiles.length
                        ? `${replyFiles.length} attachment(s) selected`
                        : 'Attach screenshots if needed.'}
                    </p>
                    <Button onClick={() => void handleReply()} disabled={replying}>
                      {replying ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : (
                        <Send className='mr-2 h-4 w-4' />
                      )}
                      {replying ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              </section>

              {isVendor &&
              ['solved', 'closed'].includes(selectedTicket.status) &&
              !selectedTicket.review ? (
                <section className='mt-5 rounded-md border border-amber-200 bg-amber-50/50 p-4 shadow-sm'>
                  <h3 className='text-sm font-semibold'>Rate support</h3>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    Share your experience once the issue is resolved.
                  </p>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        type='button'
                        variant={rating >= value ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setRating(value)}
                      >
                        <Star className='mr-1 h-3.5 w-3.5' />
                        {value}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder='Share your feedback (optional)'
                    className='mt-4 min-h-28'
                  />
                  <div className='mt-4 flex justify-end'>
                    <Button onClick={() => void handleReview()} disabled={reviewing}>
                      {reviewing ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : null}
                      Submit Review
                    </Button>
                  </div>
                </section>
              ) : null}

              {selectedTicket.review ? (
                <section className='mt-5 rounded-md border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm'>
                  <h3 className='text-sm font-semibold'>Submitted review</h3>
                  <p className='mt-2 text-sm font-medium'>
                    Rating: {selectedTicket.review.rating}/5
                  </p>
                  {selectedTicket.review.comment ? (
                    <p className='text-muted-foreground mt-2 text-sm leading-6 whitespace-pre-wrap'>
                      {selectedTicket.review.comment}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : (
            <div className='flex flex-1 items-center justify-center px-5 py-10 text-sm text-muted-foreground'>
              Select a ticket to view the conversation.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Help center statistics'
        description='Summary for the current ticket list and filters.'
        items={statsItems}
      />
    </>
  )
}
