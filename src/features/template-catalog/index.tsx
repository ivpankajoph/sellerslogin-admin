import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { AlertTriangle, Loader2, RefreshCcw, Shield, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import type { RootState } from '@/store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'

const CORE_TEMPLATE_KEYS = new Set(['mquiq', 'poupqz', 'oragze', 'whiterose', 'pocofood'])

type TemplateCatalogItem = {
  key: string
  name: string
  description?: string
  previewImage?: string
  isCore?: boolean
  deletable?: boolean
}

const normalizeRole = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

const normalizeTemplateKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()

const isCoreTemplate = (template: TemplateCatalogItem) => {
  if (typeof template.isCore === 'boolean') return template.isCore
  const key = normalizeTemplateKey(template.key)
  return CORE_TEMPLATE_KEYS.has(key)
}

const normalizeCatalog = (rows: TemplateCatalogItem[]) =>
  rows.map((item) => {
    const key = normalizeTemplateKey(item.key)
    const deletable =
      typeof item.deletable === 'boolean' ? item.deletable : true
    const isCore =
      typeof item.isCore === 'boolean' ? item.isCore : CORE_TEMPLATE_KEYS.has(key)
    return {
      ...item,
      key,
      isCore,
      deletable,
    }
  })

export default function TemplateCatalogPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const reduxToken = useSelector((state: RootState) => state.auth?.token)
  const roleKey = normalizeRole(role)
  const isAdmin = roleKey === 'admin' || roleKey === 'superadmin'

  const token = useMemo(() => {
    if (reduxToken) return reduxToken
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('persist:root')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const authRaw = parsed?.auth
      if (!authRaw) return null
      const auth = JSON.parse(authRaw)
      return typeof auth?.token === 'string' ? auth.token : null
    } catch {
      return null
    }
  }, [reduxToken])

  const [templates, setTemplates] = useState<TemplateCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TemplateCatalogItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${BASE_URL}/v1/templates/catalog`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const rows = Array.isArray(res.data?.data)
        ? (res.data.data as TemplateCatalogItem[])
        : []
      setTemplates(normalizeCatalog(rows))
    } catch (error: any) {
      setTemplates([])
      toast.error(error?.response?.data?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isAdmin) return
    loadCatalog()
  }, [isAdmin, loadCatalog])

  const openDeleteWarning = (template: TemplateCatalogItem) => {
    if (!isAdmin) return
    setDeleteTarget(template)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!isAdmin || !deleteTarget) return
    if (!token) {
      toast.error('Session expired. Please login again.')
      return
    }

    const template = deleteTarget

    setDeletingKey(template.key)
    try {
      const res = await axios.delete(
        `${BASE_URL}/v1/templates/catalog/${encodeURIComponent(template.key)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const rows = Array.isArray(res.data?.data)
        ? (res.data.data as TemplateCatalogItem[])
        : []
      setTemplates(normalizeCatalog(rows))
      toast.success(res.data?.message || 'Template deleted')
    } catch (error: any) {
      const status = Number(error?.response?.status || 0)
      if (status === 401) {
        toast.error('Session expired. Please login again.')
      } else if (status === 403) {
        toast.error('Only admin can delete templates')
      } else {
        toast.error(error?.response?.data?.message || 'Template delete failed')
      }
    } finally {
      setDeletingKey(null)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  const summary = useMemo(
    () => ({
      total: templates.length,
      core: templates.filter((item) => isCoreTemplate(item)).length,
      custom: templates.filter((item) => !isCoreTemplate(item)).length,
    }),
    [templates]
  )

  if (!isAdmin) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <Card className='border-rose-200 bg-rose-50'>
          <CardHeader>
            <CardTitle className='text-rose-700'>Access denied</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-rose-600'>
            Only admins can access template management.
          </CardContent>
        </Card>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Template Manager</h2>
            <p className='text-muted-foreground'>
              View and delete storefront templates from one place.
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={loadCatalog}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <RefreshCcw className='h-4 w-4' />
            )}
            Refresh
          </Button>
        </div>

        <div className='grid gap-3 sm:grid-cols-3'>
          <Card className='border-slate-200'>
            <CardContent className='pt-6'>
              <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Total</p>
              <p className='mt-2 text-2xl font-semibold text-slate-900'>{summary.total}</p>
            </CardContent>
          </Card>
          <Card className='border-slate-200'>
            <CardContent className='pt-6'>
              <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Core</p>
              <p className='mt-2 text-2xl font-semibold text-slate-900'>{summary.core}</p>
            </CardContent>
          </Card>
          <Card className='border-slate-200'>
            <CardContent className='pt-6'>
              <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>Custom</p>
              <p className='mt-2 text-2xl font-semibold text-slate-900'>{summary.custom}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className='flex items-center gap-3 py-8 text-sm text-slate-600'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading template catalog...
            </CardContent>
          </Card>
        ) : null}

        {!loading && templates.length === 0 ? (
          <Card>
            <CardContent className='py-8 text-sm text-slate-600'>
              No templates found.
            </CardContent>
          </Card>
        ) : null}

        {!loading ? (
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {templates.map((template) => (
              <Card key={template.key} className='overflow-hidden border-slate-200'>
                <div className='relative h-40 w-full overflow-hidden bg-slate-100'>
                  {template.previewImage ? (
                    <img
                      src={template.previewImage}
                      alt={template.name}
                      className='h-full w-full object-cover'
                    />
                  ) : null}
                </div>
                <CardContent className='space-y-3 p-4'>
                  {(() => {
                    const isCore = isCoreTemplate(template)
                    const isDeleting = deletingKey === template.key
                    return (
                      <>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <h3 className='text-lg font-semibold text-slate-900'>{template.name}</h3>
                      <p className='text-xs uppercase tracking-[0.2em] text-slate-500'>
                        {template.key}
                      </p>
                    </div>
                    {isCore ? (
                      <Badge className='bg-slate-100 text-slate-700 hover:bg-slate-100'>
                        <Shield className='mr-1 h-3 w-3' />
                        Core
                      </Badge>
                    ) : (
                      <Badge className='bg-sky-100 text-sky-700 hover:bg-sky-100'>
                        <Sparkles className='mr-1 h-3 w-3' />
                        Custom
                      </Badge>
                    )}
                  </div>

                  <p className='min-h-10 text-sm text-slate-600'>
                    {template.description || 'No description'}
                  </p>

                  <div className='flex items-center justify-end'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      disabled={isDeleting}
                      onClick={() => openDeleteWarning(template)}
                    >
                      {isDeleting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Trash2 className='h-4 w-4' />
                      )}
                      Delete
                    </Button>
                  </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </Main>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deletingKey) {
            setDeleteDialogOpen(open)
            if (!open) setDeleteTarget(null)
          }
        }}
        title={
          deleteTarget
            ? `Delete template "${deleteTarget.name}"?`
            : 'Delete template?'
        }
        desc={
          <div className='space-y-2 text-sm'>
            <p>
              This will permanently remove this template and its configuration from
              the active template catalog.
            </p>
            {deleteTarget && isCoreTemplate(deleteTarget) ? (
              <div className='rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700'>
                <div className='flex items-center gap-2 font-medium'>
                  <AlertTriangle className='h-4 w-4' />
                  Warning: you are deleting a core template.
                </div>
              </div>
            ) : null}
            <p>
              Vendors currently using this template will be switched to a fallback
              template automatically.
            </p>
          </div>
        }
        destructive
        confirmText='Delete Permanently'
        cancelBtnText='Cancel'
        isLoading={Boolean(deletingKey)}
        handleConfirm={handleDelete}
      />
    </>
  )
}
