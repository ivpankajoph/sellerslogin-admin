import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Globe,
  MailPlus,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import {
  VENDOR_PAGE_ACCESS_OPTIONS,
  type VendorPageAccessKey,
  type VendorPageAccessOption,
} from './access-config'

type WebsiteOption = {
  id: string
  name: string
  template_key?: string
  template_name?: string
}

type TeamMember = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  allowed_page_keys: VendorPageAccessKey[]
  allowed_website_ids: string[]
  allowed_websites: WebsiteOption[]
  last_login_at?: string | null
  createdAt?: string | null
}

type ActivityItem = {
  id: string
  user_id: string
  user_name: string
  user_email: string
  action: string
  page_key: string
  path: string
  website_id?: string
  website_name?: string
  createdAt?: string | null
}

type TeamMemberFormState = {
  name: string
  email: string
  status: 'active' | 'inactive'
  allowed_page_keys: VendorPageAccessKey[]
  allowed_website_ids: string[]
}

const emptyForm: TeamMemberFormState = {
  name: '',
  email: '',
  status: 'active',
  allowed_page_keys: [],
  allowed_website_ids: [],
}

const getBulkSelectablePageKeys = (
  options: VendorPageAccessOption[],
  hasWebsites: boolean
) =>
  options
    .map((option) => option.key)
    .filter((key) => hasWebsites || key !== 'my_websites')

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Never'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return 'Never'
  }
}

const formatAction = (value: string) =>
  String(value || '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-'

const chunk = <T,>(items: T[], size: number) =>
  items.reduce<T[][]>((groups, item, index) => {
    if (index % size === 0) groups.push([])
    groups[groups.length - 1]?.push(item)
    return groups
  }, [])

type TeamAccessPageProps = {
  initialTab?: 'members' | 'activity'
}

export default function TeamAccessPage({
  initialTab = 'members',
}: TeamAccessPageProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [websites, setWebsites] = useState<WebsiteOption[]>([])
  const [pageOptions, setPageOptions] = useState<VendorPageAccessOption[]>(
    VENDOR_PAGE_ACCESS_OPTIONS
  )
  const [membersLoading, setMembersLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<TeamMemberFormState>(emptyForm)
  const [tab, setTab] = useState<'members' | 'activity'>(initialTab)
  const [memberSearch, setMemberSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityUserId, setActivityUserId] = useState('all')
  const [activityWebsiteId, setActivityWebsiteId] = useState('all')
  const [activitySummary, setActivitySummary] = useState({
    total_actions: 0,
    unique_users: 0,
    page_views: 0,
    logins: 0,
  })

  const pageOptionsByKey = useMemo(
    () =>
      pageOptions.reduce<Record<string, VendorPageAccessOption>>((acc, option) => {
        acc[option.key] = option
        return acc
      }, {}),
    [pageOptions]
  )

  const loadMeta = async () => {
    const response = await api.get('/team-users/meta')
    setWebsites(response.data?.data?.websites || [])
    setPageOptions(response.data?.data?.page_options || VENDOR_PAGE_ACCESS_OPTIONS)
  }

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const response = await api.get('/team-users')
      setMembers(response.data?.data?.members || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load user access list')
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const loadActivity = async () => {
    setActivityLoading(true)
    try {
      const params = new URLSearchParams()
      if (activitySearch.trim()) params.set('search', activitySearch.trim())
      if (activityUserId !== 'all') params.set('team_user_id', activityUserId)
      if (activityWebsiteId !== 'all') params.set('website_id', activityWebsiteId)
      const query = params.toString()
      const response = await api.get(`/team-users/activity/report${query ? `?${query}` : ''}`)
      setActivityItems(response.data?.data?.items || [])
      setActivitySummary(
        response.data?.data?.summary || {
          total_actions: 0,
          unique_users: 0,
          page_views: 0,
          logins: 0,
        }
      )
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load activity report')
      setActivityItems([])
      setActivitySummary({
        total_actions: 0,
        unique_users: 0,
        page_views: 0,
        logins: 0,
      })
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadMeta(), loadMembers(), loadActivity()])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (tab !== 'activity') return
    const timer = window.setTimeout(() => {
      void loadActivity()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [activitySearch, activityUserId, activityWebsiteId, tab])

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return members
    return members.filter((member) =>
      [member.name, member.email].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    )
  }, [memberSearch, members])

  const memberSummary = useMemo(
    () => ({
      total: members.length,
      active: members.filter((member) => member.status === 'active').length,
      inactive: members.filter((member) => member.status !== 'active').length,
      website_links: members.reduce(
        (count, member) => count + member.allowed_website_ids.length,
        0
      ),
    }),
    [members]
  )

  const websiteGrid = useMemo(() => chunk(websites, 2), [websites])
  const selectablePageKeys = useMemo(
    () => getBulkSelectablePageKeys(pageOptions, websites.length > 0),
    [pageOptions, websites.length]
  )
  const allPagesSelected =
    selectablePageKeys.length > 0 &&
    selectablePageKeys.every((key) => form.allowed_page_keys.includes(key))
  const allWebsitesSelected =
    websites.length > 0 &&
    websites.every((website) => form.allowed_website_ids.includes(website.id))

  const openCreateDialog = () => {
    setEditingMember(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member)
    setForm({
      name: member.name,
      email: member.email,
      status: member.status,
      allowed_page_keys: member.allowed_page_keys,
      allowed_website_ids: member.allowed_website_ids,
    })
    setDialogOpen(true)
  }

  const updateForm = <K extends keyof TeamMemberFormState>(
    key: K,
    value: TeamMemberFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const togglePageKey = (key: VendorPageAccessKey) => {
    setForm((prev) => {
      const exists = prev.allowed_page_keys.includes(key)
      const nextPageKeys = exists
        ? prev.allowed_page_keys.filter((item) => item !== key)
        : [...prev.allowed_page_keys, key]
      return {
        ...prev,
        allowed_page_keys: nextPageKeys,
        allowed_website_ids:
          key === 'my_websites' || nextPageKeys.includes('my_websites')
            ? prev.allowed_website_ids
            : [],
      }
    })
  }

  const toggleWebsiteId = (websiteId: string) => {
    setForm((prev) => {
      const exists = prev.allowed_website_ids.includes(websiteId)
      return {
        ...prev,
        allowed_website_ids: exists
          ? prev.allowed_website_ids.filter((item) => item !== websiteId)
          : [...prev.allowed_website_ids, websiteId],
      }
    })
  }

  const toggleAllPageAccess = () => {
    setForm((prev) => {
      if (allPagesSelected) {
        return {
          ...prev,
          allowed_page_keys: [],
          allowed_website_ids: [],
        }
      }

      return {
        ...prev,
        allowed_page_keys: selectablePageKeys,
        allowed_website_ids: websites.map((website) => website.id),
      }
    })
  }

  const canSave =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    form.allowed_page_keys.length > 0 &&
    (!form.allowed_page_keys.includes('my_websites') ||
      form.allowed_website_ids.length > 0)

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Add a name, email, page access, and website access when required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        status: form.status,
        allowed_page_keys: form.allowed_page_keys,
        allowed_website_ids: form.allowed_website_ids,
      }

      if (editingMember) {
        await api.put(`/team-users/${editingMember.id}`, payload)
        toast.success('User access updated')
      } else {
        await api.post('/team-users', payload)
        toast.success('User access created and invitation email sent')
      }

      setDialogOpen(false)
      await Promise.all([loadMembers(), loadActivity()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save user access')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/team-users/${deleteTarget.id}`)
      toast.success('User access removed')
      setDeleteTarget(null)
      await Promise.all([loadMembers(), loadActivity()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove user access')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <TablePageHeader title='User Access'>
        <Input
          value={tab === 'members' ? memberSearch : activitySearch}
          onChange={(event) =>
            tab === 'members'
              ? setMemberSearch(event.target.value)
              : setActivitySearch(event.target.value)
          }
          placeholder={tab === 'members' ? 'Search team users...' : 'Search activity...'}
          className='h-10 w-64 shrink-0'
        />
        <Button variant='outline' onClick={() => void refreshAll()} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button onClick={openCreateDialog}>
          <MailPlus className='h-4 w-4' />
          Invite User
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <Users className='h-5 w-5 text-primary' />
              <p className='text-sm font-medium text-muted-foreground'>Team Users</p>
            </div>
            <p className='mt-4 text-3xl font-semibold text-foreground'>{memberSummary.total}</p>
          </div>
          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <ShieldCheck className='h-5 w-5 text-emerald-600' />
              <p className='text-sm font-medium text-muted-foreground'>Active Access</p>
            </div>
            <p className='mt-4 text-3xl font-semibold text-foreground'>{memberSummary.active}</p>
          </div>
          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <Globe className='h-5 w-5 text-sky-600' />
              <p className='text-sm font-medium text-muted-foreground'>Website Grants</p>
            </div>
            <p className='mt-4 text-3xl font-semibold text-foreground'>
              {memberSummary.website_links}
            </p>
          </div>
          <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <Activity className='h-5 w-5 text-violet-600' />
              <p className='text-sm font-medium text-muted-foreground'>Tracked Actions</p>
            </div>
            <p className='mt-4 text-3xl font-semibold text-foreground'>
              {activitySummary.total_actions}
            </p>
          </div>
        </div>

        <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as 'members' | 'activity')}
          >
            <TabsList>
              <TabsTrigger value='members'>Team Members</TabsTrigger>
              <TabsTrigger value='activity'>Activity Report</TabsTrigger>
            </TabsList>

            <TabsContent value='members' className='mt-5'>
              {membersLoading ? (
                <p className='text-sm text-muted-foreground'>Loading user access list...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Page Access</TableHead>
                      <TableHead>Website Access</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length ? (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className='align-top'>
                            <div className='space-y-1'>
                              <p className='font-medium text-foreground'>{member.name}</p>
                              <p className='text-sm text-muted-foreground'>{member.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className='align-top'>
                            <Badge
                              variant={member.status === 'active' ? 'default' : 'outline'}
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className='align-top'>
                            <div className='flex max-w-sm flex-wrap gap-2'>
                              {member.allowed_page_keys.map((key) => (
                                <Badge key={key} variant='outline'>
                                  {pageOptionsByKey[key]?.label || key}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className='align-top'>
                            <div className='flex max-w-sm flex-wrap gap-2'>
                              {member.allowed_websites.length ? (
                                member.allowed_websites.map((website) => (
                                  <Badge key={website.id} variant='outline'>
                                    {website.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className='text-sm text-muted-foreground'>No websites</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className='align-top text-sm text-muted-foreground'>
                            {formatDateTime(member.last_login_at)}
                          </TableCell>
                          <TableCell className='align-top'>
                            <div className='flex justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => openEditDialog(member)}
                              >
                                <PencilLine className='h-4 w-4' />
                                Edit
                              </Button>
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() => setDeleteTarget(member)}
                              >
                                <Trash2 className='h-4 w-4' />
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='py-10 text-center text-muted-foreground'>
                          No team users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value='activity' className='mt-5'>
              <div className='mb-4 grid gap-3 md:grid-cols-3'>
                <Select value={activityUserId} onValueChange={setActivityUserId}>
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue placeholder='All users' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All users</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={activityWebsiteId} onValueChange={setActivityWebsiteId}>
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue placeholder='All websites' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All websites</SelectItem>
                    {websites.map((website) => (
                      <SelectItem key={website.id} value={website.id}>
                        {website.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className='rounded-2xl border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground'>
                  {activitySummary.unique_users} users, {activitySummary.page_views} page views,{' '}
                  {activitySummary.logins} logins
                </div>
              </div>

              {activityLoading ? (
                <p className='text-sm text-muted-foreground'>Loading activity report...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityItems.length ? (
                      activityItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className='space-y-1'>
                              <p className='font-medium text-foreground'>{item.user_name}</p>
                              <p className='text-sm text-muted-foreground'>{item.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline'>{formatAction(item.action)}</Badge>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {pageOptionsByKey[item.page_key]?.label || item.page_key || item.path || '-'}
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {item.website_name || '-'}
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {formatDateTime(item.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className='py-10 text-center text-muted-foreground'>
                          No tracked activity found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[92vh] w-[min(94vw,1100px)] max-w-[min(94vw,1100px)] overflow-y-auto rounded-2xl border-border/70 p-0 sm:max-w-[min(94vw,1100px)]'>
          <DialogHeader className='border-b border-border px-6 py-5 text-left'>
            <DialogTitle>{editingMember ? 'Edit User Access' : 'Invite User'}</DialogTitle>
            <DialogDescription>
              Give a team member email-based access, choose allowed pages, and assign websites.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6 px-6 py-6'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='md:col-span-1'>
                <Label htmlFor='team-name'>Name</Label>
                <Input
                  id='team-name'
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder='Example: Pankaj Sharma'
                  className='mt-2 h-11'
                />
              </div>
              <div className='md:col-span-1'>
                <Label htmlFor='team-email'>Email</Label>
                <Input
                  id='team-email'
                  type='email'
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  placeholder='name@example.com'
                  className='mt-2 h-11'
                />
              </div>
              <div className='md:col-span-1'>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: 'active' | 'inactive') =>
                    updateForm('status', value)
                  }
                >
                  <SelectTrigger className='mt-2 h-11 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='inactive'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-base font-semibold text-foreground'>Allowed Pages</h3>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Choose which dashboard pages this user can open.
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>{form.allowed_page_keys.length} selected</Badge>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={toggleAllPageAccess}
                    disabled={!selectablePageKeys.length}
                  >
                    {allPagesSelected ? 'Clear All' : 'Select All'}
                  </Button>
                </div>
              </div>

              <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {pageOptions.map((option) => (
                  <label
                    key={option.key}
                    className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30'
                  >
                    <Checkbox
                      checked={form.allowed_page_keys.includes(option.key)}
                      onCheckedChange={() => togglePageKey(option.key)}
                      className='mt-1'
                    />
                    <div>
                      <p className='font-medium text-foreground'>{option.label}</p>
                      <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-base font-semibold text-foreground'>Assigned Websites</h3>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Select the websites this user can access inside My Websites and the website
                    builder.
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>{form.allowed_website_ids.length} selected</Badge>
                  {form.allowed_page_keys.includes('my_websites') && websites.length ? (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        updateForm(
                          'allowed_website_ids',
                          allWebsitesSelected ? [] : websites.map((website) => website.id)
                        )
                      }
                    >
                      {allWebsitesSelected ? 'Clear All' : 'Select All'}
                    </Button>
                  ) : null}
                </div>
              </div>

              {form.allowed_page_keys.includes('my_websites') ? (
                <div className='mt-5 space-y-4'>
                  {websiteGrid.length ? (
                    websiteGrid.map((row, rowIndex) => (
                      <div key={rowIndex} className='grid gap-4 md:grid-cols-2'>
                        {row.map((website) => {
                          const checked = form.allowed_website_ids.includes(website.id)
                          return (
                            <label
                              key={website.id}
                              className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30'
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleWebsiteId(website.id)}
                                className='mt-1'
                              />
                              <div>
                                <p className='font-medium text-foreground'>{website.name}</p>
                                <p className='mt-1 text-sm text-muted-foreground'>
                                  {website.template_name || website.template_key || 'Website'}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No websites available yet. Create a website first, then assign it here.
                    </p>
                  )}
                </div>
              ) : (
                <p className='mt-5 text-sm text-muted-foreground'>
                  Enable the <strong>My Websites</strong> page above to assign website access.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className='border-t border-border px-6 py-4'>
            <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={handleSave} disabled={saving || !canSave}>
              {saving ? 'Saving...' : editingMember ? 'Update Access' : 'Create Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deleting && !open) setDeleteTarget(null)
        }}
        title={
          deleteTarget
            ? `Remove access for ${deleteTarget.name}?`
            : 'Remove user access?'
        }
        desc='This will delete the team user and remove all assigned page and website access.'
        destructive
        confirmText='Remove Access'
        cancelBtnText='Cancel'
        isLoading={deleting}
        handleConfirm={handleDelete}
      />
    </>
  )
}
