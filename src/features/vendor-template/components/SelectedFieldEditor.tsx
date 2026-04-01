import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageInput } from './form/ImageInput'

type SelectedFieldEditorProps = {
  data: unknown
  selectedComponent?: string | null
  updateField: (path: string[], value: unknown) => void
  handleImageChange?: (path: string[], file: File | null) => Promise<void> | void
}

const getValueAtPath = (source: any, path: string[]) =>
  path.reduce((current, segment) => {
    if (current == null) return undefined
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10)
      if (Number.isNaN(index)) return undefined
      return current[index]
    }
    return current[segment]
  }, source)

const toLabel = (path: string[]) => {
  const tail = path.slice(-2).join(' ')
  return tail
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const looksLikeImagePath = (path: string[]) => {
  const joined = path.join('.').toLowerCase()
  return (
    joined.includes('image') ||
    joined.endsWith('.logo') ||
    joined.includes('.logo.') ||
    joined.includes('backgroundimage') ||
    joined.includes('thumbnail') ||
    joined.includes('banner')
  )
}

const prefersTextarea = (path: string[], value: unknown) => {
  if (typeof value === 'string' && value.includes('\n')) return true
  const joined = path.join('.').toLowerCase()
  return [
    'subtitle',
    'summary',
    'description',
    'content',
    'answer',
    'body',
    'quote',
    'narrative',
    'paragraph',
    'text',
    'address',
  ].some((token) => joined.includes(token))
}

export function SelectedFieldEditor({
  data,
  selectedComponent,
  updateField,
  handleImageChange,
}: SelectedFieldEditorProps) {
  const normalizedComponent = String(selectedComponent || '').trim()
  if (!normalizedComponent) return null

  const path = normalizedComponent
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (!path.length) return null

  const rawValue = getValueAtPath(data, path)
  const value =
    typeof rawValue === 'string' || typeof rawValue === 'number'
      ? String(rawValue)
      : rawValue == null
        ? ''
        : ''
  const label = toLabel(path)
  const isImageField = looksLikeImagePath(path)
  const useTextarea = prefersTextarea(path, rawValue)

  return (
    <div className='rounded-3xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm'>
      <div className='mb-3'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-blue-600'>
          Quick Editor
        </p>
        <h3 className='text-lg font-semibold text-slate-900'>{label || 'Selected field'}</h3>
        <p className='mt-1 text-xs text-slate-600'>{normalizedComponent}</p>
      </div>

      <div data-editor-component={normalizedComponent}>
        {isImageField && handleImageChange ? (
          <ImageInput
            label={label || 'Selected image'}
            name={normalizedComponent}
            value={value || null}
            onChange={(file) => void handleImageChange(path, file)}
            isFileInput
          />
        ) : useTextarea ? (
          <div className='space-y-2'>
            <Label>{label || 'Selected field'}</Label>
            <Textarea
              value={value}
              onChange={(event) => updateField(path, event.target.value)}
              className='min-h-[120px]'
            />
          </div>
        ) : (
          <div className='space-y-2'>
            <Label>{label || 'Selected field'}</Label>
            <Input
              value={value}
              onChange={(event) => updateField(path, event.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
