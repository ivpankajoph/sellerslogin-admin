/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Home, RefreshCcw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/store'
import type { RootState } from '@/store'
import { getAllCategories } from '@/store/slices/admin/categorySlice'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { Pagination } from '@/components/pagination'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CategoryTree } from './components/category-tree'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'

export type DrillPath = {
  level: 'main' | 'category'| 'subcategory'
  mainId?: string
  mainName?: string
  categoryId?: string
  categoryName?: string
}

function AdminCategoryPage() {
  const dispatch = useDispatch<AppDispatch>()
  const MAIN_CATEGORY_PAGE_SIZE = 100

  const { categories, loading, error, pagination } = useSelector(
    (state: any) => state.categories
  )
  const token = useSelector((state: RootState) => state.auth?.token)
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isAdmin = role === 'admin'
  const totalPages = pagination?.totalPages || 1
  const limit = 100
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [mainFilter, setMainFilter] = useState('all')
  const [statsOpen, setStatsOpen] = useState(false)
  
  const [drillPath, setDrillPath] = useState<DrillPath>({ level: 'main' })

  const [mainCategoryOptions, setMainCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([])
  const [backendTotals, setBackendTotals] = useState({
    mainCategories: 0,
    categories: 0,
    subcategories: 0,
  })
  const mainCategoryTotal =
    backendTotals.mainCategories || mainCategoryOptions.length
  const categoryTotal = backendTotals.categories || pagination?.total || 0
  const subcategoryTotal = backendTotals.subcategories
  const totalRows = pagination?.total || 0

  const refreshCategories = useCallback(() => {
    dispatch(
      getAllCategories({
        page,
        limit,
        search: searchQuery || undefined,
        level: typeFilter || undefined,
        main_category_id: mainFilter || undefined,
      })
    )
  }, [dispatch, limit, mainFilter, page, searchQuery, typeFilter])

  useEffect(() => {
    refreshCategories()
  }, [refreshCategories])

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const allRows: any[] = []
        let nextPage = 1
        let totalPagesForMain = 1

        do {
          const res = await axios.get(
            `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/getall`,
            {
              params: {
                page: nextPage,
                limit: MAIN_CATEGORY_PAGE_SIZE,
              },
              headers,
            }
          )

          const list = Array.isArray(res.data?.data) ? res.data.data : []
          allRows.push(...list)
          totalPagesForMain = Number(res.data?.pagination?.totalPages || 1)
          nextPage += 1
        } while (nextPage <= totalPagesForMain)

        setMainCategoryOptions(
          allRows.map((item: any) => ({
            value: item?._id || item?.name || '',
            label: item?.name || item?.slug || item?._id,
          }))
        )
        setBackendTotals((prev) => ({
          ...prev,
          mainCategories: allRows.length,
        }))
      } catch {
        setMainCategoryOptions([])
      }
    }
    fetchMainCategories()
  }, [token])

  useEffect(() => {
    const fetchGlobalTotals = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        const [categoriesRes, subcategoriesRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/getall`,
            {
              params: { page: 1, limit: 1, level: 'category' },
              headers,
            }
          ),
          axios.get(
            `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/getall`,
            {
              params: { page: 1, limit: 1 },
              headers,
            }
          ),
        ])

        setBackendTotals((prev) => ({
          ...prev,
          categories: Number(
            categoriesRes.data?.pagination?.total ??
              categoriesRes.data?.data?.length ??
              0
          ),
          subcategories: Number(
            subcategoriesRes.data?.pagination?.total ??
              subcategoriesRes.data?.data?.length ??
              0
          ),
        }))
      } catch {
        // noop: keep existing fallback values
      }
    }

    fetchGlobalTotals()
  }, [token])

  const statsItems = [
    {
      label: 'Main Categories',
      value: mainCategoryTotal,
      helper: 'Global count of main category levels.',
    },
    {
      label: 'Categories',
      value: categoryTotal,
      helper: 'Total category level items.',
    },
    {
      label: 'Subcategories',
      value: subcategoryTotal,
      helper: 'Count of active subcategories.',
    },
    {
      label: 'Showing',
      value: categories?.length || 0,
      helper: 'Current items in the table below.',
    },
  ]

  const Breadcrumbs = () => (
    <nav className='flex items-center gap-1.5 py-1 text-sm text-slate-500'>
      <button
        type='button'
        onClick={() => setDrillPath({ level: 'main' })}
        className={`flex items-center gap-1.5 transition hover:text-indigo-600 ${
          drillPath.level === 'main' ? 'font-bold text-slate-900' : ''
        }`}
      >
        <Home className='h-3.5 w-3.5' />
        All Main
      </button>

      {drillPath.mainId ? (
        <>
          <ChevronRight className='h-3.5 w-3.5 opacity-60' />
          <button
            type='button'
            onClick={() =>
              setDrillPath({
                level: 'category',
                mainId: drillPath.mainId,
                mainName: drillPath.mainName,
              })
            }
            className={`transition hover:text-indigo-600 ${
              drillPath.level === 'category' ? 'font-bold text-slate-900' : ''
            }`}
          >
            {drillPath.mainName}
          </button>
        </>
      ) : null}

      {drillPath.categoryId ? (
        <>
          <ChevronRight className='h-3.5 w-3.5 opacity-60' />
          <span className='font-bold text-slate-900'>{drillPath.categoryName}</span>
        </>
      ) : null}
    </nav>
  )

  return (
    <UsersProvider>
      <TablePageHeader title='Category List'>
        <Button
          variant='outline'
          className='ms-auto shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          variant='outline'
          className='shrink-0'
          onClick={refreshCategories}
          disabled={loading}
        >
          {loading ? (
            'Refreshing...'
          ) : (
            <>
              <RefreshCcw className='mr-2 h-4 w-4' />
              Refresh
            </>
          )}
        </Button>
        {isAdmin ? <UsersPrimaryButtons /> : null}
      </TablePageHeader>

      <Main className='font-manrope relative flex flex-1 flex-col gap-4 overflow-x-clip pb-10 sm:gap-6'>
        <section className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5'>
          <div className='flex flex-col gap-3'>
            <Breadcrumbs />
            <div className='flex flex-wrap items-center gap-3'>
              <div className='min-w-0 flex-1'>
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder='Search main/category/subcategory, slug, or meta...'
                  className='h-11 rounded-xl border-slate-300 bg-white'
                />
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPage(1)
                  }}
                  className='h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none hover:border-slate-400'
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
                  className='h-11 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none hover:border-slate-400'
                >
                  <option value='all'>All main categories</option>
                  {mainCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter('all')
                    setMainFilter('all')
                    setPage(1)
                  }}
                  className='h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Reset
                </button>
              </div>
              <div className='flex items-center text-xs font-semibold text-slate-500'>
                Showing {categories?.length || 0} / {totalRows}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className='rounded-2xl border border-slate-200 bg-white/90 px-4 py-12 text-center text-slate-500 shadow-sm'>
            Loading categories...
          </div>
        ) : error ? (
          <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-12 text-center text-red-600 shadow-sm'>
            {error || 'Error loading categories.'}
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white/90 px-4 py-12 text-center text-slate-500 shadow-sm'>
            No categories found.
          </div>
        ) : (
          <>
            <section className='rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-4'>
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2 px-1'>
                <h3 className='text-sm font-bold tracking-[0.12em] text-slate-600 uppercase'>
                  {drillPath.level === 'main'
                    ? 'Main Category List'
                    : drillPath.level === 'category'
                      ? `Categories in ${drillPath.mainName}`
                      : `Subcategories in ${drillPath.categoryName}`}
                </h3>
              </div>
              <div className='max-h-[70vh] min-h-[560px] overflow-auto'>
                <CategoryTree
                  categories={categories}
                  onRefresh={refreshCategories}
                  canEdit={isAdmin}
                  drillPath={drillPath}
                  setDrillPath={setDrillPath}
                />
              </div>
            </section>

            <section className='rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm'>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={loading}
              />
            </section>
          </>
        )}
      </Main>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Category Statistics'
        description='Detailed count of all main, category, and subcategory records.'
        items={statsItems}
      />
      {isAdmin ? <UsersDialogs /> : null}
    </UsersProvider>
  )
}

export function Category() {
  const navigate = useNavigate()
  const role = String(
    useSelector((state: RootState) => state.auth?.user?.role || '')
  ).toLowerCase()

  useEffect(() => {
    if (role === 'vendor') {
      void navigate({ to: '/products', replace: true })
    }
  }, [navigate, role])

  if (role === 'vendor') {
    return null
  }

  return <AdminCategoryPage />
}
