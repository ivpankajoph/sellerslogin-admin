function AnalyticsWidgetShell({ eyebrow, title, description, actions, children }) {
  return (
    <section className="widget-shell">
      <div className="flex flex-col gap-4 border-b border-ui px-6 py-5 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ui-muted">{eyebrow}</p>
          ) : null}
          <h3 className="mt-1 text-xl font-semibold text-ui-strong">{title}</h3>
          {description ? <p className="mt-1 text-sm text-ui-body">{description}</p> : null}
        </div>
        {actions ? <div className="table-toolbar-actions">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}

export default AnalyticsWidgetShell
