import type { ReactNode } from 'react'
import { Spinner } from './ui'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /** Server-side sort key; omit for unsortable columns. */
  sortKey?: string
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  onSort?: (key: string) => void
  empty?: string
}

/** Responsive, table-first list with sort headers, loading and empty states. */
export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  rowKey,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  empty = 'No records found.',
}: Props<T>) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = !!(c.sortKey && onSort)
              const active = sortable && c.sortKey === sortBy
              return (
                <th
                  key={c.key}
                  className={sortable ? 'sortable' : undefined}
                  onClick={sortable ? () => onSort!(c.sortKey!) : undefined}
                  aria-sort={active ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : undefined}
                >
                  {c.header}
                  {active && <span className="sort-ind">{sortOrder === 'ASC' ? '▲' : '▼'}</span>}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr className="empty-row">
              <td colSpan={columns.length} style={{ color: 'var(--red)' }}>
                {error}{' '}
                {onRetry && (
                  <button className="btn sm" onClick={onRetry}>
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ) : loading && !rows?.length ? (
            <tr className="loading-row">
              <td colSpan={columns.length}>
                <Spinner /> Loading…
              </td>
            </tr>
          ) : !rows?.length ? (
            <tr className="empty-row">
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'rowclick' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={loading ? { opacity: 0.6 } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (p: number) => void
  onPageSize?: (n: number) => void
}) {
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  return (
    <div className="pagination">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="pages">
        {onPageSize && (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button className="btn sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next ›
        </button>
      </div>
    </div>
  )
}

/** Stops row-click navigation when clicking buttons inside a row. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}
