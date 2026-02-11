import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  Users,
  ExternalLink,
  Search,
  BarChart3,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import api from '@/lib/axios'

interface Notification {
  _id: string
  title: string
  description: string
  type: 'info' | 'warning' | 'error' | 'success'
  source: 'system' | 'analytics' | 'email' | 'team' | 'integration' | 'user' | 'vendor' | 'order' | 'product' | 'wallet'
  createdAt: string
  read: boolean
  important: boolean
  action_url?: string
  metadata?: Record<string, string | number>
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [expandedNotifications, setExpandedNotifications] = useState<string[]>(
    []
  )

  const [selectedTab, setSelectedTab] = useState<
    'all' | 'unread' | 'important'
  >('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  )

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=100')
        setNotifications(res.data?.notifications || [])
      } catch (error) {
        console.error('Failed to fetch notifications', error)
      }
    }
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Filter notifications based on tab and search
  const filteredNotifications = useMemo(
    () =>
      notifications
        .filter((notification) => {
          if (selectedTab === 'unread') return !notification.read
          if (selectedTab === 'important') return notification.important
          return true
        })
        .filter(
          (notification) =>
            notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        ),
    [notifications, selectedTab, searchTerm]
  )

  // Handle notification selection
  const toggleNotification = (id: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleExpanded = (id: string) => {
    setExpandedNotifications((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map((n) => n._id))
    }
    setSelectAll(!selectAll)
  }

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Failed to mark notification read', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setSelectedNotifications([])
      setSelectAll(false)
    } catch (error) {
      console.error('Failed to mark all read', error)
    }
  }

  // Delete selected
  const deleteSelected = async () => {
    try {
      await Promise.all(
        selectedNotifications.map((id) => api.delete(`/notifications/${id}`))
      )
      setNotifications((prev) =>
        prev.filter((n) => !selectedNotifications.includes(n._id))
      )
      setSelectedNotifications([])
      setSelectAll(false)
    } catch (error) {
      console.error('Failed to delete notifications', error)
    }
  }

  // Get notification type icon and color
  const getNotificationType = (type: string) => {
    const icons = {
      info: <MessageSquare className='h-4 w-4 text-blue-500' />,
      warning: <AlertCircle className='h-4 w-4 text-yellow-500' />,
      error: <AlertCircle className='h-4 w-4 text-red-500' />,
      success: <CheckCircle className='h-4 w-4 text-green-500' />,
    }
    const colors = {
      info: 'bg-blue-50 text-blue-800 border-blue-200',
      warning: 'bg-amber-50 text-amber-900 border-amber-200',
      error: 'bg-rose-50 text-rose-800 border-rose-200',
      success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    }
    const ring = {
      info: 'ring-blue-200/60',
      warning: 'ring-amber-200/60',
      error: 'ring-rose-200/60',
      success: 'ring-emerald-200/60',
    }
    return {
      icon: icons[type as keyof typeof icons],
      color: colors[type as keyof typeof colors],
      ring: ring[type as keyof typeof ring],
    }
  }

  // Get source icon
  const getSourceIcon = (source: string) => {
    const icons = {
      system: <Bell className='h-4 w-4' />,
      analytics: <BarChart3 className='h-4 w-4' />,
      email: <Mail className='h-4 w-4' />,
      team: <Users className='h-4 w-4' />,
      integration: <ExternalLink className='h-4 w-4' />,
      user: <Users className='h-4 w-4' />,
      vendor: <Users className='h-4 w-4' />,
      order: <Bell className='h-4 w-4' />,
      product: <Bell className='h-4 w-4' />,
      wallet: <Bell className='h-4 w-4' />,
    }
    return icons[source as keyof typeof icons]
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900'>Notifications</h1>
          <p className='text-muted-foreground mt-1'>
            Stay updated with system alerts, analytics insights, and team
            activity
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={deleteSelected}
            disabled={selectedNotifications.length === 0}
            className='border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
          >
            Delete selected
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        {/* Search */}
        <div className='relative max-w-md flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <input
            type='text'
            placeholder='Search notifications...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='border-input bg-background focus:ring-ring w-full rounded-md border py-2 pr-4 pl-10 focus:ring-2 focus:outline-none'
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={(value) =>
            setSelectedTab(value as 'all' | 'unread' | 'important')
          }
          className='flex-shrink-0'
        >
          <TabsList className='bg-slate-100/80'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='unread' className='data-[state=active]:bg-blue-600 data-[state=active]:text-white'>
              Unread ({notifications.filter((n) => !n.read).length})
            </TabsTrigger>
            <TabsTrigger value='important' className='data-[state=active]:bg-rose-600 data-[state=active]:text-white'>
              Important ({notifications.filter((n) => n.important).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notification List */}
      <div className='space-y-4'>
        {filteredNotifications.length === 0 ? (
          <Card className='py-12 text-center'>
            <Bell className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
            <h3 className='mb-1 text-lg font-medium'>No notifications found</h3>
            <p className='text-muted-foreground'>
              {searchTerm
                ? 'Try adjusting your search terms'
                : selectedTab === 'unread'
                  ? "You're all caught up!"
                  : "You're all caught up with your notifications"}
            </p>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((notification) => {
              const typeStyle = getNotificationType(notification.type)
              const isExpanded = expandedNotifications.includes(notification._id)
              const metadataEntries = Object.entries(notification.metadata || {})
              const visibleMetadata = isExpanded
                ? metadataEntries
                : metadataEntries.slice(0, 3)
              return (
              <Card
                key={notification._id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-sm ${
                  !notification.read
                    ? 'border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/40 to-white'
                    : 'bg-white'
                } ${
                  selectedNotifications.includes(notification._id)
                    ? 'ring-2 ring-slate-200'
                    : ''
                }`}
              >
                <CardContent className='p-4 sm:p-5'>
                <div className='flex items-start gap-3'>
                    {/* Checkbox */}
                    <div className='pt-0.5'>
                      <Checkbox
                        id={`notification-${notification._id}`}
                        checked={selectedNotifications.includes(
                          notification._id
                        )}
                        onCheckedChange={() =>
                          toggleNotification(notification._id)
                        }
                      />
                    </div>

                    {/* Icon and Content */}
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start gap-3'>
                        <div className='flex-shrink-0'>
                          <div className={`rounded-lg bg-white p-2 shadow-xs ring-1 ${typeStyle.ring}`}>
                            {getSourceIcon(notification.source)}
                          </div>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='mb-1 flex flex-wrap items-center gap-2'>
                            <h3 className='text-sm leading-tight font-semibold text-slate-900'>
                              {notification.title}
                            </h3>
                            <Badge
                              variant='outline'
                              className={`border px-2 py-0.5 text-[11px] ${typeStyle.color}`}
                            >
                              {notification.type.charAt(0).toUpperCase() +
                                notification.type.slice(1)}
                            </Badge>
                            {notification.important && (
                              <Badge variant='destructive' className='text-[11px]'>
                                Important
                              </Badge>
                            )}
                          </div>

                          <p
                            className={`text-sm leading-5 text-slate-700 ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {notification.description}
                          </p>

                          {/* Metadata */}
                          {metadataEntries.length > 0 && (
                            <div className='mt-2 flex flex-wrap gap-1.5'>
                              {visibleMetadata.map(([key, value]) => (
                                <Badge
                                  key={key}
                                  variant='outline'
                                  className='px-2 py-0.5 text-[11px] font-medium text-slate-700'
                                >
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                              {!isExpanded && metadataEntries.length > 3 && (
                                <Badge
                                  variant='outline'
                                  className='px-2 py-0.5 text-[11px] text-slate-500'
                                >
                                  +{metadataEntries.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp and read indicator */}
                      <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                          <Clock className='h-3 w-3' />
                          {formatTimeAgo(notification.createdAt)}
                          {!notification.read && (
                            <span className='bg-primary h-2 w-2 animate-pulse rounded-full'></span>
                          )}
                        </div>

                        <div className='flex flex-wrap items-center gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-7 px-2.5 text-xs'
                            onClick={() => toggleExpanded(notification._id)}
                          >
                            {isExpanded ? 'Hide details' : 'View details'}
                          </Button>
                          {notification.action_url ? (
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 px-2.5 text-xs'
                              asChild
                            >
                              <Link to={notification.action_url}>
                                View
                                <ExternalLink className='ml-1 h-3 w-3' />
                              </Link>
                            </Button>
                          ) : null}
                          {!notification.read && (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => markAsRead(notification._id)}
                              className='h-7 px-2 text-xs'
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
          </>
        )}
      </div>

      {/* Bulk actions bar (shown when items selected) */}
      {selectedNotifications.length > 0 && (
        <div className='bg-background border-border fixed right-0 bottom-0 left-0 z-50 border-t px-6 py-4 shadow-lg'>
          <div className='mx-auto flex max-w-7xl items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Checkbox
                id='select-all-bulk'
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <span className='text-sm'>
                {selectedNotifications.length} selected
              </span>
            </div>

            <div className='flex items-center gap-3'>
              <Button variant='outline' size='sm' onClick={markAllAsRead}>
                Mark as read
              </Button>
              <Button variant='destructive' size='sm' onClick={deleteSelected}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification settings card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Customize which notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>System Alerts</h3>
                <p className='text-muted-foreground text-sm'>
                  Receive notifications for server issues, maintenance, and
                  security events
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Analytics Insights</h3>
                <p className='text-muted-foreground text-sm'>
                  Get notified about traffic spikes, conversion changes, and
                  performance trends
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Email Campaigns</h3>
                <p className='text-muted-foreground text-sm'>
                  Receive status updates for your email marketing campaigns
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Team Activity</h3>
                <p className='text-muted-foreground text-sm'>
                  Get notified when team members comment on your projects
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Integration Updates</h3>
                <p className='text-muted-foreground text-sm'>
                  Receive notifications when connected services have status
                  changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Daily Digest</h3>
                <p className='text-muted-foreground text-sm'>
                  Receive a daily summary of all notifications (email)
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Email Notifications</h3>
                <p className='text-muted-foreground text-sm'>
                  Send important notifications to your email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>Push Notifications</h3>
                <p className='text-muted-foreground text-sm'>
                  Receive alerts on your mobile device
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className='mt-6 flex justify-end'>
            <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
