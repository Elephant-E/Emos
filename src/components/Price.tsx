import { formatThousand } from '@/lib/format'

/** 「1,200 胡萝卜」，取不到时给破折号 */
export function formatPrice(value: number | null | undefined): string {
  return value == null ? '—' : `${formatThousand(value)} 胡萝卜`
}

/**
 * 商品价格：现价 +（有折扣时）划掉的原价。
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
    <span className="product-tile__price">
      <b>{formatPrice(price)}</b>
      {/* 原价与现价同一单位：只写数字会被读成别的计价方式 */}
      {now > 0 && origin > now ? <s>{formatThousand(origin)} 胡萝卜</s> : null}
    </span>
  )
}
