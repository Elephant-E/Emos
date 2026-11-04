import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconDots, IconLeft } from '@/components/icons'
import { mediaApi } from '@/api/endpoints'
import { useEpisodes, useMediaList, usePersons, useSeasons, useSubtitles, useVideoDetail, useVideoMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatSize, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

export interface DetailSearch {
  season: number
  episode: number
}

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
      setSeason(seasons.data[0].season_number)
    }
  }, [seasons.data, season])

  const episodes = useEpisodes(videoId, season)
  const currentSeason = seasons.data?.find((s) => s.season_number === season)
  const seasonEpisodes = (episodes.data ?? []).filter((e) => (currentSeason ? e.season_id === currentSeason.season_id : true))
  const currentEpisode = seasonEpisodes.find((e) => e.episode_number === episode) ?? seasonEpisodes[0]

  useEffect(() => {
    if (episodes.data?.length && !episodes.data.some((e) => e.episode_number === episode)) {
      setEpisode(episodes.data[0].episode_number)
    }
  }, [seasonEpisodes.length, episode])

  const media = useMediaList({
    video_list_id: videoId,
    video_season_id: currentEpisode?.season_id,
    video_episode_id: currentEpisode?.episode_id,
  })
  const subtitles = useSubtitles({ video_list_id: videoId, video_episode_id: currentEpisode?.episode_id })
  const persons = usePersons(videoId)
  const actions = useVideoMutations(videoId)

  const [renaming, setRenaming] = useState<{ mediaId: string; name: string } | null>(null)
  const [renamingSub, setRenamingSub] = useState<{ id: string; title: string } | null>(null)
  const [moving, setMoving] = useState<{ mediaId: string; name: string } | null>(null)
  const [moveSeason, setMoveSeason] = useState<number>(season)
  const moveEpisodes = useEpisodes(videoId, moveSeason)

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
              <button
                className="btn btn--ghost"
                onClick={() => actions.syncVideo.mutate(undefined, { onSuccess: () => toast('已触发同步', 'success') })}
              >
                同步
              </button>
            ) : null}
            {video ? (
            <button
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

      {detail.error ? <ErrorBlock error={detail.error as Error & { status?: number }} onRetry={() => detail.refetch()} /> : null}
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
              <img className="poster-img" style={{ width: 76, height: 108 }} src={video.video_image_poster} alt="" />
            ) : null}
            <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="zone">
                  <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                  {VIDEO_TYPE_LABEL[video.video_type]}
                </span>
                {video.genres?.map((genre) => (
                  <span key={genre.id} className="chip">
                    {genre.name}
                  </span>
                ))}
                {video.seek_is_request ? (
                  <span className="chip" style={{ color: 'var(--c-yellow)', borderColor: 'rgba(255,197,61,.4)' }}>
                    {video.request_count} 人求片
                  </span>
                ) : null}
                {video.is_delete ? <span className="chip" style={{ color: 'var(--c-red)' }}>已删除</span> : null}
              </div>
              {video.video_origin_title ? <p className="detail-desc">{video.video_origin_title}</p> : null}
              <div className="detail-stats">
                <div className="detail-stat">
                  <b>#{video.video_id}</b>
                  <span>系统 ID</span>
                </div>
                <div className="detail-stat">
                  <b>{video.todb_id}</b>
                  <span>toDB</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)', gap: 18, marginTop: 18 }}>
        <article className="card" style={{ padding: '18px 20px' }}>
          <p className="stat__label">季与集</p>

          {seasons.isLoading ? <div className="skeleton" style={{ height: 120 }} /> : null}
          {seasons.data && seasons.data.length > 0 ? (
            <div className="tabs" style={{ marginBottom: 12, marginTop: 6, overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
              {seasons.data.map((s) => (
                <button
                  key={s.season_id}
                  className="tab"
                  role="tab"
                  aria-selected={s.season_number === season}
                  onClick={() => pick(s.season_number, 1)}
                  style={{ flex: 'none' }}
                >
                  {s.season_title || `第 ${s.season_number} 季`}
                </button>
              ))}
            </div>
          ) : null}

          {episodes.isLoading ? <div className="skeleton" style={{ height: 160 }} /> : null}
          {episodes.data && seasonEpisodes.length === 0 ? <EmptyBlock bare title="这一季还没有集" /> : null}
          {seasonEpisodes.length > 0 ? (
            <ul style={{ display: 'grid', gap: 2 }}>
              {seasonEpisodes.map((ep) => {
                const active = currentEpisode?.episode_id === ep.episode_id
                return (
                  <li key={ep.episode_id}>
                    <button
                      onClick={() => pick(ep.season_number, ep.episode_number)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: 0,
                        textAlign: 'left',
                        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: active ? 'var(--fg)' : 'var(--fg-2)',
                        cursor: 'pointer',
                      }}
                    >
                      <span className="tnum" style={{ width: 26, color: 'var(--fg-4)', flex: 'none' }}>
                        {String(ep.episode_number).padStart(2, '0')}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.episode_title}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          {ep.runtime ? `${ep.runtime} 分` : '—'} · {ep.medias_count} 资源 · {ep.subtitles_count} 字幕
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </article>

        <div style={{ display: 'grid', gap: 18 }}>
          <article className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <p className="stat__label" style={{ margin: 0 }}>
                资源
              </p>
              <span className="muted" style={{ fontSize: 12 }}>
                {currentEpisode?.episode_title ?? ''}
              </span>
            </div>

            {media.error ? <ErrorBlock bare error={media.error as Error & { status?: number }} onRetry={() => media.refetch()} /> : null}
            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {media.data && media.data.length === 0 ? <EmptyBlock bare title="这一集还没有资源" hint="去上传页把文件入库到这里。" /> : null}

            {media.data && media.data.length > 0 ? (
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>资源名</th>
                    <th className="num" style={{ width: 92 }}>大小</th>
                    <th style={{ width: 96 }}>上传者</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {media.data.map((row) => {
                    const mediaId = String(row.media_id ?? '')
                    return (
                      <tr key={mediaId}>
                        <td>
                          <span className="cell-title__name">{String(row.media_name ?? '—')}</span>
                          <span className="cell-title__code">{mediaId}</span>
                        </td>
                        <td className="num muted">{formatSize(Number(row.media_file_size ?? 0))}</td>
                        <td className="muted">{String(row.user_pseudonym ?? '—')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="row-menu"
                            aria-label="操作"
                            onClick={() =>
                              setRenaming({ mediaId, name: String(row.media_name ?? '') })
                            }
                          >
                            <IconDots />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : null}
          </article>

          <article className="card" style={{ padding: '18px 20px' }}>
            <p className="stat__label">字幕</p>
            {subtitles.data && subtitles.data.length === 0 ? <EmptyBlock bare title="还没有字幕" /> : null}
            {subtitles.data && subtitles.data.length > 0 ? (
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>字幕</th>
                    <th style={{ width: 70 }}>格式</th>
                    <th style={{ width: 96 }}>上传者</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {subtitles.data.map((row) => {
                    const id = String(row.subtitle_id)
                    return (
                      <tr key={id}>
                        <td>
                          <span className="cell-title__name">{String(row.subtitle_title)}</span>
                          <span className="cell-title__code">{formatDateTime(String(row.created_at))}</span>
                        </td>
                        <td className="muted">{String(row.subtitle_codec)}</td>
                        <td className="muted">{String(row.user_pseudonym ?? '—')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="row-menu" aria-label="重命名" onClick={() => setRenamingSub({ id, title: String(row.subtitle_title) })}>
                            <IconDots />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : null}
          </article>
        </div>
      </div>

      ) : null}

      {video && persons.data && persons.data.items.length > 0 ? (
        <article className="card" style={{ marginTop: 18, padding: '18px 20px' }}>
          <p className="stat__label">演职员</p>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
            {persons.data.items.slice(0, 8).map((person) => (
              <div key={person.id} style={{ display: 'grid', gap: 6, width: 84 }}>
                {person.image_profile ? (
                  <img src={person.image_profile} alt="" style={{ width: 84, height: 112, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 84, height: 112, borderRadius: 8, background: 'var(--raised)' }} />
                )}
                <span style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>{person.name}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{person.job ?? person.title ?? ''}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {renaming ? (
        <Modal
          title="重命名资源"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setRenaming(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() =>
                  actions.renameMedia.mutate(renaming, {
                    onSuccess: () => {
                      toast('已重命名', 'success')
                      setRenaming(null)
                    },
                  })
                }
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>资源名</span>
            <input className="input" value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} autoFocus />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--ghost"
              onClick={() =>
                actions.playUrl.mutate(renaming.mediaId, {
                  onSuccess: (res) => {
                    navigator.clipboard?.writeText(res.url)
                    toast('播放地址已复制', 'success')
                  },
                })
              }
            >
              <IconLeft size={11} /> 复制播放地址
            </button>
            <button
              className="btn btn--ghost"
              onClick={() =>
                actions.syncMetadata.mutate(renaming.mediaId, { onSuccess: () => toast('已重新同步元数据', 'success') })
              }
            >
              同步元数据
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setMoveSeason(season)
                setMoving({ mediaId: renaming.mediaId, name: renaming.name })
                setRenaming(null)
              }}
            >
              移到其他集
            </button>
            <button
              className="btn btn--danger"
              style={{ marginLeft: 'auto' }}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: '删除这个资源？',
                  message: '删除后播放端立刻不可用。',
                  hint: '会扣除相应胡萝卜，删除后可到回收站恢复。',
                  danger: true,
                  confirmText: '删除',
                })
                if (ok) {
                  actions.removeMedia.mutate(renaming.mediaId, {
                    onSuccess: (res) => {
                      toast(`已删除，${res.carrot > 0 ? '+' : ''}${res.carrot} 胡萝卜`, 'success')
                      setRenaming(null)
                    },
                  })
                }
              }}
            >
              删除
            </button>
          </div>
        </Modal>
      ) : null}

      {moving ? (
        <Modal
          title={`移动资源 · ${moving.name}`}
          hint="传错集会扣两次胡萝卜，用这个把它挪到正确的位置。"
          width={520}
          onClose={() => setMoving(null)}
        >
          <div className="tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {(seasons.data ?? []).map((s) => (
              <button
                key={s.season_id}
                className="tab"
                role="tab"
                aria-selected={s.season_number === moveSeason}
                style={{ flex: 'none' }}
                onClick={() => setMoveSeason(s.season_number)}
              >
                {s.season_title || `第 ${s.season_number} 季`}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
            {(moveEpisodes.data ?? []).map((ep) => (
              <div key={ep.episode_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                <span className="tnum muted" style={{ width: 26 }}>{String(ep.episode_number).padStart(2, '0')}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ep.episode_title}
                </span>
                <button
                  className="btn btn--quiet"
                  disabled={ep.episode_id === currentEpisode?.episode_id}
                  onClick={() =>
                    mediaApi
                      .move(moving.mediaId, 've', ep.episode_id)
                      .then(() => {
                        toast('已移动', 'success')
                        setMoving(null)
                        void media.refetch()
                      })
                      .catch(() => toast('移动失败', 'error'))
                  }
                >
                  {ep.episode_id === currentEpisode?.episode_id ? '当前位置' : '移到这里'}
                </button>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {renamingSub ? (
        <Modal
          title="重命名字幕"
          onClose={() => setRenamingSub(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setRenamingSub(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() =>
                  actions.renameSubtitle.mutate(renamingSub, {
                    onSuccess: () => {
                      toast('已重命名', 'success')
                      setRenamingSub(null)
                    },
                  })
                }
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>字幕标题</span>
            <input className="input" value={renamingSub.title} onChange={(e) => setRenamingSub({ ...renamingSub, title: e.target.value })} autoFocus />
          </label>
          <button
            className="btn btn--ghost"
            onClick={async () => {
              const ok = await confirmDialog({
                title: '删除这条字幕？',
                message: '观看端将不再显示这条字幕。',
                hint: '会扣除 1 个胡萝卜，可重新上传。',
                danger: true,
                confirmText: '删除',
              })
              if (!ok) return
              actions.removeSubtitle.mutate(renamingSub.id, {
                onSuccess: () => {
                  toast('已删除字幕', 'success')
                  setRenamingSub(null)
                },
              })
            }}
          >
            删除字幕
          </button>
        </Modal>
      ) : null}
    </>
  )
}
