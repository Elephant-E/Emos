import { useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

let open: ((options: ConfirmOptions) => Promise<boolean>) | null = null

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!open) return Promise.resolve(window.confirm(options.title))
  return open(options)
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null)
  const current = useRef<Pending | null>(null)

  useEffect(() => {
    open = (options) =>
      new Promise<boolean>((resolve) => {
        const next: Pending = { ...options, resolve }
        current.current = next
        setPending(next)
      })
    return () => {
      open = null
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  const settle = (ok: boolean) => {
    current.current?.resolve(ok)
    current.current = null
    setPending(null)
  }

  if (!pending) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && settle(false)}>
      <div className="modal" style={{ width: 400 }} role="alertdialog" aria-modal="true" aria-label={pending.title}>
        <div className="modal__head">
          <h2 className="modal__title">{pending.title}</h2>
        </div>
        <div className="modal__body">
          {pending.message ? <p style={{ color: 'var(--fg-2)', fontSize: 13.5, lineHeight: 1.7 }}>{pending.message}</p> : null}
        </div>
        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={() => settle(false)}>
            {pending.cancelText ?? '取消'}
          </button>
          <button
            className={pending.danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={() => settle(true)}
            autoFocus
          >
            {pending.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
