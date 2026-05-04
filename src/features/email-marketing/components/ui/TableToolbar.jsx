function TableToolbar({ title, description, actions, children }) {
  return (
    <div className="shell-card-strong p-5 md:p-6">
      <div className="table-toolbar">
        <div>
          {title ? <h3 className="text-lg font-semibold text-ui-strong">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-ui-body">{description}</p> : null}
        </div>
        {actions ? <div className="table-toolbar-actions">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}

export default TableToolbar
