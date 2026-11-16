import type { ShopProduct } from '@/api/types'
import { rowLink } from '@/lib/rowLink'
import { Price } from '@/components/Price'
import { IconBag } from '@/components/icons'
import { Poster } from '@/components/Poster'
import { formatThousand } from '@/lib/format'

/**
 * 商品卡片，商城的「全部商品」与店铺页共用。
 * 以图为主，所以用卡片而不是表格行；右下角只有一个购买动作。
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
    <article className="product-tile" {...rowLink(onOpen, true, 'button')}>
      <div className="product-tile__cover">
        <Poster src={product.cover_url} name={product.name} shape="square" />
      </div>
      <div className="product-tile__body">
        <span className="product-tile__name">{product.name}</span>
        <Price price={product.price} priceOrigin={product.price_origin} />
        <div className="product-tile__meta">
          <span>销量 {formatThousand(product.sales)} 件</span>
          {soldOut ? <span>已售罄</span> : <span>库存 {formatThousand(product.stock)} 件</span>}
          <button type="button"
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
