const pad = (value) => String(value).padStart(2, '0')

const parseLocalDateTimeInput = (value) => {
  if (!value) {
    return null
  }

  const stringValue = String(value)
  const [datePart, timePart = ''] = stringValue.split('T')
  const [year, month, day] = datePart.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const [hours = 0, minutes = 0, secondsAndMs = '0'] = timePart.split(':')
  const [seconds = 0, milliseconds = 0] = String(secondsAndMs).split('.').map(Number)

  const date = new Date(
    year,
    month - 1,
    day,
    Number(hours) || 0,
    Number(minutes) || 0,
    Number(seconds) || 0,
    Number(milliseconds) || 0,
  )

  return Number.isNaN(date.getTime()) ? null : date
}

export const formatLocalDateTimeInput = (value) => {
  const date = parseLocalDateTimeInput(value)

  return date
    ? date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''
}

export const toDateTimeLocalInput = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const toIsoStringFromLocalInput = (value) => {
  const date = parseLocalDateTimeInput(value)
  return date ? date.toISOString() : ''
}
