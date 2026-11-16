import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { VideoCasts } from '@/components/video/VideoCasts'
import { MediaMoveModal } from '@/components/video/MediaMoveModal'
import { VideoSeasons } from '@/components/video/VideoSeasons'
import { VideoMedias } from '@/components/video/VideoMedias'
import { VideoSubtitles, type SubtitleRow } from '@/components/video/VideoSubtitles'
import { MediaEditModal } from '@/components/video/MediaEditModal'
import { SubtitleEditModal } from '@/components/video/SubtitleEditModal'
import { PageHeader } from '@/components/PageHeader'
import { DetailHead, DetailStats } from '@/components/DetailHead'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import { uploadSubtitle } from '@/lib/uploader'
import { useCapabilities, useSeekApply, useEpisodes, useMediaList, usePersons, useSeasons, useSubtitles, useVideoDetail, useVideoMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { confirmDelete } from '@/ui/confirm-delete'
import { VIDEO_TYPE_LABEL } from '@/lib/format'

export interface DetailSearch {
  season: number
  episode: number
}

/** TODB 的岗位字段是英文，界面统一用中文 */
export function VideoDetailView({
  videoId,
  search,
  onSearch,
}: {
  videoId: number
  search: DetailSearch
  onSearch: (patch: Partial<DetailSearch>) => void
}) {
  const detail = useVideoDetail(videoId)
  const seasons = useSeasons(videoId)
  const [season, setSeason] = useState(search.season)
  const [episode, setEpisode] = useState(search.episode)

  useEffect(() => {
    if (seasons.data?.length && !seasons.data.some((s) => s.season_number === season)) {
      const next = seasons.data[0].season_number
      setSeason(next)
      onSearch({ season: next, episode: 1 })
    }
  }, [seasons.data, season, onSearch])

  const episodes = useEpisodes(videoId, season)
  const currentSeason = seasons.data?.find((s) => s.season_number === season)
  const seasonEpisodes = (episodes.data ?? []).filter((e) => (currentSeason ? e.season_id === currentSeason.season_id : true))
  const currentEpisode = seasonEpisodes.find((e) => e.episode_number === episode) ?? seasonEpisodes[0]

  useEffect(() => {
    if (episodes.data?.length && !episodes.data.some((e) => e.episode_number === episode)) {
      const next = episodes.data[0].episode_number
      setEpisode(next)
      onSearch({ episode: next })
    }
  }, [episodes.data, episode, onSearch])

  const caps = useCapabilities()
  const seekApply = useSeekApply()
  // 电影没有季集（真机实测 /season 与 /episode 都返回空数组），资源与字幕挂影片级（vl）；
  // 剧集挂在单集上：未选集时不发请求，否则只带 video_list_id 的请求会返回整部剧的资源
  const isMovie = detail.data?.video_type === 'movie'
  const episodeReady = isMovie || Boolean(currentEpisode)
  const media = useMediaList(
    {
      video_list_id: videoId,
      video_season_id: currentEpisode?.season_id,
      video_episode_id: currentEpisode?.episode_id,
    },
    episodeReady,
  )
  const subtitles = useSubtitles(
    { video_list_id: videoId, video_episode_id: currentEpisode?.episode_id },
    episodeReady,
  )
  const persons = usePersons(videoId)
  const actions = useVideoMutations(videoId)

  const [renaming, setRenaming] = useState<{ mediaId: string; name: string; isSelf: boolean; owner?: string | null } | null>(null)
  const [renamingSub, setRenamingSub] = useState<{ id: string; title: string; isSelf: boolean; owner?: string | null } | null>(null)
  const [moving, setMoving] = useState<{ mediaId: string; name: string } | null>(null)
  const [subProgress, setSubProgress] = useState(0)
  const [subBusy, setSubBusy] = useState(false)

  const video = detail.data

  const pick = (nextSeason: number, nextEpisode: number) => {
    setSeason(nextSeason)
    setEpisode(nextEpisode)
    onSearch({ season: nextSeason, episode: nextEpisode })
  }

  return (
    <>
      <PageHeader
        crumb={['媒体库', video?.video_title ?? `#${videoId}`]}
        title={video?.video_title ?? '影片详情'}
        hint={video?.video_date_air?.slice(0, 4)}
        tools={
          <>
            <Link className="btn btn--ghost" to="/library" search={{ q: '', type: '' }}>
              返回列表
            </Link>
            {video ? (
              <button type="button"
                className="btn btn--ghost"
                disabled={actions.syncVideo.isPending}
                onClick={() => {
                  // 接口要的是 TODB 的 id，不是站内的 video_id
                  if (!video?.todb_id) {
                    toast('这部影片没有 TODB 记录，无法同步', 'error')
                    return
                  }
                  actions.syncVideo.mutate(video.todb_id, { onSuccess: () => toast('已开始同步', 'success') })
                }}
              >
                同步
              </button>
            ) : null}
            {video ? (
              <button type="button"
                className="btn btn--ghost"
                disabled={seekApply.isPending}
                onClick={async () => {
                  // 电影按整部（vl）求，剧集按当前这一集（ve）求
                  const itemType = isMovie ? 'vl' : 've'
                  const itemId = isMovie ? video.video_id : currentEpisode?.episode_id
                  if (!itemId) {
                    toast(isMovie ? '这部影片没有可用的记录' : '还没选中具体某一集', 'error')
                    return
                  }
                  const ok = await confirmDialog({
                    title: '代为发起求片？',
                    message: isMovie ? `为《${video.video_title}》发起求片。` : `为第 ${currentEpisode?.episode_number ?? episode} 集发起求片。`,
                    hint: '会出现在求片列表，其他用户可以认领上传。',
                    confirmText: '发起',
                  })
                  if (!ok) return
                  seekApply.mutate(
                    { item_type: itemType, item_id: Number(itemId) },
                    { onSuccess: () => toast('已发起求片', 'success') },
                  )
                }}
              >
                求片
              </button>
            ) : null}
            {video ? (
            <button type="button"
              className="btn btn--danger-text"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: '删除这部影片？',
                  message: `《${video?.video_title}》会被标记为已删除，从列表里移除。`,
                  hint: '会移入回收站；能否恢复取决于后台策略，已上传的资源与字幕不会立即清除。',
                  confirmText: '删除',
                  danger: true,
                })
                if (ok) actions.removeVideo.mutate(undefined, { onSuccess: () => toast('已删除', 'success') })
              }}
            >
              删除
            </button>
            ) : null}
          </>
        }
      />

      {detail.error ? <ErrorBlock error={detail.error} onRetry={() => detail.refetch()} /> : null}
      {/* 与真实详情头同形：卡片外壳 + 一排胶囊 + 原名 + 四格统计，加载完不跳高度 */}
      {detail.isLoading ? (
        <section className="detail-head" aria-busy="true" aria-live="polite">
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            {[56, 44, 44].map((width, i) => (
              <div key={i} className="skeleton" style={{ height: 24, width, borderRadius: 999 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 14, width: '34%' }} />
          <div style={{ display: 'flex', gap: 'var(--sp-5)' }}>
            {[46, 58, 62, 74].map((width, i) => (
              <div key={i} style={{ display: 'grid', gap: 'var(--sp-1)' }}>
                <div className="skeleton" style={{ height: 19, width }} />
                <div className="skeleton" style={{ height: 12, width: Math.round(width * 0.6) }} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!detail.isLoading && !detail.error && !video ? (
        <EmptyBlock
          title="找不到这部影片"
          hint="它可能已被删除（去回收站看看），或这个 ID 不存在。"
          action={
            <Link className="btn btn--ghost" to="/library" search={{ q: '', type: '' }}>
              回到媒体库
            </Link>
          }
        />
      ) : null}

      {video ? (
        <DetailHead
          chips={
            <>
              <span className="chip">{VIDEO_TYPE_LABEL[video.video_type]}</span>
              {video.genres?.map((genre) => (
                <span key={genre.id} className="chip">
                  {genre.name}
                </span>
              ))}
              {/* seek_is_request 为 false 也可能存在求片（实测 seek_id 有值却 false），按 id/count 判断 */}
              {video.request_count > 0 || video.seek_id ? (
                <span className="chip" style={{ color: 'var(--c-yellow)', borderColor: 'var(--c-yellow)' }}>
                  {video.request_count} 人求片
                </span>
              ) : null}
              {video.is_delete ? (
                <span className="chip" style={{ color: 'var(--c-red)', borderColor: 'var(--c-red)' }}>
                  已删除
                </span>
              ) : null}
            </>
          }
        >
          {video.video_origin_title ? <p className="detail-desc">{video.video_origin_title}</p> : null}
          <DetailStats
            items={[
              { value: <b>{video.todb_id}</b>, label: 'TODB' },
              { value: <b>{video.tmdb_id ?? '—'}</b>, label: 'TMDB' },
              { value: <b>{video.medias_count}</b>, label: '资源' },
              { value: <b>{video.subtitles_count}</b>, label: '字幕' },
            ]}
          />
        </DetailHead>
      ) : null}

      {video ? (
      <div className={isMovie ? 'detail-body detail-body--single' : 'detail-body'}>
        {isMovie ? null : (
        <VideoSeasons
          seasons={seasons.data ?? []}
          seasonsError={seasons.error}
          seasonsLoading={seasons.isLoading}
          onRetrySeasons={() => seasons.refetch()}
          season={season}
          onPickSeason={(next) => pick(next, 1)}
          episodesError={episodes.error}
          episodesLoading={episodes.isLoading}
          onRetryEpisodes={() => episodes.refetch()}
          seasonEpisodes={seasonEpisodes}
          currentEpisode={currentEpisode}
          onPickEpisode={(nextSeason, nextEpisode) => pick(nextSeason, nextEpisode)}
        />
        )}

        <div className="detail-col">
          <VideoMedias
            rows={(media.data ?? []) as unknown as Array<Record<string, unknown>>}
            error={media.error}
            loading={!episodeReady || media.isLoading}
            onRetry={() => media.refetch()}
            canEdit={caps.isAdmin}
            onEdit={(target) => setRenaming(target)}
            isMovie={isMovie}
            episodeTitle={currentEpisode?.episode_title}
          />

          <VideoSubtitles
            rows={(subtitles.data ?? []) as unknown as SubtitleRow[]}
            error={subtitles.error}
            loading={!episodeReady || subtitles.isLoading}
            onRetry={() => subtitles.refetch()}
            canEdit={caps.isAdmin}
            onEdit={(row) => setRenamingSub(row)}
            uploading={subBusy}
            progress={subProgress}
            onUpload={async (file) => {
              // 电影没有季集，字幕挂影片级（vl）；剧集挂当前这一集（ve）
              const target = isMovie
                ? { item_type: 'vl', item_id: videoId }
                : currentEpisode
                  ? { item_type: 've', item_id: currentEpisode.episode_id }
                  : null
              if (!target) {
                toast('还没选中具体某一集', 'error')
                return
              }
              setSubBusy(true)
              setSubProgress(0)
              try {
                await uploadSubtitle(file, target, setSubProgress)
                toast('字幕已上传', 'success')
                void subtitles.refetch()
              } catch (error) {
                toast(error instanceof Error ? error.message : '上传失败', 'error')
              } finally {
                setSubBusy(false)
                setSubProgress(0)
              }
            }}
          />
        </div>
      </div>

      ) : null}

      {video && (persons.data?.items.length ?? 0) > 0 ? <VideoCasts persons={persons.data?.items ?? []} /> : null}

      {renaming ? (
        <MediaEditModal
          media={renaming}
          pending={actions.renameMedia.isPending}
          onClose={() => setRenaming(null)}
          onRename={(next) =>
            actions.renameMedia.mutate(next, {
              onSuccess: () => {
                toast('已重命名', 'success')
                setRenaming(null)
              },
            })
          }
          onSyncMetadata={() =>
            actions.syncMetadata.mutate(renaming.mediaId, { onSuccess: () => toast('已同步元数据', 'success') })
          }
          onMove={(current) => {
            setMoving({ mediaId: current.mediaId, name: current.name })
          }}
          onDelete={async () => {
            const reason = await confirmDelete({
              title: '删除这个资源？',
              message: '删除后播放端立刻不可用，会扣除相应胡萝卜，并移入回收站。',
              isSelf: renaming.isSelf,
              owner: renaming.owner,
            })
            if (reason === null) return
            actions.removeMedia.mutate(
              { mediaId: renaming.mediaId, reason },
              {
                onSuccess: (res) => {
                  toast(`已删除，${res.carrot > 0 ? '+' : ''}${res.carrot} 胡萝卜`, 'success')
                  setRenaming(null)
                },
              },
            )
          }}
        />
      ) : null}

      {moving ? (
        <MediaMoveModal
          media={moving}
          videoId={videoId}
          season={season}
          currentEpisodeId={currentEpisode?.episode_id}
          onClose={() => setMoving(null)}
          onMoved={() => void media.refetch()}
        />
      ) : null}

      {renamingSub ? (
        <SubtitleEditModal
          subtitle={renamingSub}
          onClose={() => setRenamingSub(null)}
          onSave={(next) =>
            actions.renameSubtitle.mutate(next, {
              onSuccess: () => {
                toast('已重命名', 'success')
                setRenamingSub(null)
              },
            })
          }
          onDelete={async () => {
            const reason = await confirmDelete({
              title: '删除这条字幕？',
              message: '观看端将不再显示它，会扣除 1 个胡萝卜，可重新上传。',
              isSelf: renamingSub.isSelf,
              owner: renamingSub.owner,
            })
            if (reason === null) return
            actions.removeSubtitle.mutate(
              { subtitleId: renamingSub.id, reason },
              {
                onSuccess: () => {
                  toast('已删除字幕', 'success')
                  setRenamingSub(null)
                },
              },
            )
          }}
          pending={actions.renameSubtitle.isPending}
        />
      ) : null}
    </>
  )
}
