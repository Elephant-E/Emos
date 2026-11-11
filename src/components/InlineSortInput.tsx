/**
 * 表格里的行内排序输入框：平时是一行数字，聚焦时才露出输入框，
 * 失焦时把新值提交上去（值没变就不提交）。
 *
 * 商城分类和片单里的影片两处用法一致，只有提交的动作不同。
 */
export function InlineSortInput({
  value,
  label,
  onCommit,
  stopRowClick,
}: {
  value: number
  label: string
  onCommit: (next: number) => void
  /** 放在可点击的行里时，别让点输入框触发整行跳转 */
  stopRowClick?: boolean
}) {
  return (
    <input
      className="input input--cell tnum"
      type="number"
      aria-label={label}
      defaultValue={value}
      onClick={stopRowClick ? (e) => e.stopPropagation() : undefined}
      onKeyDown={stopRowClick ? (e) => e.stopPropagation() : undefined}
      onBlur={(e) => {
        const next = Number(e.target.value)
        if (!Number.isFinite(next) || next === value) return
        onCommit(next)
      }}
    />
  )
}
