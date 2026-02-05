// src/components/form/ArrayField.tsx
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus } from 'lucide-react';
import { type ReactNode } from 'react';

interface ArrayFieldProps<T> {
  label: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number, onChange: (updated: T) => void) => ReactNode;
}

export function ArrayField<T>({
  label,
  items,
  onAdd,
  onRemove,
  renderItem,
}: ArrayFieldProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <Separator />
      {items.map((item, index) => (
        <div key={index} className="relative space-y-3 p-3 border rounded-md">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => onRemove(index)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          {renderItem(item, index, (updated) => {
            const newItems = [...items];
            newItems[index] = updated;
            // Parent must handle update
          })}
        </div>
      ))}
    </div>
  );
}