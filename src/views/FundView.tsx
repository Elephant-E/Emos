import { useState } from 'react'
import { PAGE_SIZE } from '@/lib/search'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { ImagePickerMulti } from '@/components/ImagePicker'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { Tabs } from '@/components/Tabs'
import { carrotApi, fundApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand } from '@/lib/format'
import { PayView } from '@/views/PayView'
import { qk, useAccountMutations, useCarrot } from '@/api/queries'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

const FUND_TABS = [
  { key: 'orders', label: '基金订单' },
  { key: 'merchant', label: '支付服务' },
  { key: 'carrot', label: '胡萝卜' },
] as const

function CarrotSection({ PAGE_SIZE }: { PAGE_SIZE: number }) {
  const carrot = useCarrot()
  const infinite = usePagedInfinite<Record<string, unknown>>(
    (next) => carrotApi.history({ page: next, page_size: PAGE_SIZE }) as unknown as Promise<{ items: Array<Record<string, unknown>>; total: number; page_size: number }>,
    { queryKey: [...qk.carrot, 'history'] },
  )
  const actions = useAccountMutations()
  const [transferring, setTransferring] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState(10)

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

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={infinite.items}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        loadingRows={8}
        loadingKind="rows"
        loadingPoster="none"
        loadingLines={2}
        loadingActions={0}
        loadingValue
        emptyTitle="还没有胡萝卜记录"
      >
          <RecordRow<Record<string, unknown>>
            rows={infinite.items}
            idKey={(row) => `${String(row.created_at ?? '')}-${String(row.trigger_type ?? '')}-${String(row.point ?? '')}`}
            title={(row) => String(row.trigger_type_string ?? row.trigger_type ?? '—')}
            facts={(row) => <span>{formatDateTime(String(row.created_at ?? ''))}</span>}
            value={(row) => {
              // point 恒为正数（金额大小），收支方向在 type：earn / cost
              const signed = row.type === 'cost' ? -Number(row.point) : Number(row.point)
              return (
                <span className={signed >= 0 ? 'mark-up' : 'mark-down'}>
                  {signed > 0 ? '+' : ''}
                  {formatThousand(signed)}
                </span>
              )
            }}
          />
      </ListSection>


      {transferring ? (
        <Modal
          title="转赠胡萝卜"
          hint="单次 2 – 6000 个，转账后不可撤回。"
          onClose={() => setTransferring(false)}
          onSubmit={() => void submitTransfer()}
          footer={
            <ModalFooter
              onCancel={() => setTransferring(false)}
              onConfirm={() => void submitTransfer()}
              confirmText="转赠"
              pending={actions.transfer.isPending}
              disabled={!transferTo.trim() || transferAmount < 2 || transferAmount > 6000 || actions.transfer.isPending}
            />
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

export function FundView({ tab, onTab }: {
  tab: 'orders' | 'merchant' | 'carrot'
  onTab: (tab: 'orders' | 'merchant' | 'carrot') => void
}) {
  const qc = useQueryClient()

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
      qc.invalidateQueries({ queryKey: qk.fund })
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
      qc.invalidateQueries({ queryKey: qk.fund })
    },
  })

  const infinite = usePagedInfinite<Row>(
    (next) =>
      fundApi
        .orders({ page: next, page_size: Math.min(30, PAGE_SIZE) })
        .then((r) => ({ items: r.items as unknown as Row[], total: r.total, page_size: r.page_size })),
    { enabled: tab === 'orders', queryKey: [...qk.fund, 'orders'] },
  )
  const rows = infinite.items

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
        {tab === 'carrot' ? <CarrotSection PAGE_SIZE={PAGE_SIZE} /> : null}
      </div>

      {tab === 'orders' ? (
        <ListSection
        loadingKind="rows"
        loadingPoster="none"
        loadingLines={3}
        loadingActions={1}
        loadingValue
          isLoading={infinite.loading && infinite.items.length === 0}
          error={infinite.error}
          onRetry={() => infinite.retry()}
          items={rows}
          infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
          loadingRows={8}
          emptyTitle="还没有基金订单"
        >
          <RecordRow
            rows={rows}
            idKey={(row) => String(row.order_no ?? '')}
            title={(row) => String(row.order_title ?? row.order_no ?? '')}
            meta={(row) => (
              <>
                <span>{String(row.order_no ?? '')}</span>
                {row.tier_name ? <span>{String(row.tier_name)}</span> : null}
                {row.activity_name ? <span>{String(row.activity_name)}</span> : null}
                <span>{String(row.payout_status_string ?? row.payout_status ?? '—')}</span>
              </>
            )}
            facts={(row) => (
              <>
                <span>{row.tier_carrot == null ? '—' : `${formatThousand(Number(row.tier_carrot))} 胡萝卜`}</span>
                <span>承诺 ¥{row.tier_price == null ? '—' : formatThousand(Number(row.tier_price))}</span>
                <span>
                  {row.payout_at
                    ? formatDateTime(String(row.payout_at))
                    : row.payed_at
                      ? formatDateTime(String(row.payed_at))
                      : '—'}
                </span>
              </>
            )}
            value={(row) => (row.payout_price == null ? '未打款' : `打款 ¥${formatThousand(Number(row.payout_price))}`)}
            actions={
              // 已打款的订单不需要再传凭证
              (row) =>
                String(row.payout_status ?? '') === 'pass' ? null : (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => {
                      setEvidenceFor(row)
                      setRemark('')
                      setImages([])
                    }}
                  >
                    提交凭证
                  </button>
                )
            }
          />
        </ListSection>
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
