import { useEffect, useState } from 'react'
import { useDebounced } from '@/lib/useDebounced'

/** 列表页搜索框：输入状态放在组件内，状态若留在页面，每敲一个字都会重渲染整张列表。 */
export function SearchField({
  value,
  onCommit,
  placeholder,
  label,
  delay = 350,
  className = 'input',
}: {
  /** 当前生效的搜索词（来自 URL） */
  value: string
  /** 防抖后或回车时提交 */
  onCommit: (next: string) => void
  placeholder?: string
  /** 读屏用的标签 */
  label: string
  delay?: number
  className?: string
}) {
  const [term, setTerm] = useState(value)

  // URL 变了（后退、清空筛选、进详情页返回）要把输入框同步回来
  useEffect(() => setTerm(value), [value])

  useDebounced(term, onCommit, { delay, current: value })

  return (
    <input
      className={className}
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={term}
      onChange={(e) => setTerm(e.target.value)}
      onKeyDown={(e) => {
        // 回车立即生效，不等防抖
        if (e.key !== 'Enter') return
        const next = term.trim()
        if (next !== value) onCommit(next)
      }}
    />
  )
}
