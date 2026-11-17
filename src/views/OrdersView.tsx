import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Segmented } from '@/components/Segmented'
import { SearchField } from '@/components/SearchField'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { Badge } from '@/components/Badge'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'

import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { shopApi } from '@/api/endpoints'
import { qk, useShopMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand, isOrderPaid } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

export interface OrdersSearch {
  pay: 'all' | 'paid' | 'unpaid'
  delivery: 'all' | 'sent' | 'pending'
  q: string
  scope: 'mine' | 'shop'
}

const PAY_TABS: Array<{ key: OrdersSearch['pay']; label: string; filter: { is_pay?: boolean } }> = [
  { key: 'all', label: '全部', filter: {} },
  { key: 'paid', label: '已支付', filter: { is_pay: true } },
  { key: 'unpaid', label: '待支付', filter: { is_pay: false } },
]

const DELIVERY_TABS: Array<{ key: OrdersSearch['delivery']; label: string; filter: { is_delivery?: boolean } }> = [
  { key: 'all', label: '全部', filter: {} },
  { key: 'sent', label: '已发货', filter: { is_delivery: true } },
  { key: 'pending', label: '待发货', filter: { is_delivery: false } },
]

export function OrdersView({ search, onSearch }: { search: OrdersSearch; onSearch: (patch: Partial<OrdersSearch>) => void }) {
  const pay = PAY_TABS.find((t) => t.key === search.pay) ?? PAY_TABS[0]
  const delivery = DELIVERY_TABS.find((t) => t.key === search.delivery) ?? DELIVERY_TABS[0]

  const mineScope = search.scope === 'mine'
  // 两个视角共用同一份筛选：分开写会出现「店铺订单能搜到、我的订单搜不到」
  const filter = {
    ...pay.filter,
    ...delivery.filter,
    // 后端对 order_no 与 order_title 是分开的两个参数，长串数字当单号、其余当商品名
    ...(search.q ? (/^[0-9A-Za-z]{12,}$/.test(search.q) ? { order_no: search.q } : { order_title: search.q }) : {}),
  }
  // 两端都滚动加载：两个接口按视角二选一
  const infinite = usePagedInfinite<Awaited<ReturnType<typeof shopApi.ordersShop>>['items'][number]>(
    (page) =>
      mineScope
        ? shopApi.ordersUser({ page, ...filter })
        : shopApi.ordersShop({ page, ...filter }),
    // 筛选与搜索都影响结果集：切换后必须重新查，否则列表还留着旧结果
    {
      // 键前缀必须与 mutation 的失效键一致，否则改了订单列表不刷新
      queryKey: [
        ...(mineScope ? qk.shopMineOrders : qk.shopOrders),
        { q: search.q, pay: search.pay, delivery: search.delivery },
      ],
    },
  )
  const actions = useShopMutations()
  // 店铺订单和自己下的单走两个接口，判断只写一处
  const remove = mineScope ? actions.removeOrder : actions.deleteOrder
  const [remarking, setRemarking] = useState<{ orderNo: string; remark: string } | null>(null)
  // 支付 / 发货 / 关键词三个筛选维度任一偏离默认值就算「筛过」，
  // 空态要能分清「筛掉了」和「本来没有」
  const filtered = Boolean(search.q) || search.pay !== 'all' || search.delivery !== 'all'

  // 实测后端只对 is_delivery 生效，is_pay / order_title / order_no 会被忽略，
  // 所以在当前页上再筛一遍：后端生效时等于没筛，不生效时也不会把已支付的算进「待支付」
  const visibleOrders = infinite.items.filter((order) => {
    if (search.pay !== 'all') {
      const paid = isOrderPaid(order.status_pay)
      if (search.pay === 'paid' ? !paid : paid) return false
    }
    if (search.q) {
      const term = search.q.toLowerCase()
      const hit = String(order.order_no ?? '').toLowerCase().includes(term) || String(order.order_title ?? '').toLowerCase().includes(term)
      if (!hit) return false
    }
    return true
  })


  return (
    <>
      <PageHeader
        crumb={['订单']}
        title="订单"
        tools={
          <>
            <Segmented
              label="视角"
              value={search.scope}
              onChange={(scope) => onSearch({ scope })}
              items={[
                { value: 'shop', label: '店铺订单' },
                { value: 'mine', label: '我的订单' },
              ]}
            />
          </>
        }
      />

      <div className="toolbar">
        <Tabs items={PAY_TABS} value={search.pay} onChange={(pay) => onSearch({ pay })} label="支付状态" />
        <span className="spacer" />
        <SearchField
          label="订单号或商品名"
          placeholder="订单号或商品名"
          value={search.q}
          onCommit={(next) => onSearch({ q: next })}
        />
        <Segmented
          label="发货状态"
          value={search.delivery}
          onChange={(delivery) => onSearch({ delivery })}
          items={DELIVERY_TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        />
      </div>

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={visibleOrders}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        loadingKind="rows"
        loadingPoster="square"
        loadingLines={3}
        loadingActions={3}
        loadingRows={6}
        emptyTitle={search.q ? `没有找到「${search.q}」` : filtered ? '没有符合条件的订单' : '没有订单'}
        emptyAction={
          filtered ? (
            <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', pay: 'all', delivery: 'all' })}>
              清空筛选
            </button>
          ) : undefined
        }
      >
          <RecordRow
            rows={visibleOrders}
            idKey={(order) => order.order_no}
            posterShape="square"
            poster={(order) => order.order_cover_url}
            title={(order) => order.order_title}
            meta={(order) => (
              <>
                <span>{order.order_no}</span>
                {order.user?.user_id ? (
                  <Link to="/users/$userId" params={{ userId: order.user.user_id }}>
                    {order.user.username ?? order.user.user_id}
                  </Link>
                ) : order.user?.username ? (
                  <span>{order.user.username}</span>
                ) : null}
                <Badge tone={isOrderPaid(order.status_pay) ? 'ok' : 'wait'}>
                  {isOrderPaid(order.status_pay) ? '已支付' : '待支付'}
                </Badge>
                {isOrderPaid(order.status_pay) ? (
                  <Badge tone={order.time_delivery ? 'ok' : (order.urge_number ?? 0) > 0 ? 'warn' : 'off'}>
                    {order.time_delivery ? '已发货' : (order.urge_number ?? 0) > 0 ? `催发货 ${order.urge_number}` : '待发货'}
                  </Badge>
                ) : null}
              </>
            )}
            facts={(order) => (
              <>
                <span className="tnum">
                  {order.price_order} 胡萝卜 × {order.buy_number ?? 1}
                </span>
                {mineScope ? null : (
                  <span className="tnum">结算 {order.price_settle == null ? '—' : order.price_settle}</span>
                )}
                <span>{formatDateTime(order.created_at)}</span>
                {order.remark_user ? <span className="ellipsis">买家备注：{order.remark_user}</span> : null}
                {order.remark_shop ? <span className="ellipsis">我的备注：{order.remark_shop}</span> : null}
              </>
            )}
            actions={(order) => {
              const paid = isOrderPaid(order.status_pay)
              const sent = Boolean(order.time_delivery)
              return (
                <>
                  {mineScope && !paid ? (
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={actions.payOrder.isPending}
                      onClick={async () => {
                        // price_order 是单价，实付 = 单价 × 数量
                        const total = order.price_order * (order.buy_number ?? 1)
                        const ok = await confirmDialog({
                          title: '支付订单？',
                          message: `「${order.order_title}」 ${order.order_no}`,
                          hint: `扣除 ${formatThousand(total)} 胡萝卜。`,
                          confirmText: '支付',
                          danger: true,
                        })
                        if (!ok) return
                        actions.payOrder.mutate(order.order_no, { onSuccess: () => toast('已支付', 'success') })
                      }}
                    >
                      付款
                    </button>
                  ) : null}
                  {!mineScope && !sent && paid ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      disabled={actions.deliver.isPending}
                      onClick={() =>
                        actions.deliver.mutate(
                          { orderNo: order.order_no, sent: true },
                          { onSuccess: () => toast('已标记发货', 'success') },
                        )
                      }
                    >
                      发货
                    </button>
                  ) : null}
                  {!mineScope && sent ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      disabled={actions.deliver.isPending}
                      onClick={() =>
                        actions.deliver.mutate(
                          { orderNo: order.order_no, sent: false },
                          { onSuccess: () => toast('已撤销发货', 'success') },
                        )
                      }
                    >
                      撤销发货
                    </button>
                  ) : null}
                  {mineScope && paid && !sent ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      disabled={actions.urgeOrder.isPending}
                      onClick={() =>
                        actions.urgeOrder.mutate(order.order_no, {
                          onSuccess: () => toast('已催发货', 'success'),
                        })
                      }
                    >
                      催发货
                    </button>
                  ) : null}
                  {mineScope && !paid ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: '关闭这个订单？',
                          message: '关闭后无法再付款，需要重新下单。',
                          confirmText: '关闭',
                          danger: true,
                        })
                        if (!ok) return
                        actions.closeOrder.mutate(order.order_no, { onSuccess: () => toast('已关闭', 'success') })
                      }}
                    >
                      关闭
                    </button>
                  ) : null}
                  {!mineScope ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => setRemarking({ orderNo: order.order_no, remark: order.remark_shop ?? '' })}
                    >
                      {order.remark_shop ? '改备注' : '加备注'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--danger-text"
                    disabled={remove.isPending}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: '把这个订单从列表里移除？',
                        message: `订单 ${order.order_no} 只是不再显示在这里，订单本身与款项不受影响。`,
                        hint: '此操作不可撤销。',
                        confirmText: '移除',
                        danger: true,
                      })
                      if (!ok) return
                      remove.mutate(order.order_no, { onSuccess: () => toast('已删除', 'success') })
                    }}
                  >
                    移除
                  </button>
                </>
              )
            }}
          />
      </ListSection>

      {remarking ? (
        <Modal
          title="订单备注"
          onClose={() => setRemarking(null)}
          footer={
            <ModalFooter
              onCancel={() => setRemarking(null)}
              onConfirm={() =>
                                  actions.remark.mutate(
                                    { orderNo: remarking.orderNo, remark: remarking.remark },
                                    {
                                      onSuccess: () => {
                                          toast('备注已保存', 'success')
                                          setRemarking(null)
                                      },
                                    },
                                  )}
              confirmText="保存"
            />
          }
        >
          <label className="field">
            <span>备注（200 字内）</span>
            <textarea className="input" maxLength={200} value={remarking.remark} onChange={(e) => setRemarking({ ...remarking, remark: e.target.value })} autoFocus />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
