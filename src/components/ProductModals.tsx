import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Modal } from '@/components/Modal'
import { LoadingBlock } from '@/components/StateBlock'
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
    <Modal title="商品详情" width={560} onClose={onClose}>
      {product.isLoading ? <LoadingBlock bare rows={4} columns={2} /> : null}
      {p ? (
        <>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="product-tile__cover" style={{ width: 160, flex: 'none', borderRadius: 10 }}>
              {p.cover_url ? <img src={p.cover_url} alt={p.name} /> : p.name.slice(0, 1)}
            </div>
            <div style={{ display: 'grid', gap: 8, alignContent: 'start', minWidth: 0 }}>
              <span style={{ fontSize: 15, color: 'var(--fg)' }}>{p.name}</span>
              <div className="product-tile__price">
                <b>{p.price == null ? '—' : `${formatThousand(p.price)} 萝卜`}</b>
                {(p.price ?? 0) > 0 && (p.price_origin ?? 0) > (p.price ?? 0) ? (
                  <s>{formatThousand(p.price_origin ?? 0)}</s>
                ) : null}
              </div>
              <div className="product-tile__meta">
                <span>库存 {formatThousand(p.stock)}</span>
                <span>销量 {formatThousand(p.sales)}</span>
                {p.category_name ? <span>{p.category_name}</span> : null}
              </div>
              {offShelf ? <span className="badge badge--off"><i />已下架</span> : null}
              {soldOut ? <span className="badge badge--warn"><i />已售罄</span> : null}
              {p.seller ? (
                <span className="muted" style={{ fontSize: 12 }}>
                  来自{' '}
                  <Link
                    to="/shop/seller/$sellerId"
                    params={{ sellerId: String(p.seller.seller_id) }}
                    style={{ color: 'var(--fg-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    {p.seller.name}
                  </Link>
                  {p.seller.description ? ` · ${p.seller.description}` : ''}
                </span>
              ) : null}
            </div>
          </div>

          {p.description ? <p className="card-note" style={{ marginTop: 14 }}>{p.description}</p> : null}
          {p.exchange_way ? <p className="card-note">兑换方式：{p.exchange_way}</p> : null}

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginTop: 14 }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>
              关闭
            </button>
            <button
              className="btn btn--primary"
              disabled={soldOut || offShelf || actions.createOrder.isPending}
              onClick={() =>
                actions.createOrder.mutate(
                  { productId, buyNumber, remark: remark.trim() || null },
                  {
                    onSuccess: (res) => {
                      onBought()
                      toast(`订单 ${res.no} 已创建，去订单页付款`, 'success')
                    },
                  },
                )
              }
            >
              {actions.createOrder.isPending ? '下单中…' : soldOut ? '已售罄' : offShelf ? '已下架' : '立即购买'}
            </button>
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
          <button className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
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
            {actions.createOrder.isPending ? '下单中…' : `下单 ${formatThousand(total)} 萝卜`}
          </button>
        </>
      }
    >
      <div className="row" style={{ gap: 12 }}>
        <div className="product-tile__cover" style={{ width: 64, height: 64, flex: 'none', borderRadius: 8 }}>
          {product.cover_url ? <img src={product.cover_url} alt={product.name} /> : product.name.slice(0, 1)}
        </div>
        <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span className="ellipsis" style={{ color: 'var(--fg)' }}>{product.name}</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {product.price == null ? '—' : `${formatThousand(product.price)} 萝卜`} · 库存 {formatThousand(product.stock)}
          </span>
        </span>
      </div>
      <label className="field" style={{ marginTop: 14 }}>
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
