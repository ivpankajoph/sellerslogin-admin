import React, { useState } from 'react'
import { Layers3, Loader2, Package2, Plus, Tag, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Variant } from '../types/type'
import {
  StudioFieldLabel,
  studioCardClass,
  studioInputClass,
  studioSubtleCardClass,
} from './studio-ui'

interface Props {
  variants: Variant[]
  attributeKeys: string[]
  newAttributeKey: string
  onNewAttributeKeyChange: (value: string) => void
  onAddAttributeKey: () => void
  onRemoveAttributeKey: (key: string) => void
  onAddVariant: () => void
  onRemoveVariant: (index: number) => void
  onVariantFieldChange: (
    index: number,
    field: keyof Variant,
    value: string | number | boolean
  ) => void
  onVariantAttributeChange: (
    variantIndex: number,
    attributeKey: string,
    value: string
  ) => void
  onVariantImageUpload: (
    variantIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void
  onVariantImageDrop: (variantIndex: number, files: File[]) => void
  onVariantImageDelete: (variantIndex: number, imageIndex: number) => void
}

const optionChipClass =
  'inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300'

const Step5Variants: React.FC<Props> = ({
  variants,
  attributeKeys,
  newAttributeKey,
  onNewAttributeKeyChange,
  onAddAttributeKey,
  onRemoveAttributeKey,
  onAddVariant,
  onRemoveVariant,
  onVariantFieldChange,
  onVariantAttributeChange,
  onVariantImageUpload,
  onVariantImageDrop,
  onVariantImageDelete,
}) => {
  const [dragOverVariantIndex, setDragOverVariantIndex] = useState<number | null>(null)

  return (
    <div className='space-y-6'>
      <div className={studioCardClass}>
        <div className='flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <Layers3 className='h-4 w-4 text-cyan-600' />
            Variants
          </div>
          <Button
            type='button'
            onClick={onAddVariant}
            className='h-11 rounded-xl bg-cyan-600 px-5 text-white hover:bg-cyan-700'
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Variant
          </Button>
        </div>

        <div className='mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
          <div className={studioSubtleCardClass}>
            <StudioFieldLabel label='Option keys' />
            {attributeKeys.length ? (
              <div className='flex flex-wrap gap-2'>
                {attributeKeys.map((key) => (
                  <span key={key} className={optionChipClass}>
                    <Tag className='h-3.5 w-3.5' />
                    {key}
                    <button
                      type='button'
                      onClick={() => onRemoveAttributeKey(key)}
                      className='rounded-full p-0.5 text-current transition hover:bg-background/70'
                      aria-label={`Remove ${key}`}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className='mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
              <input
                type='text'
                value={newAttributeKey}
                onChange={(event) => onNewAttributeKeyChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onAddAttributeKey()
                  }
                }}
                placeholder='e.g. color, size, finish'
                className={studioInputClass}
              />
              <Button
                type='button'
                onClick={onAddAttributeKey}
                className='h-11 rounded-xl border border-border bg-card px-5 text-foreground hover:bg-secondary'
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Key
              </Button>
            </div>
          </div>

          <div className={studioSubtleCardClass}>
            <StudioFieldLabel label='Count' />
            <div className='flex flex-wrap gap-2'>
              <span className={optionChipClass}>{variants.length} variants</span>
              {attributeKeys.length ? (
                <span className={optionChipClass}>{attributeKeys.length} keys</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className={studioCardClass}>
          <h3 className='text-base font-semibold text-foreground'>No variants yet</h3>
          <Button
            type='button'
            onClick={onAddVariant}
            className='mt-4 h-11 rounded-xl bg-cyan-600 px-5 text-white hover:bg-cyan-700'
          >
            <Plus className='mr-2 h-4 w-4' />
            Create First Variant
          </Button>
        </div>
      ) : (
        <div className='space-y-5'>
          {variants.map((variant, variantIndex) => {
            const summary = attributeKeys
              .map((key) => variant.variantAttributes[key])
              .filter(Boolean)
              .join(' / ')

            return (
              <article key={variantIndex} className={studioCardClass}>
                <div className='mb-5 flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300'>
                      Variant {variantIndex + 1}
                    </div>
                    <h3 className='text-xl font-semibold text-foreground'>
                      {summary || 'Unnamed option set'}
                    </h3>
                  </div>

                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='flex items-center gap-2 rounded-full bg-background/60 px-3 py-2'>
                      <Switch
                        checked={variant.isActive}
                        onCheckedChange={(checked) =>
                          onVariantFieldChange(variantIndex, 'isActive', checked)
                        }
                      />
                      <span className='text-sm font-medium text-foreground'>
                        {variant.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => onRemoveVariant(variantIndex)}
                      className='h-11 rounded-xl border-red-500/25 bg-red-500/10 px-4 text-red-600 hover:bg-red-500/15 hover:text-red-700'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
                  <div className='space-y-4'>
                    <section className={studioSubtleCardClass}>
                      <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                        <Tag className='h-4 w-4 text-cyan-600' />
                        Option values
                      </div>
                      <div className='grid gap-4 md:grid-cols-2'>
                        {attributeKeys.length ? (
                          attributeKeys.map((key) => (
                            <div key={key}>
                              <StudioFieldLabel label={key} />
                              <input
                                type='text'
                                value={variant.variantAttributes[key] || ''}
                                onChange={(event) =>
                                  onVariantAttributeChange(
                                    variantIndex,
                                    key,
                                    event.target.value
                                  )
                                }
                                placeholder={`Enter ${key.toLowerCase()}`}
                                className={studioInputClass}
                              />
                            </div>
                          ))
                        ) : (
                          <div className='md:col-span-2 rounded-2xl bg-background/40 px-4 py-3 text-sm text-muted-foreground'>
                            Add option keys first.
                          </div>
                        )}
                      </div>
                    </section>

                    <section className={studioSubtleCardClass}>
                      <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                        <Package2 className='h-4 w-4 text-emerald-600' />
                        Pricing and stock
                      </div>
                      <div className='grid gap-4 md:grid-cols-3'>
                        <div>
                          <StudioFieldLabel label='Actual Price' />
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            value={variant.actualPrice}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'actualPrice',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                        <div>
                          <StudioFieldLabel label='Final Price' />
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            value={variant.finalPrice}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'finalPrice',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                        <div>
                          <StudioFieldLabel label='Stock Quantity' />
                          <input
                            type='number'
                            min='0'
                            value={variant.stockQuantity}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'stockQuantity',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className={studioSubtleCardClass}>
                    <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                      <Upload className='h-4 w-4 text-indigo-600' />
                      Variant images
                    </div>

                    <div
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'copy'
                        setDragOverVariantIndex(variantIndex)
                      }}
                      onDragLeave={(event) => {
                        const nextTarget = event.relatedTarget as Node | null
                        if (nextTarget && event.currentTarget.contains(nextTarget)) return
                        if (dragOverVariantIndex === variantIndex) {
                          setDragOverVariantIndex(null)
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDragOverVariantIndex(null)
                        const files = Array.from(event.dataTransfer.files || [])
                        if (files.length) {
                          onVariantImageDrop(variantIndex, files)
                        }
                      }}
                      className={`rounded-2xl p-6 text-center transition ${
                        dragOverVariantIndex === variantIndex
                          ? 'bg-cyan-500/10'
                          : 'bg-background/40'
                      }`}
                    >
                      <input
                        type='file'
                        multiple
                        accept='image/*'
                        onChange={(event) => onVariantImageUpload(variantIndex, event)}
                        className='hidden'
                        id={`variant-image-upload-${variantIndex}`}
                      />
                      <label
                        htmlFor={`variant-image-upload-${variantIndex}`}
                        className='flex cursor-pointer flex-col items-center gap-2'
                      >
                        <div className='inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10'>
                          <Upload className='h-5 w-5 text-cyan-600' />
                        </div>
                        <span className='text-sm font-semibold text-foreground'>
                          Upload or drop images
                        </span>
                      </label>
                    </div>

                    {variant.variantsImageUrls.length > 0 ? (
                      <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'>
                        {variant.variantsImageUrls.map((image, imageIndex) => (
                          <div
                            key={image.tempId || image.publicId || imageIndex}
                            className='relative h-28 overflow-hidden rounded-2xl bg-card'
                          >
                            <img
                              src={image.url}
                              alt='Variant'
                              className={`h-full w-full object-cover ${
                                image.uploading ? 'opacity-45' : ''
                              }`}
                            />
                            {image.uploading ? (
                              <div className='absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-sm'>
                                <Loader2 className='h-5 w-5 animate-spin text-cyan-600' />
                              </div>
                            ) : (
                              <button
                                type='button'
                                onClick={() =>
                                  onVariantImageDelete(variantIndex, imageIndex)
                                }
                                className='absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-red-600'
                                aria-label='Delete variant image'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-4 text-sm text-muted-foreground'>No images yet.</p>
                    )}
                  </section>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Step5Variants
