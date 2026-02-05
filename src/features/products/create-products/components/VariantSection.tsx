import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function VariantSection({ state, actions }: any) {
  const { variants, variantImagePreviews, variantImageFiles } = state
  const { setVariants, setVariantImagePreviews, setVariantImageFiles } = actions

  const onAddVariant = () =>
    setVariants((prev: any[]) => [
      ...prev,
      {
        sku: '',

        final_price: '',
        actual_price: '',
        discount_percent: '',
        stock: '',
        attributes: [{ key: '', value: '' }],
      },
    ])

  const onRemoveVariant = (index: number) => {
    setVariants((prev: any[]) => prev.filter((_, i) => i !== index))
    setVariantImageFiles((prev: any) => {
      const copy = { ...prev }
      delete copy[index]
      return copy
    })
    setVariantImagePreviews((prev: any) => {
      const copy = { ...prev }
      delete copy[index]
      return copy
    })
  }

  const onUpdateVariantField = (index: number, field: string, value: any) => {
    const updated = [...variants]
    updated[index][field] = value
    setVariants(updated)
  }

  const onAddAttribute = (vIndex: number) => {
    const updated = [...variants]
    updated[vIndex].attributes.push({ key: '', value: '' })
    setVariants(updated)
  }

  const onRemoveAttribute = (vIndex: number, aIndex: number) => {
    const updated = [...variants]
    updated[vIndex].attributes = updated[vIndex].attributes.filter(
      (_: any, i: number) => i !== aIndex
    )
    setVariants(updated)
  }

  return (
    <section className='space-y-6 border-t border-gray-200 pt-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-xl font-semibold text-gray-700'>Variants</h3>
        <Button type='button' variant='outline' onClick={onAddVariant}>
          <Plus className='mr-1 h-4 w-4' /> Add Variant
        </Button>
      </div>

      <AnimatePresence>
        {variants.length > 0 ? (
          variants.map((variant: any, vIndex: any) => (
            <motion.div
              key={vIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className='mb-4 border border-gray-300 bg-gray-50 shadow-sm'>
                <CardContent className='space-y-4 p-4'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                    <div>
                      <Label>SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) =>
                          onUpdateVariantField(vIndex, 'sku', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>WholeSale Price</Label>
                      <Input
                        type='number'
                        step='0.01'
                        value={variant.actual_price}
                        onChange={(e) =>
                          onUpdateVariantField(
                            vIndex,
                            'actual_price',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Discount (%)</Label>
                      <Input
                        type='number'
                        min='0'
                        max='100'
                        value={variant.discount_percent}
                        onChange={(e) =>
                          onUpdateVariantField(
                            vIndex,
                            'discount_percent',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Retail Price</Label>
                      <Input
                        type='number'
                        min='0'
                        value={variant.final_price}
                        onChange={(e) =>
                          onUpdateVariantField(
                            vIndex,
                            'final_price',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input
                        type='number'
                        value={variant.stock}
                        onChange={(e) =>
                          onUpdateVariantField(vIndex, 'stock', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <Label>Attributes (Key-Value Pairs)</Label>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => onAddAttribute(vIndex)}
                      >
                        <Plus className='mr-1 h-3 w-3' /> Add Attribute
                      </Button>
                    </div>
                    <div className='space-y-2'>
                      {variant.attributes.map((attr: any, aIndex: number) => (
                        <div key={aIndex} className='flex gap-2'>
                          <Input
                            placeholder='Key (e.g. Color)'
                            value={attr.key}
                            onChange={(e) => {
                              const updated = [...variants]
                              updated[vIndex].attributes[aIndex].key =
                                e.target.value
                              setVariants(updated)
                            }}
                            className='flex-1'
                          />
                          <Input
                            placeholder='Value (e.g. Black)'
                            value={attr.value}
                            onChange={(e) => {
                              const updated = [...variants]
                              updated[vIndex].attributes[aIndex].value =
                                e.target.value
                              setVariants(updated)
                            }}
                            className='flex-1'
                          />
                          <Button
                            type='button'
                            variant='destructive'
                            size='icon'
                            onClick={() => onRemoveAttribute(vIndex, aIndex)}
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variant Images */}
                  <div>
                    <Label>Variant Images</Label>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      {variantImagePreviews[vIndex]?.map(
                        (src: string, imgIndex: number) => (
                          <div key={imgIndex} className='relative h-20 w-20'>
                            <img
                              src={src}
                              alt='variant preview'
                              className='h-full w-full rounded border object-cover'
                            />
                            <button
                              type='button'
                              className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white'
                              onClick={() => {
                                const newPreviews = [
                                  ...(variantImagePreviews[vIndex] || []),
                                ]
                                const newFiles = [
                                  ...(variantImageFiles[vIndex] || []),
                                ]
                                newPreviews.splice(imgIndex, 1)
                                newFiles.splice(imgIndex, 1)
                                setVariantImagePreviews((prev: any) => ({
                                  ...prev,
                                  [vIndex]: newPreviews,
                                }))
                                setVariantImageFiles((prev: any) => ({
                                  ...prev,
                                  [vIndex]: newFiles,
                                }))
                              }}
                            >
                              <Trash2 className='h-3 w-3' />
                            </button>
                          </div>
                        )
                      )}
                      <label className='flex h-20 w-20 cursor-pointer items-center justify-center rounded border-2 border-dashed text-gray-400 hover:border-blue-500'>
                        <Upload className='h-4 w-4' />
                        <input
                          type='file'
                          multiple
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => {
                            const files = e.target.files
                            if (!files) return
                            const newFiles = Array.from(files)
                            const newPreviews = newFiles.map((f) =>
                              URL.createObjectURL(f)
                            )
                            setVariantImageFiles((prev: any) => ({
                              ...prev,
                              [vIndex]: [...(prev[vIndex] || []), ...newFiles],
                            }))
                            setVariantImagePreviews((prev: any) => ({
                              ...prev,
                              [vIndex]: [
                                ...(prev[vIndex] || []),
                                ...newPreviews,
                              ],
                            }))
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => onRemoveVariant(vIndex)}
                    >
                      <Trash2 className='mr-1 h-3 w-3' /> Remove Variant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <p className='text-gray-500 italic'>No variants added yet.</p>
        )}
      </AnimatePresence>
    </section>
  )
}
