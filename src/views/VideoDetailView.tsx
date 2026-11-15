import { useEffect, useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { VideoCasts } from '@/components/video/VideoCasts'
import { VideoSeasons } from '@/components/video/VideoSeasons'
import { VideoMedias } from '@/components/video/VideoMedias'
import { VideoSubtitles, type SubtitleRow } from '@/components/video/VideoSubtitles'
import { MediaEditModal } from '@/components/video/MediaEditModal'
import { SubtitleEditModal } from '@/components/video/SubtitleEditModal'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { mediaApi } from '@/api/endpoints'
import { uploadSubtitle } from '@/lib/uploader'
import { useCapabilities, useSeekApply, useEpisodes, useMediaList, usePersons, useSeasons, useSubtitles, useVideoDetail, useVideoMutations, useVideoPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { confirmDelete } from '@/ui/confirm-delete'
import { VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

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
  const [moveSeason, setMoveSeason] = useState<number>(season)
  // 移动目标不限于当前影片：先搜到目标影片，再选季/集（电影直接落到影片级）
  const [moveVideo, setMoveVideo] = useState<{ id: number; title: string; type: 'movie' | 'tv' } | null>(null)
  const [moveTerm, setMoveTerm] = useState('')
  const [moveKeyword, setMoveKeyword] = useState('')
  const moveSearchTimer = useRef<number | undefined>(undefined)
  const moveTargetId = moveVideo?.id ?? videoId
  const moveSearch = useVideoPage({ page: 1, page_size: 6, title: moveKeyword || undefined, enabled: Boolean(moveKeyword) })
  const moveSeasons = useSeasons(moveTargetId)
  const moveEpisodes = useEpisodes(moveTargetId, moveSeason)
  // 换目标影片后季号要归位，否则会停在上一个影片的季上
  useEffect(() => setMoveSeason(1), [moveTargetId])

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
            <Link className="btn btn--ghost" to="/library" search={{ page: 1, page_size: 20, q: '', type: '' }}>
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
                  hint: '可在回收站恢复；已上传的资源与字幕不会立即清除。',
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
      {detail.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}

      {!detail.isLoading && !detail.error && !video ? (
        <EmptyBlock
          title="找不到这部影片"
          hint="它可能已被删除（去回收站看看），或这个 ID 不存在。"
          action={
            <Link className="btn btn--ghost" to="/library" search={{ page: 1, page_size: 20, q: '', type: '' }}>
              回到媒体库
            </Link>
          }
        />
      ) : null}

      {video ? (
        <section className="detail-head">
          <div className="detail-head__row">
            {video.video_image_poster ? (
              <Poster src={video.video_image_poster} name={video.video_title} className="poster-img detail-head__poster" />
            ) : null}
            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="zone">
                  <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                  {VIDEO_TYPE_LABEL[video.video_type]}
                </span>
                {video.genres?.map((genre) => (
                  <span key={genre.id} className="chip">
                    {genre.name}
                  </span>
                ))}
                {/* seek_is_request 为 false 也可能存在求片（实测 seek_id 有值却 false），按 id/count 判断 */}
                {video.request_count > 0 || video.seek_id ? (
                  <span className="chip" style={{ color: 'var(--c-yellow)', borderColor: 'rgba(255,197,61,.4)' }}>
                    {video.request_count} 人求片
                  </span>
                ) : null}
                {video.is_delete ? <span className="chip" style={{ color: 'var(--c-red)' }}>已删除</span> : null}
              </div>
              {video.video_origin_title ? <p className="detail-desc">{video.video_origin_title}</p> : null}
              <div className="detail-stats">
                <div className="detail-stat">
                  <b>{video.todb_id}</b>
                  <span>TODB</span>
                </div>
                <div className="detail-stat">
                  <b>{video.tmdb_id ?? '—'}</b>
                  <span>TMDB</span>
                </div>
                <div className="detail-stat">
                  <b>{video.medias_count}</b>
                  <span>资源</span>
                </div>
                <div className="detail-stat">
                  <b>{video.subtitles_count}</b>
                  <span>字幕</span>
                </div>
              </div>
            </div>
          </div>
        </section>
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
            setMoveSeason(season)
            setMoving({ mediaId: current.mediaId, name: current.name })
          }}
          onDelete={async () => {
            const reason = await confirmDelete({
              title: '删除这个资源？',
              message: '删除后播放端立刻不可用，会扣除相应胡萝卜，可到回收站恢复。',
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
        <Modal
          title={`移动资源 · ${moving.name}`}
          width={460}
          onClose={() => {
            setMoving(null)
            setMoveVideo(null)
            setMoveTerm('')
            setMoveKeyword('')
          }}
        >
          <label className="field">
            <span>目标影片</span>
            <input
              className="input"
              type="search"
            aria-label="搜片名，留空则在当前影片里移动"
              placeholder="搜片名，留空则在当前影片里移动"
              value={moveTerm}
              onChange={(e) => {
                const value = e.target.value
                setMoveTerm(value)
                if (!value.trim()) {
                  setMoveVideo(null)
                  setMoveKeyword('')
                  return
                }
                // 每次输入都清掉上一个定时器，否则连打六个字就是六个请求
                window.clearTimeout(moveSearchTimer.current)
                moveSearchTimer.current = window.setTimeout(() => setMoveKeyword(value.trim()), 300)
              }}
            />
          </label>

          {moveVideo ? (
            <p className="card-note" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>目标：{moveVideo.title}</span>
              <button type="button"
                className="btn btn--quiet"
                onClick={() => {
                  setMoveVideo(null)
                  setMoveTerm('')
                  setMoveKeyword('')
                }}
              >
                换一部
              </button>
            </p>
          ) : moveKeyword ? (
            <div className="pick-list">
              {(moveSearch.data?.items ?? []).map((v) => (
                <div key={v.video_id} className="pick-row">
                  <span className="pick-row__title">{v.video_title}</span>
                  <span className="muted text-xs">{v.video_type === 'movie' ? '电影' : '剧集'}</span>
                  <button type="button"
                    className="btn btn--quiet"
                    onClick={() => {
                      setMoveVideo({ id: v.video_id, title: v.video_title, type: v.video_type === 'movie' ? 'movie' : 'tv' })
                      setMoveKeyword('')
                    }}
                  >
                    选它
                  </button>
                </div>
              ))}
              {!moveSearch.isLoading && (moveSearch.data?.items ?? []).length === 0 ? (
                <p className="card-note">没有找到「{moveKeyword}」</p>
              ) : null}
            </div>
          ) : null}

          {/* 电影没有季集，资源直接挂在影片上；剧集要选到集 */}
          {!moveKeyword && moveVideo?.type === 'movie' ? (
            <button type="button"
              className="btn btn--primary"
              style={{ marginTop: 'var(--stack)' }}
              onClick={() =>
                mediaApi
                  .move(moving.mediaId, 'vl', moveVideo.id)
                  .then(() => {
                    toast(`已移到《${moveVideo.title}》`, 'success')
                    setMoving(null)
                    setMoveVideo(null)
                    void media.refetch()
                  })
                  .catch((error) => toast(error instanceof Error ? error.message : '移动失败', 'error'))
              }
            >
              移到这部影片
            </button>
          ) : null}

          {!moveKeyword && (!moveVideo || moveVideo.type !== 'movie') ? (
            <>
              <div className="tabs pick-tabs__scroll" role="tablist" aria-label="选择季">
                {(moveSeasons.data ?? []).map((s) => (
                  <button type="button"
                    key={s.season_id}
                    className="tab pick-tabs__item"
                    role="tab"
                    aria-selected={s.season_number === moveSeason}
                    onClick={() => setMoveSeason(s.season_number)}
                  >
                    {s.season_title || `第 ${s.season_number} 季`}
                  </button>
                ))}
              </div>

              <div className="pick-list">
                {(moveEpisodes.data ?? []).map((ep) => {
                  const samePlace = !moveVideo && ep.episode_id === currentEpisode?.episode_id
                  return (
                    <div key={ep.episode_id} className="pick-row">
                      <span className="tnum muted pick-row__num">{String(ep.episode_number).padStart(2, '0')}</span>
                      <span className="pick-row__title">{ep.episode_title}</span>
                      <button type="button"
                        className="btn btn--quiet"
                        disabled={samePlace}
                        onClick={() =>
              mediaApi
              .move(moving.mediaId, 've', ep.episode_id)
              .then(() => {
              toast('已移动', 'success')
              setMoving(null)
              setMoveVideo(null)
              void media.refetch()
              })
              .catch((error) => toast(error instanceof Error ? error.message : '移动失败', 'error'))
                        }
                      >
                        {samePlace ? '当前位置' : '移到这里'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </Modal>
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
