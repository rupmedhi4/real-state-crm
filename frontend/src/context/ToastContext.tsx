import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Kind = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  kind: Kind
  text: string
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = nextId++
    setItems((list) => [...list, { id, kind, text }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 2800)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
