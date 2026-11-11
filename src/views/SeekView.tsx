import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListCard } from '@/components/ListCard'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { seekApi } from '@/api/endpoints'
import { useQuery } from '@tanstack/react-query'
import { formatDateTime } from '@/lib/format'
import { useSeekPage, useSeekPoll, useSession } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { rowLink } from '@/lib/rowLink'
import { useDebounced } from '@/lib/useDebounced'
import { formatRelative, formatThousand, SEEK_STATUS, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
import type { SeekItem, SeekStatus } from '@/api/types'

export interface SeekSearch {
  page: number
  page_size: number
  tab: 'all' | 'default' | 'upload' | 'complete'
  q: string
  type: '' | 'movie' | 'tv'
  mine: boolean
}

const TABS: Array<{ key: SeekSearch['tab']; label: string; statuses: SeekStatus[] }> = [
  { key: 'all', label: '全部', statuses: ['default', 'upload', 'complete'] },
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
  // 列表只有汇总，谁给过胡萝卜要看详情接口
  const [detailFor, setDetailFor] = useState<SeekItem | null>(null)
  const detail = useQuery({
    queryKey: ['seek', 'query', detailFor?.id ?? 0] as const,
    queryFn: () => seekApi.query(detailFor?.id ?? 0),
    enabled: Boolean(detailFor),
  })
  const history = useQuery({
    queryKey: ['seek', 'history', detailFor?.id ?? 0] as const,
    queryFn: () => seekApi.history(detailFor?.id ?? 0),
    enabled: Boolean(detailFor),
  })

  /** 「详情」在任何状态下都能点开 */
  const detailButton = (item: SeekItem) => (
    <button type="button"
      className="btn btn--quiet"
      onClick={(e) => {
        e.stopPropagation()
        setDetailFor(item)
      }}
    >
      详情
    </button>
  )

  /** 催片按钮在所有状态下都出现，初始悬赏额定在此处 */
  const urgeButton = (item: SeekItem) => (
    <button type="button"
      className="btn btn--quiet"
      onClick={(e) => {
        e.stopPropagation()
        setUrgeTarget(item)
        setCarrot(10)
      }}
    >
      催片
    </button>
  )
  const session = useSession()
  const myNames = [session.data?.pseudonym, session.data?.username].filter(Boolean) as string[]
  const [carrot, setCarrot] = useState(10)
  const statuses = TABS.find((t) => t.key === search.tab)?.statuses ?? TABS[0].statuses
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])
  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: search.q })

  const { data, isLoading, error, refetch, isFetching } = useSeekPage({
    page: search.page,
    page_size: search.page_size,
    status: statuses,
    video_title: search.q || undefined,
    video_type: search.type || undefined,
    upload_self: search.mine || undefined,
  })

  // 列表按 updated_at 排序，首行不一定是最大 id；用当前页最大 id 做增量基准，
  // 否则有人认领老求片就会把它顶上来，lastId 变小导致每轮都全量重查
  const lastId = (data?.items ?? []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
  const poll = useSeekPoll(lastId)
  useEffect(() => {
    // 有新求片才让列表重查：否则每 30 秒重查一次 2.4 万条的列表
    if (poll.data && poll.data.length > 0) qc.invalidateQueries({ queryKey: ['seeks'] })
  }, [poll.data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seeks'] })
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
        tools={isFetching ? <span className="head-note">拉取中</span> : null}
      />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab, page: 1 })} label="状态" />
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
          <button type="button" aria-pressed={search.type === ''} onClick={() => onSearch({ type: '', page: 1 })}>
            不限
          </button>
          <button type="button" aria-pressed={search.type === 'movie'} onClick={() => onSearch({ type: 'movie', page: 1 })}>
            电影
          </button>
          <button type="button" aria-pressed={search.type === 'tv'} onClick={() => onSearch({ type: 'tv', page: 1 })}>
            剧集
          </button>
        </div>
        <label className="switch" style={{ marginLeft: 4 }}>
          <input type="checkbox" checked={search.mine} onChange={(e) => onSearch({ mine: e.target.checked, page: 1 })} />
          只看我认领的
        </label>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={6} columns={4} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        // 区分「确实没有求片」和「页码越界」：后者的总条数是有值的
        data.total > 0 ? (
          // 空态和分页器同属一张卡，并给回第一页的入口
          <div className="table-card">
            <EmptyBlock
              bare
              title="这一页没有内容"
              hint={`共 ${formatThousand(data.total)} 条，当前在第 ${search.page} 页`}
              action={
                <button type="button" className="btn btn--ghost" onClick={() => onSearch({ page: 1 })}>
                  回第一页
                </button>
              }
            />
            <Pager
              total={data.total}
              page={search.page}
              pageSize={search.page_size}
              onPage={(page) => onSearch({ page })}
              onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
            />
          </div>
        ) : (
          <EmptyBlock
            action={
              search.q ? <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} /> : undefined
            }
            title={emptyTitle(search.q, search.mine, search.type)}
          />
        )
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <ListCard items={data.items} total={data.total ?? data.items.length} idKey={(v) => v.id}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '32%' }} className="th-thumb">求片</th>
                <th style={{ width: '10%' }}>类型</th>
                <th style={{ width: '12%' }}>状态</th>
                <th className="num" style={{ width: '10%' }}>求片数</th>
                <th className="num" style={{ width: '10%' }}>悬赏</th>
                <th className="num" style={{ width: '14%' }}>更新</th>
                <th style={{ width: '12%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const st = SEEK_STATUS[item.status] ?? SEEK_STATUS.default
                // 认领人名字对上当前账号才显示「撤回」
                const isMine =
                  Boolean(item.upload_username) && myNames.includes(String(item.upload_username))
                return (
                  <tr
                    key={item.id}
                    {...rowLink(
                      () =>
                        navigate({
                          to: '/media/$videoId',
                          params: { videoId: String(item.video_list_id) },
                          search: { season: item.video_season_number ?? 0, episode: item.video_episode_number ?? 1 },
                        }),
                      Boolean(item.video_list_id),
                    )}
                  >
                    <td>
                      <div className="cell-title">
                        {item.video_image_poster ? (
                          <Poster src={item.video_image_poster} name={String(item.video_title ?? "?")} />
                        ) : (
                          <span className="thumb">{item.video_title_display.slice(0, 1)}</span>
                        )}
                        <span>
                          <span className="cell-title__name">{item.video_title_display}</span>
                          {item.upload_username ? (
                            <span className="cell-title__code">认领 {item.upload_username}</span>
                          ) : null}
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
                      {item.status === 'upload' && item.upload_expired_at ? (
                        <span className="cell-title__code">{formatRelative(item.upload_expired_at)}到期</span>
                      ) : null}
                    </td>
                    <td className="num">{item.count_request}</td>
                    <td className="num">{item.seek_carrot == null ? '—' : `${formatThousand(item.seek_carrot)} 胡萝卜`}</td>
                    <td className="num muted">{formatRelative(item.updated_at)}</td>
                    <td>
                      <span className="action-group">
                        {item.status === 'upload' ? (
                          <>
                            <Link className="btn btn--quiet" to="/upload" onClick={(e) => e.stopPropagation()}>
                              去上传
                            </Link>
                            {isMine ? (
                              <button type="button"
                                className="btn btn--quiet"
                                disabled={cancelClaim.isPending}
                                onClick={async (e) => {
                                  e.stopPropagation()
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
                            {urgeButton(item)}
                            {detailButton(item)}
                          </>
                        ) : item.status === 'default' ? (
                          <>
                            {item.is_can_claim ? (
                              <button type="button"
                                className="btn btn--ghost"
                                aria-busy={claim.isPending && claim.variables === item.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  claim.mutate(item.id)
                                }}
                                disabled={claim.isPending && claim.variables === item.id}
                              >
                                认领
                              </button>
                            ) : null}
                            {urgeButton(item)}
                            {detailButton(item)}
                          </>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pager total={data.total} page={search.page} pageSize={data.page_size} onPage={(page) => onSearch({ page })} />
        </ListCard>
      ) : null}

      {detailFor ? (
        <Modal
          title={`求片详情 · ${detailFor.video_title_display}`}
          width={520}
          onClose={() => setDetailFor(null)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setDetailFor(null)}>
              关闭
            </button>
          }
        >
          {detail.error ? <ErrorBlock bare error={detail.error} onRetry={() => detail.refetch()} /> : null}
          {detail.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
          {detail.data ? (
            <dl className="kv">
              <div>
                <dt>状态</dt>
                <dd>{String(detail.data.status ?? '—')}</dd>
              </div>
              <div>
                <dt>悬赏</dt>
                <dd>{formatThousand(Number(detail.data.seek_carrot ?? 0))} 胡萝卜</dd>
              </div>
              <div>
                <dt>求片人数</dt>
                <dd>{formatThousand(Number(detail.data.request_count ?? 0))}</dd>
              </div>
              <div>
                <dt>可认领</dt>
                <dd className="muted">{detail.data.is_can_claim ? '可以' : '不可以'}</dd>
              </div>
              <div>
                <dt>认领人</dt>
                <dd className="muted">{String(detail.data.upload_username ?? '—')}</dd>
              </div>
              <div>
                <dt>认领到期</dt>
                <dd className="muted">{detail.data.upload_expired_at ? formatDateTime(String(detail.data.upload_expired_at)) : '—'}</dd>
              </div>
              <div>
                <dt>更新</dt>
                <dd className="muted">{formatDateTime(String(detail.data.updated_at ?? ''))}</dd>
              </div>
            </dl>
          ) : null}

          <p className="stat__label" style={{ marginTop: 16 }}>悬赏记录</p>
          {history.error ? <ErrorBlock bare error={history.error} onRetry={() => history.refetch()} /> : null}
          {history.isLoading ? <LoadingBlock bare rows={2} columns={3} /> : null}
          {(history.data?.length ?? 0) === 0 && !history.isLoading && !history.error ? (
            <EmptyBlock bare title="还没有人加过胡萝卜" />
          ) : null}
          {(history.data?.length ?? 0) > 0 ? (
            <table className="table table--inset" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>用户</th>
                  <th className="num" style={{ width: 100 }}>胡萝卜</th>
                  <th style={{ width: 130 }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {(history.data ?? []).map((row, index) => (
                  <tr key={`${row.username}-${index}`}>
                    <td className="cell-title__name">{row.username}</td>
                    <td className="num muted">{row.carrot ? `+${formatThousand(row.carrot)}` : '—'}</td>
                    <td className="muted">{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <button type="button" className="btn btn--ghost" onClick={() => setUrgeTarget(null)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={urge.isPending || !carrotValid}
                onClick={() => {
                  urge.mutate({ id: urgeTarget.id, carrot: Math.min(5000, Math.max(1, carrot)) })
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
            提交后立即从余额扣除。
          </p>
        </Modal>
      ) : null}
    </>
  )
}
