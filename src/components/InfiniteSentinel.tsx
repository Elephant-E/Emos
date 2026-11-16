import { useEffect, useRef } from 'react'

/**
 * 列表底部的哨兵：进入视口就触发下一次加载（页面滚动容器）。
 *
 * 回调用 ref 收住：调用点普遍传内联箭头函数，直接进依赖会让观察器每翻一页重建一次。
 */
export function InfiniteSentinel({
  onLoadMore,
  disabled = false,
  loading = false,
}: {
  onLoadMore: () => void
  disabled?: boolean
  loading?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [disabled])

  return <div ref={ref} className="infinite-sentinel" aria-hidden="true" data-loading={loading || undefined} />
}
