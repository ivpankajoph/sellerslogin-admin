/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { CategoryTree } from './components/category-tree'
import { useEffect, useState } from 'react'
import { AppDispatch } from '@/store'
import { useDispatch, useSelector } from 'react-redux'
import { getAllCategories } from '@/store/slices/admin/categorySlice'
import { Pagination } from '@/components/pagination'
import { Input } from '@/components/ui/input'
import axios from 'axios'

import type { RootState } from '@/store'

export function Category() {
  const dispatch = useDispatch<AppDispatch>()

  const { categories, loading, error, pagination } = useSelector(
    (state: any) => state.categories
  )
  const token = useSelector((state: RootState) => state.auth?.token)
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isAdmin = role === 'admin'
  const totalPages = pagination?.totalPages || 1
  const limit = 10
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [mainFilter, setMainFilter] = useState('all')
  const [mainCategoryOptions, setMainCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([])
  const mainCategoryTotal = categories?.length
    ? new Set(
        categories.map(
          (cat: any) => cat?.mainCategory?._id || cat?.mainCategory?.name || 'unassigned'
        )
      ).size
    : 0

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
        const res = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/getall`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        const list = res.data?.data || []
        setMainCategoryOptions(
          list.map((item: any) => ({
            value: item?._id || item?.name || '',
            label: item?.name || item?.slug || item?._id,
          }))
        )
      } catch {
        setMainCategoryOptions([])
      }
    }
    fetchMainCategories()
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

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Category List</h2>
            <p className='text-muted-foreground'>
              Manage your categories here.
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Total main categories: {mainCategoryTotal}
            </p>
          </div>
          {isAdmin ? <UsersPrimaryButtons /> : null}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            placeholder='Search main/category/subcategory, slug, or meta...'
            className='w-72'
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
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
            className='h-10 min-w-[190px] rounded-md border border-input bg-background px-3 text-sm'
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
            className='h-10 rounded-md border border-input bg-background px-3 text-sm text-slate-700 hover:bg-muted'
          >
            Reset
          </button>
          <div className='text-xs text-muted-foreground'>
            Showing {categories?.length || 0} / {pagination?.total || 0}
          </div>
        </div>

        {/* ✅ Handle loading, error, and empty states */}
        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Loading categories...</p>
        ) : error ? (
          <p className="text-center py-10 text-red-500">
            {error || 'Error loading categories.'}
          </p>
        ) : !categories || categories.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No categories found.</p>
        ) : (
          <>
            <CategoryTree
              categories={categories}
              onRefresh={refreshCategories}
              canEdit={isAdmin}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          </>
        )}
      </Main>

      {isAdmin ? <UsersDialogs /> : null}
    </UsersProvider>
  )
}
