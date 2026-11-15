import { useEffect, useRef } from 'react'
import { ProductTile } from '@/components/ProductTile'
import type { ShopProduct } from '@/api/types'

/**
 * 商品网格 + 触底加载。
 * 卡片视图没有「第几页」的概念，所以用触底加载代替翻页。
 */
export function ProductGrid({
  products,
  hasMore,
  loadingMore,
  loadError,
  onLoadMore,
  onOpen,
  onBuy,
}: {
  products: ShopProduct[]
  hasMore: boolean
  loadingMore: boolean
  /** 触底加载失败：真机后端偶发 504，失败态要与「没有更多」区分开 */
  loadError?: boolean
  onLoadMore: () => void
  onOpen: (product: ShopProduct) => void
  onBuy: (product: ShopProduct) => void
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  // 调用点传的是内联箭头函数，作为依赖会让观察器每次渲染重建
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) loadMoreRef.current()
      },
      { rootMargin: '240px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  return (
    <>
      <div className="product-grid content-in">
        {products.map((product) => (
          <ProductTile
            key={product.product_id}
            product={product}
            onOpen={() => onOpen(product)}
            onBuy={() => onBuy(product)}
          />
        ))}
      </div>
      <div ref={sentinel} />
      {!loadingMore && loadError ? (
        <p className="grid-state">
          <button type="button" className="btn btn--quiet" onClick={onLoadMore}>
            没加载出来，重试
          </button>
        </p>
      ) : null}
    </>
  )
}
