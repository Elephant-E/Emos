/**
 * 表格里的行内排序输入框：平时是一行数字，聚焦时才露出输入框，
 * 失焦时把新值提交上去（值没变就不提交）。
 */
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
  return (
    <input
      className="input input--cell tnum"
      type="number"
      aria-label={label}
      defaultValue={value ?? ''}
      onClick={stopRowClick ? (e) => e.stopPropagation() : undefined}
      onKeyDown={stopRowClick ? (e) => e.stopPropagation() : undefined}
      onBlur={(e) => {
        // 清空后 Number('') === 0，会把排序写成 0 排到最前；空值与非法值一律当作放弃修改
        const raw = e.target.value.trim()
        if (!raw) {
          e.target.value = value == null ? '' : String(value)
          return
        }
        const next = Number(raw)
        if (!Number.isFinite(next) || next === value) {
          e.target.value = value == null ? '' : String(value)
          return
        }
        onCommit(next)
      }}
    />
  )
}
