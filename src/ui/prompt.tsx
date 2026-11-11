import { useEffect, useRef, useState } from 'react'
import { DecisionShell } from './decision'

export interface PromptOptions {
  title: string
  /** 输入框上方的说明 */
  label: string
  message?: string
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  /** 返回 null 表示取消 */
  required?: boolean
}

interface Pending extends PromptOptions {
  resolve: (value: string | null) => void
}

let open: ((options: PromptOptions) => Promise<string | null>) | null = null

/** 需要输入内容的确认框，例如「删除理由」 */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  if (!open) {
    const value = window.prompt(options.label, options.defaultValue ?? '')
    return Promise.resolve(value)
  }
  return open(options)
}

export function PromptHost() {
  const [pending, setPending] = useState<Pending | null>(null)
  const [value, setValue] = useState('')
  const current = useRef<Pending | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    open = (options) =>
      new Promise<string | null>((resolve) => {
        const next: Pending = { ...options, resolve }
        current.current = next
        setValue(options.defaultValue ?? '')
        setPending(next)
      })
    return () => {
      open = null
    }
  }, [])

  const settle = (result: string | null) => {
    if (!current.current) return
    current.current.resolve(result)
    current.current = null
    setPending(null)
  }

  const canSubmit = !pending?.required || value.trim().length > 0

  useEffect(() => {
    if (pending) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [pending])


  if (!pending) return null

  return (
    <DecisionShell
      title={pending.title}
      role="dialog"
      danger
      message={pending.message}
      cancelText={pending.cancelText}
      confirmText={pending.confirmText}
      dangerConfirm
      confirmDisabled={!canSubmit}
      onCancel={() => settle(null)}
      onConfirm={() => {
        if (!canSubmit) return
        settle(value.trim())
      }}
    >
      <label className="field" style={{ marginTop: 12 }}>
        <span>{pending.label}</span>
        <input
          ref={inputRef}
          className="input"
          value={value}
          placeholder={pending.placeholder}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
    </DecisionShell>
  )
}
