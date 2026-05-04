function DateRangeFilter({ filters, onChange, onApply }) {
  return (
    <form
      className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <input
        className="field"
        type="date"
        value={filters.startDate}
        onChange={(event) => onChange('startDate', event.target.value)}
      />
      <input
        className="field"
        type="date"
        value={filters.endDate}
        onChange={(event) => onChange('endDate', event.target.value)}
      />
      <button type="submit" className="primary-button">
        Apply range
      </button>
    </form>
  )
}

export default DateRangeFilter
