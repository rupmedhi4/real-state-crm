import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface SearchState {
  query: string
  setQuery: (q: string) => void
  /** The query after the user stops typing for a moment. */
  debounced: string
}

const SearchContext = createContext<SearchState>({ query: '', setQuery: () => {}, debounced: '' })

/** The topbar search box filters whichever list page is open. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const { pathname } = useLocation()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Each page starts unfiltered.
  useEffect(() => {
    setQuery('')
    setDebounced('')
  }, [pathname])

  return (
    <SearchContext.Provider value={{ query, setQuery, debounced }}>
      {children}
    </SearchContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  return useContext(SearchContext)
}
