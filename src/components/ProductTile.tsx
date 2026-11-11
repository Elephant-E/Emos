import type { ShopProduct } from '@/api/types'
import { IconBag } from '@/components/icons'
import { Poster } from '@/components/Poster'
import { formatThousand } from '@/lib/format'

/**
 * 商品卡片。商城的「全部商品」与店铺页共用。
 * 卖点是图，所以是卡片不是表格行；右下角只有一个购买动作。
 */
export function ProductTile({
  product,
  onOpen,
  onBuy,
}: {
  product: ShopProduct
  onOpen: () => void
  onBuy: () => void
}) {
  const soldOut = product.stock <= 0
  return (
    <article
      className="product-tile"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="product-tile__cover">
        <Poster src={product.cover_url} name={product.name} />
      </div>
      <div className="product-tile__body">
        <span className="product-tile__name">{product.name}</span>
        <div className="product-tile__price">
          <b>{product.price == null ? '—' : `${formatThousand(product.price)} 胡萝卜`}</b>
          {(product.price ?? 0) > 0 && (product.price_origin ?? 0) > (product.price ?? 0) ? (
            <s>{formatThousand(product.price_origin ?? 0)}</s>
          ) : null}
        </div>
        <div className="product-tile__meta">
          <span>销量 {formatThousand(product.sales)}</span>
          {soldOut ? <span>已售罄</span> : <span>库存 {formatThousand(product.stock)}</span>}
          <button
            className="product-tile__buy"
            aria-label={`购买 ${product.name}`}
            title={soldOut ? '已售罄' : '购买'}
            disabled={soldOut || !product.is_up}
            onClick={(e) => {
              e.stopPropagation()
              onBuy()
            }}
          >
            <IconBag size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
