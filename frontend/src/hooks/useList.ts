import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../services/api'
import type { Query } from '../services/crm'
import type { Paginated } from '../types'

export interface ListState<T> {
  data: Paginated<T> | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loads a paginated list and re-runs whenever `params` change. Out-of-order
 * responses are ignored so fast typing in search can't show stale results.
 */
export function useList<T>(fetcher: (q: Query) => Promise<Paginated<T>>, params: Query): ListState<T> {
  const [data, setData] = useState<Paginated<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const requestId = useRef(0)
  const key = JSON.stringify(params)

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    fetcher(JSON.parse(key) as Query)
      .then((res) => id === requestId.current && setData(res))
      .catch((err) => id === requestId.current && setError(errorMessage(err)))
      .finally(() => id === requestId.current && setLoading(false))
    // fetcher is a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload }
}

/** Loads a single value (non-paginated) with the same semantics. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetcher()
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(errorMessage(err)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload, setData }
}

/** Page/sort state shared by list pages. */
export function useTableState(defaultSort: string, defaultOrder: 'ASC' | 'DESC' = 'DESC', limit = 20) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(limit)
  const [sortBy, setSortBy] = useState(defaultSort)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(defaultOrder)

  const toggleSort = (key: string) => {
    if (key === sortBy) setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))
    else {
      setSortBy(key)
      setSortOrder('ASC')
    }
    setPage(1)
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (n: number) => {
      setPageSize(n)
      setPage(1)
    },
    sortBy,
    sortOrder,
    toggleSort,
    setSort: (key: string, order: 'ASC' | 'DESC') => {
      setSortBy(key)
      setSortOrder(order)
      setPage(1)
    },
    params: { page, limit: pageSize, sortBy, sortOrder },
  }
}
