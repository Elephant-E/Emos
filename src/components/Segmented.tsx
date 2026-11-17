/**
 * 分段控件（按钮组）：与 `<Tabs>` 有意区分——Tabs 是页面级分区（下划线），
 * Segmented 是工具栏里的就地筛选（带底色的按钮组）。
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (next: T) => void
  /** 这组按钮的作用，读屏用（如「排序」「发货状态」） */
  label: string
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
