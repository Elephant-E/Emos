import { useEffect, useRef, useState } from 'react'
import { DecisionShell, useDecisionKeys } from './decision'

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
let openCount = 0

/** 确认框是叠在弹层之上的，Esc 应只关它，不能穿透到底层弹层 */
export function isConfirmOpen(): boolean {
  return openCount > 0
}

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
        openCount += 1
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
    openCount = Math.max(0, openCount - 1)
    current.current.resolve(ok)
    current.current = null
    setPending(null)
  }

  useDecisionKeys(Boolean(pending), () => settle(false), () => settle(true))

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
