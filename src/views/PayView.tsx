import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { useQueryClient } from '@tanstack/react-query'
import { usePayBase, usePayOrder } from '@/api/queries'
import { payApi } from '@/api/endpoints'
import { carrotApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatThousand } from '@/lib/format'

const PAY_STATUS: Record<string, string> = {
  default: '待支付',
  pay: '已支付',
  paid: '已支付',
  close: '已关闭',
  refund: '已退款',
}

export function PayView({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient()
  const base = usePayBase()
  const [no, setNo] = useState('')
  const [lookup, setLookup] = useState('')
  const order = usePayOrder(lookup)

  const [transferTo, setTransferTo] = useState('')
  const [amount, setAmount] = useState(10)
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState<{ name: string; description: string; notify_url: string } | null>(null)

  return (
    <>
      {!embedded ? (
      <PageHeader
        crumb={['支付']}
        title="支付"
        hint={base.data ? base.data.name : undefined}
        tools={
          <>
            {base.data && base.data.status !== 'pass' ? <span className="head-note">{base.data.status}</span> : null}

          </>
        }
      />
      ) : null}

      {(base.error as { status?: number } | null)?.status === 404 ? (
        <EmptyBlock
          title="还不是支付服务商"
          hint="查单与收款需要服务商身份。"
          action={
            <button
              className="btn btn--primary"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: '申请成为支付服务商？',
                  message: '申请将扣除 5000 胡萝卜，且不退还。',
                  hint: '提交后需要联系管理员审核，审核不通过也不退还。',
                  confirmText: '确认申请',
                  danger: true,
                })
                if (!ok) return
                try {
                  await payApi.apply('我的支付服务', '由后台发起申请')
                  toast('已提交申请，等待审核', 'success')
                  void base.refetch()
                } catch (error) {
                  toast(error instanceof Error ? error.message : '提交失败', 'error')
                }
              }}
            >
              申请成为服务商（扣 5000 胡萝卜）
            </button>
          }
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
          <div className="detail-head">
            <p className="stat__label">回调地址</p>
            <button
              className="btn btn--quiet"
              onClick={() =>
                setEditing({
                  name: base.data?.name ?? '',
                  description: base.data?.description ?? '',
                  notify_url: base.data?.notify_url ?? '',
                })
              }
            >
              编辑
            </button>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--fg-2)', wordBreak: 'break-all' }}>
            {base.data?.notify_url || '未配置'}
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 12 }}>
            {base.data?.description || '—'}
          </p>
        </article>
      </section>

      <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <article className="card" style={{ display: base.error ? 'none' : undefined }}>
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
              disabled={!transferTo.trim() || amount < 2 || amount > 6000 || sending}
              onClick={async () => {
                setSending(true)
                try {
                  const res = await carrotApi.transfer(transferTo.trim(), amount)
                  // 转赠改了余额，侧栏与概览的胡萝卜都得跟着变
                  void qc.invalidateQueries({ queryKey: ['carrot'] })
                  void qc.invalidateQueries({ queryKey: ['session'] })
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

      {editing ? (
        <Modal
          title="服务商信息"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={async () => {
                  try {
                    await payApi.update(editing)
                    toast('已保存', 'success')
                    setEditing(null)
                    base.refetch()
                  } catch (error) {
                    toast(error instanceof Error ? error.message : '保存失败', 'error')
                  }
                }}
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>名称</span>
            <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>描述</span>
            <input className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <label className="field">
            <span>回调地址</span>
            <input
              className="input"
              value={editing.notify_url}
              onChange={(e) => setEditing({ ...editing, notify_url: e.target.value })}
              placeholder="https://…"
            />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
