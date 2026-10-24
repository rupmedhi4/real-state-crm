import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Opens a page's "create" dialog when the URL has ?create=1 (used by the
 * topbar "Create New" menu), then removes the parameter.
 */
export function useCreateParam(): [boolean, (open: boolean) => void] {
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (params.get('create') === '1') {
      setOpen(true)
      params.delete('create')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  return [open, setOpen]
}
