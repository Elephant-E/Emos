import { formatThousand } from '@/lib/format'

/** 「1,200 胡萝卜」，取不到时给破折号 */
export function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${formatThousand(value)} 胡萝卜`
}

/**
 * 商品价格：现价 +（有折扣时）划掉的原价。
 *
 * 这个判断原来在商品卡片、详情弹窗里各写一遍：
 * `(price ?? 0) > 0 && (price_origin ?? 0) > (price ?? 0)`。
 */
export function Price({
  price,
  priceOrigin,
}: {
  price: number | null | undefined
  priceOrigin: number | null | undefined
}) {
  const now = price ?? 0
  const origin = priceOrigin ?? 0
  return (
    <div className="product-tile__price">
      <b>{formatPrice(price)}</b>
      {now > 0 && origin > now ? <s>{formatThousand(origin)}</s> : null}
    </div>
  )
}
