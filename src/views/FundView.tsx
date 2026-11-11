import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListCard } from '@/components/ListCard'
import { ImagePickerMulti } from '@/components/ImagePicker'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Tabs } from '@/components/Tabs'
import { Pager } from '@/components/Pager'
import { fundApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand } from '@/lib/format'
import { PayView } from '@/views/PayView'
import { useAccountMutations, useCarrot, useCarrotHistory } from '@/api/queries'

const FUND_TABS = [
  { key: 'orders', label: '基金订单' },
  { key: 'merchant', label: '支付服务' },
  { key: 'carrot', label: '胡萝卜' },
] as const

function CarrotSection({ page, pageSize, onPage, onPageSize }: { page: number; pageSize: number; onPage: (page: number) => void; onPageSize: (size: number) => void }) {
  const carrot = useCarrot()
  const history = useCarrotHistory(page, pageSize)
  const actions = useAccountMutations()
  const [transferring, setTransferring] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState(10)
  const rows = history.data?.items ?? []

  /** 转赠唯一入口：按钮与回车都走这里，先确认再扣款 */
  const submitTransfer = async () => {
    if (!transferTo.trim() || transferAmount < 2 || transferAmount > 6000 || actions.transfer.isPending) return
    const ok = await confirmDialog({
      title: `转赠 ${transferAmount} 个胡萝卜？`,
      message: `转给 ${transferTo.trim()}，转出后不可撤回。`,
      confirmText: '转赠',
      danger: true,
    })
    if (!ok) return
    actions.transfer.mutate(
      { userId: transferTo.trim(), carrot: transferAmount },
      {
        onSuccess: (res: { carrot: number }) => {
          toast(`已转赠，余额 ${res.carrot}`, 'success')
          setTransferring(false)
          setTransferTo('')
        },
      },
    )
  }

  return (
    <>
      <section className="cards cards--wide">
        <div style={{ maxWidth: 380 }}>
          <StatCard
            label="胡萝卜余额"
            value={carrot.data ? formatThousand(carrot.data.carrot) : '—'}
            unit="个"
            note="签到、上传、字幕都会获得"
            action={
              <button type="button"
                className="btn btn--quiet"
                disabled={!carrot.data || carrot.data.carrot < 2}
                onClick={() => setTransferring(true)}
              >
                转赠
              </button>
            }
          />
        </div>
      </section>

      {history.error ? <ErrorBlock error={history.error} onRetry={() => history.refetch()} /> : null}
      {history.isLoading ? <LoadingBlock rows={8} columns={3} /> : null}
      {!history.isLoading && !history.error && rows.length === 0 ? <EmptyBlock title="还没有胡萝卜记录" /> : null}
      {rows.length > 0 ? (
        <ListCard items={rows} total={rows.length} idKey={(r) => `${r.created_at}-${r.trigger_type}-${r.point}`} scope={page}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '46%' }}>来源</th>
                <th className="num" style={{ width: '16%' }}>变动</th>
                <th style={{ width: '24%' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                // point 恒为正数（金额大小），收支方向在 type：earn / cost
                const signed = row.type === 'cost' ? -Number(row.point) : Number(row.point)
                return (
                <tr key={index}>
                  <td className="text-body">{String(row.trigger_type_string ?? row.trigger_type ?? '—')}</td>
                  <td className={signed >= 0 ? 'num mark-up' : 'num mark-down'}>
                    {signed > 0 ? '+' : ''}{formatThousand(signed)}
                  </td>
                  <td className="muted tnum">{formatDateTime(String(row.created_at ?? ''))}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          <Pager total={history.data?.total ?? 0} page={page} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} />
        </ListCard>
      ) : null}

      {transferring ? (
        <Modal
          title="转赠胡萝卜"
          hint="单次 2 – 6000 个，转账后不可撤回。"
          onClose={() => setTransferring(false)}
          onSubmit={() => void submitTransfer()}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setTransferring(false)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={!transferTo.trim() || transferAmount < 2 || transferAmount > 6000 || actions.transfer.isPending}
                onClick={() => void submitTransfer()}
              >
                转赠
              </button>
            </>
          }
        >
          <label className="field">
            <span>对方用户 ID</span>
            <input className="input" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>数量</span>
            <input className="input" type="number" min={2} max={6000} value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} />
          </label>
        </Modal>
      ) : null}
    </>
  )
}

type Row = Record<string, unknown>

export function FundView({ tab, onTab, page, pageSize, onPage, onPageSize }: {
  tab: 'orders' | 'merchant' | 'carrot'
  onTab: (tab: 'orders' | 'merchant' | 'carrot') => void
  page: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  const qc = useQueryClient()
  const orders = useQuery({
    queryKey: ['fund', 'orders', page, pageSize] as const,
    // 接口上限 30（传 50 直接 422），老链接里超限的值在这里夹住
    queryFn: () => fundApi.orders({ page, page_size: Math.min(30, pageSize) }),
    // 只在基金订单 tab 取数，切到支付服务或胡萝卜时不请求
    enabled: tab === 'orders',
  })

  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [carrot, setCarrot] = useState('100')
  const [evidenceFor, setEvidenceFor] = useState<Row | null>(null)
  const [remark, setRemark] = useState('')
  const [images, setImages] = useState<string[]>([])

  // 下单前先问「能不能参加」：后端用 message 说明原因（如活动只能参加 1 次）。
  // 检查失败（码不对会 404）不拦，交给 create 报错
  const [checking, setChecking] = useState(false)
  const checkThenCreate = async () => {
    const activityCode = code.trim()
    if (!activityCode) return
    setChecking(true)
    try {
      const res = await fundApi.check(activityCode)
      const message = String(res?.message ?? '').trim()
      if (message) {
        toast(message, 'error')
        return
      }
    } catch {
      /* 检查不可用就继续下单 */
    } finally {
      setChecking(false)
    }
    create.mutate()
  }

  const create = useMutation({
    mutationFn: () => fundApi.create(code.trim(), Number(carrot)),
    onSuccess: (res) => {
      toast(`已创建订单 ${res.no}`, 'success')
      setCreating(false)
      qc.invalidateQueries({ queryKey: ['fund'] })
    },
  })

  const submitEvidence = useMutation({
    mutationFn: (orderNo: string) =>
      fundApi.evidence({
        order_no: orderNo,
        images,
        remark: remark.trim(),
      }),
    onSuccess: () => {
      toast('凭证已提交', 'success')
      setEvidenceFor(null)
      setRemark('')
      setImages([])
      qc.invalidateQueries({ queryKey: ['fund'] })
    },
  })

  const rows = (orders.data?.items ?? []) as Row[]
  const total = orders.data?.total ?? 0

  return (
    <>
      <PageHeader
        crumb={['资金', tab === 'orders' ? '基金订单' : tab === 'merchant' ? '支付服务' : '胡萝卜']}
        title="资金"
        tools={
          tab === 'orders' ? (
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(true)}>
              新建订单
            </button>
          ) : null
        }
      />

      <div className="toolbar">
        <Tabs items={FUND_TABS} value={tab} onChange={onTab} label="资金" />
      </div>

      <div className="content-in" key={tab}>
        {tab === 'merchant' ? <PayView embedded /> : null}
        {tab === 'carrot' ? <CarrotSection page={page} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} /> : null}
      </div>

      {tab === 'orders' && orders.error ? <ErrorBlock error={orders.error} onRetry={() => orders.refetch()} /> : null}
      {tab === 'orders' && orders.isLoading ? <LoadingBlock rows={8} columns={4} /> : null}

      {tab === 'orders' && !orders.isLoading && !orders.error && rows.length === 0 ? (
        <EmptyBlock title="还没有基金订单" />
      ) : null}

      {tab === 'orders' && rows.length > 0 ? (
        <div className="table-card">
          <table className="table table--fixed table--dense">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>订单</th>
                <th className="num" style={{ width: '9%' }}>胡萝卜</th>
                <th className="num" style={{ width: '9%' }}>承诺补贴</th>
                <th className="num" style={{ width: '9%' }} title="实际打款的金额">实际打款</th>
                <th style={{ width: '12%' }}>状态</th>
                <th style={{ width: '13%' }}>时间</th>
                <th style={{ width: '18%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const orderNo = String(row.order_no ?? '')
                return (
                  <tr key={orderNo}>
                    <td>
                      <span className="cell-title__name">{String(row.order_title ?? orderNo)}</span>
                      <span className="cell-title__code">
                        {orderNo}
                        {row.tier_name ? ` · ${String(row.tier_name)}` : ''}
                        {row.activity_name ? ` · ${String(row.activity_name)}` : ''}
                      </span>
                    </td>
                    <td className="num">{row.tier_carrot == null ? '—' : formatThousand(Number(row.tier_carrot))}</td>
                    <td className="num">{row.tier_price == null ? '—' : `¥${String(row.tier_price)}`}</td>
                    {/* 承诺的补贴与实际打款可能不同（payout_price 打款后才有值） */}
                    <td className="num">{row.payout_price == null ? '—' : `¥${String(row.payout_price)}`}</td>
                    <td className="muted">{String(row.payout_status_string ?? row.payout_status ?? '—')}</td>
                    <td className="muted tnum">
                      {row.payout_at ? formatDateTime(String(row.payout_at)) : row.payed_at ? formatDateTime(String(row.payed_at)) : '—'}
                    </td>
                    <td>
                      <button type="button"
                        className="btn btn--quiet"
                        onClick={() => {
                          setEvidenceFor(row)
                          setRemark('')
                          setImages([])
                        }}
                      >
                        提交凭证
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pager total={total} page={page} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} />
        </div>
      ) : null}

      {creating ? (
        <Modal
          title="新建基金订单"
          width={400}
          onClose={() => setCreating(false)}
          onSubmit={() => {
            if (code.trim() && Number(carrot) > 0 && !create.isPending && !checking) void checkThenCreate()
          }}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                type="submit"
                disabled={!code.trim() || Number(carrot) <= 0 || create.isPending || checking}
              >
                {checking ? '检查中…' : create.isPending ? '创建中…' : '创建'}
              </button>
            </>
          }
        >
          <div className="stack">
            <label className="field">
              <span>活动码</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="fund_activity_code" />
            </label>
            <label className="field">
              <span>胡萝卜</span>
              <input className="input tnum" type="number" min={1} value={carrot} onChange={(e) => setCarrot(e.target.value)} />
            </label>
          </div>
        </Modal>
      ) : null}

      {evidenceFor ? (
        <Modal
          title={`提交凭证 · ${String(evidenceFor.order_no ?? '')}`}
          width={460}
          onClose={() => setEvidenceFor(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setEvidenceFor(null)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={submitEvidence.isPending || images.length === 0}
                onClick={() => submitEvidence.mutate(String(evidenceFor.order_no ?? ''))}
              >
                {submitEvidence.isPending ? '提交中…' : '提交'}
              </button>
            </>
          }
        >
          <div className="stack">
            <ImagePickerMulti label="凭证图片" value={images} onChange={setImages} />
            <label className="field">
              <span>备注</span>
              <textarea className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
            </label>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
