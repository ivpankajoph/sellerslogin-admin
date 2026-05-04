function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ui-muted">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-[30px] font-semibold tracking-tight text-ui-strong md:text-[36px]">{title}</h3>
      <p className="max-w-3xl text-[15px] leading-6 text-ui-body">{description}</p>
    </div>
  )
}

export default PageHeader
