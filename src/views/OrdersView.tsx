import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ListCard } from '@/components/ListCard'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { useShopMineOrders, useShopMutations, useShopOrders } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useDebounced } from '@/lib/useDebounced'
import { formatDateTime, formatThousand } from '@/lib/format'

export interface OrdersSearch {
  page: number
  page_size: number
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
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])
  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: search.q })

  const mineScope = search.scope === 'mine'
  // 两个视角共用同一份筛选：分开写会出现「店铺订单能搜到、我的订单搜不到」
  const filter = {
    ...pay.filter,
    ...delivery.filter,
    // 后端对 order_no 与 order_title 是分开的两个参数，长串数字当单号、其余当商品名
    ...(search.q ? (/^[0-9A-Za-z]{12,}$/.test(search.q) ? { order_no: search.q } : { order_title: search.q }) : {}),
  }
  // 两个视角只挂自己那条，否则每次订单操作都会多取一份屏幕上看不到的列表
  const shopOrders = useShopOrders(search.page, filter, search.page_size, !mineScope)
  const mineOrders = useShopMineOrders(search.page, filter, search.page_size, mineScope)
  const orders = mineScope ? mineOrders : shopOrders
  const actions = useShopMutations()
  // 店铺订单和自己下的单走两个接口，判断只写一处
  const remove = mineScope ? actions.removeOrder : actions.deleteOrder
  const [remarking, setRemarking] = useState<{ orderNo: string; remark: string } | null>(null)
  // 支付 / 发货 / 关键词三个筛选维度任一偏离默认值就算「筛过」，
  // 空态要能分清「筛掉了」和「本来没有」
  const filtered = Boolean(search.q) || search.pay !== 'all' || search.delivery !== 'all'

  // 实测后端只对 is_delivery 生效，is_pay / order_title / order_no 会被忽略，
  // 所以在当前页上再筛一遍：后端生效时等于没筛，不生效时也不会把已支付的算进「待支付」
  const visibleOrders = (orders.data?.items ?? []).filter((order) => {
    if (search.pay !== 'all') {
      const paid = order.status_pay === 'pay' || order.status_pay === 'paid'
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
            {orders.isFetching ? <span className="head-note">拉取中</span> : null}
            <div className="seg" role="group" aria-label="视角">
              <button type="button" aria-pressed={search.scope === 'shop'} onClick={() => onSearch({ scope: 'shop', page: 1 })}>
                店铺订单
              </button>
              <button type="button" aria-pressed={search.scope === 'mine'} onClick={() => onSearch({ scope: 'mine', page: 1 })}>
                我的订单
              </button>
            </div>
          </>
        }
      />

      <div className="toolbar">
        <Tabs items={PAY_TABS} value={search.pay} onChange={(pay) => onSearch({ pay, page: 1 })} label="支付状态" />
        <span className="spacer" />
        <input
          className="input"
          type="search"
            aria-label="订单号或商品名"
          placeholder="订单号或商品名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="seg" role="group" aria-label="发货状态">
          {DELIVERY_TABS.map((tab) => (
            <button type="button" key={tab.key} aria-pressed={search.delivery === tab.key} onClick={() => onSearch({ delivery: tab.key, page: 1 })}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {orders.error ? <ErrorBlock error={orders.error} onRetry={() => orders.refetch()} /> : null}
      {orders.isLoading ? <LoadingBlock rows={6} columns={5} /> : null}
      {orders.data && visibleOrders.length === 0 ? (
        <EmptyBlock
          title={search.q ? `没有找到「${search.q}」` : filtered ? '没有符合条件的订单' : '没有订单'}
          action={
            filtered ? (
              <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', pay: 'all', delivery: 'all', page: 1 })}>
                清空筛选
              </button>
            ) : undefined
          }
        />
      ) : null}

      {orders.data && visibleOrders.length > 0 ? (
        <ListCard items={visibleOrders} total={orders.data.total} idKey={(o) => o.order_no}>
          <table className="table table--fixed table--dense">
            <thead>
              <tr>
                <th style={{ width: mineScope ? '34%' : '30%' }} className="th-thumb">订单</th>
                <th className="num" style={{ width: '11%' }}>单价 × 数量</th>
                {/* price_settle 只有店铺侧接口返回，买家视角没有这一列 */}
                {mineScope ? null : (
                  <th className="num" style={{ width: '8%' }} title="平台结算给店铺的胡萝卜">
                    结算
                  </th>
                )}
                <th style={{ width: '11%' }}>支付</th>
                <th style={{ width: '12%' }}>发货</th>
                <th className="num" style={{ width: '12%' }}>下单时间</th>
                <th style={{ width: '1%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((order) => {
                const paid = order.status_pay === 'pay' || order.status_pay === 'paid'
                const sent = Boolean(order.time_delivery)
                return (
                  <tr key={order.order_no}>
                    <td>
                      <div className="cell-title">
                        <Poster src={order.order_cover_url} name={order.order_title} shape="square" />
                        <span>
                          <span className="cell-title__name">{order.order_title}</span>
                          <span className="cell-title__code">
                            {order.order_no}
                            {order.user?.user_id ? (
                              <>
                                {' · '}
                                <Link
                                  to="/users/$userId"
                                  params={{ userId: order.user.user_id }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: 'var(--fg-3)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                                >
                                  {order.user.username ?? order.user.user_id}
                                </Link>
                              </>
                            ) : order.user?.username ? (
                              ` · ${order.user.username}`
                            ) : null}
                            {order.remark_user ? ` · 买家备注：${order.remark_user}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="num tnum">{order.price_order} × {order.buy_number ?? 1}</td>
                    {mineScope ? null : (
                      <td className="num tnum muted">{order.price_settle == null ? '—' : order.price_settle}</td>
                    )}
                    <td>
                      <span className={`badge ${paid ? 'badge--ok' : 'badge--wait'}`}>
                        <i />
                        {paid ? '已支付' : '待支付'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sent ? 'badge--ok' : (order.urge_number ?? 0) > 0 ? 'badge--warn' : 'badge--off'}`}>
                        <i />
                        {sent ? '已发货' : (order.urge_number ?? 0) > 0 ? `催发货 ${order.urge_number}` : '待发货'}
                      </span>
                    </td>
                    <td className="num muted">{formatDateTime(order.created_at)}</td>
                    <td>
                      <span className="action-group">
                        {mineScope && !paid ? (
                          <button type="button"
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
                              })
                              if (!ok) return
                              actions.payOrder.mutate(order.order_no, { onSuccess: () => toast('已支付', 'success') })
                            }}
                          >
                            付款
                          </button>
                        ) : null}
                        {!mineScope && !sent && paid ? (
                          <button type="button"
                            className="btn btn--quiet"
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
                          <button type="button"
                            className="btn btn--quiet"
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
                          <button type="button"
                            className="btn btn--quiet"
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
                          <button type="button"
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
                          <button type="button" className="btn btn--quiet" onClick={() => setRemarking({ orderNo: order.order_no, remark: order.remark_shop ?? '' })}>
                            备注
                          </button>
                        ) : null}
                        <button type="button"
                          className="btn btn--danger-text"
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: '删除这个订单？',
                              message: `订单 ${order.order_no} 会从列表移除。`,
                              hint: '此操作不可撤销。',
                              confirmText: '删除',
                              danger: true,
                            })
                            if (!ok) return
                            remove.mutate(order.order_no, { onSuccess: () => toast('已删除', 'success') })
                          }}
                        >
                          删除
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* 接口会忽略 is_pay / order_title / order_no，本地再筛一遍；
              这时总条数只能用当前页筛出来的数，否则会出现「本页 0 条但还有 N 页」 */}
          <Pager
            total={filtered ? visibleOrders.length : orders.data.total}
            page={filtered ? 1 : search.page}
            pageSize={search.page_size}
            onPage={(page) => onSearch({ page })}
            onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
          />
        </ListCard>
      ) : null}

      {remarking ? (
        <Modal
          title="订单备注"
          onClose={() => setRemarking(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setRemarking(null)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                onClick={() =>
                  actions.remark.mutate(
                    { orderNo: remarking.orderNo, remark: remarking.remark },
                    {
                      onSuccess: () => {
                        toast('备注已保存', 'success')
                        setRemarking(null)
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
            <span>备注（200 字内）</span>
            <textarea className="input" maxLength={200} value={remarking.remark} onChange={(e) => setRemarking({ ...remarking, remark: e.target.value })} autoFocus />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
