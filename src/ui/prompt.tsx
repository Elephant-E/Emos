import { useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    if (!pending) return
    inputRef.current?.focus()
    inputRef.current?.select()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        return settle(null)
      }
      if (e.key !== 'Enter') return
      e.preventDefault()
      const trimmed = value.trim()
      if (pending.required && !trimmed) return
      settle(trimmed)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, value])

  if (!pending) return null

  const canSubmit = !pending.required || value.trim().length > 0

  return (
    <div
      className="modal-overlay modal-overlay--decision"
      onClick={(e) => e.target === e.currentTarget && settle(null)}
    >
      <div className="confirm" role="dialog" aria-modal="true" aria-label={pending.title}>
        <div className="confirm__head">
          <span className="confirm__dot confirm__dot--danger" />
          <h2 className="confirm__title">{pending.title}</h2>
        </div>

        {pending.message ? <p className="confirm__msg">{pending.message}</p> : null}

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

        <div className="confirm__foot">
          <button className="btn btn--ghost" onClick={() => settle(null)}>
            {pending.cancelText ?? '取消'}
          </button>
          <button
            className="btn btn--danger"
            disabled={!canSubmit}
            onClick={() => settle(value.trim())}
          >
            {pending.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
