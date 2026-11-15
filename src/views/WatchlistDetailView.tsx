import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { watchApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { WatchMusicRows, type WatchDetailSearch } from '@/components/watchlist/WatchMusicRows'
import { DynamicFetchModal } from '@/components/watchlist/DynamicFetchModal'
import { WatchlistHead } from '@/components/watchlist/WatchlistHead'
import { InlineSortInput } from '@/components/InlineSortInput'
import { UserCell } from '@/components/UserCell'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { Pager } from '@/components/Pager'
import { IconPlus } from '@/components/icons'
import { PickList } from '@/components/PickList'
import { WatchlistForm } from '@/components/WatchlistForm'
import { TagInput } from '@/components/TagInput'
import type {} from '@/api/types'
import { qk, useWatch, useWatchMusic, useWatchMutations, useWatchSearch, useWatchVideos } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { rowLink } from '@/lib/rowLink'
import { useDebounced } from '@/lib/useDebounced'
import { formatThousand, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

export function WatchlistDetailView({
  watchId,
  search,
  onSearch,
}: {
  watchId: number
  search: WatchDetailSearch
  onSearch: (patch: Partial<WatchDetailSearch>) => void
}) {
  const id = watchId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [term, setTerm] = useState(search.q)
  const [adding, setAdding] = useState(false)
  const [addingSong, setAddingSong] = useState(false)
  const [editing, setEditing] = useState(false)
  const [remarkFor, setRemarkFor] = useState<{ videoId: number; title: string; remark: string } | null>(null)
  const [maintainerOpen, setMaintainerOpen] = useState(false)
  const [maintainerIds, setMaintainerIds] = useState<string[]>([])
  // 订阅用户与清空：都是片单主才有的操作
  const [subsOpen, setSubsOpen] = useState(false)
  const [subsPage, setSubsPage] = useState(1)
  // 上游这个接口固定 15 条/页（传 20 也回 15），页码按响应的 page_size 算
  const subs = useQuery({
    queryKey: ['watch', 'subscribers', watchId, subsPage] as const,
    queryFn: () => watchApi.subscribers(watchId, { page: subsPage, page_size: 15 }),
    enabled: subsOpen,
  })
  const [dynamicOpen, setDynamicOpen] = useState(false)
  const [dynamicUrl, setDynamicUrl] = useState('')

  const removeWatch = useMutation({
    mutationFn: (watchId: number) => watchApi.remove(watchId),
    onSuccess: () => {
      toast('片单已删除', 'success')
      void qc.invalidateQueries({ queryKey: qk.watches })
      void qc.invalidateQueries({ queryKey: qk.session })
    },
  })

  const watch = useWatch(id)
  const videos = useWatchVideos(id, { page: search.page, page_size: search.page_size, video_title: search.q || undefined })
  const videoRows = videos.data?.items ?? []
  const [addTerm, setAddTerm] = useState('')
  const candidates = useWatchSearch(id, addTerm)
  const { addVideo, removeVideo, updateVideoEntry, subscribe, toggleShow, setDynamic, update, setMaintainers, clearVideos, clearMusic } = useWatchMutations(id)

  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: search.q })

  const item = watch.data?.items[0]
  const isMusic = item?.type === 'music'

  // 音乐片单的行数据在父组件拉：两种片单共用同一套外壳和操作按钮
  const songs = useWatchMusic(
    id,
    { page: search.page, page_size: search.page_size, song_name: search.q || undefined },
    isMusic,
  )


  const go = (patch: Partial<WatchDetailSearch>) => onSearch(patch)

  const openVideo = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  if (!watch.isLoading && !item) {
    return (
      <>
        <PageHeader crumb={['片单', '详情']} title="片单" />
        {watch.error ? (
          <ErrorBlock error={watch.error} onRetry={() => watch.refetch()} />
        ) : (
          <EmptyBlock title="片单不存在，或没有查看权限" />
        )}
      </>
    )
  }

  /** 片单里的条目数：影视用视频数，音乐用歌曲数（清空与删除都要显示） */
  const entryCount = isMusic ? (songs.data?.total ?? 0) : (item?.video_count ?? 0)
  const entryUnit = isMusic ? '首' : '部影片'

  /** 清空片单内容：影视走 video/empty，音乐走 music/empty，都不可撤销 */
  const clearAll = async () => {
    const count = entryCount
    if (!count) {
      toast('这份片单已经是空的', 'error')
      return
    }
    const ok = await confirmDialog({
      title: '清空这份片单？',
      message: `会把里面的 ${formatThousand(count)} ${isMusic ? '首歌' : '部影片'} 全部移除。`,
      hint: '片单本身保留，只清内容；这个操作不能在界面上撤销。',
      confirmText: '清空',
      danger: true,
    })
    if (!ok) return
    // 成功后 ['watch'] 前缀失效，影片/歌曲列表与头部计数一起重取
    const empty = isMusic ? clearMusic : clearVideos
    empty.mutate(undefined, {
      onSuccess: () => {
        toast('已清空', 'success')
        // 清空后总数为 0，停在越界页会只剩空表，退回第 1 页
        if (search.page !== 1) go({ page: 1 })
      },
      // 失败提示由全局 MutationCache 统一弹出
    })
  }

  return (
    <>
      <PageHeader
        crumb={['片单', item?.name ?? '详情']}
        title={item?.name ?? '片单'}
        hint={
          item
            ? `${formatThousand(isMusic ? (songs.data?.total ?? 0) : item.video_count)} ${isMusic ? '首' : '部'}`
            : undefined
        }
        tools={
          item ? (
            <>
              <button type="button" className={`btn ${item.is_subscribe ? 'btn--ghost' : 'btn--primary'}`} onClick={() => subscribe.mutate(undefined, { onSuccess: () => toast(item.is_subscribe ? '已取消订阅' : '已订阅', 'success') })} disabled={subscribe.isPending}>
                {item.is_subscribe ? '取消订阅' : '订阅'}
              </button>
              {item.is_self ? (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                    编辑
                  </button>
                  <button type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setMaintainerIds((item.maintainers ?? []).map((m) => m.user_id).filter(Boolean) as string[])
                      setMaintainerOpen(true)
                    }}
                  >
                    维护者
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => toggleShow.mutate(undefined, { onSuccess: () => toast(item.user_is_show ? '已隐藏' : '已显示', 'success') })} disabled={toggleShow.isPending}>
                    {item.user_is_show ? '隐藏' : '显示'}
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => { setDynamicUrl(''); setDynamicOpen(true) }}>
                    动态抓取
                  </button>
                  <button type="button"
                    className="btn btn--danger-text"
                    disabled={clearVideos.isPending || clearMusic.isPending}
                    onClick={() => void clearAll()}
                  >
                    清空
                  </button>
                  <button type="button"
                    className="btn btn--danger-text"
                    disabled={removeWatch.isPending}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: `删除片单「${item.name}」？`,
                        message: `${formatThousand(entryCount)} ${entryUnit}会一起从片单移除，内容本身不受影响。`,
                        hint: '片单删除后无法恢复，槽位会释放。',
                        confirmText: '删除',
                        danger: true,
                      })
                      if (!ok) return
                      removeWatch.mutate(id, { onSuccess: () => navigate({ to: '/watchlists', search: { page: 1, page_size: 20, q: '', scope: 'self' } }) })
                    }}
                  >
                    删除
                  </button>
                </>
              ) : null}
            </>
          ) : null
        }
      />

      {watch.error ? <ErrorBlock error={watch.error} onRetry={() => watch.refetch()} /> : null}

      {item ? (
        <WatchlistHead
          item={item}
          count={isMusic ? (songs.data?.total ?? 0) : item.video_count}
          countLabel={isMusic ? '首' : '影片'}
          onSubscribers={
            item.is_self
              ? () => {
                  setSubsPage(1)
                  setSubsOpen(true)
                }
              : undefined
          }
        />
      ) : null}

      <div className="toolbar">
        <input
          className="input"
          type="search"
            aria-label="搜索"
          placeholder={isMusic ? '搜歌名' : '在该片单里搜片名'}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <span className="spacer" />
        {item?.is_edit_video ? (
          <button type="button"
            className="btn btn--primary"
            onClick={() => {
              if (isMusic) {
                setAddingSong(true)
              } else {
                setAddTerm('')
                setAdding(true)
              }
            }}
          >
            <IconPlus />
            {isMusic ? '添加歌曲' : '添加影片'}
          </button>
        ) : null}
      </div>

      {isMusic ? (
        <WatchMusicRows watchId={id} item={item} search={search} onSearch={onSearch} songs={songs} addingSong={addingSong} onCloseAdd={() => setAddingSong(false)} />
      ) : (
        <>

      <ListSection
        isLoading={videos.isLoading}
        error={videos.error}
        onRetry={() => videos.refetch()}
        items={videos.data?.items ?? []}
        total={videos.data?.total ?? 0}
        page={search.page}
        pageSize={videos.data?.page_size ?? search.page_size}
        onPage={(page) => go({ page })}
        idKey={(v) => v.video_id}
        scope={`${search.q}-${search.page}`}
        loadingRows={6}
        loadingCols={4}
        emptyTitle="片单里还没有影片"
      >
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '44%' }} className="th-thumb">影片</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '12%' }}>排序</th>
                <th style={{ width: item?.is_edit_video ? '18%' : '32%' }}>备注</th>
                {item?.is_edit_video ? <th style={{ width: '1%' }}>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {videoRows.map((video) => (
                <tr key={video.video_id} {...rowLink(() => openVideo(video.video_id))}>
                  <td>
                    <div className="cell-title">
                      {video.video_image_poster ? (
                        <Poster src={video.video_image_poster} name={String(video.video_title ?? "?")} />
                      ) : (
                        <span className="thumb">{video.video_title.slice(0, 1)}</span>
                      )}
                      <span>
                        <span className="cell-title__name">{video.video_title}</span>
                        <span className="cell-title__code">
              {video.video_origin_title ?? '—'} · {video.video_date_air ?? '—'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="zone">
                      <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                      {VIDEO_TYPE_LABEL[video.video_type]}
                    </span>
                  </td>
                  <td className="num">
                    {item?.is_edit_video ? (
                      <InlineSortInput
                        value={video.sort}
                        label={`${video.video_title} 的排序`}
                        stopRowClick
                        onCommit={(sort) =>
              updateVideoEntry.mutate(
              { videoId: video.video_id, sort, remark: video.remark ?? null },
              { onSuccess: () => toast('已调整排序', 'success') },
              )
                        }
                      />
                    ) : (
                      video.sort
                    )}
                  </td>
                  <td className="muted">
                    {item?.is_edit_video ? (
                      <button type="button"
                        className="btn btn--quiet"
                        onClick={(e) => {
              e.stopPropagation()
              setRemarkFor({
              videoId: video.video_id,
              title: video.video_title,
              remark: video.remark ?? '',
              })
                        }}
                      >
                        {video.remark || '添加备注'}
                      </button>
                    ) : (
                      video.remark ?? '—'
                    )}
                  </td>
                  {item?.is_edit_video ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button"
                        className="btn btn--danger-text"
                        onClick={async () => {
              const ok = await confirmDialog({
              title: '移出这个影片？',
              message: `《${video.video_title}》会从本片单移除。`,
              hint: '影片本身不会被删除，其它片单不受影响。',
              confirmText: '移出',
              danger: true,
              })
              if (!ok) return
              removeVideo.mutate(video.video_id, {
              onSuccess: () => toast('已移出', 'success'),
              })
                        }}
                        disabled={removeVideo.isPending}
                      >
                        移出
                    </button>
                  </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
      </ListSection>
        </>
      )}

      {adding ? (
        <Modal title="添加影片" onClose={() => setAdding(false)} width={460}>
          <label className="field">
            <span>按片名搜索</span>
            <input
              className="input"
              autoFocus
              value={addTerm}
              placeholder="输入片名"
              onChange={(e) => setAddTerm(e.target.value)}
            />
          </label>
          <PickList loading={candidates.isFetching} query={addTerm} count={(candidates.data ?? []).length}>
            {(candidates.data ?? []).map((c) => (
              <div key={c.video_id} className="pick-row">
                {c.video_image_poster ? <Poster src={c.video_image_poster} name={String(c.video_title ?? '?')} /> : null}
                <span className="pick-row__text">
                  <span style={{ fontSize: 13.5 }}>{c.video_title}</span>
                  <span className="meta-sm">
                    {VIDEO_TYPE_LABEL[c.video_type]} · {c.video_date_air ?? '—'}
                  </span>
                </span>
                <button type="button"
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    const maxSort = Math.max(0, ...(videos.data?.items ?? []).map((v) => v.sort ?? 0))
                    addVideo.mutate(
                      { videoId: c.video_id, sort: maxSort + 10 },
                      { onSuccess: () => toast(`已加入《${c.video_title}》`, 'success') },
                    )
                  }}
                  disabled={addVideo.isPending}
                >
                  加入
                </button>
              </div>
            ))}
          </PickList>
        </Modal>
      ) : null}

      {dynamicOpen ? (
        <DynamicFetchModal
          current={dynamicUrl}
          pending={setDynamic.isPending}
          onClose={() => setDynamicOpen(false)}
          onSave={(url) =>
            setDynamic.mutate(url, {
              onSuccess: () => {
                toast(url ? '已开启动态抓取' : '已关闭动态抓取', 'success')
                setDynamicOpen(false)
              },
            })
          }
        />
      ) : null}



      {subsOpen ? (
        <Modal
          title={`订阅用户 · ${item?.name ?? ''}`}
          width={520}
          onClose={() => setSubsOpen(false)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setSubsOpen(false)}>
              关闭
            </button>
          }
        >
          {subs.error ? <ErrorBlock bare error={subs.error} onRetry={() => subs.refetch()} /> : null}
          {subs.isLoading ? <LoadingBlock bare rows={4} columns={4} /> : null}
          {(subs.data?.items.length ?? 0) === 0 && !subs.isLoading && !subs.error ? <EmptyBlock bare title="还没有人订阅" /> : null}
          {(subs.data?.items.length ?? 0) > 0 ? (
            <table className="table table--inset">
              <thead>
                <tr>
                  <th className="th-thumb">用户</th>
                  <th className="num" style={{ width: 90 }}>付费</th>
                  <th style={{ width: 110 }}>到期</th>
                </tr>
              </thead>
              <tbody>
                {(subs.data?.items ?? []).map((row, index) => (
                  <tr key={`${row.username}-${index}`}>
                    <td>
                      <UserCell name={row.username} avatar={row.avatar} />
                    </td>
                    <td className="num muted">{row.carrot ? formatThousand(row.carrot) : '—'}</td>
                    <td className="muted">{row.expiration_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {subs.data ? (
            <Pager total={subs.data.total} page={subsPage} pageSize={subs.data.page_size} onPage={setSubsPage} />
          ) : null}
        </Modal>
      ) : null}

      {maintainerOpen && item ? (
        <Modal
          title="设置维护者"
          onClose={() => setMaintainerOpen(false)}
          footer={
            <ModalFooter
              onCancel={() => setMaintainerOpen(false)}
              onConfirm={() =>
                                  setMaintainers.mutate(
                                    maintainerIds,
                                    {
                                      onSuccess: () => {
                                          toast('已保存', 'success')
                                          setMaintainerOpen(false)
                                      },
                                    },
                                  )}
              confirmText="保存"
              pending={setMaintainers.isPending}
              disabled={setMaintainers.isPending}
            />
          }
        >
          <div className="field">
            <span>维护者用户 ID</span>
            <TagInput
              value={maintainerIds}
              onChange={setMaintainerIds}
              placeholder="输入用户 ID 后回车，全部清空即取消维护者"
              autoFocus
            />
          </div>
        </Modal>
      ) : null}

      {remarkFor ? (
        <Modal
          title={`备注 · ${remarkFor.title}`}
          onClose={() => setRemarkFor(null)}
          footer={
            <ModalFooter
              onCancel={() => setRemarkFor(null)}
              onConfirm={() =>
                                  updateVideoEntry.mutate(
                                    {
                                      videoId: remarkFor.videoId,
                                      // sort 取当前列表的值，而不是弹窗打开那一刻的值
                                      sort: videos.data?.items.find((v) => v.video_id === remarkFor.videoId)?.sort ?? 0,
                                      remark: remarkFor.remark.trim() || null,
                                    },
                                    {
                                      onSuccess: () => {
                                          toast('已保存', 'success')
                                          setRemarkFor(null)
                                      },
                                    },
                                  )}
              confirmText="保存"
              pending={updateVideoEntry.isPending}
              disabled={updateVideoEntry.isPending}
            />
          }
        >
          <label className="field">
            <span>备注（只有自己看得到）</span>
            <textarea
              className="input"
              style={{ minHeight: 90 }}
              value={remarkFor.remark}
              onChange={(e) => setRemarkFor({ ...remarkFor, remark: e.target.value })}
              autoFocus
            />
          </label>
        </Modal>
      ) : null}

      {editing && item ? (
        <WatchlistForm
          initial={{
            type: item.type,
            name: item.name,
            description: item.description ?? '',
            is_public: item.is_public,
            point: item.carrot ?? 0,
            tags: item.tags ?? [],
            image_poster_url: item.image_poster_url ?? null,
            is_show_empty: item.is_show_empty,
          }}
          submitLabel="保存"
          pending={update.isPending}
          onClose={() => setEditing(false)}
          onSubmit={(values) =>
            update.mutate(
              { ...values, type: item.type },
              {
                onSuccess: () => {
                  toast('已保存', 'success')
                  setEditing(false)
                },
              },
            )
          }
        />
      ) : null}
    
</>
  )
}
