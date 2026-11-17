import { useEffect, useRef } from 'react'

/** 列表底部哨兵：进入视口触发下一页加载；回调经 ref 收住，避免内联箭头函数让观察器每页重建。 */
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
