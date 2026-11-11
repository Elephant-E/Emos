import type { ReactNode } from 'react'

/**
 * 页内 tabs。
 *
 * 这个结构原来在十三个页面里各写一遍：七种用数组 map、六种手写按钮，
 * 其中一处（商城的分类）漏了 role="tablist"，一处（悄悄话）漏了 aria-label。
 * 动态来源的 tab（媒体库、店铺分类）由调用方先 map 成 items 再传进来。
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
