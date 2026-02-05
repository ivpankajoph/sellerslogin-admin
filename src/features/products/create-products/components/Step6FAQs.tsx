// src/components/ProductCreate/Step6FAQs.tsx

import React from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface Props {
  faqs: FAQ[];
  onFAQChange: (index: number, field: 'question' | 'answer', value: string) => void;
  onAddFAQ: () => void;
  onRemoveFAQ: (index: number) => void;
  onGenerate: () => void;
  aiLoading: boolean;
}

const Step6FAQs: React.FC<Props> = ({ faqs, onFAQChange, onAddFAQ, onRemoveFAQ, onGenerate, aiLoading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Frequently Asked Questions (FAQs)</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={aiLoading}
            className="flex items-center space-x-2 rounded-lg bg-purple-100 px-4 py-2 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Generate with AI</span>
          </button>
          <button
            type="button"
            onClick={onAddFAQ}
            className="flex items-center space-x-1 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      {faqs.length === 0 ? (
        <p className="text-gray-500">No FAQs added yet. Click "Add FAQ" to get started.</p>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Question</label>
                    <textarea
                      value={faq.question}
                      onChange={(e) => onFAQChange(index, 'question', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter question..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Answer</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => onFAQChange(index, 'answer', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter answer..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFAQ(index)}
                  className="ml-4 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Step6FAQs;