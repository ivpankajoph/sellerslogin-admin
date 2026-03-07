import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
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
import { Star, StarOff, MessageSquare, Trash2, RefreshCw, ShieldCheck, Store } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/customer-reviews/')({
  component: CustomerReviewsPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

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
  vendor_id?: { _id: string; business_name?: string; name?: string; email?: string } | null
  user_type: 'customer' | 'template_customer'
  rating: number
  comment: string
  images: ReviewImage[]
  replies: ReviewReply[]
  reviewer: { name: string; email: string; avatar: string }
  createdAt: string
  updatedAt: string
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ color: star <= rating ? '#f59e0b' : '#d1d5db' }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function CustomerReviewsPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = user?.role
  const isAdmin = role === 'superadmin' || role === 'admin'

  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  // ── Fetch reviews ─────────────────────────────────────────────────────────────

  const loadReviews = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = { page, limit: 20 }
        if (ratingFilter !== 'all') params.rating = ratingFilter
        if (search.trim()) params.search = search.trim()

        const endpoint = isAdmin ? '/admin/reviews' : '/vendor/reviews'
        const res = await api.get(endpoint, { params })

        if (res.data.success) {
          setReviews(res.data.reviews || [])
          // ensure pagination includes current page when backend doesn't return it
          setPagination((prev) => ({
            ...prev,
            ...(res.data.pagination || {}),
            page,
          }))
        }

      } catch (err) {
        console.error('Error loading reviews:', err)
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, ratingFilter, search],
  )

  useEffect(() => {
    loadReviews(1)
  }, [loadReviews])

  // ── Reply ─────────────────────────────────────────────────────────────────────

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
        setReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)))
        setSelectedReview(updated)
      }
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setIsSendingReply(false)
    }
  }

  // ── Delete (admin only) ───────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className='flex flex-col gap-6 p-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900 dark:text-slate-100'>
            Customer Reviews
          </h1>
          <p className='text-sm text-muted-foreground'>
            {isAdmin
              ? 'View and reply to all customer product reviews.'
              : 'View and reply to reviews on your products.'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {isAdmin && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(searchInput)
              }}
              className='flex gap-1'
            >
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='Search by product name…'
                className='w-56'
              />
              <Button type='submit' variant='outline' size='sm'>
                Search
              </Button>
            </form>
          )}

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className='w-36'>
              <SelectValue placeholder='All Ratings' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Ratings</SelectItem>
              <SelectItem value='5'>★★★★★ 5 Stars</SelectItem>
              <SelectItem value='4'>★★★★ 4 Stars</SelectItem>
              <SelectItem value='3'>★★★ 3 Stars</SelectItem>
              <SelectItem value='2'>★★ 2 Stars</SelectItem>
              <SelectItem value='1'>★ 1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => loadReviews(1)}
            disabled={loading}
            variant='outline'
            size='icon'
            title='Refresh'
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        {[
          { label: 'Total Reviews', value: pagination.total },
          {
            label: 'Avg Rating',
            value:
              reviews.length > 0
                ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                : '—',
          },
          { label: '5-Star Reviews', value: reviews.filter((r) => r.rating === 5).length },
          {
            label: 'Awaiting Reply',
            value: reviews.filter((r) => r.replies.length === 0).length,
          },
        ].map(({ label, value }) => (
          <Card key={label} className='py-3'>
            <CardContent className='px-4 py-0'>
              <p className='text-xs text-muted-foreground mb-1'>{label}</p>
              <p className='text-2xl font-bold tracking-tight'>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-Panel Layout */}
      <div className='grid gap-6 lg:grid-cols-[380px_1fr]'>
        {/* Left: Review List */}
        <Card className='h-[calc(100vh-340px)] overflow-hidden flex flex-col'>
          <CardHeader className='py-3 px-4 border-b'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {reviews.length} review{reviews.length !== 1 ? 's' : ''} shown
            </CardTitle>
          </CardHeader>
          <CardContent className='overflow-y-auto p-3 space-y-2 flex-grow pt-3'>
            {loading && reviews.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-48 text-muted-foreground gap-2'>
                <RefreshCw size={28} className='animate-spin opacity-30' />
                <p className='text-sm'>Loading reviews…</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground'>
                <Star size={36} className='opacity-20' />
                <p className='text-sm'>No reviews found.</p>
              </div>
            ) : (
              reviews.map((review) => (
                <button
                  key={review._id}
                  onClick={() => {
                    setSelectedReview(review)
                    setReplyText('')
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedReview?._id === review._id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                >
                  <div className='flex justify-between items-start mb-1'>
                    <span className='font-medium text-sm truncate max-w-[140px]'>
                      {review.reviewer.name}
                    </span>
                    <Badge
                      variant='outline'
                      className={`text-[10px] px-1.5 py-0.5 ${ratingColor(review.rating)}`}
                    >
                      ★ {review.rating}
                    </Badge>
                  </div>
                  <p className='text-xs text-muted-foreground truncate mb-1'>
                    {review.product_id?.name || 'Unknown product'}
                  </p>
                  <p className='text-xs text-foreground/70 line-clamp-2 mb-2 leading-relaxed'>
                    {review.comment}
                  </p>
                  <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                    <span>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</span>
                    <span>
                      {review.replies.length === 0 ? (
                        <span className='text-amber-600 font-medium'>• No reply yet</span>
                      ) : (
                        <span className='text-emerald-600 font-medium'>
                          ✓ {review.replies.length} repl{review.replies.length > 1 ? 'ies' : 'y'}
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className='border-t px-4 py-2 flex items-center justify-between gap-2'>
              <Button
                size='sm'
                variant='ghost'
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadReviews(pagination.page - 1)}
                className='text-xs'
              >
                ← Prev
              </Button>
              <span className='text-xs text-muted-foreground'>
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                size='sm'
                variant='ghost'
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadReviews(pagination.page + 1)}
                className='text-xs'
              >
                Next →
              </Button>
            </div>
          )}
        </Card>

        {/* Right: Review Detail */}
        <Card className='h-[calc(100vh-340px)] overflow-y-auto'>
          {selectedReview ? (
            <>
              <CardHeader className='border-b sticky top-0 bg-card z-10 py-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <CardTitle className='text-base font-semibold mb-1'>
                      Review by {selectedReview.reviewer.name}
                    </CardTitle>
                    <div className='flex items-center gap-3 flex-wrap'>
                      <StarRating rating={selectedReview.rating} size={15} />
                      <span className='text-xs text-muted-foreground'>
                        {format(new Date(selectedReview.createdAt), 'PPPP')}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0'
                      onClick={() => handleDelete(selectedReview._id)}
                      disabled={isDeletingId === selectedReview._id}
                      title='Delete review'
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className='space-y-6 pt-6'>
                {/* Info Grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                  <div className='space-y-3'>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Reviewer</Label>
                      <p className='text-sm font-medium mt-0.5'>{selectedReview.reviewer.name}</p>
                      {selectedReview.reviewer.email && (
                        <p className='text-xs text-muted-foreground'>
                          {selectedReview.reviewer.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Type</Label>
                      <Badge variant='outline' className='mt-0.5 text-xs block w-fit'>
                        {selectedReview.user_type === 'template_customer'
                          ? 'Template Customer'
                          : 'Customer'}
                      </Badge>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <div>
                      <Label className='text-xs text-muted-foreground'>Product</Label>
                      <p className='text-sm font-medium mt-0.5'>
                        {selectedReview.product_id?.name || 'Unknown'}
                      </p>
                    </div>
                    {selectedReview.vendor_id && (
                      <div>
                        <Label className='text-xs text-muted-foreground'>Vendor</Label>
                        <p className='text-sm font-medium mt-0.5'>
                          {selectedReview.vendor_id.business_name ||
                            selectedReview.vendor_id.name ||
                            'Unknown'}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className='text-xs text-muted-foreground'>Rating</Label>
                      <div className='mt-1 flex items-center gap-2'>
                        <StarRating rating={selectedReview.rating} size={18} />
                        <span className='text-sm font-bold text-amber-600'>
                          {selectedReview.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                <div className='border-t pt-4'>
                  <Label className='text-xs text-muted-foreground'>Review Comment</Label>
                  <div className='mt-2 p-4 rounded-lg bg-muted/40 text-sm leading-relaxed whitespace-pre-wrap'>
                    {selectedReview.comment}
                  </div>
                </div>

                {/* Review Images */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div className='border-t pt-4'>
                    <Label className='text-xs text-muted-foreground mb-2 block'>
                      Review Images ({selectedReview.images.length})
                    </Label>
                    <div className='flex flex-wrap gap-2'>
                      {selectedReview.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageUrl(img.url)}
                          className='w-20 h-20 rounded-md border overflow-hidden hover:ring-2 hover:ring-primary transition-all focus:outline-none'
                        >
                          <img
                            src={img.url}
                            alt={`Review image ${idx + 1}`}
                            className='w-full h-full object-cover'
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply History */}
                <div className='border-t pt-4'>
                  <Label className='text-sm font-medium mb-3 block'>
                    Reply History
                    {selectedReview.replies.length > 0 && (
                      <span className='ml-2 text-xs text-muted-foreground font-normal'>
                        ({selectedReview.replies.length})
                      </span>
                    )}
                  </Label>

                  {selectedReview.replies && selectedReview.replies.length > 0 ? (
                    <div className='space-y-3 max-h-56 overflow-y-auto pr-1'>
                      {selectedReview.replies.map((reply, idx) => (
                        <div key={idx} className='flex items-start gap-3'>
                          {/* Avatar icon */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${reply.senderRole === 'Admin'
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
                            <div className='flex items-center gap-2 mb-1'>
                              <span
                                className={`text-xs font-semibold ${reply.senderRole === 'Admin'
                                  ? 'text-indigo-700'
                                  : 'text-blue-700'
                                  }`}
                              >
                                {reply.senderRole === 'Admin' ? 'Admin' : 'Vendor'}
                              </span>
                              <span className='text-[10px] text-muted-foreground'>
                                {reply.createdAt
                                  ? format(new Date(reply.createdAt), 'MMM dd, p')
                                  : ''}
                              </span>
                            </div>
                            <div
                              className={`text-sm rounded-lg px-3 py-2 leading-relaxed ${reply.senderRole === 'Admin'
                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100'
                                : 'bg-blue-50 text-blue-900 border border-blue-100'
                                }`}
                            >
                              {reply.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center py-6 text-muted-foreground gap-2'>
                      <MessageSquare size={24} className='opacity-20' />
                      <p className='text-xs'>No replies yet. Be the first to respond.</p>
                    </div>
                  )}
                </div>

                {/* Reply Input */}
                <div className='border-t pt-4 space-y-3'>
                  <Label htmlFor='reply-input' className='text-sm font-medium flex items-center gap-2'>
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
                    placeholder='Write a response visible to the customer on the product page…'
                    className='min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none'
                  />
                  <div className='flex justify-end'>
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className='gap-1.5'
                    >
                      <MessageSquare size={15} />
                      {isSendingReply ? 'Sending…' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className='h-full flex flex-col items-center justify-center text-muted-foreground gap-3'>
              <Star size={48} className='opacity-10' />
              <p className='text-sm'>Select a review from the list to view details and reply</p>
            </div>
          )}
        </Card>
      </div>

      {/* Image Lightbox */}
      {selectedImageUrl && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className='relative max-w-3xl max-h-[90vh] p-2'>
            <img
              src={selectedImageUrl}
              alt='Review image preview'
              className='max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl'
            />
            <button
              className='absolute top-4 right-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/75 text-lg font-bold'
              onClick={() => setSelectedImageUrl(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
