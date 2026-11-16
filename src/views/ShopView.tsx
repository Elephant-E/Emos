import { useEffect, useState } from 'react'
import { PAGE_SIZE } from '@/lib/search'
import { Price } from '@/components/Price'
import { SellerFormModal } from '@/components/shop/SellerFormModal'
import { ProductEditModal } from '@/components/shop/ProductEditModal'
import { CategoryPanel } from '@/components/shop/CategoryPanel'
import { InlineSortInput } from '@/components/InlineSortInput'
import { shopApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { Badge } from '@/components/Badge'
import { ProductToolbar } from '@/components/ProductToolbar'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingGrid } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconPlus } from '@/components/icons'
import { ProductGrid } from '@/components/ProductGrid'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useShopCategories, useShopCounts, useShopMutations, useShopProduct, useShopProductsInfinite, useShopSeller } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useSearchTerm } from '@/lib/useSearchTerm'
import {formatDateTime, formatThousand} from '@/lib/format'
import type { ShopProduct } from '@/api/types'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

type Tab = 'products' | 'categories' | 'seller'

/** 文档枚举：default / examine / pass / disable */
const SELLER_STATUS: Record<string, string> = {
  pass: '营业中',
  examine: '审核中',
  default: '未开店',
  disable: '已禁用',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'products', label: '商品' },
  { key: 'categories', label: '分类' },
  { key: 'seller', label: '店铺' },
]

export function ShopView({
  tab,
  categoryId,
  q,
  sort,
  scope,
  onSearch,
}: {
  tab: Tab
  categoryId: number
  q: string
  sort: '' | 'sales' | 'price'
  /** all = 逛全站商品（默认）；mine = 管自己的店 */
  scope: 'all' | 'mine'
  onSearch: (patch: {
    tab?: Tab
    page?: number
    page_size?: number
    category?: number
    q?: string
    sort?: '' | 'sales' | 'price'
    scope?: 'all' | 'mine'
  }) => void
}) {
  // 浮层用 URL 的 tab 表达：刷新、返回、面包屑都能对上，避免两套状态
  const panel = tab === 'products' ? null : tab
  const seller = useShopSeller()
  const categories = useShopCategories(seller.data?.seller_id)
  const mine = scope === 'mine'
  // 逛全站时只显示上架商品：下架商品对买家不存在
  // 表格只在「我的店铺」用；全站是卡片网格，走 browse
  // 逛全站：无限网格；我的店铺：同一个「滚动加载」模型
  const browse = useShopProductsInfinite({ sellerId: 0, name: q, sortBy: sort, onlyUp: true, enabled: !mine })
  const browseItems = browse.data?.pages.flatMap((p) => p.items) ?? []
  const counts = useShopCounts(seller.data?.seller_id ?? 0)
  const infinite = usePagedInfinite<ShopProduct>(
    (next) =>
      shopApi.products({
        page: next,
        page_size: PAGE_SIZE,
        seller_id: seller.data?.seller_id ?? 0,
        category_id: categoryId || undefined,
        name: q || undefined,
        sort_by: sort || undefined,
      }),
    { enabled: mine && Boolean(seller.data?.seller_id), resetKey: `${q}|${categoryId}|${sort}` },
  )
  const actions = useShopMutations()

  const [editing, setEditing] = useState<Partial<ShopProduct> | null>(null)
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<ShopProduct | null>(null)
  const [term, setTerm] = useSearchTerm(q, (next) => onSearch({ q: next }))
  const [sellerForm, setSellerForm] = useState<{ name: string; description: string; cover_url: string | null } | null>(null)

  // createOrUpdate 是整体覆盖：payload 里少 description / exchange_way / time_start /
  // time_end / user_buy_max 都会把它们清空，编辑时用商品详情补齐原值
  const editingDetail = useShopProduct(editing?.product_id ?? 0)
  useEffect(() => {
    const detail = editingDetail.data
    if (!detail || !editing?.product_id || detail.product_id !== editing.product_id) return
    setEditing((prev) =>
      prev && prev.product_id === detail.product_id
        ? {
            ...prev,
            description: prev.description ?? detail.description,
            exchange_way: prev.exchange_way ?? detail.exchange_way,
            time_start: prev.time_start ?? detail.time_start,
            time_end: prev.time_end ?? detail.time_end,
            user_buy_max: prev.user_buy_max ?? detail.user_buy_max,
          }
        : prev,
    )
  }, [editingDetail.data, editing?.product_id])

  const saveProduct = () => {
    const categoryId = editing?.category_id ?? categories.data?.[0]?.category_id
    if (!editing?.name?.trim() || !categoryId || actions.saveProduct.isPending) return
    actions.saveProduct.mutate(
      {
        product_id: editing.product_id ?? null,
        category_id: categoryId,
        name: editing.name,
        cover_url: editing.cover_url ?? null,
        description: editing.description ?? null,
        exchange_way: editing.exchange_way ?? null,
        price: Math.max(1, Number(editing.price) || 1),
        price_origin: Math.max(1, Number(editing.price_origin) || 1),
        // 接口要求库存 1–5000，0 会 422；原值与时间窗按详情回填，避免被覆盖清空
        stock: Math.min(5000, Math.max(1, Number(editing.stock) || 1)),
        sort: editing.sort ?? 80,
        is_up: editing.is_up ?? false,
        time_start: editing.time_start ?? null,
        time_end: editing.time_end ?? null,
        // user_buy_max 只有 product/list 会给，product/info 没有；
        // 也就是说编辑时拿不到原值，传 null 反倒可能清掉限购，所以这里不提交该字段
        ...(editing.user_buy_max == null ? {} : { user_buy_max: editing.user_buy_max }),
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
              <button type="button" aria-pressed={scope === 'all'} onClick={() => onSearch({ scope: 'all', category: 0 })}>
                全部商品
              </button>
              <button type="button" aria-pressed={scope === 'mine'} onClick={() => onSearch({ scope: 'mine', category: 0 })}>
                我的店铺
              </button>
            </div>
            {/* 分类与店铺入口按「我在看自己的店铺」判断，而不是「已经有店」：
                否则还没开店的人进不去店铺面板，也就点不到「申请开店」 */}
            {mine ? (
              <>
                {isSeller ? (
                  <button type="button" className="btn btn--ghost" onClick={() => onSearch({ tab: 'categories' })}>
                    分类
                  </button>
                ) : null}
                <button type="button" className="btn btn--ghost" onClick={() => onSearch({ tab: 'seller' })}>
                  店铺
                </button>
              </>
            ) : null}
          </>
        }
      />

      {seller.error ? <ErrorBlock error={seller.error} onRetry={() => seller.refetch()} /> : null}

      {mine && isSeller && tab === 'products' && !panel ? (
        <section className="cards cards--4" style={{ marginBottom: 'var(--gap-card)' }}>
          <StatCard
            label="待发货"
            value={counts.ordersPending ?? '—'}
            unit="单"
            /* 取不到（比如非管理员，订单接口 403）与 0 单是两回事 */
            note={counts.ordersPending === undefined ? '读取中' : counts.ordersPending > 0 ? '需要处理' : '都发完了'}
          />
          <StatCard secondary label="在售商品" value={counts.productsOnSale ?? '—'} unit="件" note={`共 ${counts.productsAll ?? '—'} 件`} />
          <StatCard secondary label="订单" value={counts.ordersAll ?? '—'} unit="单" note="开店以来" />
          <StatCard
            secondary
            label="销量"
            value={counts.salesTotal ?? '—'}
            unit="件"
            // 上游 product/list 的 page_size 上限是 100，所以只能累计前 100 件
            note={counts.salesCapped ? '前 100 件累计' : '全部商品累计'}
          />
        </section>
      ) : null}

      <>
          <ProductToolbar
              style={{ marginTop: 0 }}
              categories={(categories.data ?? []).map((c) => ({ id: c.category_id, name: c.name }))}
              categoryId={categoryId}
              onCategory={(category) => onSearch({ category })}
              allLabel="全部分类"
              showCategories={mine}
              term={term}
              onTerm={setTerm}
              sort={sort}
              onSort={(next) => onSearch({ sort: next })}
              placeholder="搜索商品名"
              extra={
                isSeller && mine ? (
              <button type="button"
                className="btn btn--primary"
                disabled={!categories.data?.length}
                // 分类取不到和确实没有分类是两回事：前者提示重试，后者提示先建分类
                title={categories.data?.length ? undefined : categories.error ? '分类没取到，请先重试' : '先创建至少一个分类'}
                onClick={() => setEditing({ stock: 100, price_origin: 100, price: 1, sort: 80, category_id: categories.data?.[0]?.category_id })}
              >
                  <IconPlus />
                  新增商品
                </button>
                ) : null
              }
            />

          {/* 全站视图走 browse（滚动加载），加载与空态独立处理 */}
          {!mine && browse.error ? (
            <ErrorBlock error={browse.error} onRetry={() => browse.refetch()} />
          ) : null}
          {!mine && browse.isLoading ? <LoadingGrid count={10} shape="square" lines={3} /> : null}
          {!mine && !browse.isLoading && !browse.error && browseItems.length === 0 ? (
            <EmptyBlock
              title={q ? `没有找到「${q}」` : '还没有在售商品'}
              action={q ? <ClearSearchButton onClick={() => onSearch({ q: '' })} /> : undefined}
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

          {mine ? (
            <ListSection
            loadingKind="rows"
            loadingPoster="square"
            loadingLines={3}
            loadingActions={2}
              isLoading={infinite.loading && infinite.items.length === 0}
              error={infinite.error}
              onRetry={() => infinite.retry()}
              items={infinite.items}
              infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
              loadingRows={6}
              emptyTitle={q ? `没有找到「${q}」` : categoryId ? '这个分类还没有商品' : '还没有商品'}
              emptyAction={q ? <ClearSearchButton onClick={() => onSearch({ q: '' })} /> : undefined}
            >
              <RecordRow
                rows={infinite.items}
                idKey={(product) => product.product_id}
                posterShape="square"
                poster={(product) => product.cover_url}
                title={(product) => product.name}
                meta={(product) => (
                  <>
                    <Badge tone={product.is_up ? 'ok' : 'off'}>{product.is_up ? '已上架' : '已下架'}</Badge>
                    <Price price={product.price} priceOrigin={product.price_origin} />
                    <span>{formatThousand(product.stock)} 件</span>
                    {(product.sales ?? 0) > 0 ? <span>{formatThousand(product.sales ?? 0)} 已售</span> : null}
                  </>
                )}
                facts={(product) => (
                  <>
                    {product.up_time ? <span>{formatDateTime(product.up_time)} 上架</span> : null}
                    {mine ? (
                      <>
                        <span>排序</span>
                        <InlineSortInput
                          value={product.sort}
                          label={`${product.name} 的排序`}
                          onCommit={(sort) => actions.setSort.mutate({ productId: product.product_id, sort })}
                        />
                      </>
                    ) : null}
                  </>
                )}
                actions={
                  mine && isSeller
                    ? (product) => (
                        <>
                          <button
                            type="button"
                            className="btn btn--quiet"
                            disabled={actions.toggleUp.isPending}
                            onClick={() =>
                              actions.toggleUp.mutate(product.product_id, {
                                onSuccess: () => toast(product.is_up ? '已下架' : '已上架', 'success'),
                              })
                            }
                          >
                            {product.is_up ? '下架' : '上架'}
                          </button>
                          <button type="button" className="btn btn--quiet" onClick={() => setEditing(product)}>
                            编辑
                          </button>
                          <button
                            type="button"
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
                        </>
                      )
                    : undefined
                }
              />
            </ListSection>
          ) : null}
      </>

      {panel === 'categories' ? (
        <CategoryPanel
          sellerId={seller.data?.seller_id}
          isSeller={Boolean(isSeller)}
          onClose={() => onSearch({ tab: 'products' })}
        />
      ) : null}

      {panel === 'seller' ? (
        <Modal title="店铺设置" width={560} onClose={() => onSearch({ tab: 'products' })}>
          <>
            <CardHead title="店铺信息" />
            {seller.isLoading ? <LoadingGrid count={6} shape="square" lines={3} /> : null}
            {!seller.isLoading && !seller.data ? (
              <>
                <p className="card-note">这个账号还没有店铺。</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ marginTop: 'var(--stack)' }}
                  disabled={actions.applySeller.isPending}
                  onClick={() => setSellerForm({ name: '', description: '', cover_url: null })}
                >
                  申请开店（扣 3000 胡萝卜）
                </button>
              </>
            ) : null}
            {seller.data ? (
              <>
                <div className="detail-stats" style={{ marginTop: 'var(--stack)' }}>
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
                {seller.data.description ? <p className="detail-desc" style={{ marginTop: 'var(--stack)' }}>{seller.data.description}</p> : null}
                {isSeller ? (
                  <button type="button"
                    className="btn btn--ghost"
                    style={{ marginTop: 'var(--stack)' }}
                    onClick={() =>
                      setSellerForm({
                        name: seller.data!.name ?? '',
                        description: seller.data!.description ?? '',
                        cover_url: seller.data!.cover_url ?? null,
                      })
                    }
                  >
                    编辑店铺
                  </button>
                ) : (
                  <button type="button"
                    className="btn btn--primary"
                    style={{ marginTop: 'var(--stack)' }}
                    onClick={() => setSellerForm({ name: '', description: '', cover_url: null })}
                  >
                    申请开店（扣 3000 胡萝卜）
                  </button>
                )}
              </>
            ) : null}
          </>
        </Modal>
      ) : null}

      {editing ? (
        <ProductEditModal
          draft={editing}
          categories={categories.data ?? []}
          pending={actions.saveProduct.isPending}
          onChange={(patch) => setEditing((prev) => (prev ? { ...prev, ...patch } : prev))}
          onClose={() => setEditing(null)}
          onSave={saveProduct}
        />
      ) : null}

      {sellerForm ? (
        <SellerFormModal current={sellerForm} isSeller={Boolean(isSeller)} onClose={() => setSellerForm(null)} />
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
