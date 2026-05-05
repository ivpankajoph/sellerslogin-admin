type ExcelCellValue = string | number | boolean | null | undefined

export type ExcelColumn<T> = {
  header: string
  value: keyof T | ((row: T) => ExcelCellValue)
}

const escapeXml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const normalizeCellValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

const buildExcelXml = <T,>(sheetName: string, columns: ExcelColumn<T>[], rows: T[]) => {
  const safeSheetName = escapeXml(sheetName || 'Sheet1')
  const headerRow = columns
    .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column.header)}</Data></Cell>`)
    .join('')
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const rawValue =
            typeof column.value === 'function' ? column.value(row) : row[column.value]
          const value = normalizeCellValue(rawValue)
          const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String'
          return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${safeSheetName}">
    <Table>
      <Row>${headerRow}</Row>
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`
}

export const downloadExcelFile = <T,>({
  filename,
  sheetName,
  columns,
  rows,
}: {
  filename: string
  sheetName: string
  columns: ExcelColumn<T>[]
  rows: T[]
}) => {
  const normalizedFilename = filename.toLowerCase().endsWith('.xls')
    ? filename
    : `${filename}.xls`
  const blob = new Blob([buildExcelXml(sheetName, columns, rows)], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizedFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const buildDatedFilename = (baseName: string) => {
  const date = new Date().toISOString().slice(0, 10)
  return `${baseName}-${date}.xls`
}
