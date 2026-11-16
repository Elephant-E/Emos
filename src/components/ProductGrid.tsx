import { InfiniteSentinel } from '@/components/InfiniteSentinel'
import { RecordGrid } from '@/components/RecordGrid'
import { Price } from '@/components/Price'
import { formatThousand } from '@/lib/format'
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
      <RecordGrid
        className="content-in"
        rows={products}
        idKey={(product) => product.product_id}
        onOpen={onOpen}
        shape="square"
        poster={(product) => product.cover_url}
        title={(product) => product.name}
        meta={(product) => <Price price={product.price} priceOrigin={product.price_origin} />}
        sub={(product) => (
          <>
            {(product.sales ?? 0) > 0 ? <span>销量 {formatThousand(product.sales)}</span> : null}
            {product.stock <= 0 ? null : <span>库存 {formatThousand(product.stock)}</span>}
          </>
        )}
        actions={(product) => (
          <button
            type="button"
            className="btn btn--ghost"
            aria-label={product.stock <= 0 ? `${product.name} 已售罄` : `购买 ${product.name}`}
            title={product.stock <= 0 ? '已售罄' : '购买'}
            disabled={product.stock <= 0 || !product.is_up}
            onClick={(event) => {
              event.stopPropagation()
              onBuy(product)
            }}
          >
            {product.stock <= 0 ? '已售罄' : '购买'}
          </button>
        )}
      />
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
