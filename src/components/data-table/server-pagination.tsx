import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { cn, getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ServerPaginationProps = {
  page: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  disabled?: boolean
  className?: string
}

export function ServerPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 40, 50],
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className,
}: ServerPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages)
  const pageNumbers = getPageNumbers(currentPage, safeTotalPages)
  const canGoPrevious = !disabled && currentPage > 1
  const canGoNext = !disabled && currentPage < safeTotalPages

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2',
        '@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4',
        className,
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex w-[140px] items-center justify-center text-sm font-medium @2xl/content:hidden'>
          Page {currentPage} of {safeTotalPages}
        </div>
        <div className='flex items-center gap-2 text-sm text-muted-foreground @max-2xl/content:flex-row-reverse'>
          {typeof totalItems === 'number' && (
            <span className='hidden sm:block'>{totalItems} total</span>
          )}
          {onPageSizeChange && typeof pageSize === 'number' && (
            <>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value))
                }}
                disabled={disabled}
              >
                <SelectTrigger className='h-8 w-[70px]'>
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side='top'>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='hidden font-medium sm:block'>Rows per page</p>
            </>
          )}
        </div>
      </div>

      <div className='flex items-center sm:space-x-6 lg:space-x-8'>
        <div className='flex w-[140px] items-center justify-center text-sm font-medium @max-3xl/content:hidden'>
          Page {currentPage} of {safeTotalPages}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
          >
            <span className='sr-only'>Go to first page</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='px-1 text-sm text-muted-foreground'>...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 px-2'
                  onClick={() => onPageChange(pageNumber as number)}
                  disabled={disabled}
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
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => onPageChange(safeTotalPages)}
            disabled={!canGoNext}
          >
            <span className='sr-only'>Go to last page</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
