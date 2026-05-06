import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { Download } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { cn, getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  className?: string
}

export function DataTablePagination<TData>({
  table,
  className,
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Look for the portal element placed by TablePageHeader
    const target = document.getElementById('table-export-portal')
    if (target) {
      setPortalTarget(target)
    }
  }, [])

  const exportToCsv = () => {
    const columns = table.getAllLeafColumns().filter(
      (col) => col.getIsVisible() && col.id !== 'select' && col.id !== 'actions'
    )

    const headers = columns.map((col) => {
      if (typeof col.columnDef.header === 'string') {
        return col.columnDef.header
      }
      return col.id
    })

    const rows = table.getFilteredRowModel().rows.map((row) => {
      return columns.map((col) => {
        let value = row.getValue(col.id)
        if (value === null || value === undefined) {
          value = ''
        } else if (typeof value === 'object') {
          value = JSON.stringify(value)
        } else {
          value = String(value)
        }
        value = String(value).replace(/"/g, '""')
        return `"${value}"`
      })
    })

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'data_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2',
        '@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4',
        className
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex w-[100px] items-center justify-center text-sm font-medium @2xl/content:hidden'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center gap-2 @max-2xl/content:flex-row-reverse'>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className='h-8 w-[70px]'>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='hidden text-sm font-medium sm:block'>Rows per page</p>
          {!portalTarget && (
            <Button
              variant='outline'
              size='sm'
              className='h-8 ml-4'
              onClick={exportToCsv}
            >
              <Download className='mr-2 h-4 w-4' />
              Excel
            </Button>
          )}
        </div>
      </div>

      <div className='flex items-center sm:space-x-6 lg:space-x-8'>
        <div className='flex w-[100px] items-center justify-center text-sm font-medium @max-3xl/content:hidden'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>Go to first page</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='text-muted-foreground px-1 text-sm'>...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 px-2'
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                >
                  <span className='sr-only'>Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>Go to last page</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
      
      {portalTarget
        ? createPortal(
            <Button
              variant='outline'
              className='shrink-0 h-10 gap-2 shadow-sm'
              onClick={exportToCsv}
            >
              <Download className='h-4 w-4' />
              <span className='hidden sm:inline'>Excel</span>
            </Button>,
            portalTarget
          )
        : null}
    </div>
  )
}
