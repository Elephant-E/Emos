import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconLeft, IconPlus, IconRight } from '@/components/icons'
import { useShopCategories, useShopMutations, useShopProducts, useShopSeller } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand } from '@/lib/format'
import type { ShopProduct } from '@/api/types'

type Tab = 'products' | 'categories' | 'seller'

const SELLER_STATUS: Record<string, string> = {
  pass: '营业中',
  normal: '营业中',
  examine: '审核中',
  review: '审核中',
  reject: '被驳回',
  closed: '已关闭',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'products', label: '商品' },
  { key: 'categories', label: '分类' },
  { key: 'seller', label: '店铺' },
]

export function ShopView({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const seller = useShopSeller()
  const categories = useShopCategories(seller.data?.seller_id)
  const [categoryId, setCategoryId] = useState(0)
  const [page, setPage] = useState(1)
  const products = useShopProducts(page, categoryId)
  const actions = useShopMutations()

  const [editing, setEditing] = useState<Partial<ShopProduct> | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [sellerForm, setSellerForm] = useState<{ name: string; description: string } | null>(null)

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / products.data.page_size)) : 1
  const isSeller = seller.data?.is_self

  return (
    <>
      <PageHeader
        crumb={['商城', TABS.find((t) => t.key === tab)?.label ?? '商品']}
        title={seller.data?.name ?? '商城'}
        hint={seller.data ? (SELLER_STATUS[seller.data.status] ?? seller.data.status) : undefined}
        tools={
          seller.data ? (
            <span className="stamp">
              <i />
              {seller.data.is_self ? '我的店铺' : '他人店铺'}
            </span>
          ) : null
        }
      />

      {seller.error ? <ErrorBlock error={seller.error as Error & { status?: number }} onRetry={() => seller.refetch()} /> : null}

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="商城分区">
          {TABS.map((item) => (
            <button key={item.key} className="tab" role="tab" aria-selected={tab === item.key} onClick={() => onTab(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'products' ? (
        <>
          <div className="toolbar" style={{ marginTop: 0 }}>
            <div className="tabs">
              <button className="tab" aria-selected={categoryId === 0} onClick={() => { setCategoryId(0); setPage(1) }}>
                全部
              </button>
              {(categories.data ?? []).map((category) => (
                <button
                  key={category.category_id}
                  className="tab"
                  aria-selected={categoryId === category.category_id}
                  onClick={() => { setCategoryId(category.category_id); setPage(1) }}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <span className="spacer" />
            {isSeller ? (
              <button className="btn btn--primary" onClick={() => setEditing({ stock: 100, price_origin: 0, sort: 80, category_id: categories.data?.[0]?.category_id })}>
                <IconPlus />
                新增商品
              </button>
            ) : null}
          </div>

          {products.error ? <ErrorBlock error={products.error as Error & { status?: number }} onRetry={() => products.refetch()} /> : null}
          {products.isLoading ? <LoadingBlock rows={6} columns={5} /> : null}
          {products.data && products.data.items.length === 0 ? (
            <EmptyBlock title="这个分类还没有商品" hint={isSeller ? '点右上角新增商品。' : '店铺还没上架商品。'} />
          ) : null}

          {products.data && products.data.items.length > 0 ? (
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '34%' }}>商品</th>
                    <th className="num" style={{ width: '12%' }}>价格</th>
                    <th className="num" style={{ width: '12%' }}>库存</th>
                    <th className="num" style={{ width: '12%' }}>销量</th>
                    <th style={{ width: '14%' }}>状态</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.items.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <div className="cell-title">
                          {product.cover_url ? (
                            <img className="poster-img" src={product.cover_url} alt="" />
                          ) : (
                            <span className="thumb">{product.name.slice(0, 1)}</span>
                          )}
                          <span>
                            <span className="cell-title__name">{product.name}</span>
                            <span className="cell-title__code">
                              #{product.product_id} · 排序 {product.sort}
                              {product.up_time ? ` · 上架 ${formatDateTime(product.up_time)}` : ''}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="num">{product.price ?? '—'}</td>
                      <td className="num">{formatThousand(product.stock)}</td>
                      <td className="num">{formatThousand(product.sales)}</td>
                      <td>
                        <span className={`badge ${product.is_up ? 'badge--ok' : 'badge--off'}`}>
                          <i />
                          {product.is_up ? '已上架' : '已下架'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSeller ? (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <button
                              className="btn btn--quiet"
                              onClick={() =>
                                actions.toggleUp.mutate(product.product_id, {
                                  onSuccess: () => toast(product.is_up ? '已下架' : '已上架', 'success'),
                                })
                              }
                            >
                              {product.is_up ? '下架' : '上架'}
                            </button>
                            <button className="btn btn--quiet" onClick={() => setEditing(product)}>
                              编辑
                            </button>
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-foot">
                <span>
                  共 {formatThousand(products.data.total)} 件 · 第 {page} / {totalPages} 页
                </span>
                <div className="pager">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="上一页">
                    <IconLeft />
                  </button>
                  <button aria-current="page">{page}</button>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="下一页">
                    <IconRight />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'categories' ? (
        <section className="cards cards--wide">
          <article className="card">
            <div className="chart-head">
              <p className="stat__label" style={{ margin: 0 }}>分类</p>
              {isSeller ? (
                <div className="row-input" style={{ maxWidth: 320 }}>
                  <input className="input" placeholder="新分类名称" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={20} />
                  <button
                    className="btn btn--ghost"
                    disabled={!newCategory.trim()}
                    onClick={() =>
                      actions.createCategory.mutate(
                        { name: newCategory.trim(), sort: 80 },
                        {
                          onSuccess: () => {
                            toast('分类已创建', 'success')
                            setNewCategory('')
                          },
                        },
                      )
                    }
                  >
                    新增
                  </button>
                </div>
              ) : null}
            </div>

            {categories.isLoading ? <LoadingBlock bare rows={3} columns={2} /> : null}
            {categories.data && categories.data.length === 0 ? <EmptyBlock bare title="还没有分类" /> : null}
            {categories.data && categories.data.length > 0 ? (
              <ul style={{ display: 'grid', gap: 2, marginTop: 12 }}>
                {categories.data.map((category) => (
                  <li key={category.category_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ color: 'var(--fg-2)' }}>{category.name}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>#{category.category_id} · 排序 {category.sort}</span>
                    <span className="spacer" />
                    {isSeller ? (
                      <button
                        className="btn btn--quiet"
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: `删除分类「${category.name}」？`,
                            message: '分类下的商品会变为未分类。',
                            confirmText: '删除',
                            danger: true,
                          })
                          if (!ok) return
                          actions.removeCategory.mutate(category.category_id, { onSuccess: () => toast('已删除', 'success') })
                        }}
                      >
                        删除
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </section>
      ) : null}

      {tab === 'seller' ? (
        <section className="cards cards--wide">
          <article className="card">
            <p className="stat__label">店铺信息</p>
            {seller.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {seller.data ? (
              <>
                <div className="detail-stats" style={{ marginTop: 12 }}>
                  <div className="detail-stat">
                    <b>{seller.data.name}</b>
                    <span>店铺名称</span>
                  </div>
                  <div className="detail-stat">
                    <b>{SELLER_STATUS[seller.data.status] ?? seller.data.status}</b>
                    <span>状态</span>
                  </div>
                  <div className="detail-stat">
                    <b>#{seller.data.seller_id}</b>
                    <span>店铺 ID</span>
                  </div>
                </div>
                {seller.data.description ? <p className="detail-desc" style={{ marginTop: 14 }}>{seller.data.description}</p> : null}
                {isSeller ? (
                  <button
                    className="btn btn--ghost"
                    style={{ marginTop: 16 }}
                    onClick={() => setSellerForm({ name: seller.data!.name, description: seller.data!.description ?? '' })}
                  >
                    编辑店铺
                  </button>
                ) : (
                  <button
                    className="btn btn--primary"
                    style={{ marginTop: 16 }}
                    onClick={() => setSellerForm({ name: '', description: '' })}
                  >
                    申请开店
                  </button>
                )}
              </>
            ) : null}
          </article>
        </section>
      ) : null}

      {editing ? (
        <Modal
          title={editing.product_id ? '编辑商品' : '新增商品'}
          hint="上架后可被用户下单；库存为 0 时自动售罄。"
          width={520}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!editing.name?.trim()}
                onClick={() =>
                  actions.saveProduct.mutate(
                    {
                      product_id: editing.product_id ?? null,
                      category_id: editing.category_id ?? categories.data?.[0]?.category_id,
                      name: editing.name,
                      cover_url: editing.cover_url ?? null,
                      price: editing.price ?? null,
                      price_origin: editing.price_origin ?? 0,
                      stock: editing.stock ?? 0,
                      sort: editing.sort ?? 80,
                      is_up: editing.is_up ?? false,
                    },
                    {
                      onSuccess: () => {
                        toast('已保存', 'success')
                        setEditing(null)
                      },
                    },
                  )
                }
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>名称</span>
            <input className="input" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field">
              <span>售价</span>
              <input className="input" type="number" value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>原价</span>
              <input className="input" type="number" value={editing.price_origin ?? 0} onChange={(e) => setEditing({ ...editing, price_origin: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>库存</span>
              <input className="input" type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>排序</span>
              <input className="input" type="number" value={editing.sort ?? 80} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} />
            </label>
          </div>
          <label className="field">
            <span>分类</span>
            <select
              className="input"
              value={editing.category_id ?? categories.data?.[0]?.category_id ?? ''}
              onChange={(e) => setEditing({ ...editing, category_id: Number(e.target.value) })}
            >
              {(categories.data ?? []).map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="switch">
            <input type="checkbox" checked={editing.is_up ?? false} onChange={(e) => setEditing({ ...editing, is_up: e.target.checked })} />
            立即上架
          </label>
        </Modal>
      ) : null}

      {sellerForm ? (
        <Modal
          title={isSeller ? '编辑店铺' : '申请开店'}
          hint={isSeller ? '修改后会重新进入审核。' : '提交后由管理员审核，通过后才能上架商品。'}
          onClose={() => setSellerForm(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setSellerForm(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!sellerForm.name.trim()}
                onClick={() => {
                  const payload = { name: sellerForm.name.trim(), description: sellerForm.description.trim() }
                  const onSuccess = () => {
                    toast(isSeller ? '已保存' : '已提交申请', 'success')
                    setSellerForm(null)
                  }
                  if (isSeller) actions.saveSeller.mutate(payload, { onSuccess })
                  else actions.applySeller.mutate(payload, { onSuccess })
                }}
              >
                {isSeller ? '保存' : '提交申请'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>店铺名称</span>
            <input className="input" value={sellerForm.name} maxLength={30} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>简介</span>
            <textarea className="input" value={sellerForm.description} maxLength={200} onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })} />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
