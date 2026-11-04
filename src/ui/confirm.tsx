import { useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  hint?: string
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

  const settle = (ok: boolean) => {
    current.current?.resolve(ok)
    current.current = null
    setPending(null)
  }

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return settle(false)
      if (e.key !== 'Enter') return
      const active = document.activeElement as HTMLElement | null
      if (active?.dataset.confirmAction === 'cancel') return
      e.preventDefault()
      settle(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!pending) return null

  return (
    <div
      className="modal-overlay modal-overlay--decision"
      onClick={(e) => e.target === e.currentTarget && settle(false)}
    >
      <div className="confirm" role="alertdialog" aria-modal="true" aria-label={pending.title}>
        <div className="confirm__head">
          <span className={`confirm__dot${pending.danger ? ' confirm__dot--danger' : ''}`} />
          <h2 className="confirm__title">{pending.title}</h2>
        </div>

        {pending.message ? <p className="confirm__msg">{pending.message}</p> : null}
        {pending.hint ? <p className="confirm__hint">{pending.hint}</p> : null}

        <div className="confirm__foot">
          <button className="btn btn--ghost" data-confirm-action="cancel" onClick={() => settle(false)}>
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
