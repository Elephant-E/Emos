import { useEffect } from 'react'

/**
 * 输入即搜：用户停手 delay 毫秒后，才把输入框的值推给查询（或 URL）。
 *
 * 这个「停手再查」的写法在九个列表页里各写了一遍，取值、判等、清理
 * 定时器的三行几乎一字不差；还有一处在组件里自己存 timer，忘了在
 * 卸载时清理。收成一个 hook，防抖时长要改时也只改这里。
 *
 * current 传当前已经生效的值（通常是 URL 里的 q）：值没变就什么都不做，
 * 免得每敲一个字都往历史里推一条同样的地址。
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, current])
}
