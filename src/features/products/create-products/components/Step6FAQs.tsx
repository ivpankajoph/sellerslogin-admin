import React from 'react'
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
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
        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            type='button'
            onClick={onGenerate}
            disabled={aiLoading}
            className='border-border bg-card text-foreground h-11 rounded-xl border px-5 hover:bg-white hover:text-black disabled:opacity-70'
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

      {faqs.length ? (
        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <article key={index} className={studioCardClass}>
              <div className='mb-4 flex justify-end'>
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
                    onChange={(event) =>
                      onFAQChange(index, 'question', event.target.value)
                    }
                    rows={2}
                    className={studioTextareaClass}
                    placeholder='Example: Is this product suitable for outdoor use?'
                  />
                </div>

                <div>
                  <StudioFieldLabel label='Answer' />
                  <textarea
                    value={faq.answer}
                    onChange={(event) =>
                      onFAQChange(index, 'answer', event.target.value)
                    }
                    rows={4}
                    className={studioTextareaClass}
                    placeholder='Example: Yes, it is designed for outdoor use and includes weather-resistant construction.'
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default Step6FAQs
