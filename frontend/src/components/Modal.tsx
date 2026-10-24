import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Spinner } from './ui'

interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'narrow' | 'wide'
  /** When set, the body is a <form> and Enter submits it. */
  onSubmit?: () => void
}

export function Modal({ title, onClose, children, footer, size, onSubmit }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const inner = (
    <>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </>
  )

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true">
        <div className="modal-h">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {onSubmit ? (
          <form
            noValidate
            style={{ display: 'contents' }}
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {inner}
          </form>
        ) : (
          inner
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Standard Cancel / Save footer for form modals. */
export function FormFooter({ onCancel, saving, label = 'Save' }: {
  onCancel: () => void
  saving?: boolean
  label?: string
}) {
  return (
    <>
      <button type="button" className="btn" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="btn primary" disabled={saving}>
        {saving ? <Spinner /> : null} {label}
      </button>
    </>
  )
}

/** Promise-free confirm dialog used for destructive actions. */
export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onClose }: {
  title?: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="narrow"
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn danger solid"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                onClose()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Spinner /> : null} {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  )
}
