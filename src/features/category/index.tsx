/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from 'framer-motion'
import { ListFilter, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Pagination } from '@/components/pagination'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Input } from '@/components/ui/input'
import { AppDispatch } from '@/store'
import { getAllCategories } from '@/store/slices/admin/categorySlice'
import { CategoryTree } from './components/category-tree'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import type { RootState } from '@/store'

export function Category() {
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
  const [mainCategoryOptions, setMainCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([])
  const [backendTotals, setBackendTotals] = useState({
    mainCategories: 0,
    categories: 0,
    subcategories: 0,
  })
  const mainCategoryTotal = backendTotals.mainCategories || mainCategoryOptions.length
  const categoryTotal = backendTotals.categories || pagination?.total || 0
  const subcategoryTotal = backendTotals.subcategories
  const totalRows = pagination?.total || 0

  const refreshCategories = () => {
    dispatch(
      getAllCategories({
        page,
        limit,
        search: searchQuery || undefined,
        level: typeFilter || undefined,
        main_category_id: mainFilter || undefined,
      })
    )
  }

  useEffect(() => {
    refreshCategories()
  }, [dispatch, page, limit, searchQuery, typeFilter, mainFilter])

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
          axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/getall`, {
            params: { page: 1, limit: 1, level: 'category' },
            headers,
          }),
          axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/getall`, {
            params: { page: 1, limit: 1 },
            headers,
          }),
        ])

        setBackendTotals((prev) => ({
          ...prev,
          categories: Number(
            categoriesRes.data?.pagination?.total ?? categoriesRes.data?.data?.length ?? 0
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

  return (
    <UsersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='relative flex flex-1 flex-col gap-5 overflow-x-clip pb-10 font-manrope sm:gap-6'>
        <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
          <div className='absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl' />
          <div className='absolute -right-20 top-10 h-96 w-96 rounded-full bg-indigo-300/15 blur-3xl' />
          <div className='absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl' />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/75 via-white to-indigo-50/65 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)]'
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700'>
                <Sparkles className='h-3.5 w-3.5' />
                Catalog Console
              </div>
              <h2 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
                Category List
              </h2>
              <p className='mt-1 text-sm text-slate-600 sm:text-base'>
                Manage all category levels in a tabular drill-down workflow.
              </p>
            </div>

            <div className='flex flex-wrap items-end justify-end gap-2'>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                  <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                    Main Categories
                  </div>
                  <div className='text-lg font-bold text-slate-900'>{mainCategoryTotal}</div>
                </div>
                <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                  <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                    Categories
                  </div>
                  <div className='text-lg font-bold text-slate-900'>
                    {categoryTotal}
                  </div>
                </div>
                <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                  <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                    Subcategories
                  </div>
                  <div className='text-lg font-bold text-slate-900'>{subcategoryTotal}</div>
                </div>
                <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                  <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                    Showing
                  </div>
                  <div className='text-lg font-bold text-slate-900'>{categories?.length || 0}</div>
                </div>
              </div>
              {isAdmin ? <UsersPrimaryButtons /> : null}
            </div>
          </div>
        </motion.section>

        <section className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5'>
          <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600'>
            <ListFilter className='h-3.5 w-3.5' />
            Smart Filters
          </div>
          <div className='grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_190px_240px_auto_auto]'>
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder='Search main/category/subcategory, slug, or meta...'
              className='h-11 rounded-xl border-slate-300 bg-white'
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className='h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700'
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
              className='h-11 min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700'
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
            <div className='flex items-center text-xs font-semibold text-slate-500'>
              Showing {categories?.length || 0} / {totalRows}
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
                <h3 className='text-sm font-bold uppercase tracking-[0.12em] text-slate-600'>
                  Category Table
                </h3>
                <div className='text-xs text-slate-500'>
                  Click a main row action to open categories, then subcategories.
                </div>
              </div>
              <div className='max-h-[70vh] min-h-[560px] overflow-auto'>
                <CategoryTree
                  categories={categories}
                  onRefresh={refreshCategories}
                  canEdit={isAdmin}
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

      {isAdmin ? <UsersDialogs /> : null}
    </UsersProvider>
  )
}
