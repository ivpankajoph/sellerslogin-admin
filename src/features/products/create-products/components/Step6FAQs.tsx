import React from 'react'
import { HelpCircle, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  StudioFieldLabel,
  studioCardClass,
  studioTextareaClass,
} from './studio-ui'

interface FAQ {
  question: string
  answer: string
}

interface Props {
  faqs: FAQ[]
  onFAQChange: (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => void
  onAddFAQ: () => void
  onRemoveFAQ: (index: number) => void
  onGenerate: () => void
  aiLoading: boolean
}

const Step6FAQs: React.FC<Props> = ({
  faqs,
  onFAQChange,
  onAddFAQ,
  onRemoveFAQ,
  onGenerate,
  aiLoading,
}) => {
  return (
    <div className='space-y-6'>
      <div className={studioCardClass}>
        <div className='flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <HelpCircle className='h-4 w-4 text-amber-600' />
            FAQs
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              onClick={onGenerate}
              disabled={aiLoading}
              className='h-11 rounded-xl border border-border bg-card px-5 text-foreground hover:bg-white hover:text-black disabled:opacity-70'
            >
              {aiLoading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Sparkles className='mr-2 h-4 w-4' />
              )}
              Generate FAQs
            </Button>
            <Button
              type='button'
              onClick={onAddFAQ}
              className='h-11 rounded-xl bg-amber-500 px-5 text-white hover:bg-white hover:text-black'
            >
              <Plus className='mr-2 h-4 w-4' />
              Add FAQ
            </Button>
          </div>
        </div>
      </div>

      {faqs.length === 0 ? (
        <div className={studioCardClass}>
          <h3 className='text-base font-semibold text-foreground'>No FAQs added yet</h3>
        </div>
      ) : (
        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <article key={index} className={studioCardClass}>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <div className='inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300'>
                  FAQ {index + 1}
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onRemoveFAQ(index)}
                  className='h-10 rounded-xl border-red-500/25 bg-red-500/10 px-4 text-red-600 hover:bg-red-500/15 hover:text-red-700'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Remove
                </Button>
              </div>

              <div className='space-y-4'>
                <div>
                  <StudioFieldLabel label='Question' />
                  <textarea
                    value={faq.question}
                    onChange={(event) => onFAQChange(index, 'question', event.target.value)}
                    rows={2}
                    className={studioTextareaClass}
                    placeholder='Example: Is this product suitable for outdoor use?'
                  />
                </div>

                <div>
                  <StudioFieldLabel label='Answer' />
                  <textarea
                    value={faq.answer}
                    onChange={(event) => onFAQChange(index, 'answer', event.target.value)}
                    rows={4}
                    className={studioTextareaClass}
                    placeholder='Example: Yes, it is designed for outdoor use and includes weather-resistant construction.'
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Step6FAQs
