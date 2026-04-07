import React from 'react'
import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  StudioFieldLabel,
  studioCardClass,
  studioInputClass,
  studioTextareaClass,
} from './studio-ui'

interface Props {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  metaKeywordInput: string
  aiLoading: Record<string, boolean>
  onMetaTitleChange: (value: string) => void
  onMetaDescChange: (value: string) => void
  onKeywordInputChange: (value: string) => void
  onAddKeyword: (event: React.KeyboardEvent) => void
  onRemoveKeyword: (index: number) => void
  onGenerateTitle: () => void
  onGenerateDesc: () => void
  onGenerateKeywords: () => void
}

const aiButtonClass =
  'h-10 rounded-xl border border-border bg-card px-4 text-foreground hover:bg-white hover:text-black'

const chipClass =
  'inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300'

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
    <div className='space-y-6'>
      <div className={studioCardClass}>
        <div className='text-foreground flex items-center gap-2 text-base font-semibold'>
          <Search className='h-4 w-4 text-cyan-600' />
          Search engine listing
        </div>
      </div>

      <div className={studioCardClass}>
        <StudioFieldLabel
          label='Meta Title'
          action={
            <Button
              type='button'
              onClick={onGenerateTitle}
              disabled={aiLoading.metaTitle}
              className={aiButtonClass}
            >
              {aiLoading.metaTitle ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Sparkles className='mr-2 h-4 w-4' />
              )}
              Generate
            </Button>
          }
        />
        <input
          type='text'
          value={metaTitle}
          onChange={(event) => onMetaTitleChange(event.target.value)}
          placeholder='Brand + product name + core keyword'
          className={studioInputClass}
        />
      </div>

      <div className={studioCardClass}>
        <StudioFieldLabel
          label='Meta Description'
          action={
            <Button
              type='button'
              onClick={onGenerateDesc}
              disabled={aiLoading.metaDescription}
              className={aiButtonClass}
            >
              {aiLoading.metaDescription ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Sparkles className='mr-2 h-4 w-4' />
              )}
              Generate
            </Button>
          }
        />
        <textarea
          rows={4}
          value={metaDescription}
          onChange={(event) => onMetaDescChange(event.target.value)}
          placeholder='Explain what the product is, who it is for, and why it matters.'
          className={studioTextareaClass}
        />
      </div>

      <div className={studioCardClass}>
        <StudioFieldLabel
          label='Meta Keywords'
          action={
            <Button
              type='button'
              onClick={onGenerateKeywords}
              disabled={aiLoading.metaKeywords}
              className={aiButtonClass}
            >
              {aiLoading.metaKeywords ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Sparkles className='mr-2 h-4 w-4' />
              )}
              Generate
            </Button>
          }
        />
        <input
          type='text'
          value={metaKeywordInput}
          onChange={(event) => onKeywordInputChange(event.target.value)}
          onKeyDown={onAddKeyword}
          placeholder='Type keyword and press Enter'
          className={studioInputClass}
        />

        {metaKeywords.length ? (
          <div className='mt-4 flex flex-wrap gap-2'>
            {metaKeywords.map((keyword, index) => (
              <span key={`${keyword}-${index}`} className={chipClass}>
                {keyword}
                <button
                  type='button'
                  onClick={() => onRemoveKeyword(index)}
                  className='hover:bg-background hover:text-foreground rounded-full p-0.5 transition'
                  aria-label={`Remove ${keyword}`}
                >
                  <X className='h-3 w-3' />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Step4SEO
