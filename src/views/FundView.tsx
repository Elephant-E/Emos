import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListSection } from '@/components/ListSection'
import { RecordList } from '@/components/RecordList'
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
import { qk, useAccountMutations, useCarrot, useCarrotHistory } from '@/api/queries'
import { usePagedInfinite } from '@/lib/usePagedInfinite'
import { useMediaQuery } from '@/lib/useMediaQuery'

const FUND_TABS = [
  { key: 'orders', label: '基金订单' },
  { key: 'merchant', label: '支付服务' },
  { key: 'carrot', label: '胡萝卜' },
] as const

function CarrotSection({ page, pageSize, onPage, onPageSize }: { page: number; pageSize: number; onPage: (page: number) => void; onPageSize: (size: number) => void }) {
  const carrot = useCarrot()
  const compact = useMediaQuery('(max-width: 600px)')
  const history = useCarrotHistory(page, pageSize)
  const infinite = usePagedInfinite<Record<string, unknown>>(
    (next) => carrotApi.history({ page: next, page_size: pageSize }) as unknown as Promise<{ items: Array<Record<string, unknown>>; total: number; page_size: number }>,
    { enabled: compact, resetKey: `${pageSize}` },
  )
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

      <ListSection
        isLoading={history.isLoading}
        error={history.error}
        onRetry={() => history.refetch()}
        items={(compact ? infinite.items : rows) as typeof rows}
        total={compact ? infinite.total : (history.data?.total ?? 0)}
        page={page}
        pageSize={pageSize}
        onPage={onPage}
        onPageSize={onPageSize}
        cardList
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        idKey={(r) => `${r.created_at}-${r.trigger_type}-${r.point}`}
        scope={page}
        loadingRows={8}
        loadingCols={3}
        emptyTitle="还没有胡萝卜记录"
      >
          <RecordList<Record<string, unknown>>
            rows={(compact ? infinite.items : rows) as Array<Record<string, unknown>>}
            idKey={(row) => `${String(row.created_at ?? '')}-${String(row.trigger_type ?? '')}-${String(row.point ?? '')}`}
            className="table"
            columns={[
              {
                key: 'source',
                label: '来源',
                mobile: 'primary',
                render: (row) => (
                  <span className="cell-title__name">
                    {String(row.trigger_type_string ?? row.trigger_type ?? '—')}
                  </span>
                ),
              },
              {
                key: 'delta',
                label: '变动',
                thClass: 'num',
                mobile: 'inline',
                mobileLabel: null,
                render: (row) => {
                  // point 恒为正数（金额大小），收支方向在 type：earn / cost
                  const signed = row.type === 'cost' ? -Number(row.point) : Number(row.point)
                  return (
                    <span className={signed >= 0 ? 'mark-up' : 'mark-down'}>
                      {signed > 0 ? '+' : ''}
                      {formatThousand(signed)}
                    </span>
                  )
                },
              },
              {
                key: 'time',
                label: '时间',
                mobile: 'inline',
                mobileLabel: null,
                render: (row) => (
                  <span className="muted tnum">{formatDateTime(String(row.created_at ?? ''))}</span>
                ),
              },
            ]}
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

  const compact = useMediaQuery('(max-width: 600px)')
  const infinite = usePagedInfinite<Row>(
    (next) =>
      fundApi
        .orders({ page: next, page_size: Math.min(30, pageSize) })
        .then((r) => ({ items: r.items as unknown as Row[], total: r.total, page_size: r.page_size })),
    { enabled: compact && tab === 'orders', resetKey: `${pageSize}` },
  )
  const rows = (compact ? infinite.items : ((orders.data?.items ?? []) as Row[]))
  const total = compact ? infinite.total : (orders.data?.total ?? 0)

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

      {tab === 'orders' ? (
        <ListSection
          isLoading={orders.isLoading}
          error={orders.error}
          onRetry={() => orders.refetch()}
          items={rows}
          total={total}
          page={page}
          pageSize={orders.data?.page_size ?? Math.min(30, pageSize)}
          onPage={onPage}
          onPageSize={onPageSize}
          sizes={[20, 30]}
          cardList
          infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
          idKey={(r) => String(r.order_no ?? r.created_at)}
          scope={page}
          loadingRows={8}
          loadingCols={4}
          emptyTitle="还没有基金订单"
        >
          <RecordList
              rows={rows}
              idKey={(row) => String(row.order_no ?? '')}
              className="table table--auto table--dense"
              columns={[
                {
                  key: 'order',
                  label: '订单',
                  mobile: 'primary',
                  render: (row) => {
                    const orderNo = String(row.order_no ?? '')
                    return (
                      <>
                        <span className="cell-title__name">{String(row.order_title ?? orderNo)}</span>
                        <span className="cell-title__code">
                          {orderNo}
                          {row.tier_name ? ` · ${String(row.tier_name)}` : ''}
                          {row.activity_name ? ` · ${String(row.activity_name)}` : ''}
                        </span>
                      </>
                    )
                  },
                },
                {
                  key: 'carrot',
                  label: '胡萝卜',
                  mobileLabel: null,
                  thClass: 'num',
                  mobile: 'inline',
                  render: (row) => (
                    <>{row.tier_carrot == null ? '—' : `${formatThousand(Number(row.tier_carrot))} 胡萝卜`}</>
                  ),
                },
                {
                  key: 'price',
                  label: '承诺补贴',
                  thClass: 'num',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <>{row.tier_price == null ? '—' : `¥${String(row.tier_price)}`}</>,
                },
                {
                  key: 'payout',
                  label: '实际打款',
                  thClass: 'num',
                  // 打款金额是核心信息：用带字段名的行
                  mobile: 'row',
                  render: (row) => <>{row.payout_price == null ? '—' : `¥${String(row.payout_price)}`}</>,
                },
                {
                  key: 'status',
                  label: '状态',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => (
                    <span className="muted">{String(row.payout_status_string ?? row.payout_status ?? '—')}</span>
                  ),
                },
                {
                  key: 'time',
                  label: '时间',
                  mobile: 'hidden',
                  render: (row) => (
                    <span className="muted tnum">
                      {row.payout_at
                        ? formatDateTime(String(row.payout_at))
                        : row.payed_at
                          ? formatDateTime(String(row.payed_at))
                          : '—'}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  label: '操作',
                  mobile: 'block',
                  mobileAlign: 'end',
                  render: (row) => (
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
                  ),
                },
              ]}
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
