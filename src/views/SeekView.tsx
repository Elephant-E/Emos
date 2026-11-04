import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconLeft, IconRight } from '@/components/icons'
import { seekApi } from '@/api/endpoints'
import { useSeekPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { formatRelative, formatThousand, SEEK_STATUS, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
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
  const [carrot, setCarrot] = useState(10)
  const statuses = TABS.find((t) => t.key === search.tab)?.statuses ?? TABS[0].statuses

  const { data, isLoading, error, refetch, isFetching } = useSeekPage({
    page: search.page,
    page_size: search.page_size,
    status: statuses,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seeks'] })
  const claim = useMutation({ mutationFn: (id: number) => seekApi.claim(id, 'confirm'), onSuccess: () => { invalidate(); toast('已认领', 'success') } })
  const urge = useMutation({ mutationFn: (payload: { id: number; carrot: number }) => seekApi.urge(payload.id, payload.carrot), onSuccess: () => { invalidate(); toast('已催片', 'success') } })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <>
      <PageHeader
        crumb={['求片', TABS.find((t) => t.key === search.tab)?.label ?? '全部']}
        title="求片"
        hint={data ? `${formatThousand(data.total)} 条` : undefined}
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
        <EmptyBlock title="这个状态下没有求片" hint="换个状态看看，或者等用户发起新的求片。" />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className="table-card">
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
                          <img className="poster-img" src={item.video_image_poster} alt="" loading="lazy" />
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
                    <td className="num">{item.seek_carrot || '—'}</td>
                    <td className="num muted">{formatRelative(item.updated_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {item.is_can_claim && item.status === 'default' ? (
                        <button className="btn btn--ghost" onClick={() => claim.mutate(item.id)} disabled={claim.isPending}>
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
          <div className="table-foot">
            <span>
              共 {formatThousand(data.total)} 条 · 第 {search.page} / {totalPages} 页
            </span>
            <div className="pager">
              <button disabled={search.page <= 1} onClick={() => onSearch({ page: search.page - 1 })} aria-label="上一页">
                <IconLeft />
              </button>
              <button aria-current="page">{search.page}</button>
              <button disabled={search.page >= totalPages} onClick={() => onSearch({ page: search.page + 1 })} aria-label="下一页">
                <IconRight />
              </button>
            </div>
          </div>
        </div>
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
