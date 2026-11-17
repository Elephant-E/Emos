import type { ReactNode } from 'react'

/** 页内切换：容器 role=tablist 带 aria-label，按钮 role=tab 带 aria-selected；动态来源由调用方 map 成 items。 */
export function Tabs<K extends string | number>({
  items,
  value,
  onChange,
  label,
}: {
  items: ReadonlyArray<{ key: K; label: ReactNode }>
  value: K
  onChange: (key: K) => void
  label: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          className="tab"
          role="tab"
          type="button"
          aria-selected={value === item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
