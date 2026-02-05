import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Filter } from 'lucide-react'
// Import Redux hooks
import { useSelector } from 'react-redux'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent } from '@/components/ui/tabs'

// -------------------- Types --------------------

export type SpecRow = {
  _id: string // Added for unique identification
  key: string
  value: string
  type: 'text' | 'number' | 'boolean' | 'select'

  options: string[]
  required: boolean
  group: string
}

export type SpecificationsPayload = {
  specifications: Array<{ key: string; value: string }> // what your backend expects
  raw: SpecRow[] // richer UI model (not required by backend, but handy if you want to store it)
}

// -------------------- Row Component (Modified) --------------------

const Row: React.FC<{
  row: SpecRow
  onChange: (next: Partial<SpecRow>) => void // Only allow changing value and required
  onDelete: () => void
  onDuplicate: () => void
}> = ({ row, onChange }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className='grid grid-cols-12 gap-2 rounded-2xl border p-3 md:p-4'
    >
      {/* Key - Read-only */}
      <div className='col-span-12 space-y-2 md:col-span-3'>
        <Label>Key</Label>
        <Input
          value={row.key}
          readOnly
          className='bg-muted cursor-not-allowed'
        />
      </div>

      {/* Value - Editable */}
      <div className='col-span-12 space-y-2 md:col-span-3'>
        <Label>Value</Label>
        {row.type === 'boolean' ? (
          <div className='flex items-center gap-3 pt-2'>
            <Switch
              checked={row.value === 'true'}
              onCheckedChange={(v) => onChange({ value: v ? 'true' : 'false' })}
            />
            <Badge variant='secondary'>
              {row.value === 'true' ? 'Yes' : 'No'}
            </Badge>
          </div>
        ) : (
          <Input
            placeholder={`Enter ${row.key}`}
            value={row.value}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        )}
      </div>

      {/* Type - Read-only */}
      <div className='col-span-6 space-y-2 md:col-span-2'>
        <Label>Type</Label>
        <Select value={row.type} disabled>
          <SelectTrigger>
            <SelectValue placeholder={row.type} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text'>Text</SelectItem>
            <SelectItem value='number'>Number</SelectItem>
            <SelectItem value='boolean'>Boolean</SelectItem>
            <SelectItem value='select'>Select</SelectItem>
          </SelectContent>
        </Select>
      </div>



      {/* Group - Read-only */}
      <div className='col-span-12 space-y-2 md:col-span-2'>
        <Label>Group</Label>
        <Input
          value={row.group}
          readOnly
          className='bg-muted cursor-not-allowed'
        />
      </div>

      {/* Options - Read-only (if select) */}
      {row.type === 'select' && (
        <div className='col-span-12 space-y-2'>
          <Label>Options (comma separated)</Label>
          <Input
            value={row.options.join(', ')}
            readOnly
            className='bg-muted cursor-not-allowed'
          />
        </div>
      )}

      {/* Required Toggle & Actions */}
      <div className='col-span-12 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Switch
              checked={row.required}
              onCheckedChange={(v) => onChange({ required: v })}
            />
            <Label className='text-sm'>Required</Label>
          </div>
        </div>
        <div className='flex items-center gap-2'></div>
      </div>
    </motion.div>
  )
}

// -------------------- Main Component (Modified) --------------------

export default function SpecificationSection() {
  // Get specs from Redux store
  const reduxSpecs = useSelector(
    (state: any) => state?.specifications?.specs || []
  )

  // Local state to track user-entered values and required status
  const [localRows, setLocalRows] = useState<SpecRow[]>([])

useEffect(() => {
  // Only process if there are specs and they have content
  if (reduxSpecs.length > 0 && reduxSpecs.some((cat: any) => cat.specs && cat.specs.length > 0)) {
    const initializedRows = reduxSpecs.flatMap((category: any) => 
      category.specs.map((spec: any) => ({
        _id: spec._id || Date.now().toString(),
        key: spec.key || '', 
        value: '', 
        type: 'text',
      
        options: [], 
        required: false, 
        group: category.title || 'General',
      }))
    );
    setLocalRows(initializedRows);
  } else {
    // Clear the local rows when no specs are available
    setLocalRows([]);
  }
}, [reduxSpecs])

  const [filter, setFilter] = useState('')

  // Filter rows based on key, group, or value
  const filteredRows = useMemo(
    () =>
      localRows.filter((r) =>
        `${r.key} ${r.group} ${r.value}`
          .toLowerCase()
          .includes(filter.toLowerCase())
      ),
    [localRows, filter]
  )

  // Update a specific row's value or required status
  const updateRow = (id: string, next: Partial<SpecRow>) => {
    setLocalRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, ...next } : r))
    )
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>
            Product Specifications
          </h2>
          <p className='text-muted-foreground text-sm'>
            Fill in the values for the predefined specifications. Export as
            key/value for your backend.
          </p>
        </div>
      </div>

      <Tabs defaultValue='editor' className='w-full'>
        <TabsContent value='editor' className='space-y-4'>
          <Card className='border-dashed'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-lg'>Specification Rows</CardTitle>
              <CardDescription>
                Fill in the values for each predefined specification.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='hidden items-center gap-2 md:flex'>
                    <Badge variant='secondary'>Total: {localRows.length}</Badge>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <Filter className='text-muted-foreground h-4 w-4' />
                  <Input
                    placeholder='Filter by key/value/group'
                    className='w-[260px]'
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <ScrollArea className='h-[520px] rounded-2xl border p-3'>
                <div className='grid gap-3'>
                  {filteredRows.length === 0 && (
                    <p className='text-muted-foreground text-center text-sm'>
                      No specifications found. Please check the Redux store.
                    </p>
                  )}

                  {filteredRows.map((r) => (
                    <Row
                      key={r._id}
                      row={r}
                      onChange={(next) => updateRow(r._id, next)}
                      onDelete={function (): void {
                        throw new Error('Function not implemented.')
                      }}
                      onDuplicate={function (): void {
                        throw new Error('Function not implemented.')
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Tips</CardTitle>
          <CardDescription>
            • The specification keys are predefined by the system. • Enter the
            corresponding <span className='font-medium'>Value</span> for each
            key. • Use the <span className='font-medium'>Required</span> toggle
            to mark mandatory fields.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
