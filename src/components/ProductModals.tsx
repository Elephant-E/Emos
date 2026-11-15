import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Price, formatPrice } from '@/components/Price'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { Poster } from '@/components/Poster'
import { LoadingBlock, ErrorBlock } from '@/components/StateBlock'
import { useShopMutations, useShopProduct } from '@/api/queries'
import { formatThousand } from '@/lib/format'
import { toast } from '@/ui/toast'
import type { ShopProduct } from '@/api/types'

/** 商品详情 + 下单。商品列表只返回一部分字段，详情与库存要以 product/info 为准。 */
export function ProductDetailModal({
  productId,
  onClose,
  onBought,
}: {
  productId: number
  onClose: () => void
  onBought: () => void
}) {
  const product = useShopProduct(productId)
  const actions = useShopMutations()
  const [buyNumber, setBuyNumber] = useState(1)
  const [remark, setRemark] = useState('')

  const p = product.data
  const soldOut = (p?.stock ?? 0) <= 0
  const offShelf = p ? !p.is_up : false

  return (
    <Modal
      title="商品详情"
      width={560}
      onClose={onClose}
      footer={
        p ? (
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              关闭
            </button>
            <button type="button"
              className="btn btn--primary"
              disabled={soldOut || offShelf || actions.createOrder.isPending}
              onClick={() =>
                actions.createOrder.mutate(
                  { productId, buyNumber, remark: remark.trim() || null },
                  {
                    onSuccess: (res) => {
                      onBought()
                      onClose()
                      toast(`订单 ${res.no} 已创建，去订单页付款`, 'success')
                    },
                  },
                )
              }
            >
              {actions.createOrder.isPending ? '下单中…' : soldOut ? '已售罄' : offShelf ? '已下架' : '立即购买'}
            </button>
          </>
        ) : null
      }
    >
      {product.isLoading ? <LoadingBlock bare rows={4} columns={2} /> : null}
      {product.error ? <ErrorBlock bare error={product.error} onRetry={() => product.refetch()} /> : null}
      {p ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <div className="product-tile__cover" style={{ width: 160, flex: 'none', borderRadius: 10 }}>
              <Poster src={p.cover_url} name={p.name} shape="square" />
            </div>
            <div style={{ display: 'grid', gap: 'var(--sp-2)', alignContent: 'start', minWidth: 0 }}>
              <span style={{ fontSize: 15, color: 'var(--fg)' }}>{p.name}</span>
              <Price price={p.price} priceOrigin={p.price_origin} />
              <div className="product-tile__meta">
                <span>库存 {formatThousand(p.stock)}</span>
                <span>销量 {formatThousand(p.sales)}</span>
                {p.category_name ? <span>{p.category_name}</span> : null}
              </div>
              {offShelf ? <Badge tone="off">已下架</Badge> : null}
              {soldOut ? <Badge tone="warn">已售罄</Badge> : null}
              {p.seller ? (
                <Link
                  to="/shop/seller/$sellerId"
                  params={{ sellerId: String(p.seller.seller_id) }}
                  className="seller-line"
                >
                  <span className="seller-line__name">{p.seller.name}</span>
                  {p.seller.description ? <span className="seller-line__desc">{p.seller.description}</span> : null}
                </Link>
              ) : null}
            </div>
          </div>

          {p.description ? <p className="card-note" style={{ marginTop: 'var(--stack)' }}>{p.description}</p> : null}
          {p.exchange_way ? <p className="card-note">兑换方式：{p.exchange_way}</p> : null}

          <div className="field-row field-row--wide" style={{ marginTop: 'var(--stack)' }}>
            <label className="field">
              <span>数量</span>
              <input
                className="input tnum"
                type="number"
                min={1}
                max={Math.max(1, p.stock)}
                value={buyNumber}
                onChange={(e) => setBuyNumber(Math.min(Math.max(1, Number(e.target.value) || 1), Math.max(1, p.stock)))}
              />
            </label>
            <label className="field">
              <span>备注（给商户看）</span>
              <input className="input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填" />
            </label>
          </div>
        </>
      ) : null}
    </Modal>
  )
}

/** 快捷购买：卡片上直接下单，不经过详情页 */
export function BuyModal({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
  const actions = useShopMutations()
  const [buyNumber, setBuyNumber] = useState(1)
  const [remark, setRemark] = useState('')
  const max = Math.max(1, product.stock)
  const total = (product.price ?? 0) * buyNumber

  return (
    <Modal
      title="购买"
      width={420}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button type="button"
            className="btn btn--primary"
            disabled={actions.createOrder.isPending}
            onClick={() =>
              actions.createOrder.mutate(
                { productId: product.product_id, buyNumber, remark: remark.trim() || null },
                {
                  onSuccess: (res) => {
                    onClose()
                    toast(`订单 ${res.no} 已创建，去订单页付款`, 'success')
                  },
                },
              )
            }
          >
            {actions.createOrder.isPending ? '下单中…' : `下单 ${formatPrice(total)}`}
          </button>
        </>
      }
    >
      <div className="row" style={{ gap: 'var(--sp-3)' }}>
        <div className="product-tile__cover" style={{ width: 64, height: 64, flex: 'none', borderRadius: 8 }}>
          <Poster src={product.cover_url} name={product.name} shape="square" />
        </div>
        <span style={{ display: 'grid', gap: 'var(--sp-1)', minWidth: 0 }}>
          <span className="ellipsis" style={{ color: 'var(--fg)' }}>{product.name}</span>
          <span className="muted text-xs">
            {formatPrice(product.price)} · 库存 {formatThousand(product.stock)}
          </span>
        </span>
      </div>
      <label className="field" style={{ marginTop: 'var(--stack)' }}>
        <span>数量</span>
        <input
          className="input tnum"
          type="number"
          min={1}
          max={max}
          value={buyNumber}
          onChange={(e) => setBuyNumber(Math.min(Math.max(1, Number(e.target.value) || 1), max))}
        />
      </label>
      <label className="field">
        <span>备注（给商户看）</span>
        <input className="input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填" />
      </label>
    </Modal>
  )
}
