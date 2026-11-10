import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { IconPlus } from '@/components/icons'
import { WatchlistForm } from '@/components/WatchlistForm'
import type { WatchItem } from '@/api/types'
import { useWatch, useWatchMusic, useWatchMusicMutations, useWatchMusicSearch, useWatchMutations, useWatchSearch, useWatchVideos } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative, formatThousand, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

export interface WatchDetailSearch {
  page: number
  page_size: number
  q: string
}

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

  const [term, setTerm] = useState(search.q)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [remarkFor, setRemarkFor] = useState<{ videoId: number; title: string; sort: number; remark: string } | null>(null)
  const [maintainerOpen, setMaintainerOpen] = useState(false)
  const [maintainerIds, setMaintainerIds] = useState('')
  const [dynamicOpen, setDynamicOpen] = useState(false)
  const [dynamicUrl, setDynamicUrl] = useState('')

  const watch = useWatch(id)
  const videos = useWatchVideos(id, { page: search.page, page_size: search.page_size, video_title: search.q || undefined })
  const [addTerm, setAddTerm] = useState('')
  const candidates = useWatchSearch(id, addTerm)
  const { addVideo, removeVideo, updateVideoEntry, subscribe, toggleShow, setDynamic, update, setMaintainers } = useWatchMutations(id)

  // 输入即搜：停手 350ms 后推进 URL。
  // 必须放在 early return 之前 —— 否则音乐片单会在第二帧少执行一个 hook 而崩溃。
  useEffect(() => {
    const next = term.trim()
    if (next === search.q) return
    const timer = setTimeout(() => onSearch({ q: next, page: 1 }), 350)
    return () => clearTimeout(timer)
  }, [term, search.q])

  const item = watch.data?.items[0]

  if (item?.type === 'music') {
    return (
      <WatchMusicList
        watchId={id}
        item={item}
        canEdit={item.is_edit_video}
        search={search}
        onSearch={onSearch}
      />
    )
  }


  const go = (patch: Partial<WatchDetailSearch>) => onSearch(patch)

  const openVideo = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  return (
    <>
      <PageHeader
        crumb={['片单', item?.name ?? '详情']}
        title={item?.name ?? '片单'}
        hint={item ? `${formatThousand(item.video_count)} 部` : undefined}
        tools={
          item ? (
            <>
              <button className={`btn ${item.is_subscribe ? 'btn--ghost' : 'btn--primary'}`} onClick={() => subscribe.mutate(undefined, { onSuccess: () => toast(item.is_subscribe ? '已取消订阅' : '已订阅', 'success') })} disabled={subscribe.isPending}>
                {item.is_subscribe ? '取消订阅' : '订阅'}
              </button>
              {item.is_self ? (
                <>
                  <button className="btn btn--ghost" onClick={() => setEditing(true)}>
                    编辑
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setMaintainerIds((item.maintainers ?? []).map((m) => m.user_id).filter(Boolean).join(' '))
                      setMaintainerOpen(true)
                    }}
                  >
                    维护者
                  </button>
                  <button className="btn btn--ghost" onClick={() => toggleShow.mutate(undefined, { onSuccess: () => toast(item.user_is_show ? '已隐藏' : '已显示', 'success') })} disabled={toggleShow.isPending}>
                    {item.user_is_show ? '隐藏' : '显示'}
                  </button>
                  <button className="btn btn--ghost" onClick={() => { setDynamicUrl(''); setDynamicOpen(true) }}>
                    动态抓取
                  </button>
                </>
              ) : null}
            </>
          ) : null
        }
      />

      {watch.error ? <ErrorBlock error={watch.error as Error & { status?: number }} onRetry={() => watch.refetch()} /> : null}

      {item ? (
        <section className="detail-head">
          <div className="detail-head__row">
            <Poster
              src={item.image_poster_url}
              name={String(item.name ?? '?')}
              className="poster-img detail-head__poster"
            />
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={`badge ${item.is_public ? 'badge--ok' : 'badge--off'}`}>
                  <i />
                  {item.is_public ? '公开' : '私密'}
                </span>
                {(item.tags ?? []).map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
                {item.carrot > 0 ? <span className="chip">订阅需 {item.carrot} 胡萝卜</span> : null}
              </div>
              {item.description ? <p className="detail-desc">{item.description}</p> : null}
              <div className="detail-stats">
                <div className="detail-stat">
                  <b>{formatThousand(item.video_count)}</b>
                  <span>影片</span>
                </div>
                <div className="detail-stat">
                  <b>{formatThousand(item.subscribe_count)}</b>
                  <span>订阅</span>
                </div>
                <div className="detail-stat">
                  <b>{formatRelative(item.updated_at)}</b>
                  <span>更新</span>
                </div>
                <div className="detail-stat">
                  <b>{item.author?.pseudonym || item.author?.username || '—'}</b>
                  <span>作者</span>
                </div>
                {item.maintainers?.length ? (
                  <div className="detail-stat">
                    <b>{item.maintainers.map((m) => m.pseudonym || m.username).filter(Boolean).join('/')}</b>
                    <span>维护者</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="在该片单里搜片名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <span className="spacer" />
        {item?.is_edit_video ? (
          <button className="btn btn--primary" onClick={() => { setAddTerm(''); setAdding(true) }}>
            <IconPlus />
            添加影片
          </button>
        ) : null}
      </div>

      {videos.error ? <ErrorBlock error={videos.error as Error & { status?: number }} onRetry={() => videos.refetch()} /> : null}
      {videos.isLoading ? <LoadingBlock bare rows={6} columns={4} /> : null}

      {!videos.isLoading && videos.data && videos.data.items.length === 0 ? (
        <EmptyBlock title="片单里还没有影片" />
      ) : null}

      {!videos.isLoading && videos.data && videos.data.items.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '44%' }} className="th-thumb">影片</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '12%' }}>排序</th>
                <th style={{ width: item?.is_edit_video ? '18%' : '32%' }}>备注</th>
                {item?.is_edit_video ? <th style={{ width: '14%' }}>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {videos.data.items.map((video) => (
                <tr
                  key={video.video_id}
                  tabIndex={0}
                  role="link"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openVideo(video.video_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openVideo(video.video_id)
                    }
                  }}
                >
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
                      <input
                        className="input tnum"
                        type="number"
                        style={{ width: 72, height: 26, padding: '0 6px', fontSize: 12.5 }}
                        defaultValue={video.sort}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          const next = Number(e.target.value)
                          if (!Number.isFinite(next) || next === video.sort) return
                          updateVideoEntry.mutate(
                            { videoId: video.video_id, sort: next, remark: video.remark ?? null },
                            { onSuccess: () => toast('已调整排序', 'success') },
                          )
                        }}
                      />
                    ) : (
                      video.sort
                    )}
                  </td>
                  <td className="muted">
                    {item?.is_edit_video ? (
                      <button
                        className="btn btn--quiet"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRemarkFor({
                            videoId: video.video_id,
                            title: video.video_title,
                            sort: video.sort,
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
                    <button
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
          {/* 该接口把 page_size 固定成 15，必须用返回的值，否则总页数算少、尾部影片翻不到 */}
          <Pager total={videos.data.total} page={search.page} pageSize={videos.data.page_size} onPage={(page) => go({ page })} />
        </div>
      ) : null}

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
          <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {candidates.isFetching ? <p className="muted">搜索中…</p> : null}
            {(candidates.data ?? []).map((c) => (
              <div key={c.video_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                {c.video_image_poster ? <Poster src={c.video_image_poster} name={String(c.video_title ?? "?")} /> : null}
                <span style={{ display: 'grid' }}>
                  <span style={{ fontSize: 13.5 }}>{c.video_title}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {VIDEO_TYPE_LABEL[c.video_type]} · {c.video_date_air ?? '—'}
                    {c.genres?.length ? ` · ${c.genres.slice(0, 2).map((g) => g.name).join('/')}` : ''}
                  </span>
                </span>
                <button
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
            {addTerm.trim() && !candidates.isFetching && (candidates.data ?? []).length === 0 ? (
              <p className="muted">没有找到「{addTerm}」</p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {dynamicOpen ? (
        <Modal
          title="动态抓取"
          onClose={() => setDynamicOpen(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setDynamicOpen(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  setDynamic.mutate(dynamicUrl.trim() ? dynamicUrl.trim() : null, {
                    onSuccess: () => toast(dynamicUrl.trim() ? '已开启动态抓取' : '已关闭动态抓取', 'success'),
                  })
                  setDynamicOpen(false)
                }}
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>抓取地址（留空关闭）</span>
            <input className="input" value={dynamicUrl} onChange={(e) => setDynamicUrl(e.target.value)} placeholder="https://…" />
          </label>
          <p className="state__hint" style={{ textAlign: 'left' }}>
            填了地址后，片单会按该地址定期同步内容；清空即关闭。
          </p>
        </Modal>
      ) : null}



      {maintainerOpen && item ? (
        <Modal
          title="设置维护者"
          onClose={() => setMaintainerOpen(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setMaintainerOpen(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={setMaintainers.isPending}
                onClick={() =>
                  setMaintainers.mutate(
                    maintainerIds.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean),
                    {
                      onSuccess: () => {
                        toast('已保存', 'success')
                        setMaintainerOpen(false)
                      },
                    },
                  )
                }
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>维护者用户 ID（空格或逗号分隔，留空即清除）</span>
            <textarea
              className="input"
              style={{ minHeight: 80 }}
              value={maintainerIds}
              onChange={(e) => setMaintainerIds(e.target.value)}
              placeholder="e1000Xs e1001Xs"
              autoFocus
            />
          </label>
        </Modal>
      ) : null}

      {remarkFor ? (
        <Modal
          title={`备注 · ${remarkFor.title}`}
          onClose={() => setRemarkFor(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setRemarkFor(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={updateVideoEntry.isPending}
                onClick={() =>
                  updateVideoEntry.mutate(
                    {
                      videoId: remarkFor.videoId,
                      sort: remarkFor.sort,
                      remark: remarkFor.remark.trim() || null,
                    },
                    {
                      onSuccess: () => {
                        toast('已保存', 'success')
                        setRemarkFor(null)
                      },
                    },
                  )
                }
              >
                保存
              </button>
            </>
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


function WatchMusicList({
  watchId,
  item,
  canEdit,
  search,
  onSearch,
}: {
  watchId: number
  item: WatchItem
  canEdit: boolean
  search: WatchDetailSearch
  onSearch: (patch: Partial<WatchDetailSearch>) => void
}) {
  const title = item.name
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])
  useEffect(() => {
    const next = term.trim()
    if (next === search.q) return
    const timer = setTimeout(() => onSearch({ q: next, page: 1 }), 350)
    return () => clearTimeout(timer)
  }, [term, search.q])

  const navigate = useNavigate()
  const songs = useWatchMusic(watchId, { page: search.page, page_size: search.page_size, song_title: search.q || undefined })
  const { addSong, removeSong } = useWatchMusicMutations(watchId)
  const [addingSong, setAddingSong] = useState(false)
  const [songTerm, setSongTerm] = useState('')
  const songCandidates = useWatchMusicSearch(watchId, songTerm)

  return (
    <>
      <PageHeader
        crumb={['片单', title]}
        title={title}
        hint={songs.data ? `${formatThousand(songs.data.total)} 首` : undefined}
        tools={
          <Link className="btn btn--ghost" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'all', type: 'music', q: '' }}>
            返回列表
          </Link>
        }
      />

      <section className="detail-head">
        <div className="detail-head__row">
          <Poster
            src={item.image_poster_url}
            name={String(item.name ?? '?')}
            className="poster-img detail-head__poster"
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`badge ${item.is_public ? 'badge--ok' : 'badge--off'}`}>
                <i />
                {item.is_public ? '公开' : '私密'}
              </span>
              {(item.tags ?? []).map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
              {item.carrot > 0 ? <span className="chip">订阅需 {item.carrot} 胡萝卜</span> : null}
            </div>
            {item.description ? <p className="detail-desc">{item.description}</p> : null}
            <div className="detail-stats">
              <div className="detail-stat">
                <b>{formatThousand(songs.data?.total ?? 0)}</b>
                <span>首</span>
              </div>
              <div className="detail-stat">
                <b>{formatThousand(item.subscribe_count)}</b>
                <span>订阅</span>
              </div>
              <div className="detail-stat">
                <b>{formatRelative(item.updated_at)}</b>
                <span>更新</span>
              </div>
              <div className="detail-stat">
                <b>{item.author?.pseudonym || item.author?.username || '—'}</b>
                <span>作者</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="搜歌名"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        {canEdit ? (
          <>
            <span className="spacer" />
            <button className="btn btn--primary" onClick={() => { setSongTerm(''); setAddingSong(true) }}>
              <IconPlus />
              添加歌曲
            </button>
          </>
        ) : null}
      </div>

      {songs.error ? <ErrorBlock error={songs.error as Error & { status?: number }} onRetry={() => songs.refetch()} /> : null}
      {songs.isLoading ? <LoadingBlock rows={8} columns={3} /> : null}

      {!songs.isLoading && songs.data && songs.data.items.length === 0 ? (
        <EmptyBlock title="这个片单还没有歌" />
      ) : null}

      {songs.data && songs.data.items.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: canEdit ? '52%' : '72%' }}>歌曲</th>
                <th className="num" style={{ width: '14%' }}>时长</th>
                <th style={{ width: '20%' }}>艺人</th>
                {canEdit ? <th style={{ width: '96px' }}>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {songs.data.items.map((song: import('@/api/types').MusicSong) => (
                <tr
                  key={song.song_id}
                  tabIndex={0}
                  role="link"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate({ to: '/music/song/$songId', params: { songId: String(song.song_id) } })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate({ to: '/music/song/$songId', params: { songId: String(song.song_id) } })
                    }
                  }}
                >
                  <td>
                    <span className="cell-title__name">{song.name}</span>
                    {song.description ? (
                      <span className="cell-title__code">{song.description.slice(0, 40)}</span>
                    ) : null}
                  </td>
                  <td className="num muted">
                    {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.round(song.duration % 60)).padStart(2, '0')}` : '—'}
                  </td>
                  <td className="muted" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(song.person_artists ?? []).map((x) => x.name).join("/")}</td>
                  {canEdit ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn--danger-text"
                      disabled={removeSong.isPending && removeSong.variables === song.song_id}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `从片单移除《${song.name}》？`,
                          message: '歌曲本身不会被删除。',
                          confirmText: '移除',
                          danger: true,
                        })
                        if (!ok) return
                        removeSong.mutate(song.song_id, { onSuccess: () => toast('已移除', 'success') })
                      }}
                    >
                      移除
                    </button>
                  </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            total={songs.data.total}
            page={search.page}
            pageSize={search.page_size}
            onPage={(page) => onSearch({ page })}
            onPageSize={(size) => onSearch({ page_size: size, page: 1 })}
          />
        </div>
      ) : null}
      {addingSong ? (
        <Modal title="添加歌曲" onClose={() => setAddingSong(false)} width={460}>
          <label className="field">
            <span>按歌名搜索</span>
            <input className="input" autoFocus value={songTerm} placeholder="输入歌名" onChange={(e) => setSongTerm(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {songCandidates.isFetching ? <p className="muted">搜索中…</p> : null}
            {(songCandidates.data?.items ?? []).map((sg) => (
              <div key={sg.song_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <Poster src={sg.image_poster_url} name={String(sg.name ?? '?')} />
                <span style={{ display: 'grid', minWidth: 0 }}>
                  <span className="ellipsis" style={{ fontSize: 13.5 }}>{sg.name}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>{(sg.person_artists ?? []).map((x) => x.name).join("/")}</span>
                </span>
                <button
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => addSong.mutate(sg.song_id, { onSuccess: () => toast(`已加入「${sg.name}」`, 'success') })}
                  disabled={addSong.isPending}
                >
                  加入
                </button>
              </div>
            ))}
            {songTerm.trim() && !songCandidates.isFetching && (songCandidates.data?.items ?? []).length === 0 ? (
              <p className="muted">没有找到「{songTerm}」</p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
