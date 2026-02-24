import React, { useState } from 'react'
import { Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Variant {
  variantAttributes: Record<string, string>
  actualPrice: number
  finalPrice: number
  stockQuantity: number
  variantsImageUrls: {
    url: string
    publicId?: string
    uploading?: boolean
    tempId?: string
  }[]
  variantMetaTitle: string
  variantMetaDescription: string
  variantMetaKeywords: string[]
  isActive: boolean
}

interface Props {
  variants: Variant[]
  tempAttributeKey: string
  tempAttributeValue: string
  metaKeywordInput: string
  aiLoading: Record<string, boolean>
  onTempAttributeKeyChange: (val: string) => void
  onTempAttributeValueChange: (val: string) => void
  onMetaKeywordInputChange: (val: string) => void
  onAddVariant: () => void
  onRemoveVariant: (index: number) => void
  onAddAttributeToVariant: (variantIndex: number) => void
  onRemoveAttributeFromVariant: (variantIndex: number, attrKey: string) => void
  onVariantFieldChange: (index: number, field: keyof Variant, value: any) => void
  onVariantImageUpload: (
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
  onVariantImageDrop: (variantIndex: number, files: File[]) => void
  onVariantImageDelete: (variantIndex: number, imageIndex: number) => void
  onAddMetaKeywordToVariant: (variantIndex: number) => void
  onRemoveMetaKeywordFromVariant: (
    variantIndex: number,
    keywordIndex: number
  ) => void
  onGenerateVariantMetaTitle: (variantIndex: number) => void
  onGenerateVariantMetaDescription: (variantIndex: number) => void
  onGenerateVariantMetaKeywords: (variantIndex: number) => void
}

const aiButtonClass =
  'inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'

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
  onVariantImageDrop,
  onVariantImageDelete,
  onAddMetaKeywordToVariant,
  onRemoveMetaKeywordFromVariant,
  onGenerateVariantMetaTitle,
  onGenerateVariantMetaDescription,
  onGenerateVariantMetaKeywords,
}) => {
  const [dragOverVariantIndex, setDragOverVariantIndex] = useState<number | null>(null)

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/80 p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-extrabold tracking-tight text-slate-900'>
              Product Variants
            </h2>
            <p className='mt-1 text-sm text-slate-600'>
              Create purchasable combinations with pricing, media, and SEO.
            </p>
          </div>
          <button
            type='button'
            onClick={onAddVariant}
            className='inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
          >
            <Plus className='h-4 w-4' />
            Add Variant
          </button>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-500 shadow-sm'>
          No variants added yet.
        </div>
      ) : (
        <div className='space-y-5'>
          {variants.map((variant, vIndex) => (
            <article
              key={vIndex}
              className='rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm'
            >
              <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-lg font-bold text-slate-900'>
                    Variant {vIndex + 1}
                  </h3>
                  <div className='mt-1 flex flex-wrap gap-1.5'>
                    {Object.entries(variant.variantAttributes).length ? (
                      Object.entries(variant.variantAttributes).map(([key, value]) => (
                        <Badge
                          key={key}
                          variant='outline'
                          className='border-cyan-200 bg-cyan-100/70 text-cyan-800'
                        >
                          <span>{key}: {value}</span>
                          <button
                            type='button'
                            onClick={() => onRemoveAttributeFromVariant(vIndex, key)}
                            className='ml-1 rounded-full p-0.5 transition hover:bg-cyan-200'
                            aria-label={`Remove ${key}`}
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant='outline'
                        className='border-slate-200 bg-slate-100 text-slate-600'
                      >
                        No attributes yet
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => onRemoveVariant(vIndex)}
                  className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100'
                  aria-label={`Remove variant ${vIndex + 1}`}
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>

              <div className='grid gap-5'>
                <section className='rounded-xl border border-slate-200 bg-slate-50/70 p-4'>
                  <h4 className='mb-2 text-sm font-semibold text-slate-700'>
                    Variant Attributes
                  </h4>
                  <div className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
                    <input
                      type='text'
                      placeholder='Key (color)'
                      value={tempAttributeKey}
                      onChange={(e) => onTempAttributeKeyChange(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type='text'
                      placeholder='Value (Red)'
                      value={tempAttributeValue}
                      onChange={(e) => onTempAttributeValueChange(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type='button'
                      onClick={() => onAddAttributeToVariant(vIndex)}
                      disabled={!tempAttributeKey.trim() || !tempAttributeValue.trim()}
                      className='h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      Add
                    </button>
                  </div>
                </section>

                <section className='grid gap-3 sm:grid-cols-3'>
                  <label className='rounded-xl border border-slate-200 bg-white p-3'>
                    <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.11em] text-slate-500'>
                      Actual Price (INR)
                    </span>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      value={variant.actualPrice}
                      onChange={(e) =>
                        onVariantFieldChange(vIndex, 'actualPrice', e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className='rounded-xl border border-slate-200 bg-white p-3'>
                    <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.11em] text-slate-500'>
                      Final Price (INR)
                    </span>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      value={variant.finalPrice}
                      onChange={(e) =>
                        onVariantFieldChange(vIndex, 'finalPrice', e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className='rounded-xl border border-slate-200 bg-white p-3'>
                    <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.11em] text-slate-500'>
                      Stock Quantity
                    </span>
                    <input
                      type='number'
                      min='0'
                      value={variant.stockQuantity}
                      onChange={(e) =>
                        onVariantFieldChange(vIndex, 'stockQuantity', e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </section>

                <section className='rounded-xl border border-slate-200 bg-white p-4'>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Variant Images
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'copy'
                      setDragOverVariantIndex(vIndex)
                    }}
                    onDragLeave={(e) => {
                      const nextTarget = e.relatedTarget as Node | null
                      if (nextTarget && e.currentTarget.contains(nextTarget)) return
                      if (dragOverVariantIndex === vIndex) {
                        setDragOverVariantIndex(null)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverVariantIndex(null)
                      const files = Array.from(e.dataTransfer.files || [])
                      if (!files.length) return
                      onVariantImageDrop(vIndex, files)
                    }}
                    className={`rounded-xl border-2 border-dashed p-4 text-center transition ${
                      dragOverVariantIndex === vIndex
                        ? 'border-cyan-500 bg-cyan-50/80'
                        : 'border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <input
                      type='file'
                      multiple
                      accept='image/*'
                      onChange={(e) => onVariantImageUpload(vIndex, e)}
                      className='hidden'
                      id={`variant-img-${vIndex}`}
                    />
                    <label
                      htmlFor={`variant-img-${vIndex}`}
                      className='flex cursor-pointer flex-col items-center gap-1 text-sm font-semibold text-cyan-700'
                    >
                      <Upload className='h-5 w-5' />
                      <span className='underline'>Click to upload images</span>
                      <span className='text-xs font-medium text-slate-500 no-underline'>
                        or drag and drop images here
                      </span>
                    </label>
                  </div>

                  {variant.variantsImageUrls.length > 0 && (
                    <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4'>
                      {variant.variantsImageUrls.map((img, imgIndex) => (
                        <div
                          key={img.tempId || img.publicId || imgIndex}
                          className='relative h-24 overflow-hidden rounded-lg border border-slate-200'
                        >
                          <img
                            src={img.url}
                            alt='variant'
                            className={`h-full w-full object-cover ${
                              img.uploading ? 'opacity-50' : ''
                            }`}
                          />
                          {img.uploading && (
                            <div className='absolute inset-0 flex items-center justify-center bg-white/65'>
                              <Loader2 className='h-5 w-5 animate-spin text-cyan-600' />
                            </div>
                          )}
                          {!img.uploading && (
                            <button
                              type='button'
                              onClick={() => onVariantImageDelete(vIndex, imgIndex)}
                              className='absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white transition hover:bg-red-600'
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className='rounded-xl border border-slate-200 bg-slate-50/70 p-4'>
                  <div className='grid gap-3'>
                    <div>
                      <label className='mb-1 flex items-center justify-between text-sm font-semibold text-slate-700'>
                        <span>Variant Meta Title</span>
                        <button
                          type='button'
                          onClick={() => onGenerateVariantMetaTitle(vIndex)}
                          disabled={aiLoading[`variantMetaTitle_${vIndex}`]}
                          className={aiButtonClass}
                        >
                          {aiLoading[`variantMetaTitle_${vIndex}`] ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='h-3.5 w-3.5' />
                          )}
                          Generate
                        </button>
                      </label>
                      <input
                        type='text'
                        value={variant.variantMetaTitle}
                        onChange={(e) =>
                          onVariantFieldChange(vIndex, 'variantMetaTitle', e.target.value)
                        }
                        className={inputClass}
                        placeholder='SEO title for this variant'
                      />
                    </div>

                    <div>
                      <label className='mb-1 flex items-center justify-between text-sm font-semibold text-slate-700'>
                        <span>Variant Meta Description</span>
                        <button
                          type='button'
                          onClick={() => onGenerateVariantMetaDescription(vIndex)}
                          disabled={aiLoading[`variantMetaDescription_${vIndex}`]}
                          className={aiButtonClass}
                        >
                          {aiLoading[`variantMetaDescription_${vIndex}`] ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='h-3.5 w-3.5' />
                          )}
                          Generate
                        </button>
                      </label>
                      <textarea
                        value={variant.variantMetaDescription}
                        onChange={(e) =>
                          onVariantFieldChange(
                            vIndex,
                            'variantMetaDescription',
                            e.target.value
                          )
                        }
                        rows={3}
                        className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
                        placeholder='SEO description for this variant'
                      />
                    </div>

                    <div>
                      <label className='mb-1 flex items-center justify-between text-sm font-semibold text-slate-700'>
                        <span>Variant Meta Keywords</span>
                        <button
                          type='button'
                          onClick={() => onGenerateVariantMetaKeywords(vIndex)}
                          disabled={aiLoading[`variantMetaKeywords_${vIndex}`]}
                          className={aiButtonClass}
                        >
                          {aiLoading[`variantMetaKeywords_${vIndex}`] ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='h-3.5 w-3.5' />
                          )}
                          Generate
                        </button>
                      </label>
                      <input
                        type='text'
                        value={metaKeywordInput}
                        onChange={(e) => onMetaKeywordInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            onAddMetaKeywordToVariant(vIndex)
                          }
                        }}
                        placeholder='Type keyword and press Enter'
                        className={inputClass}
                      />
                      <div className='mt-2 flex flex-wrap gap-1.5'>
                        {variant.variantMetaKeywords.map((kw, kwIdx) => (
                          <span
                            key={`${kw}-${kwIdx}`}
                            className='inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-100/70 px-2.5 py-1 text-xs font-semibold text-cyan-800'
                          >
                            {kw}
                            <button
                              type='button'
                              onClick={() =>
                                onRemoveMetaKeywordFromVariant(vIndex, kwIdx)
                              }
                              className='rounded-full p-0.5 transition hover:bg-cyan-200'
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <label className='inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm'>
                  <input
                    type='checkbox'
                    checked={variant.isActive}
                    onChange={(e) =>
                      onVariantFieldChange(vIndex, 'isActive', e.target.checked)
                    }
                    className='h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500'
                  />
                  Variant Active
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Step5Variants
