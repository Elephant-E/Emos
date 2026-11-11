import { useEffect, useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { CardHead } from '@/components/CardHead'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconDots } from '@/components/icons'
import { mediaApi } from '@/api/endpoints'
import { uploadSubtitle } from '@/lib/uploader'
import { useCapabilities, useSeekApply, useEpisodes, useMediaList, usePersons, useSeasons, useSubtitles, useVideoDetail, useVideoMutations, useVideoPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { confirmDelete } from '@/ui/confirm-delete'
import { formatDateTime, formatSize, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

export interface DetailSearch {
  season: number
  episode: number
}

/** TODB 的岗位字段是英文，界面统一用中文 */
const JOB_LABEL: Record<string, string> = {
  Director: '导演',
  Actor: '演员',
  Actress: '演员',
  Writer: '编剧',
  Screenplay: '编剧',
  Producer: '制片',
  'Executive Producer': '出品人',
  Composer: '配乐',
  'Director of Photography': '摄影',
  Editor: '剪辑',
  Casting: '选角',
  'Production Design': '美术',
  Costume: '服装',
  Sound: '音效',
  'Visual Effects': '视效',
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
  const subInputRef = useRef<HTMLInputElement>(null)
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
              <button
                className="btn btn--ghost"
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
              <button
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
                    message: isMovie ? `为《${video.video_title}》发起求片。` : `为第 ${episode} 集发起求片。`,
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
                {video.seek_is_request && video.request_count > 0 ? (
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
        <article className="card card--tight">
          <CardHead title="季与集">
            <span className="muted tnum-sm">
              共 {seasons.data?.length ?? 0} 季 · 本季 {seasonEpisodes.length} 集
            </span>
          </CardHead>

          {seasons.error ? <ErrorBlock bare error={seasons.error} onRetry={() => seasons.refetch()} /> : null}
          {seasons.isLoading ? <div className="skeleton" style={{ height: 34, marginTop: 12 }} /> : null}
          {seasons.data && seasons.data.length > 0 ? (
            <select
              className="input"
              style={{ marginTop: 12 }}
              value={season}
              aria-label="选择季"
              onChange={(event) => pick(Number(event.target.value), 1)}
            >
              {seasons.data.map((s) => (
                <option key={s.season_id} value={s.season_number}>
                  {s.season_title || `第 ${s.season_number} 季`}
                  {s.episodes_count ? `（${s.episodes_count} 集）` : ''}
                </option>
              ))}
            </select>
          ) : null}

          {episodes.error ? <ErrorBlock bare error={episodes.error} onRetry={() => episodes.refetch()} /> : null}
          {episodes.isLoading ? <div className="skeleton" style={{ height: 160, marginTop: 12 }} /> : null}
          {!episodes.error && episodes.data && seasonEpisodes.length === 0 ? <EmptyBlock bare title="这一季还没有集" /> : null}

          {seasonEpisodes.length > 0 ? (
            <>
              <div className="ep-grid" role="listbox" aria-label="选择集">
                {seasonEpisodes.map((ep) => {
                  const active = currentEpisode?.episode_id === ep.episode_id
                  return (
                    <button
                      key={ep.episode_id}
                      role="option"
                      aria-selected={active}
                      className={`ep-chip${active ? ' is-active' : ''}`}
                      title={ep.episode_title || `第 ${ep.episode_number} 集`}
                      onClick={() => pick(ep.season_number, ep.episode_number)}
                    >
                      {String(ep.episode_number).padStart(2, '0')}
                      {ep.seek ? <span className="ep-chip__dot ep-chip__dot--seek" aria-hidden="true" /> : null}
                      {ep.medias_count > 0 ? <span className="ep-chip__dot" aria-hidden="true" /> : null}
                    </button>
                  )
                })}
              </div>

              {currentEpisode ? (
                <div className="ep-current">
                  <span className="ep-current__title">
                    {currentEpisode.episode_title || `第 ${currentEpisode.episode_number} 集`}
                  </span>
                  <span className="meta-sm">
                    {currentEpisode.date_air ? `${currentEpisode.date_air.slice(0, 10)} · ` : ''}
                    {currentEpisode.runtime ? `${currentEpisode.runtime} 分钟` : '—'} ·{' '}
                    {currentEpisode.medias_count} 资源 · {currentEpisode.subtitles_count} 字幕
                    {currentEpisode.seek ? ` · 求片中 ${currentEpisode.seek.seek_carrot ?? 0} 胡萝卜` : ''}
                  </span>
                  {currentEpisode.episode_description ? (
                    <span className="ep-current__desc">{currentEpisode.episode_description}</span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </article>
        )}

        <div className="detail-col">
          <article className="card card--tight">
            <CardHead title="资源">
              {currentEpisode && !isMovie ? (
                <span className="muted text-xs">
                  {currentEpisode.episode_title}
                </span>
              ) : null}
            </CardHead>

            {media.error ? <ErrorBlock bare error={media.error} onRetry={() => media.refetch()} /> : null}
            {/* 剧集还没选中具体某集时请求被 enabled 挡住，此时按加载态占位，避免卡片空着 */}
            {!episodeReady ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {media.data && media.data.length === 0 ? <EmptyBlock bare title={isMovie ? '这部影片还没有资源' : '这一集还没有资源'} hint="去上传页把文件入库到这里。" /> : null}

            {media.data && media.data.length > 0 ? (
              <table className="table table--inset">
                <thead>
                  <tr>
                    <th>资源名</th>
                    <th className="num" style={{ width: 92 }}>大小</th>
                    <th style={{ width: 96 }}>上传者</th>
                    <th style={{ width: 48 }} />
                  </tr>
                </thead>
                <tbody>
                  {media.data.map((row) => {
                    const mediaId = String(row.media_id ?? '')
                    return (
                      <tr key={mediaId}>
                        <td>
                          <span className="cell-title__name">{String(row.media_name ?? '—')}</span>
                        </td>
                        <td className="num muted">{formatSize(row.media_file_size == null ? null : Number(row.media_file_size))}</td>
                        <td className="muted">{String(row.user_pseudonym ?? '—')}</td>
                        <td>
                          {row.is_self_upload || caps.isAdmin ? (
                            <button
                              className="row-menu"
                              aria-label="操作"
                              onClick={() => setRenaming({ mediaId, name: String(row.media_name ?? ''), isSelf: Boolean(row.is_self_upload), owner: row.user_pseudonym ? String(row.user_pseudonym) : null })}
                            >
                              <IconDots />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : null}
          </article>

          <article className="card card--tight">
            <CardHead title="字幕">
              <button className="btn btn--quiet" disabled={subBusy} onClick={() => subInputRef.current?.click()}>
                {subBusy ? `上传中 ${Math.round(subProgress * 100)}%` : '上传字幕'}
              </button>
              <input
                ref={subInputRef}
                type="file"
                accept=".srt,.ass,.ssa,.vtt,text/plain"
                hidden
                disabled={subBusy}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  // 电影没有季集，字幕挂影片级（vl）；剧集挂当前这一集（ve）
                  const target = isMovie
                    ? { item_type: 'vl', item_id: videoId }
                    : currentEpisode
                      ? { item_type: 've', item_id: currentEpisode.episode_id }
                      : null
                  if (!file) return
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
            </CardHead>
            {subtitles.error ? <ErrorBlock bare error={subtitles.error} onRetry={() => subtitles.refetch()} /> : null}
            {!episodeReady ? <LoadingBlock bare rows={2} columns={3} /> : null}
            {!subtitles.error && subtitles.data && subtitles.data.length === 0 ? <EmptyBlock bare title="还没有字幕" /> : null}
            {subtitles.data && subtitles.data.length > 0 ? (
              <table className="table table--inset">
                <thead>
                  <tr>
                    <th>字幕</th>
                    <th style={{ width: 70 }}>格式</th>
                    <th style={{ width: 96 }}>上传者</th>
                    <th style={{ width: 48 }} />
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
                        <td>
                          {row.is_self_upload || caps.isAdmin ? (
                            <button className="row-menu" aria-label="重命名" onClick={() => setRenamingSub({ id, title: String(row.subtitle_title), isSelf: Boolean(row.is_self_upload), owner: row.user_pseudonym ? String(row.user_pseudonym) : null })}>
                              <IconDots />
                            </button>
                          ) : null}
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
        <article className="card card--tight" style={{ marginTop: 18 }}>
          <p className="stat__label">演职员</p>
          <div className="person-grid">
            {persons.data.items.slice(0, 8).map((person) => (
              <div key={person.person_id_tmdb ?? person.name} className="person-card">
                <span className={`person-card__photo${person.image_profile ? '' : ' is-empty'}`}>
                  {person.image_profile ? (
                    <img
                      src={`https://image.theotherdb.org/original/${person.image_profile}`}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        // 地址是拼出来的，缺图时把槽切到「首字」状态，而不是隐藏 img 后留个洞
                        e.currentTarget.parentElement?.classList.add('is-empty')
                      }}
                    />
                  ) : null}
                  <span className="person-card__initial" aria-hidden>
                    {person.name.slice(0, 1)}
                  </span>
                </span>
                <span className="person-card__name">{person.name}</span>
                <span className="person-card__role">
                  {JOB_LABEL[person.job ?? ''] ?? person.job ?? (person.title ? `饰 ${person.title}` : '')}
                </span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {renaming ? (
        <Modal
          title="编辑资源"
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
          <div className="pick-tabs">
            <button
              className="btn btn--ghost"
              onClick={() =>
                actions.syncMetadata.mutate(renaming.mediaId, { onSuccess: () => toast('已同步元数据', 'success') })
              }
            >
              同步元数据
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setMoveSeason(season)
                setMoving({ mediaId: renaming.mediaId, name: renaming.name })
                // 不关「编辑资源」：移动弹窗关掉后要能回到它
              }}
            >
              移到其他位置
            </button>
            <button
              className="btn btn--danger"
              style={{ marginLeft: 'auto' }}
              onClick={async () => {
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
            >
              删除
            </button>
          </div>
        </Modal>
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
              <button
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
                  <button
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
            <button
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
                  <button
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
                      <button
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
        <Modal
          title="编辑字幕"
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
              const reason = await confirmDelete({
                title: '删除这条字幕？',
                message: '观看端将不再显示它，会扣除 1 个胡萝卜，可重新上传。',
                isSelf: renamingSub.isSelf,
                owner: renamingSub.owner,
              })
              if (reason === null) return
              actions.removeSubtitle.mutate({ subtitleId: renamingSub.id, reason }, {
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
