import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'

type NotificationItem = {
  _id: string
  title: string
  description?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  source?: string
  action_url?: string
  read?: boolean
  createdAt?: string
  metadata?: Record<string, unknown>
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

const resolveActionUrl = (n: NotificationItem): string => {
  const direct = String(n.action_url || '').trim()
  if (direct) return direct

  const title = String(n.title || '').toLowerCase()
  const source = String(n.source || '').toLowerCase()
  const meta = (n.metadata || {}) as Record<string, unknown>

  if (meta.ticketId) return `/help-center?ticketId=${encodeURIComponent(String(meta.ticketId))}`
  if (meta.queryId) return '/customer-queries'
  if (meta.orderId) return '/order'
  if (meta.productId) return '/products'
  if (meta.vendorId && (title.includes('vendor') || source === 'vendor')) return '/vendor'

  if (title.includes('query')) return '/customer-queries'
  if (title.includes('review')) return '/customer-reviews'
  if (title.includes('ticket')) return '/help-center'
  if (title.includes('order')) return '/order'
  if (title.includes('product')) return '/products'
  if (title.includes('vendor')) return '/vendor'

  return ''
}

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count')
      return Number(res.data?.count || 0)
    },
    refetchInterval: 30_000,
  })

  const latestQuery = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { limit: 10 } })
      return Array.isArray(res.data?.notifications) ? res.data.notifications : []
    },
    enabled: open,
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all')
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'latest'] }),
      ])
    },
  })

  const unreadCount = unreadQuery.data ?? 0
  const hasUnread = unreadCount > 0
  const items = (latestQuery.data ?? []) as NotificationItem[]

  const badgeLabel = useMemo(() => {
    if (!hasUnread) return ''
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [hasUnread, unreadCount])

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) markAllReadMutation.mutate()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className={cn('relative', className)}
          aria-label='Notifications'
        >
          <Bell className='h-4 w-4' />
          {hasUnread && (
            <span className='absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white'>
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-96 p-0'>
        <div className='p-3'>
          <DropdownMenuLabel className='p-0'>Notifications</DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className='max-h-[420px]'>
          <div className='py-1'>
            {items.length === 0 ? (
              <div className='px-3 py-6 text-center text-sm text-muted-foreground'>
                {latestQuery.isFetching ? 'Loading…' : 'No notifications yet'}
              </div>
            ) : (
              items.map((n) => (
                <DropdownMenuItem
                  key={n._id}
                  className='flex cursor-pointer flex-col items-start gap-1 px-3 py-2'
                  onSelect={(e) => {
                    e.preventDefault()
                    const url = resolveActionUrl(n)
                    if (url) {
                      setOpen(false)
                      void navigate({ to: url })
                    }
                  }}
                >
                  <div className='flex w-full items-start gap-2'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='truncate text-sm font-medium'>{n.title}</span>
                        {!n.read && (
                          <span className='h-2 w-2 flex-none rounded-full bg-red-600' />
                        )}
                      </div>
                      {n.description ? (
                        <div className='line-clamp-2 text-xs text-muted-foreground'>
                          {n.description}
                        </div>
                      ) : null}
                      {n.createdAt ? (
                        <div className='mt-1 text-[11px] text-muted-foreground'>
                          {formatTime(n.createdAt)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

