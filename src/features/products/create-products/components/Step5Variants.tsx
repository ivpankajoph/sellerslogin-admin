// src/components/ProductCreate/Step5Variants.tsx

import React from 'react';
import { Plus, X, Trash2, Loader2, Sparkles } from 'lucide-react';

interface Variant {
  variantAttributes: Record<string, string>;
  actualPrice: number;
  finalPrice: number;
  stockQuantity: number;
  variantsImageUrls: {
    url: string
    publicId?: string
    uploading?: boolean
    tempId?: string
  }[];

  variantMetaTitle: string;
  variantMetaDescription: string;
  variantMetaKeywords: string[];
  isActive: boolean;
}

interface Props {
  variants: Variant[];
  tempAttributeKey: string;
  tempAttributeValue: string;
  metaKeywordInput: string;
  aiLoading: Record<string, boolean>; // ← NEW: for AI loading states
  onTempAttributeKeyChange: (val: string) => void;
  onTempAttributeValueChange: (val: string) => void;
  onMetaKeywordInputChange: (val: string) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
  onAddAttributeToVariant: (variantIndex: number) => void;
  onRemoveAttributeFromVariant: (variantIndex: number, attrKey: string) => void;
  onVariantFieldChange: (index: number, field: keyof Variant, value: any) => void;
  onVariantImageUpload: (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onVariantImageDelete: (variantIndex: number, imageIndex: number) => void;
  onAddMetaKeywordToVariant: (variantIndex: number) => void;
  onRemoveMetaKeywordFromVariant: (variantIndex: number, keywordIndex: number) => void;
  onGenerateVariantMetaTitle: (variantIndex: number) => void; // ← NEW
  onGenerateVariantMetaDescription: (variantIndex: number) => void; // ← NEW
  onGenerateVariantMetaKeywords: (variantIndex: number) => void; // ← NEW
}

const Step5Variants: React.FC<Props> = ({
  variants,
  tempAttributeKey,
  tempAttributeValue,
  metaKeywordInput,
  aiLoading,
  onTempAttributeKeyChange,
  onTempAttributeValueChange,
  onMetaKeywordInputChange,
  onAddVariant,
  onRemoveVariant,
  onAddAttributeToVariant,
  onRemoveAttributeFromVariant,
  onVariantFieldChange,
  onVariantImageUpload,
  onVariantImageDelete,
  onAddMetaKeywordToVariant,
  onRemoveMetaKeywordFromVariant,
  onGenerateVariantMetaTitle,
  onGenerateVariantMetaDescription,
  onGenerateVariantMetaKeywords,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Product Variants</h2>
        <button
          type="button"
          onClick={onAddVariant}
          className="flex items-center space-x-1 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Variant</span>
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-gray-500">No variants added yet.</p>
      ) : (
        <div className="space-y-6">
          {variants.map((variant, vIndex) => (
            <div key={vIndex} className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-700">
                  Variant {vIndex + 1} ({Object.entries(variant.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                </h3>
                <button
                  type="button"
                  onClick={() => onRemoveVariant(vIndex)}
                  className="rounded p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Variant Attributes */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Variant Attributes</label>
                <div className="mb-2 flex space-x-2">
                  <input
                    type="text"
                    placeholder="Key (e.g., color)"
                    value={tempAttributeKey}
                    onChange={(e) => onTempAttributeKeyChange(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g., Red)"
                    value={tempAttributeValue}
                    onChange={(e) => onTempAttributeValueChange(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => onAddAttributeToVariant(vIndex)}
                    disabled={!tempAttributeKey.trim() || !tempAttributeValue.trim()}
                    className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variant.variantAttributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center space-x-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700"
                    >
                      <span>{key}: {value}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveAttributeFromVariant(vIndex, key)}
                        className="hover:text-indigo-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Actual Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.actualPrice}
                    onChange={(e) =>
                      onVariantFieldChange(vIndex, 'actualPrice', e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Final Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.finalPrice}
                    onChange={(e) =>
                      onVariantFieldChange(vIndex, 'finalPrice', e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={variant.stockQuantity}
                    onChange={(e) =>
                      onVariantFieldChange(vIndex, 'stockQuantity', e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Variant Images */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Variant Images
                </label>

                <div className="rounded-lg border-2 border-dashed border-gray-300 p-3 inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => onVariantImageUpload(vIndex, e)}
                    className="hidden"
                    id={`variant-img-${vIndex}`}
                  />

                  <label
                    htmlFor={`variant-img-${vIndex}`}
                    className="cursor-pointer text-sm text-blue-600 underline"
                  >
                    Choose files
                  </label>
                </div>
              </div>
              {/* Image Previews */}
              {variant.variantsImageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {variant.variantsImageUrls.map((img, imgIndex) => (
                    <div
                      key={img.tempId || img.publicId || imgIndex}
                      className="relative h-24 w-24 overflow-hidden rounded-lg border"
                    >
                      <img
                        src={img.url}
                        alt="variant"
                        className={`h-full w-full object-cover ${img.uploading ? 'opacity-50' : ''
                          }`}
                      />

                      {/* Loader while uploading */}
                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      )}

                      {/* Delete button */}
                      {!img.uploading && (
                        <button
                          type="button"
                          onClick={() => onVariantImageDelete(vIndex, imgIndex)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}


              {/* Variant SEO */}
              <div className="mt-4 space-y-3">
                {/* Meta Title with AI */}
                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>Variant Meta Title</span>
                    <button
                      type="button"
                      onClick={() => onGenerateVariantMetaTitle(vIndex)}
                      disabled={aiLoading[`variantMetaTitle_${vIndex}`]}
                      className="flex items-center space-x-1 rounded-lg bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {aiLoading[`variantMetaTitle_${vIndex}`] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      <span>Generate</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={variant.variantMetaTitle}
                    onChange={(e) => onVariantFieldChange(vIndex, 'variantMetaTitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Red Cotton T-Shirt M"
                  />
                </div>

                {/* Meta Description with AI */}
                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>Variant Meta Description</span>
                    <button
                      type="button"
                      onClick={() => onGenerateVariantMetaDescription(vIndex)}
                      disabled={aiLoading[`variantMetaDescription_${vIndex}`]}
                      className="flex items-center space-x-1 rounded-lg bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {aiLoading[`variantMetaDescription_${vIndex}`] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      <span>Generate</span>
                    </button>
                  </label>
                  <textarea
                    value={variant.variantMetaDescription}
                    onChange={(e) =>
                      onVariantFieldChange(vIndex, 'variantMetaDescription', e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Red premium cotton t-shirt size M"
                  />
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>Variant Meta Keywords</span>
                    <button
                      type="button"
                      onClick={() => onGenerateVariantMetaKeywords(vIndex)}
                      disabled={aiLoading[`variantMetaKeywords_${vIndex}`]}
                      className="flex items-center space-x-1 rounded-lg bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {aiLoading[`variantMetaKeywords_${vIndex}`] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      <span>Generate</span>
                    </button>
                  </label>
                  <label className="mb-1 block text-sm font-medium text-gray-700 hidden">Variant Meta Keywords</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={metaKeywordInput}
                      onChange={(e) => onMetaKeywordInputChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddMetaKeywordToVariant(vIndex);
                        }
                      }}
                      placeholder="Type and press Enter"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {variant.variantMetaKeywords.map((kw, kwIdx) => (
                      <span
                        key={kwIdx}
                        className="inline-flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveMetaKeywordFromVariant(vIndex, kwIdx)}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="mt-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={variant.isActive}
                  onChange={(e) => onVariantFieldChange(vIndex, 'isActive', e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Variant Active</label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Step5Variants;