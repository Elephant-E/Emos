import { useRef, useState } from 'react'

/**
 * 标签输入。
 *
 * 已确认的标签单独一行放在输入框下面，不塞进框里——塞进去时第一个标签紧贴
 * 左边框，看着像被选中了；而且框内的空间被标签占掉，看不出「还能继续输入」。
 */
export function TagInput({
  value,
  onChange,
  placeholder = '输入后回车添加',
  allowEmpty = true,
  autoFocus = false,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  allowEmpty?: boolean
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState('')
  const fieldRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const text = draft.trim()
    if (!text) return
    const parts = text.split(/[,，\s]+/).filter(Boolean)
    const next = [...value]
    for (const part of parts) if (!next.includes(part)) next.push(part)
    onChange(next)
    setDraft('')
    // 下一帧再收焦点：同步调用会被这次重渲染覆盖掉
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  return (
    <div className="tag-field">
      <input
        ref={fieldRef}
        className="input"
        autoFocus={autoFocus}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
            e.preventDefault()
            commit()
            return
          }
          if (e.key === 'Backspace' && draft === '' && allowEmpty && value.length > 0) {
            e.preventDefault()
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={commit}
      />
      {value.length > 0 ? (
        <div className="tag-field__list">
          {value.map((tag) => (
            <span key={tag} className="chip tag-field__chip">
              {tag}
              <button
                type="button"
                className="tag-field__remove"
                aria-label={`移除 ${tag}`}
                onClick={() => remove(tag)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
