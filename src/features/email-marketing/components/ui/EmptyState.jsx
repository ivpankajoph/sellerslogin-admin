function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="mx-auto flex h-12 w-12 items-center justify-center bg-[#f0e8fb] text-[13px] font-semibold text-[#5a189a]">
        EM
      </div>
      <h3 className="mt-5 text-[15px] font-semibold text-[#21192d]">{title}</h3>
      <p className="mt-2 text-[13px] text-[#7f6f96]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default EmptyState
