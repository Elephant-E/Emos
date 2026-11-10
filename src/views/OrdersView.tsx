import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { useShopMineOrders, useShopMutations, useShopOrders } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime } from '@/lib/format'

export interface OrdersSearch {
  page: number
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
  useEffect(() => {
    const next = term.trim()
    if (next === search.q) return
    const timer = setTimeout(() => onSearch({ q: next, page: 1 }), 350)
    return () => clearTimeout(timer)
  }, [term, search.q])

  const mineScope = search.scope === 'mine'
  const shopOrders = useShopOrders(search.page, {
    ...pay.filter,
    ...delivery.filter,
    // 后端对 order_no 与 order_title 是分开的两个参数，长串数字当单号、其余当商品名
    ...(search.q ? (/^[0-9A-Za-z]{12,}$/.test(search.q) ? { order_no: search.q } : { order_title: search.q }) : {}),
  })
  // 「我的订单」也要吃搜索与两个状态筛选，之前只传了页码
  const mineOrders = useShopMineOrders(search.page, {
    ...pay.filter,
    ...delivery.filter,
    ...(search.q ? (/^[0-9A-Za-z]{12,}$/.test(search.q) ? { order_no: search.q } : { order_title: search.q }) : {}),
  })
  const orders = mineScope ? mineOrders : shopOrders
  const actions = useShopMutations()
  const [remarking, setRemarking] = useState<{ orderNo: string; remark: string } | null>(null)


  return (
    <>
      <PageHeader
        crumb={['订单']}
        title="订单"
        tools={
          <>
            {orders.isFetching ? <span className="head-note">拉取中</span> : null}
            <div className="seg" role="group" aria-label="视角">
              <button aria-pressed={search.scope === 'shop'} onClick={() => onSearch({ scope: 'shop', page: 1 })}>
                店铺订单
              </button>
              <button aria-pressed={search.scope === 'mine'} onClick={() => onSearch({ scope: 'mine', page: 1 })}>
                我的订单
              </button>
            </div>
          </>
        }
      />

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="订单号或商品名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="tabs" role="tablist" aria-label="支付状态">
          {PAY_TABS.map((tab) => (
            <button key={tab.key} className="tab" role="tab" aria-selected={search.pay === tab.key} onClick={() => onSearch({ pay: tab.key, page: 1 })}>
              {tab.label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="发货状态">
          {DELIVERY_TABS.map((tab) => (
            <button key={tab.key} aria-pressed={search.delivery === tab.key} onClick={() => onSearch({ delivery: tab.key, page: 1 })}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {orders.error ? <ErrorBlock error={orders.error as Error & { status?: number }} onRetry={() => orders.refetch()} /> : null}
      {orders.isLoading ? <LoadingBlock rows={6} columns={5} /> : null}
      {orders.data && orders.data.items.length === 0 ? <EmptyBlock title="没有符合条件的订单" /> : null}

      {orders.data && orders.data.items.length > 0 ? (
        <div className="table-card content-in" key={`${orders.data.items.length}-${orders.data.items[0]?.order_no}-${orders.data.total}`}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '32%' }} className="th-thumb">订单</th>
                <th className="num" style={{ width: '14%' }}>单价 × 数量</th>
                <th style={{ width: '12%' }}>支付</th>
                <th style={{ width: '12%' }}>发货</th>
                <th className="num" style={{ width: '12%' }}>下单时间</th>
                <th style={{ width: '18%' }}>操作</th>
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
                        <Poster src={order.order_cover_url} name={order.order_title} />
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
                    <td>
                      <span className={`badge ${paid ? 'badge--ok' : 'badge--wait'}`}>
                        <i />
                        {paid ? '已支付' : '待支付'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sent ? 'badge--ok' : order.urge_number > 0 ? 'badge--warn' : 'badge--off'}`}>
                        <i />
                        {sent ? '已发货' : order.urge_number > 0 ? `催发货 ${order.urge_number}` : '待发货'}
                      </span>
                    </td>
                    <td className="num muted">{formatDateTime(order.created_at)}</td>
                    <td>
                      <span className="action-group">
                        {mineScope && !paid ? (
                          <button
                            className="btn btn--primary"
                            onClick={() =>
                              actions.payOrder.mutate(order.order_no, { onSuccess: () => toast('已支付', 'success') })
                            }
                          >
                            付款
                          </button>
                        ) : null}
                        {!mineScope && !sent && paid ? (
                          <button
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
                          <button
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
                        {mineScope && !sent ? (
                          <button
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
                          <button
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
                          <button className="btn btn--quiet" onClick={() => setRemarking({ orderNo: order.order_no, remark: order.remark_shop ?? '' })}>
                            备注
                          </button>
                        ) : null}
                        <button
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
                            // 店铺订单和自己下的单是两个接口
                            const mutation = mineScope ? actions.removeOrder : actions.deleteOrder
                            mutation.mutate(order.order_no, { onSuccess: () => toast('已删除', 'success') })
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
          <Pager total={orders.data.total} page={search.page} pageSize={orders.data.page_size} onPage={(page) => onSearch({ page })} />
        </div>
      ) : null}

      {remarking ? (
        <Modal
          title="订单备注"
          onClose={() => setRemarking(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setRemarking(null)}>
                取消
              </button>
              <button
                className="btn btn--ghost"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: '删除这个订单？',
                    message: `订单 ${remarking.orderNo} 会从列表移除。`,
                    hint: '此操作不可撤销。',
                    confirmText: '删除',
                    danger: true,
                  })
                  if (!ok) return
                  actions.removeOrder.mutate(remarking.orderNo, {
                    onSuccess: () => {
                      toast('已删除', 'success')
                      setRemarking(null)
                    },
                  })
                }}
              >
                删除订单
              </button>
              <button
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
