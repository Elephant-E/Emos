import { useEffect, useRef } from 'react'

/**
 * 列表底部的哨兵：进入视口就触发下一次加载。
 * 只在手机端渲染（桌面仍用分页器），`root` 用页面滚动容器。
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

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [disabled, onLoadMore])

  return <div ref={ref} className="infinite-sentinel" aria-hidden="true" data-loading={loading || undefined} />
}
