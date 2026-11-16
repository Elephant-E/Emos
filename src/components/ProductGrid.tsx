import { InfiniteSentinel } from '@/components/InfiniteSentinel'
import { LoadingGrid } from '@/components/StateBlock'
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
      {loadingMore ? <LoadingGrid count={4} shape="product" /> : null}
      {hasMore ? <InfiniteSentinel onLoadMore={onLoadMore} loading={loadingMore} /> : null}
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
