/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { buildDatedFilename, downloadExcelFile, type ExcelColumn } from '@/lib/excel-export'
import { vendorColumns as columns } from './users-columns'

type DataTableProps = {
  data: any[]
  search: Record<string, unknown>
  navigate: NavigateFn
}

const formatDateTime = (value: unknown) => {
  const date = value ? new Date(String(value)) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-IN') : ''
}

const joinList = (value: unknown) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return String(value ?? '')
}

const vendorExportColumns: ExcelColumn<any>[] = [
  { header: 'Vendor ID', value: (row) => row._id || row.id },
  { header: 'Vendor Name', value: (row) => row.name || row.business_name || row.registrar_name },
  { header: 'Email', value: 'email' },
  { header: 'Phone', value: 'phone' },
  { header: 'Password', value: (row) => row.plain_password || row.password },
  { header: 'Business Type', value: 'business_type' },
  { header: 'Business Nature', value: (row) => joinList(row.business_nature) },
  { header: 'Established Year', value: 'established_year' },
  { header: 'GST Number', value: 'gst_number' },
  { header: 'PAN Number', value: 'pan_number' },
  { header: 'Verified', value: (row) => Boolean(row.is_verified) },
  { header: 'Active', value: (row) => Boolean(row.is_active) },
  { header: 'Email Verified', value: (row) => Boolean(row.is_email_verified) },
  { header: 'Profile Completed', value: (row) => Boolean(row.is_profile_completed) },
  { header: 'Profile Completion %', value: 'profile_complete_level' },
  { header: 'Categories', value: (row) => joinList(row.categories) },
  { header: 'Alternate Contact Name', value: 'alternate_contact_name' },
  { header: 'Alternate Contact Phone', value: 'alternate_contact_phone' },
  { header: 'Address', value: 'address' },
  { header: 'Street', value: 'street' },
  { header: 'City', value: 'city' },
  { header: 'State', value: 'state' },
  { header: 'Pincode', value: 'pincode' },
  { header: 'Country', value: 'country' },
  { header: 'Dealing Area', value: 'dealing_area' },
  { header: 'Annual Turnover', value: 'annual_turnover' },
  { header: 'Office Employees', value: 'office_employees' },
  { header: 'Operating Hours', value: 'operating_hours' },
  { header: 'Return Policy', value: 'return_policy' },
  { header: 'Bank Name', value: 'bank_name' },
  { header: 'Bank Account', value: 'bank_account' },
  { header: 'IFSC Code', value: 'ifsc_code' },
  { header: 'Branch', value: 'branch' },
  { header: 'UPI ID', value: 'upi_id' },
  { header: 'GST Certificate', value: 'gst_cert' },
  { header: 'PAN Card', value: 'pan_card' },
  { header: 'Created At', value: (row) => formatDateTime(row.createdAt) },
  { header: 'Updated At', value: (row) => formatDateTime(row.updatedAt) },
]

export function UsersTable({ data, search, navigate }: DataTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const visibleColumns = columns.filter((column) => column.id !== 'select')

  // Local state management for table (uncomment to use local-only state, not synced with URL)
  // const [columnFilters, onColumnFiltersChange] = useState<ColumnFiltersState>([])
  // const [pagination, onPaginationChange] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  // Synced with URL states (keys/defaults mirror users route search schema)
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      // name per-column text filter
      { columnId: 'name', searchKey: 'name', type: 'string' },
      { columnId: 'is_active', searchKey: 'is_active', type: 'array' },
      { columnId: 'is_verified', searchKey: 'is_verified', type: 'array' },
    ],
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
    onPaginationChange,
    onColumnFiltersChange,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  const handleDownloadExcel = () => {
    downloadExcelFile({
      filename: buildDatedFilename('vendors'),
      sheetName: 'Vendors',
      columns: vendorExportColumns,
      rows: data,
    })
  }

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16', // Add margin bottom to the table on mobile when the toolbar is visible
        'flex flex-1 flex-col gap-4'
      )}
    >
      <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
        <div className='min-w-0 flex-1'>
          <DataTableToolbar
            table={table}
            searchKey='name'
            showViewOptions={true}
            filters={[
              {
                columnId: 'is_active',
                title: 'Status',
                options: [
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' },
                ],
              },
              {
                columnId: 'is_verified',
                title: 'Verfication',
                options: [
                  { label: 'Verified', value: 'true' },
                  { label: 'Unverified', value: 'false' },
                ],
              },
            ]}
          />
        </div>
        <Button
          variant='outline'
          className='rounded-none xl:ml-3'
          disabled={!data.length}
          onClick={handleDownloadExcel}
        >
          <Download className='h-4 w-4' />
          Download Excel
        </Button>
      </div>
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className='group/row'>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
