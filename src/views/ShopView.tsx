import { useEffect, useState } from 'react'
import { formatPrice } from '@/components/Price'
import { InlineSortInput } from '@/components/InlineSortInput'
import { ListCard } from '@/components/ListCard'
import { ProductToolbar } from '@/components/ProductToolbar'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { IconPlus } from '@/components/icons'
import { ProductGrid } from '@/components/ProductGrid'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useShopCategories, useShopCounts, useShopMutations, useShopProducts, useShopProductsInfinite, useShopSeller } from '@/api/queries'
import { ImagePicker } from '@/components/ImagePicker'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useDebounced } from '@/lib/useDebounced'
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

export function ShopView({
  tab,
  page,
  categoryId,
  q,
  sort,
  scope,
  onSearch,
}: {
  tab: Tab
  page: number
  categoryId: number
  q: string
  sort: '' | 'sales' | 'price'
  /** all = 逛全站商品（默认）；mine = 管自己的店 */
  scope: 'all' | 'mine'
  onSearch: (patch: {
    tab?: Tab
    page?: number
    category?: number
    q?: string
    sort?: '' | 'sales' | 'price'
    scope?: 'all' | 'mine'
  }) => void
}) {
  const [panel, setPanel] = useState<Tab | null>(tab === 'products' ? null : tab)
  const seller = useShopSeller()
  const categories = useShopCategories(seller.data?.seller_id)
  const mine = scope === 'mine'
  // 逛全站时只显示上架的——下架商品对买家不存在
  // 表格只在「我的店铺」用；全站是卡片网格，走 browse
  const products = useShopProducts({
    page,
    sellerId: mine ? (seller.data?.seller_id ?? 0) : 0,
    categoryId,
    pageSize: 12,
    name: q,
    sortBy: sort,
    onlyUp: !mine,
    // 等 seller 回来再查，否则 seller_id=0 会把全站商品填进「我的店铺」
    enabled: mine && Boolean(seller.data?.seller_id),
  })
  // 卡片视图用滚动加载；表格视图仍分页
  const browse = useShopProductsInfinite({ sellerId: 0, name: q, sortBy: sort, onlyUp: true, enabled: !mine })
  const browseItems = browse.data?.pages.flatMap((p) => p.items) ?? []
  const counts = useShopCounts(seller.data?.seller_id ?? 0)
  const actions = useShopMutations()

  const [editing, setEditing] = useState<Partial<ShopProduct> | null>(null)
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<ShopProduct | null>(null)
  const [term, setTerm] = useState(q)
  useEffect(() => setTerm(q), [q])
  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: q })
  const [newCategory, setNewCategory] = useState('')
  const [sellerForm, setSellerForm] = useState<{ name: string; description: string } | null>(null)

  const createCategory = () => {
    if (!newCategory.trim() || actions.createCategory.isPending) return
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

  const saveProduct = () => {
    const categoryId = editing?.category_id ?? categories.data?.[0]?.category_id
    if (!editing?.name?.trim() || !categoryId || actions.saveProduct.isPending) return
    actions.saveProduct.mutate(
      {
        product_id: editing.product_id ?? null,
        category_id: categoryId,
        name: editing.name,
        cover_url: editing.cover_url ?? null,
        price: editing.price ?? 1,
        price_origin: editing.price_origin ?? 1,
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

  const isSeller = seller.data?.is_self

  return (
    <>
      <PageHeader
        crumb={['商城', TABS.find((t) => t.key === tab)?.label ?? '商品']}
        title={mine ? (seller.data?.name ?? '商城') : '商城'}
        hint={mine && seller.data ? (SELLER_STATUS[seller.data.status] ?? seller.data.status) : undefined}
        tools={
          <>
            <div className="seg" role="group" aria-label="范围">
              <button aria-pressed={scope === 'all'} onClick={() => onSearch({ scope: 'all', category: 0, page: 1 })}>
                全部商品
              </button>
              <button aria-pressed={scope === 'mine'} onClick={() => onSearch({ scope: 'mine', category: 0, page: 1 })}>
                我的店铺
              </button>
            </div>
            {isSeller && mine ? (
              <>
                <button className="btn btn--ghost" onClick={() => setPanel('categories')}>
                  分类
                </button>
                <button className="btn btn--ghost" onClick={() => setPanel('seller')}>
                  店铺
                </button>
              </>
            ) : null}
          </>
        }
      />

      {seller.error ? <ErrorBlock error={seller.error} onRetry={() => seller.refetch()} /> : null}

      {mine && isSeller && tab === 'products' && !panel ? (
        <section className="cards cards--4" style={{ marginBottom: 18 }}>
          <StatCard
            label="待发货"
            value={counts.ordersPending ?? '—'}
            unit="单"
            /* 取不到（比如非管理员，订单接口 403）时不能写「都发完了」 */
            note={counts.ordersPending === undefined ? '读取中' : counts.ordersPending > 0 ? '需要处理' : '都发完了'}
          />
          <StatCard label="在售商品" value={counts.productsOnSale ?? '—'} unit="件" note={`共 ${counts.productsAll ?? '—'} 件`} />
          <StatCard label="订单" value={counts.ordersAll ?? '—'} unit="单" note="开店以来" />
          <StatCard
            label="销量"
            value={counts.salesTotal ?? '—'}
            unit="件"
            note={counts.salesCapped ? '前 200 件累计' : '全部商品累计'}
          />
        </section>
      ) : null}

      <>
          <ProductToolbar
              style={{ marginTop: 0 }}
              categories={(categories.data ?? []).map((c) => ({ id: c.category_id, name: c.name }))}
              categoryId={categoryId}
              onCategory={(category) => onSearch({ category, page: 1 })}
              allLabel="全部分类"
              showCategories={mine}
              term={term}
              onTerm={setTerm}
              sort={sort}
              onSort={(next) => onSearch({ sort: next, page: 1 })}
              placeholder="搜索商品名"
              extra={
                isSeller && mine ? (
              <button
                className="btn btn--primary"
                disabled={!categories.data?.length}
                title={categories.data?.length ? undefined : '先创建至少一个分类'}
                onClick={() => setEditing({ stock: 100, price_origin: 100, price: 1, sort: 80, category_id: categories.data?.[0]?.category_id })}
              >
                  <IconPlus />
                  新增商品
                </button>
                ) : null
              }
            />

          {mine && products.error ? (
            <ErrorBlock error={products.error} onRetry={() => products.refetch()} />
          ) : null}
          {mine && products.isLoading ? <LoadingBlock rows={6} columns={5} /> : null}
          {mine && products.data && products.data.items.length === 0 ? (
            <EmptyBlock
              title={q ? `没有找到「${q}」` : categoryId ? '这个分类还没有商品' : '还没有商品'}
              action={q ? <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} /> : undefined}
            />
          ) : null}

          {/* 全站视图走 browse（滚动加载），它的加载与空态之前完全没接 */}
          {!mine && browse.error ? (
            <ErrorBlock error={browse.error} onRetry={() => browse.refetch()} />
          ) : null}
          {!mine && browse.isLoading ? <LoadingBlock rows={4} columns={5} /> : null}
          {!mine && !browse.isLoading && browseItems.length === 0 ? (
            <EmptyBlock
              title={q ? `没有找到「${q}」` : '还没有在售商品'}
              action={q ? <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} /> : undefined}
            />
          ) : null}

          {!mine && browseItems.length > 0 ? (
            <ProductGrid
              products={browseItems}
              hasMore={browse.hasNextPage}
              loadingMore={browse.isFetchingNextPage}
              loadError={browse.isFetchNextPageError}
              onLoadMore={() => browse.fetchNextPage()}
              onOpen={(product) => setDetailId(product.product_id)}
              onBuy={setBuyTarget}
            />
          ) : null}

          {products.data && products.data.items.length > 0 && mine ? (
            <ListCard items={products.data.items} total={products.data.total} idKey={(p) => p.product_id}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: mine ? '34%' : '44%' }} className="th-thumb">商品</th>
                    <th className="num" style={{ width: '12%' }}>价格</th>
                    <th className="num" style={{ width: '12%' }}>库存</th>
                    <th className="num" style={{ width: '12%' }}>销量</th>
                    <th style={{ width: '14%' }}>状态</th>
                    {mine ? <th style={{ width: '16%' }}>操作</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {products.data.items.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <div className="cell-title">
                          {product.cover_url ? (
                            <Poster src={product.cover_url} name={product.name} />
                          ) : (
                            <span className="thumb">{product.name.slice(0, 1)}</span>
                          )}
                          <span>
                            <span className="cell-title__name">{product.name}</span>
                            {product.up_time ? (
                              <span className="cell-title__code">上架 {formatDateTime(product.up_time)}</span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="num">{formatPrice(product.price)}</td>
                      <td className="num">{formatThousand(product.stock)}</td>
                      <td className="num">{formatThousand(product.sales)}</td>
                      <td>
                        <span className={`badge ${product.is_up ? 'badge--ok' : 'badge--off'}`}>
                          <i />
                          {product.is_up ? '已上架' : '已下架'}
                        </span>
                      </td>
                      {mine ? (
                      <td>
                        {isSeller ? (
                          <span className="action-group">
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
                            <button
                              className="btn btn--quiet"
                              onClick={() => setEditing(product)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn--danger-text"
                              disabled={actions.removeProduct.isPending}
                              onClick={async () => {
                                const ok = await confirmDialog({
                                  title: `删除商品「${product.name}」？`,
                                  message: '商品会从商城下架并删除，已产生的订单不受影响。',
                                  hint: '删除后无法恢复。',
                                  confirmText: '删除',
                                  danger: true,
                                })
                                if (!ok) return
                                actions.removeProduct.mutate(product.product_id, {
                                  onSuccess: () => toast('商品已删除', 'success'),
                                })
                              }}
                            >
                              删除
                            </button>
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager total={products.data.total} page={page} pageSize={products.data.page_size} onPage={(next) => onSearch({ page: next })} />
            </ListCard>
          ) : null}
      </>

      {panel === 'categories' ? (
        <Modal
          title="分类管理"
          width={560}
          onClose={() => setPanel(null)}
          onSubmit={() => {
            // 分类输入框有内容时回车才创建，否则不拦截
            if (newCategory.trim()) createCategory()
          }}
        >
          <>
            <CardHead title="分类">
              {isSeller ? (
                <div className="row-input" style={{ maxWidth: 320 }}>
                  <input className="input" placeholder="新分类名称" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={20} />
                  <button
                    className="btn btn--ghost"
                    disabled={!newCategory.trim()}
                    onClick={createCategory}
                  >
                    新增
                  </button>
                </div>
              ) : null}
            </CardHead>

            {categories.isLoading ? <LoadingBlock bare rows={3} columns={2} /> : null}
            {categories.data && categories.data.length === 0 ? <EmptyBlock bare title="还没有分类" /> : null}
            {categories.data && categories.data.length > 0 ? (
              <ul style={{ display: 'grid', gap: 2, marginTop: 12 }}>
                {categories.data.map((category) => (
                  <li key={category.category_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ color: 'var(--fg-2)' }}>{category.name}</span>
                    <span className="spacer" />
                    {isSeller ? (
                      <InlineSortInput
                        value={category.sort}
                        label={`${category.name} 的排序`}
                        onCommit={(sort) =>
                          actions.sortCategory.mutate(
                            { categoryId: category.category_id, sort },
                            { onSuccess: () => toast('已调整排序', 'success') },
                          )
                        }
                      />
                    ) : (
                      <span className="meta-sm">排序 {category.sort}</span>
                    )}
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
          </>
        </Modal>
      ) : null}

      {panel === 'seller' ? (
        <Modal title="店铺设置" width={560} onClose={() => setPanel(null)}>
          <>
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
                    onClick={() => setSellerForm({ name: seller.data!.name ?? '', description: seller.data!.description ?? '' })}
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
          </>
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={editing.product_id ? '编辑商品' : '新增商品'}
          width={460}
          onClose={() => setEditing(null)}
          onSubmit={saveProduct}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!editing.name?.trim() || !(editing.category_id ?? categories.data?.[0]?.category_id)}
                onClick={saveProduct}
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
          <ImagePicker
            label="封面"
            value={editing.cover_url ?? null}
            onChange={(url) => setEditing({ ...editing, cover_url: url })}
          />
          <div className="field-row">
            <label className="field">
              <span>售价</span>
              <input className="input" type="number" min={1} value={editing.price ?? 1} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>原价</span>
              <input className="input" type="number" min={1} value={editing.price_origin ?? 1} onChange={(e) => setEditing({ ...editing, price_origin: Number(e.target.value) })} />
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

      {buyTarget ? (
        <BuyModal product={buyTarget} onClose={() => setBuyTarget(null)} />
      ) : null}

      {detailId ? (
        <ProductDetailModal
          productId={detailId}
          onClose={() => setDetailId(0)}
          onBought={() => toast('订单已创建', 'success')}
        />
      ) : null}
    </>
  )
}
