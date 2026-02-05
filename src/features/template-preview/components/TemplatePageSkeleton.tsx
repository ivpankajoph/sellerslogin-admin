export function TemplatePageSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14'>
        <div className='h-8 w-52 rounded-full bg-slate-200/70 animate-pulse' />
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='h-64 rounded-2xl bg-slate-200/60 animate-pulse' />
          <div className='h-64 rounded-2xl bg-slate-200/60 animate-pulse' />
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='h-40 rounded-2xl bg-slate-200/60 animate-pulse' />
          <div className='h-40 rounded-2xl bg-slate-200/60 animate-pulse' />
          <div className='h-40 rounded-2xl bg-slate-200/60 animate-pulse' />
        </div>
      </div>
    </div>
  )
}
