import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Pager } from '@/components/Pager'
import { ProductTile } from '@/components/ProductTile'
import { BuyModal, ProductDetailModal } from '@/components/ProductModals'
import { useShopProducts, useShopSeller } from '@/api/queries'

/**
 * 别人的店铺。从商品详情点店名进来，看这一家在卖什么。
 * 只看上架商品，也不提供任何管理入口——不是自己的店。
 */
export function SellerView({ sellerId }: { sellerId: number }) {
  const seller = useShopSeller(sellerId)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(0)
  const [buyTarget, setBuyTarget] = useState<import('@/api/types').ShopProduct | null>(null)
  const products = useShopProducts(page, sellerId, 0, 24, '', '', true)

  return (
    <>
      <PageHeader
        crumb={['商城', seller.data?.name ?? '店铺']}
        title={seller.data?.name ?? '店铺'}
        hint={seller.data?.description ?? undefined}
        tools={
          <Link className="btn btn--ghost" to="/shop" search={{ tab: 'products', page: 1, category: 0, q: '', sort: '', scope: 'all' }}>
            回到商城
          </Link>
        }
      />

      {seller.error ? <ErrorBlock error={seller.error as Error & { status?: number }} onRetry={() => seller.refetch()} /> : null}
      {products.error ? (
        <ErrorBlock error={products.error as Error & { status?: number }} onRetry={() => products.refetch()} />
      ) : null}

      {products.isLoading ? <LoadingBlock rows={4} columns={4} /> : null}

      {!products.isLoading && products.data && products.data.items.length === 0 ? (
        <EmptyBlock title="这家店还没有在售商品" />
      ) : null}

      {products.data && products.data.items.length > 0 ? (
        <>
          <div className="product-grid content-in" style={{ marginTop: 18 }}>
            {products.data.items.map((product) => (
              <ProductTile
                key={product.product_id}
                product={product}
                onOpen={() => setDetailId(product.product_id)}
                onBuy={() => setBuyTarget(product)}
              />
            ))}
          </div>
          <Pager total={products.data.total} page={page} pageSize={products.data.page_size} onPage={setPage} />
        </>
      ) : null}

      {buyTarget ? <BuyModal product={buyTarget} onClose={() => setBuyTarget(null)} /> : null}
      {detailId ? (
        <ProductDetailModal productId={detailId} onClose={() => setDetailId(0)} onBought={() => undefined} />
      ) : null}
    </>
  )
}
