import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { seekApi } from '@/api/endpoints'
import { useSeekPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { formatRelative, formatThousand, SEEK_STATUS, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL, formatDateTime } from '@/lib/format'
import type { SeekItem, SeekStatus } from '@/api/types'

export interface SeekSearch {
  page: number
  page_size: number
  tab: 'all' | 'default' | 'upload' | 'complete'
}

const TABS: Array<{ key: SeekSearch['tab']; label: string; statuses: SeekStatus[] }> = [
  { key: 'all', label: '全部', statuses: ['default', 'upload', 'complete'] },
  { key: 'default', label: '求片中', statuses: ['default'] },
  { key: 'upload', label: '已认领', statuses: ['upload'] },
  { key: 'complete', label: '已完成', statuses: ['complete'] },
]

export function SeekView({ search, onSearch }: { search: SeekSearch; onSearch: (patch: Partial<SeekSearch>) => void }) {
  const qc = useQueryClient()
  const [urgeTarget, setUrgeTarget] = useState<SeekItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<SeekItem | null>(null)
  const [detail, setDetail] = useState<{ info: Record<string, unknown> | null; history: Array<Record<string, unknown>>; loading: boolean; error?: boolean }>({ info: null, history: [], loading: false })
  const [carrot, setCarrot] = useState(10)
  const statuses = TABS.find((t) => t.key === search.tab)?.statuses ?? TABS[0].statuses

  const { data, isLoading, error, refetch, isFetching, isPlaceholderData } = useSeekPage({
    page: search.page,
    page_size: search.page_size,
    status: statuses,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seeks'] })
  const claim = useMutation({ mutationFn: (id: number) => seekApi.claim(id, 'confirm'), onSuccess: () => { invalidate(); toast('已认领', 'success') } })
  const cancelClaim = useMutation({
    mutationFn: (id: number) => seekApi.claim(id, 'cancel'),
    onSuccess: () => {
      invalidate()
      toast('已撤回认领', 'success')
      setDetailTarget(null)
    },
  })

  const urge = useMutation({ mutationFn: (payload: { id: number; carrot: number }) => seekApi.urge(payload.id, payload.carrot), onSuccess: () => { invalidate(); toast('已催片', 'success') } })


  return (
    <>
      <PageHeader
        crumb={['求片', TABS.find((t) => t.key === search.tab)?.label ?? '全部']}
        title="求片"
        tools={
          <span className="stamp">
            <i />
            {isFetching ? '拉取中' : '每 30 秒刷新'}
          </span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="状态">
          {TABS.map((tab) => (
            <button key={tab.key} className="tab" role="tab" aria-selected={search.tab === tab.key} onClick={() => onSearch({ tab: tab.key, page: 1 })}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorBlock error={error as Error & { status?: number }} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={6} columns={4} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        <EmptyBlock title="没有求片" />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className={`table-card content-in${isPlaceholderData ? ' is-stale' : ''}`} key={`${data.items.length}-${data.items[0]?.id}-${data.total ?? data.items.length}`}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>求片</th>
                <th style={{ width: '10%' }}>类型</th>
                <th style={{ width: '12%' }}>状态</th>
                <th className="num" style={{ width: '10%' }}>求片数</th>
                <th className="num" style={{ width: '10%' }}>悬赏</th>
                <th className="num" style={{ width: '14%' }}>更新</th>
                <th style={{ width: '12%', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const st = SEEK_STATUS[item.status] ?? SEEK_STATUS.default
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">
                        {item.video_image_poster ? (
                          <Poster src={item.video_image_poster} name={String(item.video_title ?? "?")} />
                        ) : (
                          <span className="thumb">{item.video_title_display.slice(0, 1)}</span>
                        )}
                        <span>
                          <span className="cell-title__name">{item.video_title_display}</span>
                          <span className="cell-title__code">
                            {item.item_id} · todb {item.todb_id}
                            {item.upload_username ? ` · 认领 ${item.upload_username}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="zone">
                        <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[item.video_type] }} />
                        {VIDEO_TYPE_LABEL[item.video_type]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>
                        <i />
                        {st.label}
                      </span>
                    </td>
                    <td className="num">{item.count_request}</td>
                    <td className="num">{item.seek_carrot == null ? '—' : formatThousand(item.seek_carrot)}</td>
                    <td className="num muted">{formatRelative(item.updated_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn--quiet"
                        onClick={async () => {
                          setDetailTarget(item)
                          setDetail({ info: null, history: [], loading: true })
                          try {
                            const [info, history] = await Promise.all([
                              seekApi.query(item.id),
                              seekApi.history(item.id),
                            ])
                            setDetail({ info, history: history ?? [], loading: false })
                          } catch {
                            setDetail({ info: null, history: [], loading: false, error: true })
                          }
                        }}
                      >
                        详情
                      </button>
                      {item.status === 'upload' ? (
                        <a className="btn btn--quiet" href="/upload">
                          去上传
                        </a>
                      ) : item.is_can_claim && item.status === 'default' ? (
                        <button
                          className="btn btn--ghost"
                          aria-busy={claim.isPending && claim.variables === item.id}
                          onClick={() => claim.mutate(item.id)}
                          disabled={claim.isPending && claim.variables === item.id}
                        >
                          认领
                        </button>
                      ) : (
                        <button className="btn btn--quiet" onClick={() => { setUrgeTarget(item); setCarrot(10) }}>
                          催片
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pager total={data.total} page={search.page} pageSize={data.page_size} onPage={(page) => onSearch({ page })} />
        </div>
      ) : null}

      {detailTarget ? (
        <Modal
          title={`求片详情 · ${detailTarget.video_title_display}`}
          hint={`#${detailTarget.id} · ${detailTarget.status}`}
          width={520}
          onClose={() => setDetailTarget(null)}
        >
          {detail.loading ? <p className="card-note">读取中…</p> : null}

          {detail.error ? <p className="card-note">详情取不到，稍后再试～</p> : null}

          {!detail.loading && detail.info ? (
            <dl className="kv">
              {[
                ['status', '状态'],
                ['upload_username', '认领人'],
                ['request_count', '求片人数'],
                ['seek_carrot', '悬赏'],
                ['updated_at', '最近更新'],
                ['upload_expired_at', '上传期限'],
              ]
                .map(([key, label]) => [label, detail.info?.[key]] as const)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([label, v]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {label === '状态'
                        ? (SEEK_STATUS[String(v) as SeekStatus] ?? SEEK_STATUS.default).label
                        : label === '最近更新' || label === '上传期限'
                          ? formatDateTime(String(v))
                          : String(v)}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null}

          <p className="stat__label" style={{ marginTop: 'var(--stack)' }}>投票记录</p>
          {!detail.loading && detail.history.length === 0 ? <p className="card-note">还没有人投票。</p> : null}
          <ul className="stack--tight">
            {detail.history.map((row, index) => (
              <li key={index} className="row row--baseline" style={{ display: 'flex' }}>
                <span className="text-body">{String(row.username ?? '—')}</span>
                <span className="muted meta-end">{String(row.carrot)} 胡萝卜</span>
                <span className="muted tnum-sm">{formatRelative(String(row.created_at))}</span>
              </li>
            ))}
          </ul>

          {detailTarget.status === 'upload' ? (
            <button
              className="btn btn--danger-text"
              style={{ marginTop: 'var(--stack)' }}
              disabled={cancelClaim.isPending}
              onClick={() => cancelClaim.mutate(detailTarget.id)}
            >
              {cancelClaim.isPending ? '撤回中…' : '撤回认领'}
            </button>
          ) : null}
        </Modal>
      ) : null}

      {urgeTarget ? (
        <Modal
          title={`催片 · ${urgeTarget.video_title_display}`}
          onClose={() => setUrgeTarget(null)}
          width={400}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setUrgeTarget(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={urge.isPending}
                onClick={() => {
                  urge.mutate({ id: urgeTarget.id, carrot })
                  setUrgeTarget(null)
                }}
              >
                催片
              </button>
            </>
          }
        >
          <label className="field">
            <span>悬赏胡萝卜（1 – 5000）</span>
            <input className="input" type="number" min={1} max={5000} value={carrot} onChange={(e) => setCarrot(Number(e.target.value))} />
          </label>
          <p className="state__hint" style={{ textAlign: 'left' }}>
            催片会从你的余额里扣除对应胡萝卜，上传者完成后按规则结算。
          </p>
        </Modal>
      ) : null}
    </>
  )
}
