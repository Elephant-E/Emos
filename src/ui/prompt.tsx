import { useEffect, useRef, useState } from 'react'
import { DecisionShell } from './decision'
import { useDialogHost } from './dialog-host'

interface PromptOptions {
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
  const { pending, begin, settle } = useDialogHost<PromptOptions, string | null>()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    open = (options) => {
      setValue(options.defaultValue ?? '')
      return begin(options)
    }
    return () => {
      open = null
    }
  }, [begin])

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
      <label className="field" style={{ marginTop: 'var(--stack)' }}>
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
