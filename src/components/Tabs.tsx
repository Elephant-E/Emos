import type { ReactNode } from 'react'

/**
 * 页内切换：容器 role=tablist 带 aria-label，按钮 role=tab 带 aria-selected。
 *
 * role=tab 向读屏承诺的是「一个 Tab 停靠点 + 方向键切换」，所以这里自己做
 * roving tabindex 与 ←/→/Home/End —— 否则读屏用户要按 N 次 Tab 才能穿过一排 tab。
 */
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
      {items.map((item, index) => (
        <button
          key={item.key}
          className="tab"
          role="tab"
          type="button"
          aria-selected={value === item.key}
          // 只有当前项能 Tab 到，其余用方向键切换
          tabIndex={value === item.key ? 0 : -1}
          onClick={() => onChange(item.key)}
          onKeyDown={(event) => {
            const delta =
              event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
            const jump =
              event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
            const next = jump ?? (delta ? (index + delta + items.length) % items.length : null)
            if (next == null) return
            event.preventDefault()
            const target = items[next]
            if (!target) return
            onChange(target.key)
            // 焦点跟着选中项走：不这么做的话焦点会留在已失活的按钮上
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.tab')
            buttons?.[next]?.focus()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
