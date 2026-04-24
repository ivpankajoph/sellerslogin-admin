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

const looksLikeColorPath = (path: string[]) => {
  const joined = path.join('.').toLowerCase()
  return (
    joined.includes('color') ||
    joined.includes('background') ||
    joined.includes('accent') ||
    joined.includes('surface') ||
    joined.includes('border')
  )
}

const looksLikeNumericStylePath = (path: string[]) => {
  const joined = path.join('.').toLowerCase()
  return (
    joined.includes('opacity') ||
    joined.includes('size') ||
    joined.includes('scale')
  )
}

const normalizeColorValue = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : '#000000'

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

const fieldHelp: Record<string, { label: string; help: string }> = {
  'components.logo': {
    label: 'Website logo',
    help: 'Appears in the header and footer where the template supports a logo.',
  },
  'components.home_page.backgroundImage': {
    label: 'Home page banner image',
    help: 'The large image behind the first headline on the home page.',
  },
  'components.home_page.header.navMenuLabel': {
    label: 'Products menu text',
    help: 'Changes the menu link that opens all products.',
  },
  'components.home_page.header.navComboLabel': {
    label: 'Combo menu text',
    help: 'Changes the menu link that opens combo offers.',
  },
  'components.home_page.header_text': {
    label: 'Main banner headline',
    help: 'The largest text visitors see first on the home page.',
  },
  'components.home_page.header_text_small': {
    label: 'Main banner subtitle',
    help: 'Short supporting line below the main headline.',
  },
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
  const isColorField = looksLikeColorPath(path)
  const isNumericStyleField = looksLikeNumericStylePath(path)
  const useTextarea = prefersTextarea(path, rawValue)
  const friendly = fieldHelp[normalizedComponent]

  return (
    <div className='rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='mb-3'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
          Quick Editor
        </p>
        <h3 className='text-lg font-semibold text-slate-900'>
          {friendly?.label || label || 'Selected field'}
        </h3>
        <p className='mt-1 text-xs text-slate-600'>
          {friendly?.help || 'This field was selected from the live preview.'}
        </p>
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
        ) : isColorField ? (
          <div className='space-y-2'>
            <Label>{label || 'Selected color'}</Label>
            <div className='flex gap-2'>
              <Input
                type='color'
                value={normalizeColorValue(value)}
                onChange={(event) => updateField(path, event.target.value)}
                className='h-11 w-16 shrink-0 cursor-pointer p-1'
              />
              <Input
                value={value}
                onChange={(event) => updateField(path, event.target.value)}
                placeholder='#000000'
              />
            </div>
          </div>
        ) : isNumericStyleField ? (
          <div className='space-y-2'>
            <Label>{label || 'Selected value'}</Label>
            <Input
              type='number'
              value={value}
              onChange={(event) =>
                updateField(
                  path,
                  event.target.value === '' ? '' : Number(event.target.value)
                )
              }
            />
          </div>
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
