import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { ProductGrid } from '@/components/ProductGrid'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useShopCategories, useShopProductsInfinite, useShopSeller } from '@/api/queries'

/**
 * 别人的店铺。从商品详情点店名进来，看这一家在卖什么。
 * 只看上架商品，也不提供任何管理入口——不是自己的店。
 */
export function SellerView({ sellerId }: { sellerId: number }) {
  const seller = useShopSeller(sellerId)
  const [categoryId, setCategoryId] = useState(0)
  const [sort, setSort] = useState<'' | 'sales' | 'price'>('')
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<import('@/api/types').ShopProduct | null>(null)
  const categories = useShopCategories(sellerId)
  const query = useShopProductsInfinite({ sellerId, categoryId, sortBy: sort, onlyUp: true })
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

      {seller.error ? <ErrorBlock error={seller.error as Error & { status?: number }} onRetry={() => seller.refetch()} /> : null}

      {seller.data?.cover_url ? (
        <div className="seller-cover">
          <img src={seller.data.cover_url} alt="" />
        </div>
      ) : null}

      {categories.data && categories.data.length > 0 ? (
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="分类">
            <button className="tab" role="tab" aria-selected={categoryId === 0} onClick={() => setCategoryId(0)}>
              全部
            </button>
            {categories.data.map((category) => (
              <button
                key={category.category_id}
                className="tab"
                role="tab"
                aria-selected={categoryId === category.category_id}
                onClick={() => setCategoryId(category.category_id)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <span className="spacer" />
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
      {query.error ? <ErrorBlock error={query.error as Error & { status?: number }} onRetry={() => query.refetch()} /> : null}

      {query.isLoading ? <LoadingBlock rows={4} columns={4} /> : null}

      {!query.isLoading && products.length === 0 ? <EmptyBlock title="这家店还没有在售商品" /> : null}

      {products.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <ProductGrid
            products={products}
            hasMore={query.hasNextPage}
            loadingMore={query.isFetchingNextPage}
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
