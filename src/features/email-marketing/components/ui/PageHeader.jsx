function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7fa3]">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-[24px] font-semibold tracking-tight text-[#21192d] md:text-[28px]">{title}</h3>
      <p className="max-w-3xl text-[14px] leading-6 text-[#5f5375]">{description}</p>
    </div>
  )
}

export default PageHeader
