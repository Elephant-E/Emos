import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 手机端的「滚动加载」：把分页接口当成无限列表用。
 *
 * 站内列表都是 `useQuery({ page })` 的分页模型，URL 里也有 page。
 * 全站不再有页码控件，往下滑就续一页，所以这里在客户端把已加载的页面累加：
 *
 * - 首屏只取第 1 页
 * - `loadMore()` 取下一页并追加，直到 `total` 取完
 * - 返回 `hasMore`，由调用方在列表底部放一个哨兵触发
 *
 * 桌面端也走滚动加载（URL 里的 page 不变），两套入口共用同一个 fetch 函数。
 */
export function usePagedInfinite<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number; page_size: number }>,
  { enabled = true, resetKey = '' }: { enabled?: boolean; resetKey?: string } = {},
) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  // 初始就是「加载中」：否则首个渲染帧 items 为空且 loading 为 false，
  // 会先闪一下「空态」文案再切骨架（实测 7–12ms，约一帧）
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<unknown>(null)
  const [done, setDone] = useState(false)

  // 每轮请求的代次：切换筛选后，旧的响应不能覆盖新的
  const runId = useRef(0)

  const load = useCallback(
    async (next: number) => {
      const run = runId.current
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPage(next)
        if (run !== runId.current) return
        setTotal(res.total)
        setPageSize(res.page_size || 20)
        setPage(next)
        setItems((prev) => (next === 1 ? res.items : [...prev, ...res.items]))
        setDone(next * (res.page_size || 20) >= res.total)
      } catch (err) {
        if (run === runId.current) setError(err)
      } finally {
        if (run === runId.current) setLoading(false)
      }
    },
    [fetchPage],
  )

  // 筛选变了就整个重来
  useEffect(() => {
    runId.current += 1
    setItems([])
    setDone(false)
    if (enabled) void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, enabled])

  const loadMore = useCallback(() => {
    if (loading || done) return
    void load(page + 1)
  }, [done, load, loading, page])

  const retry = useCallback(() => {
    runId.current += 1
    setItems([])
    setDone(false)
    void load(1)
  }, [load])

  return {
    items,
    total,
    pageSize,
    page,
    loading,
    error,
    hasMore: !done && items.length < total,
    // 用「已有数据 + 正在请求」判断续页：page 是成功后才有值的，
    // 拿 page > 1 判断会让第一次续页的加载态永远不出现（用户以为加载不动了）
    loadingMore: loading && items.length > 0,
    loadMore,
    retry,
  }
}
