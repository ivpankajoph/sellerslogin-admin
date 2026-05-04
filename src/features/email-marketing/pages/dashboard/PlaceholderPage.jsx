import PageHeader from '../../components/ui/PageHeader.jsx'

function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <PageHeader eyebrow="Placeholder" title={title} description={description} />
      </section>

      <section className="shell-card-strong p-6">
        <div className="empty-state">
          <p className="text-sm font-medium text-ui-body">
            The {title.toLowerCase()} screen is ready for API-backed features in a later step.
          </p>
        </div>
      </section>
    </div>
  )
}

export default PlaceholderPage
