import { useRef, useState } from 'react'

/**
 * 标签输入。
 *
 * 逗号 / 空格分隔的纯文本要用户自己记住分隔符，写错了还得回头改。
 * 这里回车或逗号即确认一个标签，确认后显示成 chip，可以单个删掉——
 * 输入过程中的「正在输入」和「已确认」是两种状态，不该看起来一样。
 */
export function TagInput({
  value,
  onChange,
  placeholder = '输入后回车添加',
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const fieldRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const text = draft.trim()
    if (!text) return
    // 一次粘进来多个（逗号或空格分隔）也拆开
    const parts = text.split(/[,，\s]+/).filter(Boolean)
    const next = [...value]
    for (const part of parts) if (!next.includes(part)) next.push(part)
    onChange(next)
    setDraft('')
    // 确认一个标签后焦点要留在框里，否则下一个回车会落到别的输入框上。
    // 放到下一帧，避开 commit 引起的这次重渲染
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="chip tag-input__chip">
          {tag}
          <button
            type="button"
            className="tag-input__remove"
            aria-label={`移除 ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={fieldRef}
        className="tag-input__field"
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
            e.preventDefault()
            e.stopPropagation()
            commit()
            return
          }
          // 输入框空着时退格删掉最后一个标签
          if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            e.preventDefault()
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}
