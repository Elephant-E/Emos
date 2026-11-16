import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListSection } from '@/components/ListSection'
import { usePagedInfinite } from '@/lib/usePagedInfinite'
import { RecordRow } from '@/components/RecordRow'
import { Badge } from '@/components/Badge'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { seekApi } from '@/api/endpoints'
import { qk, useSeekPoll, useSession } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useSearchTerm } from '@/lib/useSearchTerm'
import { formatRelative, formatThousand, SEEK_STATUS, VIDEO_TYPE_LABEL } from '@/lib/format'
import type { SeekItem, SeekStatus } from '@/api/types'

export interface SeekSearch {
  page_size: number
  tab: 'all' | 'default' | 'upload' | 'complete'
  q: string
  type: '' | 'movie' | 'tv'
  mine: boolean
}

const TABS: Array<{ key: SeekSearch['tab']; label: string; statuses: SeekStatus[] }> = [
  // 五个状态都要带上：只查前三个会漏掉已取消/已遗忘（实测漏 1468 条）
  { key: 'all', label: '全部', statuses: ['default', 'upload', 'complete', 'cancel', 'forget'] },
  { key: 'default', label: '求片中', statuses: ['default'] },
  { key: 'upload', label: '已认领', statuses: ['upload'] },
  { key: 'complete', label: '已完成', statuses: ['complete'] },
]

/** 空态标题：搜索没命中优先，其次按「只看我认领的」和类型 */
function emptyTitle(q: string, mine: boolean, type: string): string {
  if (q) return `没有找到「${q}」`
  if (mine) return '没有我认领的求片'
  if (type) return `没有${type === 'movie' ? '电影' : '剧集'}类的求片`
  return '没有求片'
}

export function SeekView({ search, onSearch }: { search: SeekSearch; onSearch: (patch: Partial<SeekSearch>) => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [urgeTarget, setUrgeTarget] = useState<SeekItem | null>(null)

  /** 「详情」在任何状态下都能点开 */

  /** 催片按钮在所有状态下都出现，初始悬赏额定在此处 */
  const openUrge = (item: SeekItem) => {
    setUrgeTarget(item)
    setCarrot(10)
  }
  const session = useSession()
  const myNames = [session.data?.pseudonym, session.data?.username].filter(Boolean) as string[]
  const [carrot, setCarrot] = useState(10)
  const statuses = TABS.find((t) => t.key === search.tab)?.statuses ?? TABS[0].statuses
  const [term, setTerm] = useSearchTerm(search.q, (next) => onSearch({ q: next }))

  const seekParams = {
    page_size: search.page_size,
    status: statuses,
    video_title: search.q || undefined,
    video_type: search.type || undefined,
    upload_self: search.mine || undefined,
  }
  // 两端都走滚动加载
  const infinite = usePagedInfinite(
    (page) => seekApi.list({ ...seekParams, page, sort_order: 'desc' }),
    { resetKey: `${search.tab}|${search.q}|${search.mine}|${search.type}|${search.page_size}` },
  )
  const items = infinite.items

  // 列表按 updated_at 排序，首行不一定是最大 id；用当前页最大 id 做增量基准，
  // 否则有人认领老求片就会把它顶上来，lastId 变小导致每轮都全量重查
  const lastId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
  const poll = useSeekPoll(lastId)
  useEffect(() => {
    // 有新求片才让列表重查：否则每 30 秒重查一次 2.4 万条的列表
    if (poll.data && poll.data.length > 0) qc.invalidateQueries({ queryKey: qk.seeks })
  }, [poll.data])

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.seeks })
  const claim = useMutation({ mutationFn: (id: number) => seekApi.claim(id, 'confirm'), onSuccess: () => { invalidate(); toast('已认领', 'success') } })
  const cancelClaim = useMutation({
    mutationFn: (id: number) => seekApi.claim(id, 'cancel'),
    onSuccess: () => {
      invalidate()
      toast('已撤回认领', 'success')
    },
  })

  const urge = useMutation({ mutationFn: (payload: { id: number; carrot: number }) => seekApi.urge(payload.id, payload.carrot), onSuccess: () => { invalidate(); toast('已催片', 'success') } })

  // Number('') 是 0，非法输入可能是 NaN，而 NaN 与任何数比较都为 false，
  // 会让按钮保持可用并提交空值：只有 1 – 5000 的有限数才算可提交
  const carrotValid = Number.isFinite(carrot) && carrot >= 1 && carrot <= 5000


  return (
    <>
      <PageHeader
        crumb={['求片', TABS.find((t) => t.key === search.tab)?.label ?? '全部']}
        title="求片"
              />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab })} label="状态" />
        <span className="spacer" />
        <input
          className="input"
          type="search"
            aria-label="搜索片名"
          placeholder="搜索片名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="seg" role="group" aria-label="类型">
          <button type="button" aria-pressed={search.type === ''} onClick={() => onSearch({ type: '' })}>
            不限
          </button>
          <button type="button" aria-pressed={search.type === 'movie'} onClick={() => onSearch({ type: 'movie' })}>
            电影
          </button>
          <button type="button" aria-pressed={search.type === 'tv'} onClick={() => onSearch({ type: 'tv' })}>
            剧集
          </button>
        </div>
        <label className="switch" style={{ marginLeft: 'var(--sp-1)' }}>
          <input type="checkbox" checked={search.mine} onChange={(e) => onSearch({ mine: e.target.checked })} />
          只看我认领的
        </label>
      </div>

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={items}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        bare
        scope={`${search.tab}-${search.q}-${search.mine}-${search.type}`}
        loadingRows={6}
        loadingKind="rows"
        loadingPoster="poster"
        loadingLines={2}
        loadingActions={3}
        loadingExtra
        loadingFullActions
        emptyTitle={emptyTitle(search.q, search.mine, search.type)}
        emptyAction={search.q ? <ClearSearchButton onClick={() => onSearch({ q: '' })} /> : undefined}
      >
          <RecordRow
            multi
            rows={items}
            idKey={(item) => item.id}
            poster={(item) => item.video_image_poster}
            posterOverlay={(item) => {
              const status = SEEK_STATUS[item.status] ?? SEEK_STATUS.default
              return <Badge tone={status.tone}>{status.label}</Badge>
            }}

            title={(item) => item.video_title_display}
            meta={(item) => (
              <>
                <span className="chip">{VIDEO_TYPE_LABEL[item.video_type]}</span>
                {item.upload_username ? <span className="cell-title__code">认领 {item.upload_username}</span> : null}
              </>
            )}
            extra={(item) => (
              <dl className="seek-records">
                <div>
                  <dt>求片人数</dt>
                  <dd>{item.count_request} 人</dd>
                </div>
                <div>
                  <dt>当前悬赏</dt>
                  <dd>{item.seek_carrot ? `${formatThousand(item.seek_carrot)} 胡萝卜` : '无'}</dd>
                </div>
                <div>
                  <dt>{item.status === 'upload' ? '认领到期' : '最近更新'}</dt>
                  <dd>
                    {item.status === 'upload' && item.upload_expired_at
                      ? formatRelative(item.upload_expired_at)
                      : formatRelative(item.updated_at)}
                  </dd>
                </div>
              </dl>
            )}
            fullActions
            actions={(item) => {
              // 求片页要在列表里就能处理，三个动作缺一不可：详情 / 认领 / 催片
              const isMine =
                Boolean(item.upload_username) && myNames.includes(String(item.upload_username))
              const canClaim = item.status === 'default' && item.is_can_claim
              return (
                <>
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => {
                      if (!item.video_list_id) return
                      navigate({
                        to: '/media/$videoId',
                        params: { videoId: String(item.video_list_id) },
                        search: { season: item.video_season_number ?? 0, episode: item.video_episode_number ?? 1 },
                      })
                    }}
                  >
                    详情
                  </button>
                  {canClaim ? (
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={claim.isPending && claim.variables === item.id}
                      onClick={() => claim.mutate(item.id)}
                    >
                      认领
                    </button>
                  ) : null}
                  {item.status === 'upload' && isMine ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      disabled={cancelClaim.isPending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: '撤回这个认领？',
                          message: '撤回后这一集重新变成待认领，已上传的资源会留在影片里。',
                          confirmText: '撤回',
                          danger: true,
                        })
                        if (!ok) return
                        cancelClaim.mutate(item.id)
                      }}
                    >
                      撤回
                    </button>
                  ) : null}
                  {item.status === 'upload' || item.status === 'default' ? (
                    <button type="button" className="btn btn--quiet" onClick={() => openUrge(item)}>
                      催片
                    </button>
                  ) : null}
                </>
              )
            }}
          />
      </ListSection>


      {urgeTarget ? (
        <Modal
          title={`催片 · ${urgeTarget.video_title_display}`}
          onClose={() => setUrgeTarget(null)}
          width={400}
          footer={
            <ModalFooter
              onCancel={() => setUrgeTarget(null)}
              onConfirm={() => {
                                                                                                                              urge.mutate({ id: urgeTarget.id, carrot: Math.min(5000, Math.max(1, carrot)) })
                                                                                                                              setUrgeTarget(null)
                                                                                                                }}
              confirmText="催片"
              pending={urge.isPending}
              disabled={urge.isPending || !carrotValid}
            />
          }
        >
          <label className="field">
            <span>悬赏胡萝卜（1 – 5000）</span>
            <input className="input" type="number" min={1} max={5000} value={carrot} onChange={(e) => setCarrot(Number(e.target.value))} />
          </label>
          <p className="state__hint">
            提交后立即从余额扣除。
          </p>
        </Modal>
      ) : null}
    </>
  )
}
