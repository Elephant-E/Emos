import { useRef } from 'react'

/** 行内排序输入框：平时一行数字，聚焦才露出输入框，失焦提交（值没变不提交）。 */
export function InlineSortInput({
  value,
  label,
  onCommit,
  stopRowClick,
}: {
  value: number | null
  label: string
  onCommit: (next: number) => void
  /** 放在可点击的行里时，阻止点击与按键冒泡到整行 */
  stopRowClick?: boolean
}) {
  // 回车已经提交过的话，随后的 blur 不要再提交一次（否则一次输入两个 PUT）
  const committedByEnter = useRef(false)

  /** 提交当前值；空值与非法值一律当作放弃修改 */
  const commit = (input: HTMLInputElement) => {
    // 清空后 Number('') === 0，会把排序写成 0 排到最前
    const raw = input.value.trim()
    const next = raw ? Number(raw) : Number.NaN
    if (!raw || !Number.isFinite(next) || next === value) {
      input.value = value == null ? '' : String(value)
      return
    }
    onCommit(next)
  }

  return (
    <input
      className="input input--cell tnum"
      type="number"
      aria-label={label}
      defaultValue={value ?? ''}
      onClick={stopRowClick ? (e) => e.stopPropagation() : undefined}
      onBlur={(e) => {
        if (committedByEnter.current) {
          committedByEnter.current = false
          return
        }
        commit(e.currentTarget)
      }}
      onKeyDown={(e) => {
        // 回车就地提交：敲完数字按回车不该静默无效
        if (e.key === 'Enter') {
          e.preventDefault()
          committedByEnter.current = true
          commit(e.currentTarget)
          e.currentTarget.blur()
        }
        if (stopRowClick) e.stopPropagation()
      }}
    />
  )
}
