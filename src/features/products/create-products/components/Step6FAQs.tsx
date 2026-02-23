import React from 'react'
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'

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
    <section className='space-y-5'>
      <div className='rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/85 via-white to-orange-50/75 p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-extrabold tracking-tight text-slate-900'>
              FAQs
            </h2>
            <p className='mt-1 text-sm text-slate-600'>
              Anticipate buyer questions and improve conversion confidence.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={onGenerate}
              disabled={aiLoading}
              className='inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {aiLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Sparkles className='h-4 w-4' />
              )}
              Generate with AI
            </button>
            <button
              type='button'
              onClick={onAddFAQ}
              className='inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
            >
              <Plus className='h-4 w-4' />
              Add FAQ
            </button>
          </div>
        </div>
      </div>

      {faqs.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-500 shadow-sm'>
          No FAQs added yet. Click <span className='font-semibold'>"Add FAQ"</span>{' '}
          to start.
        </div>
      ) : (
        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <article
              key={index}
              className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-bold uppercase tracking-[0.11em] text-slate-500'>
                  FAQ {index + 1}
                </h3>
                <button
                  type='button'
                  onClick={() => onRemoveFAQ(index)}
                  className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100'
                  aria-label={`Remove FAQ ${index + 1}`}
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>

              <div className='space-y-3'>
                <div>
                  <label className='mb-1 block text-sm font-semibold text-slate-700'>
                    Question
                  </label>
                  <textarea
                    value={faq.question}
                    onChange={(event) =>
                      onFAQChange(index, 'question', event.target.value)
                    }
                    rows={2}
                    className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                    placeholder='What will customers ask first?'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-sm font-semibold text-slate-700'>
                    Answer
                  </label>
                  <textarea
                    value={faq.answer}
                    onChange={(event) =>
                      onFAQChange(index, 'answer', event.target.value)
                    }
                    rows={3}
                    className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                    placeholder='Provide a clear and concise answer.'
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Step6FAQs
