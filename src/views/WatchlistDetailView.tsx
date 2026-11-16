import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { watchApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { WatchMusicRows, type WatchDetailSearch } from '@/components/watchlist/WatchMusicRows'
import { AddVideoModal } from '@/components/watchlist/AddVideoModal'
import { MaintainerModal } from '@/components/watchlist/MaintainerModal'
import { SubscribersModal } from '@/components/watchlist/SubscribersModal'
import { RemarkModal } from '@/components/watchlist/RemarkModal'
import { DynamicFetchModal } from '@/components/watchlist/DynamicFetchModal'
import { WatchlistHead } from '@/components/watchlist/WatchlistHead'
import { InlineSortInput } from '@/components/InlineSortInput'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { WatchlistForm } from '@/components/WatchlistForm'
import type {} from '@/api/types'
import { qk, useWatch, useWatchMusic, useWatchMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useSearchTerm } from '@/lib/useSearchTerm'
import { formatThousand, VIDEO_TYPE_LABEL } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

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

  const [term, setTerm] = useSearchTerm(search.q, (next) => onSearch({ q: next }))
  const [adding, setAdding] = useState(false)
  const [addingSong, setAddingSong] = useState(false)
  const [editing, setEditing] = useState(false)
  const [remarkFor, setRemarkFor] = useState<{ videoId: number; title: string; remark: string } | null>(null)
  const [maintainerOpen, setMaintainerOpen] = useState(false)
  // 订阅用户与清空：都是片单主才有的操作
  const [subsOpen, setSubsOpen] = useState(false)
  // 上游这个接口固定 15 条/页（传 20 也回 15），页码按响应的 page_size 算
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
  // 两端都走滚动加载
  const infinite = usePagedInfinite(
    (page) => watchApi.videos(id, { page, page_size: search.page_size, video_title: search.q || undefined }),
    { resetKey: `${id}|${search.q}|${search.page_size}` },
  )
  const videoRows = infinite.items
  const { removeVideo, updateVideoEntry, subscribe, toggleShow, setDynamic, update, clearVideos, clearMusic } = useWatchMutations(id)


  const item = watch.data?.items[0]
  const isMusic = item?.type === 'music'

  // 音乐片单的行数据在父组件拉：两种片单共用同一套外壳和操作按钮
  const songs = useWatchMusic(
    id,
    { page: 1, page_size: search.page_size, song_name: search.q || undefined },
    isMusic,
  )



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
              {/* 订阅的片单在列表里的排序：从卡片搬到这里，功能不丢 */}
              {item.is_subscribe ? (
                <span className="head-tools__field">
                  <span className="head-tools__label">排序</span>
                  <InlineSortInput
                    value={item.user_sort}
                    label="片单排序"
                    onCommit={(sort) =>
                      watchApi.sort(id, sort).then(() => qc.invalidateQueries({ queryKey: qk.watches }))
                    }
                  />
                </span>
              ) : null}

            </>
          ) : null
        }
        more={
          item?.is_self ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                编辑
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setMaintainerOpen(true)}>
                维护者
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => toggleShow.mutate(undefined, { onSuccess: () => toast(item.user_is_show ? '已隐藏' : '已显示', 'success') })}
                disabled={toggleShow.isPending}
              >
                {item.user_is_show ? '隐藏' : '显示'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => { setDynamicUrl(''); setDynamicOpen(true) }}>
                动态抓取
              </button>
              <button
                type="button"
                className="btn btn--danger-text"
                disabled={clearVideos.isPending || clearMusic.isPending}
                onClick={() => void clearAll()}
              >
                清空
              </button>
              <button
                type="button"
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
                  removeWatch.mutate(id, { onSuccess: () => navigate({ to: '/watchlists', search: { page_size: 20, q: '', scope: 'self' } }) })
                }}
              >
                删除
              </button>
            </>
          ) : undefined
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
              ? () => setSubsOpen(true)
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
        <WatchMusicRows watchId={id} item={item} songs={songs} addingSong={addingSong} onCloseAdd={() => setAddingSong(false)} />
      ) : (
        <>

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={videoRows}
        bare
        loadingKind="single-rows"
        loadingRows={6}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        scope={search.q}
        emptyTitle="片单里还没有影片"
      >
        <RecordRow
          single
          rows={videoRows}
          idKey={(video) => video.video_id}
          onOpen={(video) => openVideo(video.video_id)}
          poster={(video) => video.video_image_poster}
          title={(video) => video.video_title}
          meta={(video) => (
            <>
              <span>{VIDEO_TYPE_LABEL[video.video_type]}</span>
              {video.video_date_air ? <span>{video.video_date_air.slice(0, 4)}</span> : null}
            </>
          )}
          facts={(video) => (video.remark ? <span>备注：{video.remark}</span> : null)}
          actions={
            item?.is_edit_video
              ? (video) => (
                  <>
                    {/* 功能操作统一放右侧：排序、备注、移出 */}
                    <span className="record-row__label-mini">排序</span>
                    <InlineSortInput
                      value={video.sort}
                      label={`${video.video_title} 的排序`}
                      onCommit={(sort) =>
                        updateVideoEntry.mutate(
                          { videoId: video.video_id, sort, remark: video.remark ?? null },
                          { onSuccess: () => toast('已调整排序', 'success') },
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() =>
                        setRemarkFor({
                          videoId: video.video_id,
                          title: video.video_title,
                          remark: video.remark ?? '',
                        })
                      }
                    >
                      {video.remark ? '改备注' : '加备注'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-text"
                      disabled={removeVideo.isPending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: '移出这个影片？',
                          message: `《${video.video_title}》会从本片单移除。`,
                          hint: '影片本身不会被删除，其它片单不受影响。',
                          confirmText: '移出',
                          danger: true,
                        })
                        if (!ok) return
                        removeVideo.mutate(video.video_id, { onSuccess: () => toast('已移出', 'success') })
                      }}
                    >
                      移出
                    </button>
                  </>
                )
              : undefined
          }
        />
      </ListSection>
        </>
      )}

      {adding ? (
        <AddVideoModal
          watchId={watchId}
          maxSort={Math.max(0, ...videoRows.map((v) => v.sort ?? 0))}
          onClose={() => setAdding(false)}
        />
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



      {subsOpen && item ? (
        <SubscribersModal watchId={watchId} watchName={String(item.name ?? '')} onClose={() => setSubsOpen(false)} />
      ) : null}

      {maintainerOpen && item ? (
        <MaintainerModal
          watchId={watchId}
          current={(item.maintainers ?? []).map((m) => m.user_id).filter((id): id is string => Boolean(id))}
          onClose={() => setMaintainerOpen(false)}
        />
      ) : null}

      {remarkFor ? (
        <RemarkModal
          title={remarkFor.title}
          current={remarkFor.remark}
          pending={updateVideoEntry.isPending}
          onClose={() => setRemarkFor(null)}
          onSave={(remark) =>
            updateVideoEntry.mutate(
              {
                videoId: remarkFor.videoId,
                // sort 取当前列表的值，而不是弹窗打开那一刻的值
                sort: videoRows.find((v) => v.video_id === remarkFor.videoId)?.sort ?? 0,
                remark: remark || null,
              },
              {
                onSuccess: () => {
                  toast('已保存', 'success')
                  setRemarkFor(null)
                },
              },
            )
          }
        />
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
