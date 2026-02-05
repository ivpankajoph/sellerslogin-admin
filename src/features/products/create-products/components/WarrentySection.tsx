import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Copy, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// -------------------- Types --------------------

export type WarrantyRow = {
  key: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date';
  unit: string;
  options: string[];
  required: boolean;
  group: string;
  description: string;
}

export type WarrantyPayload = {
  warranties: Array<{ key: string; value: string; description: string }>;
  raw: WarrantyRow[];
}

// -------------------- Category-based templates --------------------

const warrantyCategoryTemplates: Record<string, WarrantyRow[]> = {
  electronics: [
    { 
      key: 'Warranty Period', 
      value: '', 
      type: 'number', 
      unit: 'months', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Standard warranty period for electronic devices'
    },
    { 
      key: 'Extended Warranty', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Options',
      description: 'Option to extend warranty period'
    },
    { 
      key: 'Warranty Type', 
      value: '', 
      type: 'select', 
      unit: '', 
      options: ['Manufacturer', 'Retailer', 'Third Party'], 
      required: true, 
      group: 'Details',
      description: 'Type of warranty provider'
    },
    { 
      key: 'Warranty Start Date', 
      value: '', 
      type: 'date', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Date when warranty coverage starts'
    },
    { 
      key: 'Coverage Area', 
      value: '', 
      type: 'select', 
      unit: '', 
      options: ['Global', 'Regional', 'Local'], 
      required: false, 
      group: 'Coverage',
      description: 'Geographic area covered by warranty'
    },
    { 
      key: 'Repair Policy', 
      value: '', 
      type: 'select', 
      unit: '', 
      options: ['Replace', 'Repair', 'Refund'], 
      required: false, 
      group: 'Service',
      description: 'Policy for handling warranty claims'
    },
    { 
      key: 'Warranty Registration', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Process',
      description: 'Whether registration is required for warranty'
    },
  ],
  clothing: [
    { 
      key: 'Return Period', 
      value: '30', 
      type: 'number', 
      unit: 'days', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Period for returning clothing items'
    },
    { 
      key: 'Defect Coverage', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Coverage',
      description: 'Coverage for manufacturing defects'
    },
    { 
      key: 'Warranty Type', 
      value: 'Return Policy', 
      type: 'text', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Details',
      description: 'Type of warranty policy'
    },
    { 
      key: 'Wash Instructions', 
      value: '', 
      type: 'text', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Care',
      description: 'Care instructions affecting warranty'
    },
    { 
      key: 'Condition Required', 
      value: 'Like New', 
      type: 'select', 
      unit: '', 
      options: ['Like New', 'Unused', 'Minor Wear'], 
      required: false, 
      group: 'Requirements',
      description: 'Condition required for return/warranty'
    },
  ],
  furniture: [
    { 
      key: 'Warranty Period', 
      value: '', 
      type: 'number', 
      unit: 'years', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Standard warranty period for furniture'
    },
    { 
      key: 'Structural Warranty', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Coverage',
      description: 'Coverage for structural defects'
    },
    { 
      key: 'Warranty Type', 
      value: '', 
      type: 'select', 
      unit: '', 
      options: ['Frame', 'Upholstery', 'Full'], 
      required: true, 
      group: 'Details',
      description: 'Type of warranty coverage'
    },
    { 
      key: 'Assembly Coverage', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Service',
      description: 'Coverage for assembly issues'
    },
    { 
      key: 'Maintenance Required', 
      value: 'false', 
      type: 'boolean', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Requirements',
      description: 'Whether maintenance is required for warranty'
    },
    { 
      key: 'Warranty Start Date', 
      value: '', 
      type: 'date', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Date when warranty coverage starts'
    },
  ],
  default: [
    { 
      key: 'Warranty Period', 
      value: '', 
      type: 'number', 
      unit: 'months', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Standard warranty period'
    },
    { 
      key: 'Warranty Type', 
      value: '', 
      type: 'text', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Details',
      description: 'Type of warranty'
    },
    { 
      key: 'Warranty Start Date', 
      value: '', 
      type: 'date', 
      unit: '', 
      options: [], 
      required: true, 
      group: 'Duration',
      description: 'Date when warranty coverage starts'
    },
    { 
      key: 'Coverage Area', 
      value: '', 
      type: 'text', 
      unit: '', 
      options: [], 
      required: false, 
      group: 'Coverage',
      description: 'Geographic area covered by warranty'
    },
  ]
}

// -------------------- Row Component --------------------

const WarrantyRow: React.FC<{
  row: WarrantyRow
  onChange: (next: WarrantyRow) => void
  onDelete: () => void
  onDuplicate: () => void
}> = ({ row, onChange, onDelete, onDuplicate }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className='grid grid-cols-12 gap-2 rounded-2xl border p-3 md:p-4'
    >
      <div className='col-span-12 space-y-2 md:col-span-3'>
        <Label>Key</Label>
        <Input
          placeholder='e.g. Warranty Period'
          value={row.key}
          onChange={(e) => onChange({ ...row, key: e.target.value })}
        />
      </div>

      <div className='col-span-12 space-y-2 md:col-span-3'>
        <Label>Value</Label>
        {row.type === 'boolean' ? (
          <div className='flex items-center gap-3 pt-2'>
            <Switch
              checked={row.value === 'true'}
              onCheckedChange={(v) =>
                onChange({ ...row, value: v ? 'true' : 'false' })
              }
            />
            <Badge variant='secondary'>
              {row.value === 'true' ? 'Yes' : 'No'}
            </Badge>
          </div>
        ) : row.type === 'date' ? (
          <Input
            type="date"
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
          />
        ) : (
          <Input
            placeholder='e.g. 24'
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
          />
        )}
      </div>

      <div className='col-span-6 space-y-2 md:col-span-2'>
        <Label>Type</Label>
        <Select
          value={row.type}
          onValueChange={(v) => onChange({ ...row, type: v as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder='Choose' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text'>Text</SelectItem>
            <SelectItem value='number'>Number</SelectItem>
            <SelectItem value='boolean'>Boolean</SelectItem>
            <SelectItem value='select'>Select</SelectItem>
            <SelectItem value='date'>Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='col-span-6 space-y-2 md:col-span-2'>
        <Label>Unit</Label>
        <Input
          placeholder='e.g. months, years'
          value={row.unit}
          onChange={(e) => onChange({ ...row, unit: e.target.value })}
        />
      </div>

      <div className='col-span-12 space-y-2 md:col-span-2'>
        <Label>Group</Label>
        <Input
          placeholder='e.g. Duration'
          value={row.group}
          onChange={(e) => onChange({ ...row, group: e.target.value })}
        />
      </div>

      {row.type === 'select' && (
        <div className='col-span-12 space-y-2'>
          <Label>Options (comma separated)</Label>
          <Input
            placeholder='e.g. Manufacturer, Retailer, Third Party'
            value={row.options.join(', ')}
            onChange={(e) =>
              onChange({
                ...row,
                options: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      <div className='col-span-12 space-y-2'>
        <Label>Description</Label>
        <Input
          placeholder='Describe the warranty field'
          value={row.description}
          onChange={(e) => onChange({ ...row, description: e.target.value })}
        />
      </div>

      <div className='col-span-12 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Switch
              checked={row.required}
              onCheckedChange={(v) => onChange({ ...row, required: v })}
            />
            <Label className='text-sm'>Required</Label>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='outline' size='icon' onClick={onDuplicate}>
                  <Copy className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate row</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='destructive' size='icon' onClick={onDelete}>
                  <Trash2 className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete row</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  )
}

// -------------------- Main Component --------------------

export default function WarrantySection() {
  const [rows, setRows] = useState<WarrantyRow[]>([]);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('default');

  // Initialize with default category
  useEffect(() => {
    setRows([...warrantyCategoryTemplates[category]]);
  }, [category]);

  const filteredRows = useMemo(
    () =>
      rows.filter((r) =>
        `${r.key} ${r.group} ${r.value} ${r.description}`
          .toLowerCase()
          .includes(filter.toLowerCase())
      ),
    [rows, filter]
  );

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        key: '',
        value: '',
        type: 'text',
        unit: '',
        options: [],
        required: false,
        group: 'General',
        description: '',
      },
    ]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, next: WarrantyRow) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? next : r)));

  const duplicateRow = (idx: number) =>
    setRows((prev) => {
      const copy = { ...prev[idx] };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });

  // const applyTemplate = (templateCategory: string) => {
  //   setCategory(templateCategory);
  //   setRows([...warrantyCategoryTemplates[templateCategory]]);
  // };

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>
            Product Warranty Information
          </h2>
          <p className='text-muted-foreground text-sm'>
            Define warranty terms, duration, and coverage details for your product.
          </p>
        </div>
      </div>

      <Tabs defaultValue='editor' className='w-full'>
        <TabsContent value='editor' className='space-y-4'>
          <Card className='border-dashed'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-lg'>Warranty Rows</CardTitle>
              <CardDescription>
                Add, duplicate, or remove warranty terms. Group related terms and choose types.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button onClick={addRow}>
                    <Plus className='mr-2 h-4 w-4' /> Add Term
                  </Button>
                  
                  <div className='flex items-center gap-2'>
                    <Label>Category:</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className='hidden items-center gap-2 md:flex'>
                    <Badge variant='secondary'>Total: {rows.length}</Badge>
                  </div>
                </div>
                
                <div className='flex items-center gap-2'>
                  <Filter className='text-muted-foreground h-4 w-4' />
                  <Input
                    placeholder='Filter by key/value/group/description'
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
                      No warranty terms. Add or apply a template to get started.
                    </p>
                  )}

                  {filteredRows.map((r, visibleIdx) => {
                    // Find the real index in rows array
                    const realIdx = rows.findIndex((x, i) => i >= 0 && x === r);
                    return (
                      <WarrantyRow
                        key={`${r.key}-${visibleIdx}`}
                        row={r}
                        onChange={(next) => updateRow(realIdx, next)}
                        onDelete={() => removeRow(realIdx)}
                        onDuplicate={() => duplicateRow(realIdx)}
                      />
                    )
                  })}
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
            • Use <span className='font-medium'>Date</span> type for warranty start/end dates. 
            • Mark <span className='font-medium'>Required</span> fields for mandatory terms. 
            • Apply a <span className='font-medium'>Category Template</span> to prefill warranty terms.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}