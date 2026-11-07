import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { fundApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatDateTime, formatThousand } from '@/lib/format'
import { PayView } from '@/views/PayView'
import { useCarrot, useCarrotHistory } from '@/api/queries'

function CarrotSection({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const carrot = useCarrot()
  const history = useCarrotHistory(page, 20)
  const rows = history.data?.items ?? []
  return (
    <>
      <section className="cards cards--2">
        <article className="card card--stat">
          <p className="stat__label">胡萝卜余额</p>
          <p className="stat__value">{carrot.data ? formatThousand(carrot.data.carrot) : '—'}<small>个</small></p>
          <p className="stat__delta stat__delta--quiet">签到、上传、字幕都会获得</p>
        </article>
        <article className="card card--stat">
          <p className="stat__label">本页记录</p>
          <p className="stat__value">{rows.length}<small>条</small></p>
          <p className="stat__delta stat__delta--quiet">第 {page} 页</p>
        </article>
      </section>
      {history.isLoading ? <LoadingBlock rows={8} columns={3} /> : null}
      {rows.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '46%' }}>来源</th>
                <th className="num" style={{ width: '16%' }}>变动</th>
                <th style={{ width: '24%' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="text-body">{String(row.trigger_type_string ?? row.trigger_type ?? '—')}</td>
                  <td className={Number(row.point) >= 0 ? 'num mark-up' : 'num mark-down'}>
                    {Number(row.point) > 0 ? '+' : ''}{String(row.point)}
                  </td>
                  <td className="muted tnum">{formatDateTime(String(row.created_at ?? ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot">
            <span className="muted">共 {formatThousand(history.data?.total ?? 0)} 条</span>
            <button className="btn btn--quiet" onClick={() => onPage(page + 1)} disabled={(history.data?.total ?? 0) <= page * 20}>
              下一页
            </button>
          </div>
        </div>
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
    queryFn: () => fundApi.orders({ page, page_size: pageSize }),
    placeholderData: (prev) => prev,
  })

  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [carrot, setCarrot] = useState('100')
  const [evidenceFor, setEvidenceFor] = useState<Row | null>(null)
  const [remark, setRemark] = useState('')
  const [images, setImages] = useState('')

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
        images: images.split(/\s+/).map((s) => s.trim()).filter(Boolean),
        remark: remark.trim(),
      }),
    onSuccess: () => {
      toast('凭证已提交', 'success')
      setEvidenceFor(null)
      setRemark('')
      setImages('')
      qc.invalidateQueries({ queryKey: ['fund'] })
    },
  })

  const rows = (orders.data?.items ?? []) as Row[]
  const total = orders.data?.total ?? 0

  return (
    <>
      <PageHeader
        crumb={['资金', tab === 'orders' ? '基金订单' : '支付服务']}
        title="资金"
        tools={
          tab === 'orders' ? (
            <button className="btn btn--ghost" onClick={() => setCreating(true)}>
              新建订单
            </button>
          ) : null
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="资金">
          <button className="tab" role="tab" aria-selected={tab === 'orders'} onClick={() => onTab('orders')}>
            基金订单
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'merchant'} onClick={() => onTab('merchant')}>
            支付服务
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'carrot'} onClick={() => onTab('carrot')}>
            胡萝卜
          </button>
        </div>
      </div>

      {tab === 'merchant' ? <PayView embedded /> : null}
      {tab === 'carrot' ? <CarrotSection page={page} onPage={onPage} /> : null}

      {tab === 'orders' && orders.error ? <ErrorBlock error={orders.error as Error & { status?: number }} onRetry={() => orders.refetch()} /> : null}
      {tab === 'orders' && orders.isLoading ? <LoadingBlock rows={8} columns={4} /> : null}

      {tab === 'orders' && !orders.isLoading && !orders.error && rows.length === 0 ? (
        <EmptyBlock title="还没有基金订单" hint="用活动码新建，再在客户端兑换" />
      ) : null}

      {tab === 'orders' && rows.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>订单号</th>
                <th className="num" style={{ width: '14%' }}>胡萝卜</th>
                <th style={{ width: '18%' }}>状态</th>
                <th style={{ width: '18%' }}>时间</th>
                <th className="cell-right" style={{ width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const orderNo = String(row.no ?? row.order_no ?? '')
                return (
                  <tr key={orderNo}>
                    <td>
                      <span className="cell-title__name tnum">{orderNo}</span>
                      <span className="cell-title__code">{String(row.fund_activity_code ?? row.activity_code ?? '')}</span>
                    </td>
                    <td className="num">{row.tier_carrot == null ? '—' : formatThousand(Number(row.tier_carrot))}</td>
                    <td className="muted">{String(row.payout_status_string ?? row.payout_status ?? '—')}</td>
                    <td className="muted tnum">{row.payed_at ? formatDateTime(String(row.payed_at)) : '—'}</td>
                    <td className="cell-right">
                      <button
                        className="btn btn--quiet"
                        onClick={() => {
                          setEvidenceFor(row)
                          setRemark(String(row.remark ?? ''))
                          setImages('')
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
        <Modal title="新建基金订单" hint="活动码由活动方提供" width={420} onClose={() => setCreating(false)}>
          <div className="stack">
            <label className="field">
              <span>活动码</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="fund_activity_code" />
            </label>
            <label className="field">
              <span>胡萝卜</span>
              <input className="input tnum" type="number" min={1} value={carrot} onChange={(e) => setCarrot(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!code.trim() || Number(carrot) <= 0 || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {evidenceFor ? (
        <Modal title="提交凭证" hint={String(evidenceFor.no ?? '')} width={460} onClose={() => setEvidenceFor(null)}>
          <div className="stack">
            <label className="field">
              <span>图片地址（每行一个）</span>
              <textarea className="input" rows={3} value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span>备注</span>
              <textarea className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setEvidenceFor(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={submitEvidence.isPending}
                onClick={() => submitEvidence.mutate(String(evidenceFor.no ?? evidenceFor.order_no ?? ''))}
              >
                {submitEvidence.isPending ? '提交中…' : '提交'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
