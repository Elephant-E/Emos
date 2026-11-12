import { useEffect, useRef, useState } from 'react'
import { DecisionShell } from './decision'

interface ConfirmOptions {
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
    if (!current.current) return
    current.current.resolve(ok)
    current.current = null
    setPending(null)
  }


  if (!pending) return null

  return (
    <DecisionShell
      title={pending.title}
      danger={pending.danger}
      message={pending.message}
      hint={pending.hint}
      cancelText={pending.cancelText}
      confirmText={pending.confirmText}
      dangerConfirm={pending.danger}
      cancelAutoFocus={pending.danger}
      confirmAutoFocus={!pending.danger}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  )
}
