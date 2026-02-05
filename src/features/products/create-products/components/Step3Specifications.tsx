// src/components/ProductCreate/Step3Specifications.tsx

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  specificationKeys: string[];
  specifications: Record<string, string>[];
  isAvailable: boolean;
  aiLoading: boolean;
  onToggleAvailable: () => void;
  onSpecChange: (key: string, value: string) => void;
  onGenerate: () => void;
  onAddKey: (key: string) => void;
}

const Step3Specifications: React.FC<Props> = ({
  specificationKeys,
  specifications,
  isAvailable,
  aiLoading,
  onToggleAvailable,
  onSpecChange,
  onGenerate,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Specifications</h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={aiLoading}
          className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>Generate with AI</span>
        </button>
      </div>
      <div className="space-y-4">
        {specificationKeys.map((key) => (
          <div key={key}>
            <label className="mb-2 block text-sm font-medium text-gray-700 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <input
              type="text"
              value={specifications[0]?.[key] || ''}
              onChange={(e) => onSpecChange(key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={onToggleAvailable}
          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
        />
        <label className="text-sm font-medium text-gray-700">Product Available</label>
      </div>

      {/* Manual Key Addition */}
      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Add Custom Specification</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Enter new specification name"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newKey.trim()) {
                  onAddKey(newKey.trim());
                  setNewKey('');
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newKey.trim()) {
                onAddKey(newKey.trim());
                setNewKey('');
              }
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step3Specifications;