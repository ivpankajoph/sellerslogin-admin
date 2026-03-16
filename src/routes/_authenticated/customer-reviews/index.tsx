import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'
import type { RootState } from '@/store'
import {
  MessageSquare,
  ShieldCheck,
  Star,
  StarOff,
  Store,
  Trash2,
} from 'lucide-react'
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

export const Route = createFileRoute('/_authenticated/customer-reviews/')({
  component: CustomerReviewsPage,
})

type ReviewReply = {
  _id: string
  senderId?: string
  senderRole: 'Admin' | 'Vendor'
  message: string
  createdAt: string
}

type ReviewImage = {
  url: string
  publicId?: string
}

type ProductReview = {
  _id: string
  product_id: { _id: string; name: string; images?: { url: string }[] } | null
  vendor_id?: {
    _id: string
    business_name?: string
    name?: string
    email?: string
  } | null
  user_type: 'customer' | 'template_customer'
  rating: number
  comment: string
  images: ReviewImage[]
  replies: ReviewReply[]
  reviewer: { name: string; email: string; avatar: string }
  createdAt: string
  updatedAt: string
}

const DEFAULT_PAGE_SIZE = 10

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ color: star <= rating ? '#f59e0b' : '#d1d5db' }}
        >
          {star <= rating ? (
            <Star size={size} fill='currentColor' />
          ) : (
            <StarOff size={size} />
          )}
        </span>
      ))}
    </span>
  )
}

function CustomerReviewsPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = user?.role
  const isAdmin = role === 'superadmin' || role === 'admin'

  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(false)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(
    null
  )
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const filtersRef = useRef({ rating: 'all', search: '' })

  const loadReviews = async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin ? '/admin/reviews' : '/vendor/reviews'
      const params: Record<string, string | number> = {
        page,
        limit: DEFAULT_PAGE_SIZE,
      }
      if (ratingFilter !== 'all') params.rating = ratingFilter
      if (debouncedSearch) params.search = debouncedSearch

      const res = await api.get(endpoint, { params })

      if (res.data.success) {
        const payload = res.data
        const pagination = payload.pagination || {}
        const total = Number(pagination.total ?? payload.reviews?.length ?? 0)
        const resolvedTotalPages =
          Number(pagination.totalPages) > 0
            ? Number(pagination.totalPages)
            : Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

        setReviews(payload.reviews || [])
        setTotalItems(Number.isFinite(total) ? total : 0)
        setTotalPages(resolvedTotalPages)

        if (page > resolvedTotalPages) {
          setPage(resolvedTotalPages)
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
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
    const nextFilters = { rating: ratingFilter, search: debouncedSearch }
    const filtersChanged =
      nextFilters.rating !== filtersRef.current.rating ||
      nextFilters.search !== filtersRef.current.search

    if (filtersChanged) {
      filtersRef.current = nextFilters
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    loadReviews()
  }, [page, ratingFilter, debouncedSearch, isAdmin])

  const openDetails = (review: ProductReview) => {
    setSelectedReview(review)
    setReplyText('')
    setDetailsOpen(true)
  }

  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return
    setIsSendingReply(true)
    try {
      const endpoint = isAdmin
        ? `/admin/reviews/${selectedReview._id}/reply`
        : `/vendor/reviews/${selectedReview._id}/reply`

      const res = await api.post(endpoint, { message: replyText.trim() })
      if (res.data.success) {
        setReplyText('')
        const updated: ProductReview = {
          ...res.data.review,
          reviewer: selectedReview.reviewer,
        }
        setReviews((prev) =>
          prev.map((r) => (r._id === updated._id ? updated : r))
        )
        setSelectedReview(updated)
      }
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    setIsDeletingId(id)
    try {
      const res = await api.delete(`/admin/reviews/${id}`)
      if (res.data.success) {
        setReviews((prev) => prev.filter((r) => r._id !== id))
        if (selectedReview?._id === id) setSelectedReview(null)
      }
    } catch (err) {
      console.error('Error deleting review:', err)
    } finally {
      setIsDeletingId(null)
    }
  }

  const ratingColor = (r: number) => {
    if (r >= 4) return 'bg-emerald-100 text-emerald-700'
    if (r === 3) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : '--'
  const awaitingReplyCount = reviews.filter(
    (review) => review.replies.length === 0
  ).length
  const lowRatingCount = reviews.filter((review) => review.rating <= 2).length
  const imageReviewCount = reviews.filter(
    (review) => review.images?.length > 0
  ).length
  const statsItems = [
    {
      label: 'Total Reviews',
      value: totalItems,
      helper: 'Rows returned for the current filters.',
    },
    {
      label: 'Average Rating',
      value: avgRating,
      helper: 'Average across visible reviews.',
    },
    {
      label: '5-Star Reviews',
      value: reviews.filter((review) => review.rating === 5).length,
      helper: 'Visible top-rated reviews.',
    },
    {
      label: 'Awaiting Reply',
      value: awaitingReplyCount,
      helper: 'Visible reviews without a reply.',
    },
    {
      label: 'Low Ratings',
      value: lowRatingCount,
      helper: 'Visible 1-2 star reviews.',
    },
    {
      label: 'Reviews With Images',
      value: imageReviewCount,
      helper: 'Visible reviews that include photos.',
    },
  ]

  return (
    <>
      <TablePageHeader title='Customer Reviews'>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by product name...'
          className='h-10 w-56 shrink-0'
        />
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className='w-36 shrink-0'>
            <SelectValue placeholder='All Ratings' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Ratings</SelectItem>
            <SelectItem value='5'>5 Stars</SelectItem>
            <SelectItem value='4'>4 Stars</SelectItem>
            <SelectItem value='3'>3 Stars</SelectItem>
            <SelectItem value='2'>2 Stars</SelectItem>
            <SelectItem value='1'>1 Star</SelectItem>
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
          onClick={loadReviews}
          disabled={loading}
          variant='outline'
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <TableShell
          className='flex-1'
          title='Recent reviews'
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
                <TableHead className='min-w-[160px]'>Reviewer</TableHead>
                <TableHead className='min-w-[200px]'>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className='min-w-[220px]'>Comment</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead className='min-w-[140px]'>Submitted</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    Loading reviews...
                  </TableCell>
                </TableRow>
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review._id}>
                    <TableCell>
                      <div className='text-sm font-medium'>
                        {review.reviewer.name}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {review.reviewer.email || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className='text-sm'>
                      {review.product_id?.name || 'Unknown product'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`px-1.5 py-0.5 text-[10px] ${ratingColor(review.rating)}`}
                      >
                        {review.rating} / 5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className='text-muted-foreground line-clamp-2 text-xs'>
                        {review.comment || '-'}
                      </p>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {review.replies.length === 0
                        ? 'No reply'
                        : review.replies.length}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {review.createdAt
                        ? format(new Date(review.createdAt), 'MMM dd, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openDetails(review)}
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
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Read the review, reply, and manage the thread.
            </DialogDescription>
          </DialogHeader>
          {selectedReview ? (
            <div className='space-y-6'>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='space-y-4'>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Reviewer
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedReview.reviewer.name}
                    </p>
                    {selectedReview.reviewer.email && (
                      <p className='text-muted-foreground text-xs'>
                        {selectedReview.reviewer.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Type
                    </Label>
                    <Badge
                      variant='outline'
                      className='mt-0.5 block w-fit text-xs'
                    >
                      {selectedReview.user_type === 'template_customer'
                        ? 'Template Customer'
                        : 'Customer'}
                    </Badge>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Submitted
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedReview.createdAt
                        ? format(new Date(selectedReview.createdAt), 'PPPP p')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Product
                    </Label>
                    <p className='text-sm font-medium'>
                      {selectedReview.product_id?.name || 'Unknown'}
                    </p>
                  </div>
                  {selectedReview.vendor_id && (
                    <div>
                      <Label className='text-muted-foreground text-xs'>
                        Vendor
                      </Label>
                      <p className='text-sm font-medium'>
                        {selectedReview.vendor_id.business_name ||
                          selectedReview.vendor_id.name ||
                          'Unknown'}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className='text-muted-foreground text-xs'>
                      Rating
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <StarRating rating={selectedReview.rating} size={18} />
                      <span className='text-sm font-bold text-amber-600'>
                        {selectedReview.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='border-t pt-4'>
                <Label className='text-muted-foreground text-xs'>
                  Review Comment
                </Label>
                <div className='bg-muted/40 mt-2 rounded-none p-4 text-sm leading-relaxed whitespace-pre-wrap'>
                  {selectedReview.comment}
                </div>
              </div>

              {selectedReview.images && selectedReview.images.length > 0 && (
                <div className='border-t pt-4'>
                  <Label className='text-muted-foreground mb-2 block text-xs'>
                    Review Images ({selectedReview.images.length})
                  </Label>
                  <div className='flex flex-wrap gap-2'>
                    {selectedReview.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageUrl(img.url)}
                        className='hover:ring-primary h-20 w-20 overflow-hidden rounded-none border transition-all hover:ring-2 focus:outline-none'
                      >
                        <img
                          src={img.url}
                          alt={`Review image ${idx + 1}`}
                          className='h-full w-full object-cover'
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className='border-t pt-4'>
                <Label className='mb-3 block text-sm font-medium'>
                  Reply History
                  {selectedReview.replies.length > 0 && (
                    <span className='text-muted-foreground ml-2 text-xs font-normal'>
                      ({selectedReview.replies.length})
                    </span>
                  )}
                </Label>

                {selectedReview.replies && selectedReview.replies.length > 0 ? (
                  <div className='max-h-56 space-y-3 overflow-y-auto pr-1'>
                    {selectedReview.replies.map((reply, idx) => (
                      <div key={idx} className='flex items-start gap-3'>
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-none ${
                            reply.senderRole === 'Admin'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {reply.senderRole === 'Admin' ? (
                            <ShieldCheck size={14} />
                          ) : (
                            <Store size={14} />
                          )}
                        </div>
                        <div className='flex-1'>
                          <div className='mb-1 flex items-center gap-2'>
                            <span
                              className={`text-xs font-semibold ${
                                reply.senderRole === 'Admin'
                                  ? 'text-indigo-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {reply.senderRole === 'Admin'
                                ? 'Admin'
                                : 'Vendor'}
                            </span>
                            <span className='text-muted-foreground text-[10px]'>
                              {reply.createdAt
                                ? format(new Date(reply.createdAt), 'MMM dd, p')
                                : ''}
                            </span>
                          </div>
                          <div
                            className={`rounded-none px-3 py-2 text-sm leading-relaxed ${
                              reply.senderRole === 'Admin'
                                ? 'border border-indigo-100 bg-indigo-50 text-indigo-900'
                                : 'border border-blue-100 bg-blue-50 text-blue-900'
                            }`}
                          >
                            {reply.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-muted-foreground flex flex-col items-center justify-center gap-2 py-6'>
                    <MessageSquare size={24} className='opacity-20' />
                    <p className='text-xs'>
                      No replies yet. Be the first to respond.
                    </p>
                  </div>
                )}
              </div>

              <div className='space-y-3 border-t pt-4'>
                <Label
                  htmlFor='reply-input'
                  className='flex items-center gap-2 text-sm font-medium'
                >
                  {isAdmin ? (
                    <>
                      <ShieldCheck size={14} className='text-indigo-600' />
                      Reply as Admin
                    </>
                  ) : (
                    <>
                      <Store size={14} className='text-blue-600' />
                      Reply as Vendor
                    </>
                  )}
                </Label>
                <textarea
                  id='reply-input'
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder='Write a response visible to the customer on the product page...'
                  className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[90px] w-full resize-none rounded-none border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
                />
                <div className='flex items-center justify-between'>
                  {isAdmin && selectedReview ? (
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-red-600 hover:text-red-700'
                      onClick={() => handleDelete(selectedReview._id)}
                      disabled={isDeletingId === selectedReview._id}
                    >
                      <Trash2 size={14} />
                      <span className='ml-1'>Delete Review</span>
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button
                    onClick={handleSendReply}
                    disabled={isSendingReply || !replyText.trim()}
                    className='gap-1.5'
                  >
                    <MessageSquare size={15} />
                    {isSendingReply ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className='text-muted-foreground py-6 text-sm'>
              Select a review to view details.
            </div>
          )}
        </DialogContent>
      </Dialog>
      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Customer review statistics'
        description='Summary for the current review list.'
        items={statsItems}
      />

      {selectedImageUrl && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className='relative max-h-[90vh] max-w-3xl p-2'>
            <img
              src={selectedImageUrl}
              alt='Review image preview'
              className='max-h-[85vh] max-w-full rounded-none object-contain shadow-2xl'
            />
            <button
              className='absolute top-4 right-4 flex h-8 w-8 items-center justify-center bg-black/50 text-lg font-bold text-white hover:bg-black/75'
              onClick={() => setSelectedImageUrl(null)}
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  )
}
