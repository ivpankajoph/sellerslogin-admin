import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { VITE_PUBLIC_API_URL } from '@/config'

export const Route = createFileRoute('/_authenticated/help-center/')({
  component: HelpCenterPage,
})

type TicketMessage = {
  sender_role: 'vendor' | 'admin'
  sender_id: string
  message: string
  images?: string[]
  createdAt?: string
}

type Ticket = {
  _id: string
  vendor_id: any
  subject: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'solved' | 'closed'
  images?: string[]
  messages?: TicketMessage[]
  unread_by_admin?: boolean
  unread_by_vendor?: boolean
  review?: { rating: number; comment?: string }
  createdAt?: string
  updatedAt?: string
}

function HelpCenterPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [createFiles, setCreateFiles] = useState<File[]>([])

  const [reply, setReply] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')

  const loadTickets = async () => {
    try {
      setLoading(true)
      const res = await api.get('/tickets', {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search || undefined,
        },
      })
      setTickets(res.data?.tickets || [])
    } finally {
      setLoading(false)
    }
  }

  const loadTicketById = async (id: string) => {
    const res = await api.get(`/tickets/${id}`)
    setSelectedTicket(res.data?.ticket || null)
  }

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    const first = tickets[0]
    if (!selectedId && first?._id) {
      setSelectedId(first._id)
      loadTicketById(first._id)
    }
  }, [tickets, selectedId])

  const filteredTickets = useMemo(() => {
    if (!search.trim()) return tickets
    const query = search.toLowerCase()
    return tickets.filter((ticket) =>
      [ticket._id, ticket.subject, ticket.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [tickets, search])

  const baseUrl =
    VITE_PUBLIC_API_URL && VITE_PUBLIC_API_URL.endsWith('/v1')
      ? VITE_PUBLIC_API_URL.replace(/\/v1$/, '')
      : VITE_PUBLIC_API_URL || ''

  const cloudinaryBase =
    VITE_PUBLIC_API_URL && VITE_PUBLIC_API_URL.endsWith('/v1')
      ? VITE_PUBLIC_API_URL
      : `${VITE_PUBLIC_API_URL}/v1`

  const isAbsoluteUrl = (value: string) =>
    /^https?:\/\//i.test(value)

  const resolveImageUrl = (value: string) =>
    isAbsoluteUrl(value) ? value : `${baseUrl}${value}`

  const uploadImagesToCloudinary = async (files: File[], folder: string) => {
    if (!files.length) return []
    const { data } = await axios.get(
      `${cloudinaryBase}/cloudinary/signature?folder=${encodeURIComponent(
        folder
      )}`
    )

    const uploads = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', data.apiKey)
      formData.append('timestamp', data.timestamp)
      formData.append('signature', data.signature)
      formData.append('folder', data.folder)
      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`,
        formData
      )
      return uploadRes.data.secure_url as string
    })

    return Promise.all(uploads)
  }

  const getStatusBadge = (status: Ticket['status']) => {
    const map = {
      open: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-amber-100 text-amber-700',
      solved: 'bg-blue-100 text-blue-700',
      closed: 'bg-slate-200 text-slate-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityBadge = (value: Ticket['priority']) => {
    const map = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-indigo-100 text-indigo-700',
      high: 'bg-rose-100 text-rose-700',
    }
    return map[value] || 'bg-slate-100 text-slate-600'
  }

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) return
    try {
      setSaving(true)
      const images = await uploadImagesToCloudinary(
        createFiles,
        'support_tickets'
      )
      await api.post('/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        images,
      })
      setSubject('')
      setDescription('')
      setPriority('medium')
      setCreateFiles([])
      await loadTickets()
    } finally {
      setSaving(false)
    }
  }

  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) return
    try {
      setSaving(true)
      const images = await uploadImagesToCloudinary(
        replyFiles,
        'support_tickets'
      )
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        message: reply.trim(),
        images,
      })
      setReply('')
      setReplyFiles([])
      await loadTicketById(selectedTicket._id)
      await loadTickets()
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return
    await api.patch(`/tickets/${selectedTicket._id}/status`, { status })
    await loadTicketById(selectedTicket._id)
    await loadTickets()
  }

  const handleReview = async () => {
    if (!selectedTicket || rating < 1) return
    await api.post(`/tickets/${selectedTicket._id}/review`, {
      rating,
      comment: reviewComment,
    })
    setRating(0)
    setReviewComment('')
    await loadTicketById(selectedTicket._id)
    await loadTickets()
  }

  const handleDelete = async () => {
    if (!selectedTicket || isVendor) return
    const confirmDelete = window.confirm(
      "Delete this ticket? This action cannot be undone."
    )
    if (!confirmDelete) return
    try {
      setDeleting(true)
      await api.delete(`/tickets/${selectedTicket._id}`)
      setSelectedTicket(null)
      setSelectedId(null)
      await loadTickets()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Help Center</h1>
          <p className='text-sm text-muted-foreground'>
            Create support tickets and chat with the admin team.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search tickets'
            className='w-60'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='h-10 w-44'>
              <SelectValue placeholder='All status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All status</SelectItem>
              <SelectItem value='open'>Open</SelectItem>
              <SelectItem value='in_progress'>In progress</SelectItem>
              <SelectItem value='solved'>Solved</SelectItem>
              <SelectItem value='closed'>Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadTickets} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {isVendor && (
        <Card className='border-amber-100 bg-amber-50/40'>
          <CardHeader>
            <CardTitle className='text-base'>Create a ticket</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-[2fr_1fr]'>
            <div className='space-y-3'>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder='Subject'
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Describe your issue...'
              />
              <div className='flex flex-wrap items-center gap-3'>
                <input
                  type='file'
                  multiple
                  accept='image/*'
                  onChange={(e) =>
                    setCreateFiles(Array.from(e.target.files || []))
                  }
                />
                {createFiles.length > 0 && (
                  <span className='text-xs text-muted-foreground'>
                    {createFiles.length} files selected
                  </span>
                )}
              </div>
            </div>
            <div className='space-y-3'>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder='Priority' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className='grid gap-6 xl:grid-cols-[320px_1fr]'>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle className='text-base'>Tickets</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {filteredTickets.length === 0 && (
              <p className='text-sm text-muted-foreground'>No tickets found.</p>
            )}
            {filteredTickets.map((ticket) => {
              const isUnread = isVendor
                ? ticket.unread_by_vendor
                : ticket.unread_by_admin
              const vendorLabel =
                !isVendor && ticket.vendor_id
                  ? ticket.vendor_id.business_name ||
                    ticket.vendor_id.name ||
                    ticket.vendor_id.email
                  : null
              return (
                <button
                  key={ticket._id}
                  onClick={async () => {
                    setSelectedId(ticket._id)
                    await loadTicketById(ticket._id)
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === ticket._id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold text-slate-900'>
                      {ticket.subject}
                    </p>
                    {isUnread && (
                      <span className='h-2 w-2 rounded-full bg-rose-500' />
                    )}
                  </div>
                  <p className='mt-1 text-[11px] text-slate-500'>
                    Ticket ID: {ticket._id}
                  </p>
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <Badge className={getStatusBadge(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityBadge(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground line-clamp-2'>
                    {ticket.description}
                  </p>
                  {vendorLabel && (
                    <p className='mt-1 text-xs text-slate-500'>
                      Vendor: {vendorLabel}
                    </p>
                  )}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Ticket details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTicket ? (
              <p className='text-sm text-muted-foreground'>
                Select a ticket to view details.
              </p>
            ) : (
              <div className='space-y-5'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Subject</p>
                    <p className='text-sm font-semibold text-slate-900'>
                      {selectedTicket.subject}
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      Ticket ID: {selectedTicket._id}
                    </p>
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      <Badge className={getStatusBadge(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityBadge(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    {!isVendor && selectedTicket.vendor_id && (
                      <p className='mt-2 text-xs text-slate-500'>
                        Vendor:{' '}
                        {selectedTicket.vendor_id.business_name ||
                          selectedTicket.vendor_id.name ||
                          selectedTicket.vendor_id.email}
                      </p>
                    )}
                  </div>
                  {!isVendor && (
                    <div className='flex flex-wrap items-center gap-2'>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className='w-44'>
                          <SelectValue placeholder='Update status' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='open'>Open</SelectItem>
                          <SelectItem value='in_progress'>In progress</SelectItem>
                          <SelectItem value='solved'>Solved</SelectItem>
                          <SelectItem value='closed'>Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete ticket'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className='rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm'>
                  {selectedTicket.description}
                </div>

                {selectedTicket.images && selectedTicket.images.length > 0 && (
                  <div className='flex flex-wrap gap-3'>
                    {selectedTicket.images.map((img) => (
                      <img
                        key={img}
                        src={resolveImageUrl(img)}
                        alt='ticket'
                        className='h-20 w-20 rounded-lg border object-cover'
                      />
                    ))}
                  </div>
                )}

                <div className='space-y-3'>
                  <p className='text-sm font-semibold'>Conversation</p>
                  <div className='space-y-3'>
                    {(selectedTicket.messages || []).map((msg, index) => (
                      <div
                        key={`${msg.sender_role}-${index}`}
                        className={`rounded-lg border p-3 ${
                          msg.sender_role === 'admin'
                            ? 'border-blue-200 bg-blue-50/40'
                            : 'border-emerald-200 bg-emerald-50/40'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                            {msg.sender_role === 'admin' ? 'Admin' : 'Vendor'}
                          </span>
                        </div>
                        <p className='mt-2 text-sm'>{msg.message}</p>
                        {msg.images && msg.images.length > 0 && (
                          <div className='mt-3 flex flex-wrap gap-3'>
                            {msg.images.map((img) => (
                              <img
                                key={img}
                                src={resolveImageUrl(img)}
                                alt='attachment'
                                className='h-16 w-16 rounded-md border object-cover'
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className='space-y-3'>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder='Write a reply...'
                  />
                  <div className='flex flex-wrap items-center gap-3'>
                    <input
                      type='file'
                      multiple
                      accept='image/*'
                      onChange={(e) =>
                        setReplyFiles(Array.from(e.target.files || []))
                      }
                    />
                    {replyFiles.length > 0 && (
                      <span className='text-xs text-muted-foreground'>
                        {replyFiles.length} files selected
                      </span>
                    )}
                  </div>
                  <Button onClick={handleReply} disabled={saving}>
                    {saving ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>

                {isVendor &&
                  ['solved', 'closed'].includes(selectedTicket.status) &&
                  !selectedTicket.review && (
                    <div className='rounded-lg border border-amber-200 bg-amber-50/40 p-4'>
                      <p className='text-sm font-semibold'>Rate the support</p>
                      <div className='mt-2 flex items-center gap-2'>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type='button'
                            onClick={() => setRating(value)}
                            className={`h-8 w-8 rounded-full border text-sm font-semibold ${
                              rating >= value
                                ? 'border-amber-400 bg-amber-400 text-white'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder='Share your experience (optional)'
                        className='mt-3'
                      />
                      <Button className='mt-3' onClick={handleReview}>
                        Submit Review
                      </Button>
                    </div>
                  )}

                {selectedTicket.review && (
                  <div className='rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 text-sm'>
                    <p className='font-semibold'>Review</p>
                    <p className='mt-1'>Rating: {selectedTicket.review.rating}/5</p>
                    {selectedTicket.review.comment && (
                      <p className='text-muted-foreground mt-1'>
                        {selectedTicket.review.comment}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
