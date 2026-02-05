"use client"

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null

  return (
    <div className='mt-8 flex items-center justify-center'>
      <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm'>
        <button
          type='button'
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className='rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
        >
          Previous
        </button>
        <div className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>
          Page {page} of {totalPages}
        </div>
        <button
          type='button'
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          className='rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
        >
          Next
        </button>
      </div>
    </div>
  )
}
