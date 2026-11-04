import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { usePayBase, usePayOrder } from '@/api/queries'
import { carrotApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatThousand } from '@/lib/format'

const PAY_STATUS: Record<string, string> = {
  default: '待支付',
  pay: '已支付',
  paid: '已支付',
  close: '已关闭',
  refund: '已退款',
}

export function PayView() {
  const base = usePayBase()
  const [no, setNo] = useState('')
  const [lookup, setLookup] = useState('')
  const order = usePayOrder(lookup)

  const [transferTo, setTransferTo] = useState('')
  const [amount, setAmount] = useState(10)
  const [sending, setSending] = useState(false)

  return (
    <>
      <PageHeader
        crumb={['支付']}
        title="支付"
        hint={base.data ? base.data.name : undefined}
        tools={
          base.data ? (
            <span className="stamp">
              <i />
              {base.data.status === 'pass' ? '已开通' : base.data.status}
            </span>
          ) : null
        }
      />

      {(base.error as { status?: number } | null)?.status === 404 ? (
        <EmptyBlock
          title="这个实例没有开通支付服务商"
          hint="/api/pay/base 返回 404，说明后端没有部署支付模块。转账与查单在这里不可用。"
        />
      ) : null}
      {base.error && (base.error as { status?: number }).status !== 404 ? (
        <ErrorBlock error={base.error as Error & { status?: number }} onRetry={() => base.refetch()} />
      ) : null}

      <section className="cards" style={base.error ? { display: 'none' } : undefined}>
        <article className="card">
          <p className="stat__label">累计收入</p>
          <p className="stat__value">
            {base.isLoading ? '—' : formatThousand(base.data?.total_revenue ?? 0)}
            <small>胡萝卜</small>
          </p>
        </article>
        <article className="card">
          <p className="stat__label">累计支出</p>
          <p className="stat__value">
            {base.isLoading ? '—' : formatThousand(base.data?.total_expenditure ?? 0)}
            <small>胡萝卜</small>
          </p>
        </article>
        <article className="card">
          <p className="stat__label">回调地址</p>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--fg-2)', wordBreak: 'break-all' }}>
            {base.data?.notify_url || '未配置'}
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 12 }}>
            {base.data?.description || '—'}
          </p>
        </article>
      </section>

      <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', display: base.error ? 'none' : undefined }}>
        <article className="card">
          <p className="stat__label">查询订单</p>
          <div className="row-input" style={{ marginTop: 10 }}>
            <input className="input" placeholder="订单号" value={no} onChange={(e) => setNo(e.target.value)} />
            <button className="btn btn--ghost" disabled={!no.trim()} onClick={() => setLookup(no.trim())}>
              查询
            </button>
          </div>

          {order.isFetching ? <LoadingBlock bare rows={2} columns={2} /> : null}
          {order.error ? (
            <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
              没有查到这个订单，或订单号有误。
            </p>
          ) : null}
          {order.data ? (
            <div className="detail-stats" style={{ marginTop: 16 }}>
              <div className="detail-stat">
                <b>{PAY_STATUS[String(order.data.pay_status)] ?? String(order.data.pay_status)}</b>
                <span>支付状态</span>
              </div>
              <div className="detail-stat">
                <b>{String(order.data.price_order ?? '—')}</b>
                <span>订单金额</span>
              </div>
              <div className="detail-stat">
                <b>{String(order.data.pay_way ?? '—')}</b>
                <span>支付方式</span>
              </div>
              <div className="detail-stat">
                <b>{String(order.data.order_name ?? '—')}</b>
                <span>商品</span>
              </div>
            </div>
          ) : null}
        </article>

        <article className="card">
          <p className="stat__label">转赠胡萝卜</p>
          <div className="row-input" style={{ marginTop: 10 }}>
            <input className="input" placeholder="对方用户 ID" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
            <input
              className="input"
              style={{ maxWidth: 100 }}
              type="number"
              min={2}
              max={6000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              className="btn btn--primary"
              disabled={!transferTo.trim() || amount < 2 || sending}
              onClick={async () => {
                setSending(true)
                try {
                  const res = await carrotApi.transfer(transferTo.trim(), amount)
                  toast(`已转赠，余额 ${res.carrot}`, 'success')
                  setTransferTo('')
                } catch (error) {
                  toast(error instanceof Error ? error.message : '转赠失败', 'error')
                } finally {
                  setSending(false)
                }
              }}
            >
              转赠
            </button>
          </div>
          <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
            单次 2 – 6000 个，转出后不可撤回。
          </p>
        </article>
      </section>
    </>
  )
}
