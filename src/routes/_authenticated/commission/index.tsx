import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight } from 'lucide-react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { VITE_PUBLIC_API_URL } from '@/config'

type CommissionRule = {
  scope_type: 'main' | 'category' | 'subcategory'
  scope_id: string
  name: string
  parent_id?: string
  parent_name?: string
  main_parent_name?: string
  percent: number
  is_active: boolean
}

export const Route = createFileRoute('/_authenticated/commission/')({
  component: CommissionPage,
})

function CommissionPage() {
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openMain, setOpenMain] = useState<Record<string, boolean>>({})
  const [openCategory, setOpenCategory] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [scopeFilter, setScopeFilter] = useState('all')
  const [mainFilter, setMainFilter] = useState('all')
  const [mainOptions, setMainOptions] = useState<
    Array<{ value: string; label: string }>
  >([])
  const token = useSelector((state: RootState) => state.auth?.token)

  const fetchRules = async () => {
    try {
      setLoading(true)
      const res = await api.get('/commission', {
        params: {
          page,
          limit,
          search: search || undefined,
          scope_type: scopeFilter === 'all' ? undefined : scopeFilter,
          main_category_id: mainFilter === 'all' ? undefined : mainFilter,
        },
      })
      setRules(res.data.rules || [])
      setTotal(res.data.pagination?.total || 0)
      setTotalPages(res.data.pagination?.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [page, search, scopeFilter, mainFilter])

  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const res = await axios.get(
          `${VITE_PUBLIC_API_URL}/v1/maincategories/getall`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        const list = res.data?.data || []
        setMainOptions(
          list.map((item: any) => ({
            value: item?._id || item?.name || '',
            label: item?.name || item?.slug || item?._id,
          }))
        )
      } catch {
        setMainOptions([])
      }
    }
    fetchMainCategories()
  }, [token])

  const updateRule = async (rule: CommissionRule) => {
    try {
      setSavingId(rule.scope_id)
      await api.put(`/commission/${rule.scope_id}`, {
        percent: rule.percent,
        is_active: rule.is_active,
        scope_type: rule.scope_type,
      })
    } finally {
      setSavingId(null)
    }
  }

  const updatePercent = (scopeId: string, value: string) => {
    const percent = Math.max(0, Math.min(100, Number(value || 0)))
    setRules((prev) =>
      prev.map((rule) =>
        rule.scope_id === scopeId ? { ...rule, percent } : rule,
      ),
    )
  }

  const tree = useMemo(() => {
    const main = rules.filter((rule) => rule.scope_type === 'main')
    const categories = rules.filter((rule) => rule.scope_type === 'category')
    const subcategories = rules.filter(
      (rule) => rule.scope_type === 'subcategory'
    )

    const categoriesByMain = new Map<string, CommissionRule[]>()
    categories.forEach((rule) => {
      const key = String(rule.parent_id || 'unknown')
      const list = categoriesByMain.get(key) || []
      list.push(rule)
      categoriesByMain.set(key, list)
    })

    const subcategoriesByCategory = new Map<string, CommissionRule[]>()
    subcategories.forEach((rule) => {
      const key = String(rule.parent_id || 'unknown')
      const list = subcategoriesByCategory.get(key) || []
      list.push(rule)
      subcategoriesByCategory.set(key, list)
    })

    return { main, categoriesByMain, subcategoriesByCategory }
  }, [rules])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Commission Rules</h1>
          <p className='text-sm text-muted-foreground'>
            Configure category-level commission cuts for marketplace orders.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search category'
            className='w-64'
          />
          <select
            value={scopeFilter}
            onChange={(e) => {
              setScopeFilter(e.target.value)
              setPage(1)
            }}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm'
          >
            <option value='all'>All levels</option>
            <option value='main'>Main category</option>
            <option value='category'>Category</option>
            <option value='subcategory'>Subcategory</option>
          </select>
          <select
            value={mainFilter}
            onChange={(e) => {
              setMainFilter(e.target.value)
              setPage(1)
            }}
            className='h-10 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm'
          >
            <option value='all'>All main categories</option>
            {mainOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant='outline'
            onClick={() => {
              setSearch('')
              setScopeFilter('all')
              setMainFilter('all')
              setPage(1)
            }}
          >
            Reset
          </Button>
          <Button onClick={fetchRules} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Category commission</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className='text-sm text-muted-foreground'>Loading categories...</p>}
          {!loading && rules.length === 0 && (
            <p className='text-sm text-muted-foreground'>No categories found.</p>
          )}
          <div className='space-y-4'>
            {tree.main.map((main) => {
              const mainId = String(main.scope_id)
              const isOpenMain = !!openMain[mainId]
              const categories = tree.categoriesByMain.get(mainId) || []
              return (
                <div
                  key={mainId}
                  className='rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white shadow-xs'
                >
                  <button
                    type='button'
                    onClick={() =>
                      setOpenMain((prev) => ({ ...prev, [mainId]: !isOpenMain }))
                    }
                    className='flex w-full items-center justify-between gap-3 px-4 py-4 text-left'
                  >
                    <div className='flex items-center gap-2'>
                      {isOpenMain ? (
                        <ChevronDown className='h-4 w-4 text-slate-600' />
                      ) : (
                        <ChevronRight className='h-4 w-4 text-slate-600' />
                      )}
                      <div>
                        <p className='text-sm font-semibold text-slate-900'>
                          {main.name}
                        </p>
                        <span className='inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700'>
                          Main category
                        </span>
                      </div>
                    </div>
                    <div
                      className='flex items-center gap-3'
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Input
                        type='number'
                        min={0}
                        max={100}
                        step={0.1}
                        value={main.percent}
                        onChange={(e) => updatePercent(main.scope_id, e.target.value)}
                        className='w-24 bg-white'
                      />
                      <span className='text-xs text-muted-foreground'>%</span>
                      <Button
                        size='sm'
                        className='bg-slate-900 text-white hover:bg-slate-800'
                        onClick={() => updateRule(main)}
                        disabled={savingId === main.scope_id}
                      >
                        {savingId === main.scope_id ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </button>

                  {isOpenMain && categories.length > 0 && (
                    <div className='border-t border-slate-200 px-4 py-3'>
                      <div className='space-y-3'>
                        {categories.map((category) => {
                          const categoryId = String(category.scope_id)
                          const isOpenCategory = !!openCategory[categoryId]
                          const subcategories =
                            tree.subcategoriesByCategory.get(categoryId) || []
                          return (
                            <div
                              key={categoryId}
                              className='rounded-lg border border-slate-200 bg-white'
                            >
                              <button
                                type='button'
                                onClick={() =>
                                  setOpenCategory((prev) => ({
                                    ...prev,
                                    [categoryId]: !isOpenCategory,
                                  }))
                                }
                                className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left'
                              >
                                <div className='flex items-center gap-2'>
                                  {isOpenCategory ? (
                                    <ChevronDown className='h-4 w-4 text-slate-500' />
                                  ) : (
                                    <ChevronRight className='h-4 w-4 text-slate-500' />
                                  )}
                                  <div>
                                    <p className='text-sm font-semibold text-slate-900'>
                                      {category.name}
                                    </p>
                                    <span className='inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700'>
                                      Category
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className='flex items-center gap-3'
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Input
                                    type='number'
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={category.percent}
                                    onChange={(e) =>
                                      updatePercent(category.scope_id, e.target.value)
                                    }
                                    className='w-24 bg-white'
                                  />
                                  <span className='text-xs text-muted-foreground'>%</span>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-slate-300'
                                    onClick={() => updateRule(category)}
                                    disabled={savingId === category.scope_id}
                                  >
                                    {savingId === category.scope_id ? 'Saving...' : 'Save'}
                                  </Button>
                                </div>
                              </button>

                              {isOpenCategory && subcategories.length > 0 && (
                                <div className='border-t border-slate-200 bg-slate-50 px-4 py-3'>
                                  <div className='space-y-2'>
                                    {subcategories.map((sub) => (
                                      <div
                                        key={sub.scope_id}
                                        className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3'
                                      >
                                        <div>
                                          <p className='text-sm font-semibold text-slate-900'>
                                            {sub.name}
                                          </p>
                                          <span className='inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700'>
                                            Subcategory
                                          </span>
                                        </div>
                                        <div className='flex items-center gap-3'>
                                          <Input
                                            type='number'
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            value={sub.percent}
                                            onChange={(e) =>
                                              updatePercent(sub.scope_id, e.target.value)
                                            }
                                            className='w-24 bg-white'
                                          />
                                          <span className='text-xs text-muted-foreground'>%</span>
                                          <Button
                                            size='sm'
                                            variant='outline'
                                            className='border-slate-300'
                                            onClick={() => updateRule(sub)}
                                            disabled={savingId === sub.scope_id}
                                          >
                                            {savingId === sub.scope_id ? 'Saving...' : 'Save'}
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {totalPages > 1 && (
            <div className='mt-4 flex items-center justify-between text-sm'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <span className='text-xs text-muted-foreground'>
                Page {page} of {totalPages} · {total} total
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
