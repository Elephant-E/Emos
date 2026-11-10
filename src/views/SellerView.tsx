import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { ProductGrid } from '@/components/ProductGrid'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useShopProductsInfinite, useShopSeller } from '@/api/queries'

/**
 * 别人的店铺。从商品详情点店名进来，看这一家在卖什么。
 * 只看上架商品，也不提供任何管理入口——不是自己的店。
 */
export function SellerView({ sellerId }: { sellerId: number }) {
  const seller = useShopSeller(sellerId)
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<import('@/api/types').ShopProduct | null>(null)
  const query = useShopProductsInfinite({ sellerId, onlyUp: true })
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
        <div className="seller-banner">
          <img src={seller.data.cover_url} alt="" />
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
