import { useState } from 'react'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { usePayBase, usePayOrder, usePayMutations } from '@/api/queries'
import { payApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatThousand } from '@/lib/format'
import { copyText } from '@/lib/clipboard'

const PAY_STATUS: Record<string, string> = {
  default: '待支付',
  pay: '已支付',
  paid: '已支付',
  close: '已关闭',
  refund: '已退款',
}

export function PayView({ embedded = false }: { embedded?: boolean } = {}) {
  const base = usePayBase()
  const [no, setNo] = useState('')
  const [lookup, setLookup] = useState('')
  const order = usePayOrder(lookup)

  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState<{ name: string; description: string; notify_url: string } | null>(null)
  // 服务商转账（与上面的胡萝卜转赠是两套：这个走支付服务，费率千六）
  const [payout, setPayout] = useState({ userId: '', carrot: 100 })
  // 建支付单
  const [draft, setDraft] = useState<{ payWay: 'telegram_bot' | 'web'; price: number; name: string; param: string } | null>(null)
  const [created, setCreated] = useState<{ no: string; pay_url?: string } | null>(null)
  const payActions = usePayMutations()

  /** 关闭一个支付订单；关掉之后不可再支付 */
  const closeOrder = async () => {
    const no = lookup
    if (!no) return
    const ok = await confirmDialog({
      title: '关闭这个支付订单？',
      message: `订单号 ${no}`,
      hint: '关闭后无法再支付，需要重新下单。',
      confirmText: '关闭',
      danger: true,
    })
    if (!ok) return
    setClosing(true)
    try {
      await payApi.close(no)
      toast('订单已关闭', 'success')
      void order.refetch()
    } catch (error) {
      toast(error instanceof Error ? error.message : '关闭失败', 'error')
    } finally {
      setClosing(false)
    }
  }

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
            <button type="button"
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
        <ErrorBlock error={base.error} onRetry={() => base.refetch()} />
      ) : null}

      <section className="cards" style={base.error ? { display: 'none' } : undefined}>
        <StatCard
          label="累计收入"
          value={base.isLoading ? '—' : formatThousand(base.data?.total_revenue ?? 0)}
          unit="胡萝卜"
        />
        <StatCard
          secondary
          label="累计支出"
          value={base.isLoading ? '—' : formatThousand(base.data?.total_expenditure ?? 0)}
          unit="胡萝卜"
        />
        <article className="card">
          <CardHead title="回调地址">
            <button type="button"
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
          </CardHead>
          <p style={{ margin: 'var(--stack) 0 0', color: 'var(--fg-2)', wordBreak: 'break-all' }}>
            {base.data?.notify_url || '未配置'}
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 12 }}>
            {base.data?.description || '—'}
          </p>
        </article>
      </section>

      <section className="cards cards--2">
        <article className="card" style={{ display: base.error ? 'none' : undefined }}>
          <CardHead title="查询订单" />
          <div className="row-input stack--top">
            <input className="input" placeholder="订单号" value={no} onChange={(e) => setNo(e.target.value)} />
            <button type="button" className="btn btn--ghost" disabled={!no.trim()} onClick={() => setLookup(no.trim())}>
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
            <>
            <div className="detail-stats" style={{ marginTop: 18 }}>
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
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn btn--danger-text" disabled={closing} onClick={() => void closeOrder()}>
                {closing ? '关闭中…' : '关闭订单'}
              </button>
            </div>
            </>
          ) : null}
        </article>

        <article className="card">
          <CardHead title="服务商转账" />
          <div className="row-input stack--top">
            <input
              className="input"
              placeholder="对方用户 ID"
              value={payout.userId}
              onChange={(e) => setPayout({ ...payout, userId: e.target.value })}
            />
            <input
              className="input"
              style={{ maxWidth: 110 }}
              type="number"
              min={1}
              max={50000}
              value={payout.carrot}
              onChange={(e) => setPayout({ ...payout, carrot: Number(e.target.value) })}
            />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!payout.userId.trim() || payout.carrot < 1 || payout.carrot > 50000 || payActions.transfer.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: '确认转账？',
                  message: `转给 ${payout.userId.trim()}，${payout.carrot} 胡萝卜。`,
                  hint: '走支付服务，费率千六；转出后不可撤回。',
                  confirmText: '转账',
                })
                if (!ok) return
                payActions.transfer.mutate(
                  { user_id: payout.userId.trim(), carrot: payout.carrot },
                  {
                    onSuccess: (res: { deduct: number; carrot: number }) => {
                      toast(`已转出 ${res.deduct}，余额 ${res.carrot}`, 'success')
                      setPayout({ userId: '', carrot: 100 })
                    },
                  },
                )
              }}
            >
              {payActions.transfer.isPending ? '转账中…' : '转账'}
            </button>
          </div>
          <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
            单次 1 – 50000，费率千六；与上面的胡萝卜转赠不是同一套账。
          </p>
        </article>

        <article className="card">
          <CardHead title="建支付单" />
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setDraft({ payWay: 'web', price: 1, name: '', param: '' })}>
              新建支付单
            </button>
          </div>
          {created ? (
            <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
              单号 {created.no}
              {created.pay_url ? (
                <>
                  {' · '}
                  <button type="button" className="btn btn--quiet" onClick={() => void copyText(created.pay_url ?? '', '支付链接')}>
                    复制支付链接
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
              网页支付生成可分享的支付链接；TG 机器人支付走会话内跳转。
            </p>
          )}
        </article>
      </section>

      {draft ? (
        <Modal
          title="新建支付单"
          width={480}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setDraft(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!draft.name.trim() || draft.price < 1 || draft.price > 50000 || payActions.createOrder.isPending}
                onClick={() =>
                  payActions.createOrder.mutate(
                    {
                      pay_way: draft.payWay,
                      price: draft.price,
                      name: draft.name.trim(),
                      param: draft.param.trim() || null,
                    },
                    {
                      onSuccess: (res: { no: string; pay_url?: string }) => {
                        toast(`已创建 ${res.no}`, 'success')
                        setCreated({ no: res.no, pay_url: res.pay_url })
                        setDraft(null)
                      },
                    },
                  )
                }
              >
                {payActions.createOrder.isPending ? '创建中…' : '创建'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>支付方式</span>
            <select
              className="input"
              value={draft.payWay}
              onChange={(e) => setDraft({ ...draft, payWay: e.target.value as 'telegram_bot' | 'web' })}
            >
              <option value="web">网页支付</option>
              <option value="telegram_bot">TG 机器人支付</option>
            </select>
          </label>
          <label className="field">
            <span>金额</span>
            <input
              className="input"
              type="number"
              min={1}
              max={50000}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>商品名称</span>
            <input className="input" maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>备注（回调原样带回，可留空）</span>
            <input className="input" maxLength={40} value={draft.param} onChange={(e) => setDraft({ ...draft, param: e.target.value })} />
          </label>
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title="服务商信息"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button"
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
