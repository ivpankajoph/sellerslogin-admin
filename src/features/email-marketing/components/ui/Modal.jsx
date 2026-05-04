function Modal({
  title,
  description,
  children,
  onClose,
  className = "",
  bodyClassName = "",
  style,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div
        className={`shell-card-strong flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden p-6 md:p-7 ${className}`}
        style={style}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-ui-strong">{title}</h3>
            {description ? <p className="mt-2 text-sm text-ui-body">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className={`mt-6 min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  )
}

export default Modal
