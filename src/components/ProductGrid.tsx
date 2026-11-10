import { useEffect, useRef } from 'react'
import { ProductTile } from '@/components/ProductTile'
import type { ShopProduct } from '@/api/types'

/**
 * 商品网格 + 触底加载。
 * 卡片视图没有「第几页」的概念，翻页会让人回到顶端重新找位置。
 */
export function ProductGrid({
  products,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
  onBuy,
}: {
  products: ShopProduct[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onOpen: (product: ShopProduct) => void
  onBuy: (product: ShopProduct) => void
}) {
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) onLoadMore()
      },
      { rootMargin: '240px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

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
      {loadingMore ? (
        <p className="muted" style={{ textAlign: 'center', marginTop: 16, width: '100%' }}>加载中…</p>
      ) : null}
      {!hasMore && products.length > 0 ? (
        <p className="muted" style={{ textAlign: 'center', marginTop: 16, fontSize: 12, width: '100%' }}>到底了</p>
      ) : null}
    </>
  )
}
