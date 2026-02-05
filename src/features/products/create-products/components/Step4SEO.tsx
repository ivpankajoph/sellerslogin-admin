// src/components/ProductCreate/Step4SEO.tsx

import React from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';

interface Props {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  metaKeywordInput: string;
  aiLoading: Record<string, boolean>;
  onMetaTitleChange: (val: string) => void;
  onMetaDescChange: (val: string) => void;
  onKeywordInputChange: (val: string) => void;
  onAddKeyword: (e: React.KeyboardEvent) => void;
  onRemoveKeyword: (index: number) => void;
  onGenerateTitle: () => void;
  onGenerateDesc: () => void;
  onGenerateKeywords: () => void;
}

const Step4SEO: React.FC<Props> = ({
  metaTitle,
  metaDescription,
  metaKeywords,
  metaKeywordInput,
  aiLoading,
  onMetaTitleChange,
  onMetaDescChange,
  onKeywordInputChange,
  onAddKeyword,
  onRemoveKeyword,
  onGenerateTitle,
  onGenerateDesc,
  onGenerateKeywords,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">SEO & Meta Information</h2>

      <div>
        <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          Meta Title
          <button
            type="button"
            onClick={onGenerateTitle}
            disabled={aiLoading.metaTitle}
            className="flex items-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading.metaTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="text-xs">Generate with AI</span>
          </button>
        </label>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          Meta Description
          <button
            type="button"
            onClick={onGenerateDesc}
            disabled={aiLoading.metaDescription}
            className="flex items-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading.metaDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="text-xs">Generate with AI</span>
          </button>
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => onMetaDescChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          Meta Keywords
          <button
            type="button"
            onClick={onGenerateKeywords}
            disabled={aiLoading.metaKeywords}
            className="flex items-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading.metaKeywords ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="text-xs">Generate with AI</span>
          </button>
        </label>
        <div className="mb-2 flex space-x-2">
          <input
            type="text"
            value={metaKeywordInput}
            onChange={(e) => onKeywordInputChange(e.target.value)}
            onKeyPress={onAddKeyword}
            placeholder="Type keyword and press Enter"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {metaKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
            >
              <span>{keyword}</span>
              <button type="button" onClick={() => onRemoveKeyword(index)} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step4SEO;