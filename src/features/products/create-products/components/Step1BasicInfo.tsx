// src/components/ProductCreate/Step1BasicInfo.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  mainCategories: any[];
  selectedMainCategoryId: string;
  setSelectedMainCategoryId: React.Dispatch<React.SetStateAction<string>>;
  categories: any[];
  selectedCategoryId: string;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string>>;
  filteredSubcategories: any[];
  isMainCategoryLoading: boolean;
  isCategoryLoading: boolean;
  aiLoading: Record<string, boolean>;
  generateWithAI: () => void;
  generateDescription: () => void;
}

type SelectOption = {
  value: string;
  label: string;
};

const SearchableSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}> = ({ value, onChange, options, placeholder, disabled, loading }) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !selectedOption && 'text-muted-foreground'
          )}
        >
          {loading ? 'Loading...' : selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Step1BasicInfo: React.FC<Props> = ({
  formData,
  setFormData,
  mainCategories,
  selectedMainCategoryId,
  setSelectedMainCategoryId,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  filteredSubcategories,
  isMainCategoryLoading,
  isCategoryLoading,
  aiLoading,
  generateWithAI,
  generateDescription
}) => {
  const [subCategorySearch, setSubCategorySearch] = useState('');

  useEffect(() => {
    setSubCategorySearch('');
  }, [selectedCategoryId]);

  const mainCategoryOptions = useMemo(
    () =>
      mainCategories.map((cat: any) => ({
        value: cat._id,
        label: cat.name,
      })),
    [mainCategories]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((cat: any) => ({
        value: cat._id,
        label: cat.name,
      })),
    [categories]
  );

  const visibleSubcategories = useMemo(() => {
    if (!subCategorySearch.trim()) return filteredSubcategories;
    const search = subCategorySearch.trim().toLowerCase();
    return filteredSubcategories.filter((sub: any) =>
      `${sub.name || ''} ${sub.slug || ''}`.toLowerCase().includes(search)
    );
  }, [filteredSubcategories, subCategorySearch]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Basic Information</h2>
      {/* Product Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Product Name *</label>
        <input
          type="text"
          value={formData.productName}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, productName: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Main Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Main Category *</label>
        <SearchableSelect
          value={selectedMainCategoryId}
          onChange={(value) => {
            setSelectedMainCategoryId(value);
            setSelectedCategoryId('');
            setFormData((prev: any) => ({
              ...prev,
              mainCategory: value,
              productCategory: '',
              productSubCategories: [],
            }));
          }}
          options={mainCategoryOptions}
          placeholder="Select main category"
          loading={isMainCategoryLoading}
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Category *</label>
        <SearchableSelect
          value={selectedCategoryId}
          onChange={(value) => {
            setSelectedCategoryId(value);
            setFormData((prev: any) => ({
              ...prev,
              productCategory: value,
              productSubCategories: [],
            }));
          }}
          options={categoryOptions}
          placeholder={
            selectedMainCategoryId
              ? 'Select category'
              : 'Select main category first'
          }
          loading={isCategoryLoading}
          disabled={!selectedMainCategoryId}
        />
      </div>

      {/* Subcategories */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Sub Categories</label>
        <Input
          value={subCategorySearch}
          onChange={(e) => setSubCategorySearch(e.target.value)}
          placeholder={
            selectedCategoryId
              ? 'Search subcategories...'
              : 'Select a category first'
          }
          disabled={!selectedCategoryId}
          className="mb-3"
        />
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
          {!selectedCategoryId ? (
            <p className="text-sm text-gray-500">Select a category to see subcategories.</p>
          ) : visibleSubcategories.length === 0 ? (
            <p className="text-sm text-gray-500">No subcategories found.</p>
          ) : (
            visibleSubcategories.map((sub: any) => (
              <label
                key={sub._id}
                className="flex cursor-pointer items-center space-x-2 rounded p-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.productSubCategories.includes(sub._id)}
                  onChange={(e) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      productSubCategories: e.target.checked
                        ? [...prev.productSubCategories, sub._id]
                        : prev.productSubCategories.filter((id: string) => id !== sub._id),
                    }));
                  }}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{sub.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Brand */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Brand *</label>
        <input
          type="text"
          value={formData.brand}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, brand: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Short Description */}
      <div>
        <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          Short Description *
          <button
            type="button"
            onClick={generateWithAI}
            disabled={aiLoading.shortDescription}
            className="flex items-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading.shortDescription ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="text-xs">Generate with AI</span>
          </button>
        </label>
        <textarea
          value={formData.shortDescription}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, shortDescription: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          Description *
          <button
            type="button"
            onClick={generateDescription}
            disabled={aiLoading.description}
            className="flex items-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading.description ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="text-xs">Generate with AI</span>
          </button>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
    </div>
  );
};

export default Step1BasicInfo;
