function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(21,128,61,0.12)] text-sm font-semibold text-[var(--accent)]">
        EM
      </div>
      <h3 className="mt-5 text-lg font-semibold text-ui-strong">{title}</h3>
      <p className="mt-2 text-sm text-ui-body">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default EmptyState
