import { type AppDispatch } from '@/store'
import { fetchSpecificationsByCategory } from '@/store/slices/admin/specificationSlice'
import { X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CategorySection({ state, actions }: any) {
  const {
    selectedCategory,
    selectedSubcategories,
    customCategory,
    customSubcategory,
    isAddingCustomCategory,
    isAddingCustomSubcategory,
    selectedCategoryId,
  } = state

  const {
    setSelectedCategory,
    setSelectedCategoryId,
    setSelectedSubcategories,
    setCustomCategory,
    setCustomSubcategory,
    setIsAddingCustomCategory,
    setIsAddingCustomSubcategory,
    setVariants,
  } = actions

  const dispatch = useDispatch<AppDispatch>()

  const categories = useSelector((s: any) => s.categories?.categories || [])
  const allSubcategories = useSelector(
    (s: any) => s.subcategories?.subcategories || []
  )
  const filteredSubcategories = allSubcategories.filter(
    (sub: any) => sub.category_id === selectedCategoryId
  )

  const removeSubcategory = (sub: string) =>
    setSelectedSubcategories((prev: string[]) => prev.filter((s) => s !== sub))

  return (
    <section className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      <div>
        <Label>Category</Label>
        <div className='space-y-2'>
          <select
            value={selectedCategory}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__add_custom__') {
                setIsAddingCustomCategory(true)
                setSelectedCategory('')
                return
              }
              const selected = categories.find((cat: any) => cat.id === val)
              if (selected) {
                setSelectedCategory(selected.name)
                setSelectedCategoryId(selected.id)
                dispatch(fetchSpecificationsByCategory(selected.id))
              }
              setIsAddingCustomCategory(false)
              setSelectedSubcategories([])
              setVariants([])
            }}
            className='w-full rounded-md border border-gray-300 p-2'
          >
            <option value=''>-- Select or Add Category --</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
            <option value='__add_custom__'>+ Add Custom Category</option>
          </select>

          {isAddingCustomCategory && (
            <div className='mt-2 flex gap-2'>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder='New category name'
              />
              <Button
                type='button'
                size='sm'
                onClick={() => {
                  if (customCategory.trim()) {
                    setSelectedCategory(customCategory.trim())
                    setIsAddingCustomCategory(false)
                    setCustomCategory('')
                    setSelectedSubcategories([])
                    setVariants([])
                  }
                }}
              >
                Add
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsAddingCustomCategory(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {selectedCategory && !isAddingCustomCategory && (
            <p className='mt-1 text-sm text-gray-600'>
              Category: <strong>{selectedCategory}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Subcategories */}
      <div>
        <Label>Subcategories (Select or Add)</Label>
        <div className='space-y-2'>
          <select
            value=''
            onChange={(e) => {
              const val = e.target.value
              if (val === '__add_custom_sub__') {
                setIsAddingCustomSubcategory(true)
              } else if (val && !selectedSubcategories.includes(val)) {
                setSelectedSubcategories((prev: string[]) => [...prev, val])
              }
            }}
            disabled={!selectedCategory}
            className='w-full rounded-md border border-gray-300 p-2'
          >
            <option value=''>-- Add Subcategory --</option>
            {filteredSubcategories.map((sub: any) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
            <option value='__add_custom_sub__'>+ Add Custom Subcategory</option>
          </select>

          {isAddingCustomSubcategory && (
            <div className='mt-2 flex gap-2'>
              <Input
                value={customSubcategory}
                onChange={(e) => setCustomSubcategory(e.target.value)}
                placeholder='New subcategory name'
              />
              <Button
                type='button'
                size='sm'
                onClick={() => {
                  if (customSubcategory.trim()) {
                    const newSub = customSubcategory.trim()
                    if (!selectedSubcategories.includes(newSub)) {
                      setSelectedSubcategories((prev: string[]) => [
                        ...prev,
                        newSub,
                      ])
                    }
                    setIsAddingCustomSubcategory(false)
                    setCustomSubcategory('')
                    setVariants([])
                  }
                }}
              >
                Add
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsAddingCustomSubcategory(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {selectedSubcategories.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-2'>
              {selectedSubcategories.map((sub: any, idx: any) => (
                <div
                  key={idx}
                  className='flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm text-blue-800'
                >
                  {sub}
                  <button type='button' onClick={() => removeSubcategory(sub)}>
                    <X className='h-3 w-3' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
