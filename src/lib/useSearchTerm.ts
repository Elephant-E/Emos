import { useEffect, useState } from 'react'
import { useDebounced } from '@/lib/useDebounced'

/**
 * 搜索框的双向绑定：本地 state 立刻响应输入，停手后再写回 URL。
 *
 * 站内有 9 处列表各写一遍 `const [term, setTerm] = useState(q)` +
 * `useEffect(() => setTerm(q), [q])` + `useDebounced(term, …)`，写法一致但四行样板。
 * 这里收成一个 hook，行为与原来完全一致（URL 变成新来源时同步回本地）。
 */
export function useSearchTerm(value: string, onCommit: (next: string) => void, delay = 350) {
  const [term, setTerm] = useState(value)
  useEffect(() => setTerm(value), [value])
  useDebounced(term, onCommit, { current: value, delay })
  return [term, setTerm] as const
}
