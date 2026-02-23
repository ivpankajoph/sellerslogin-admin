import React from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'

interface Props {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  metaKeywordInput: string
  aiLoading: Record<string, boolean>
  onMetaTitleChange: (val: string) => void
  onMetaDescChange: (val: string) => void
  onKeywordInputChange: (val: string) => void
  onAddKeyword: (e: React.KeyboardEvent) => void
  onRemoveKeyword: (index: number) => void
  onGenerateTitle: () => void
  onGenerateDesc: () => void
  onGenerateKeywords: () => void
}

const aiButtonBase =
  'inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'

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
    <section className='space-y-5'>
      <div className='rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/70 p-5'>
        <h2 className='text-2xl font-extrabold tracking-tight text-slate-900'>
          SEO & Discovery
        </h2>
        <p className='mt-1 text-sm text-slate-600'>
          Optimize how this product appears in search and social previews.
        </p>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700'>
          Meta Title
          <button
            type='button'
            onClick={onGenerateTitle}
            disabled={aiLoading.metaTitle}
            className={aiButtonBase}
          >
            {aiLoading.metaTitle ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Sparkles className='h-3.5 w-3.5' />
            )}
            Generate
          </button>
        </label>
        <input
          type='text'
          value={metaTitle}
          onChange={(event) => onMetaTitleChange(event.target.value)}
          className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200'
          placeholder='Product title for search engines'
        />
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700'>
          Meta Description
          <button
            type='button'
            onClick={onGenerateDesc}
            disabled={aiLoading.metaDescription}
            className={aiButtonBase}
          >
            {aiLoading.metaDescription ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Sparkles className='h-3.5 w-3.5' />
            )}
            Generate
          </button>
        </label>
        <textarea
          value={metaDescription}
          onChange={(event) => onMetaDescChange(event.target.value)}
          rows={4}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200'
          placeholder='Summary users see in search snippets'
        />
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700'>
          Meta Keywords
          <button
            type='button'
            onClick={onGenerateKeywords}
            disabled={aiLoading.metaKeywords}
            className={aiButtonBase}
          >
            {aiLoading.metaKeywords ? (
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
          onChange={(event) => onKeywordInputChange(event.target.value)}
          onKeyDown={onAddKeyword}
          placeholder='Type keyword and press Enter'
          className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200'
        />

        <div className='mt-3 flex flex-wrap gap-2'>
          {metaKeywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-800'
            >
              {keyword}
              <button
                type='button'
                onClick={() => onRemoveKeyword(index)}
                className='rounded-full p-0.5 text-emerald-700 transition hover:bg-emerald-200'
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Step4SEO
