import { useEffect } from 'react'

/**
 * 输入即搜：停顿 delay 毫秒后才把输入框的值推给查询（或 URL）。
 * current 传已生效的值（通常是 URL 里的 q）：值没变就不推，免得历史里多一条同样的地址。
 */
export function useDebounced(
  value: string,
  onSettle: (next: string) => void,
  { delay = 350, current }: { delay?: number; current?: string } = {},
) {
  useEffect(() => {
    const next = value.trim()
    if (current !== undefined && next === current) return
    const timer = setTimeout(() => onSettle(next), delay)
    return () => clearTimeout(timer)
    // onSettle 每次渲染都是新函数，不该进依赖，否则每敲一键都重新计时
  }, [value, delay, current])
}
