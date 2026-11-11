import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { ProductGrid } from '@/components/ProductGrid'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useDebounced } from '@/lib/useDebounced'
import { useShopCategories, useShopProductsInfinite, useShopSeller } from '@/api/queries'

/**
 * 别人的店铺。从商品详情点店名进来，看这一家在卖什么。
 * 只看上架商品，也不提供任何管理入口——不是自己的店。
 */
export function SellerView({ sellerId }: { sellerId: number }) {
  const seller = useShopSeller(sellerId)
  const [categoryId, setCategoryId] = useState(0)
  const [sort, setSort] = useState<'' | 'sales' | 'price'>('')
  const [term, setTerm] = useState('')
  const [keyword, setKeyword] = useState('')

  useDebounced(term, setKeyword)
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<import('@/api/types').ShopProduct | null>(null)
  const categories = useShopCategories(sellerId)
  const query = useShopProductsInfinite({ sellerId, categoryId, name: keyword, sortBy: sort, onlyUp: true })
  const products = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <>
      <PageHeader
        crumb={['商城', seller.data?.name ?? '店铺']}
        title={seller.data?.name ?? '店铺'}
        hint={
          [
            seller.data?.description,
            query.data ? `${query.data.pages[0]?.total ?? 0} 件在售` : null,
            categories.data?.length ? `${categories.data.length} 个分类` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        tools={
          <Link className="btn btn--ghost" to="/shop" search={{ tab: 'products', page: 1, category: 0, q: '', sort: '', scope: 'all' }}>
            回到商城
          </Link>
        }
      />

      {seller.error ? <ErrorBlock error={seller.error} onRetry={() => seller.refetch()} /> : null}

      {categories.data && categories.data.length > 0 ? (
        <div className="toolbar">
          <Tabs
            items={[{ key: 0, label: '全部' }, ...categories.data.map((category) => ({ key: category.category_id, label: category.name }))]}
            value={categoryId}
            onChange={setCategoryId}
            label="分类"
          />
          <span className="spacer" />
          <input
            className="input"
            type="search"
            placeholder="搜这家店的商品"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={{ minWidth: 170 }}
          />
          <div className="seg" role="group" aria-label="排序">
            <button aria-pressed={sort === ''} onClick={() => setSort('')}>
              默认
            </button>
            <button aria-pressed={sort === 'sales'} onClick={() => setSort('sales')}>
              销量
            </button>
            <button aria-pressed={sort === 'price'} onClick={() => setSort('price')}>
              价格
            </button>
          </div>
        </div>
      ) : null}
      {query.error ? <ErrorBlock error={query.error} onRetry={() => query.refetch()} /> : null}

      {query.isLoading ? <LoadingBlock rows={4} columns={4} /> : null}

      {!query.isLoading && products.length === 0 ? (
        <EmptyBlock
          title={keyword ? `这家店没有「${keyword}」` : '这家店还没有在售商品'}
          action={
            keyword ? <ClearSearchButton onClick={() => { setTerm(''); setKeyword('') }} /> : undefined
          }
        />
      ) : null}

      {products.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <ProductGrid
            products={products}
            hasMore={query.hasNextPage}
            loadingMore={query.isFetchingNextPage}
            loadError={query.isFetchNextPageError}
            onLoadMore={() => query.fetchNextPage()}
            onOpen={(product) => setDetailId(product.product_id)}
            onBuy={setBuyTarget}
          />
        </div>
      ) : null}

      {buyTarget ? <BuyModal product={buyTarget} onClose={() => setBuyTarget(null)} /> : null}
      {detailId ? (
        <ProductDetailModal productId={detailId} onClose={() => setDetailId(0)} onBought={() => undefined} />
      ) : null}
    </>
  )
}
