import { useQuery } from '@tanstack/react-query'
import { Main } from '@/components/layout/main'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildApiUrl } from '../analytics-hub/lib/api'
import { getQueryFn } from '../analytics-hub/lib/query'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { buildDatedFilename, downloadExcelFile, type ExcelColumn } from '@/lib/excel-export'

interface TukkaVendor {
  _id: string
  name: string
  email: string
  phone: string
  registrar_name: string // Company Name
  city: string
  business_nature: string[]
  is_active: boolean
  is_verified: boolean
  createdAt: string
}

const tukkaExportColumns: ExcelColumn<TukkaVendor>[] = [
  { header: 'Registration ID', value: '_id' },
  { header: 'Date', value: (vendor) => format(new Date(vendor.createdAt), 'dd MMM yyyy HH:mm') },
  { header: 'Name', value: 'name' },
  { header: 'Company', value: 'registrar_name' },
  { header: 'Email', value: 'email' },
  { header: 'Phone', value: 'phone' },
  { header: 'City', value: 'city' },
  { header: 'Goals', value: (vendor) => vendor.business_nature?.[0] || '' },
  { header: 'Sold Online', value: (vendor) => vendor.business_nature?.[1] || '' },
  { header: 'Business Nature', value: (vendor) => vendor.business_nature?.join(', ') || '' },
  { header: 'Payment Status', value: (vendor) => (vendor.is_active ? 'Paid' : 'Pending') },
  { header: 'Verified', value: (vendor) => vendor.is_verified },
  { header: 'Active', value: (vendor) => vendor.is_active },
]

export default function TukkaSubmissions() {
  const queryFn = getQueryFn<{ success: boolean; vendors: TukkaVendor[] }>()
  
  const { data, isLoading } = useQuery({
    queryKey: [buildApiUrl('/vendors/tukka-submissions')],
    queryFn,
  })

  const vendors = data?.vendors || []

  const handleDownloadExcel = () => {
    downloadExcelFile({
      filename: buildDatedFilename('tukka-registrations'),
      sheetName: 'Tukka Registrations',
      columns: tukkaExportColumns,
      rows: vendors,
    })
  }

  return (
    <div className='flex flex-col h-full'>
      <Main className='flex-1 gap-4 overflow-auto'>
        <Card className='rounded-none'>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle>Recent Submissions</CardTitle>
            <Button
              variant='outline'
              className='rounded-none'
              disabled={isLoading || !vendors.length}
              onClick={handleDownloadExcel}
            >
              <Download className='h-4 w-4' />
              Download Excel
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">Loading registrations...</div>
            ) : (
              <div className="rounded-none border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor._id}>
                        <TableCell className="font-medium">
                          {format(new Date(vendor.createdAt), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{vendor.name || 'N/A'}</TableCell>
                        <TableCell>{vendor.registrar_name || 'N/A'}</TableCell>
                        <TableCell>{vendor.email || 'N/A'}</TableCell>
                        <TableCell>{vendor.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                            {vendor.is_active ? 'Paid' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className='rounded-none'>View Details</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-none">
                              <DialogHeader>
                                <DialogTitle>Submission Details: {vendor.name}</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Company</span>
                                  <span className="col-span-3 text-sm">{vendor.registrar_name || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Email</span>
                                  <span className="col-span-3 text-sm">{vendor.email || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Phone</span>
                                  <span className="col-span-3 text-sm">{vendor.phone || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">City</span>
                                  <span className="col-span-3 text-sm">{vendor.city || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Goals</span>
                                  <span className="col-span-3 text-sm text-wrap">{vendor.business_nature?.[0] || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4 border-b pb-2">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Sold Online</span>
                                  <span className="col-span-3 text-sm">{vendor.business_nature?.[1] || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-semibold text-muted-foreground uppercase text-[10px]">Payment Status</span>
                                  <span className="col-span-3">
                                    <Badge variant={vendor.is_active ? 'default' : 'secondary'} className='rounded-none'>
                                      {vendor.is_active ? 'Success / Activated' : 'Payment Pending'}
                                    </Badge>
                                  </span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vendors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                          No Tukka registrations found yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </div>
  )
}
