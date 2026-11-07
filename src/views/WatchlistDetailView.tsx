import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { IconLeft, IconPlus, IconRight } from '@/components/icons'
import { useWatch, useWatchMusic, useWatchMusicMutations, useWatchMutations, useWatchSearch, useWatchVideos } from '@/api/queries'
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

  const [term, setTerm] = useState('')
  const [adding, setAdding] = useState(false)
  const [dynamicOpen, setDynamicOpen] = useState(false)
  const [dynamicUrl, setDynamicUrl] = useState('')

  const watch = useWatch(id)
  const videos = useWatchVideos(id, { page: search.page, page_size: search.page_size, video_title: search.q || undefined })
  const candidates = useWatchSearch(id, term)
  const { addVideo, removeVideo, subscribe, toggleShow, setDynamic } = useWatchMutations(id)

  const item = watch.data?.items[0]

  if (item?.type === 'music') {
    return <WatchMusicList watchId={id} title={item.name} search={search} onSearch={onSearch} />
  }

  const totalPages = videos.data ? Math.max(1, Math.ceil(videos.data.total / videos.data.page_size)) : 1

  const go = (patch: Partial<WatchDetailSearch>) => onSearch(patch)

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
            {item.image_poster_url ? <img className="poster-img" style={{ width: 56, height: 76 }} src={item.image_poster_url} alt="" /> : null}
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={`badge ${item.is_public ? 'badge--ok' : 'badge--off'}`}>
                  <i />
                  {item.is_public ? '公开' : '私密'}
                </span>
                {item.tags.map((tag) => (
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
                  <b>{item.author?.username ?? '—'}</b>
                  <span>作者</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {item && !item.is_edit_video ? (
        <p className="card-note" style={{ marginTop: 12 }}>
          你不是这个片单的维护者，只能查看和搜索，不能增删影片。
        </p>
      ) : null}

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="在该片单里搜片名"
          defaultValue={search.q}
          onKeyDown={(e) => e.key === 'Enter' && go({ q: (e.target as HTMLInputElement).value.trim(), page: 1 })}
        />
        <span className="spacer" />
        {item?.is_edit_video ? (
          <button className="btn btn--primary" onClick={() => setAdding(true)}>
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
                <th style={{ width: '44%' }}>影片</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '12%' }}>排序</th>
                <th style={{ width: '18%' }}>备注</th>
                <th style={{ width: '14%', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {videos.data.items.map((video) => (
                <tr key={video.video_id}>
                  <td>
                    <div className="cell-title">
                      {video.video_image_poster ? (
                        <img className="poster-img" src={video.video_image_poster} alt="" loading="lazy" />
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
                  <td className="num">{video.sort}</td>
                  <td className="muted">{video.remark ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {item?.is_edit_video ? (
                      <button
                        className="btn btn--quiet"
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
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              共 {formatThousand(videos.data.total)} 部 · 第 {search.page} / {totalPages} 页
            </span>
            <div className="pager">
              <button disabled={search.page <= 1} onClick={() => go({ page: search.page - 1 })} aria-label="上一页">
                <IconLeft />
              </button>
              <button aria-current="page">{search.page}</button>
              <button disabled={search.page >= totalPages} onClick={() => go({ page: search.page + 1 })} aria-label="下一页">
                <IconRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adding ? (
        <Modal title="添加影片" onClose={() => setAdding(false)} width={520}>
          <label className="field">
            <span>按片名搜索</span>
            <input
              className="input"
              autoFocus
              value={term}
              placeholder="输入片名，回车搜索"
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>
          <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {candidates.isFetching ? <p className="muted">搜索中…</p> : null}
            {(candidates.data ?? []).map((c) => (
              <div key={c.video_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                {c.video_image_poster ? <img className="poster-img" src={c.video_image_poster} alt="" /> : null}
                <span style={{ display: 'grid' }}>
                  <span style={{ fontSize: 13.5 }}>{c.video_title}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {VIDEO_TYPE_LABEL[c.video_type]} · {c.video_date_air ?? '—'}
                  </span>
                </span>
                <button
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() =>
                    addVideo.mutate(c.video_id, {
                      onSuccess: () => toast(`已加入《${c.video_title}》`, 'success'),
                    })
                  }
                  disabled={addVideo.isPending}
                >
                  加入
                </button>
              </div>
            ))}
            {term.trim() && !candidates.isFetching && (candidates.data ?? []).length === 0 ? (
              <p className="muted">没有找到「{term}」</p>
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
    </>
  )
}


function WatchMusicList({
  watchId,
  title,
  search,
  onSearch,
}: {
  watchId: number
  title: string
  search: WatchDetailSearch
  onSearch: (patch: Partial<WatchDetailSearch>) => void
}) {
  const songs = useWatchMusic(watchId, { page: search.page, page_size: search.page_size, song_title: search.q || undefined })
  const { removeSong } = useWatchMusicMutations(watchId)
  const totalPages = songs.data ? Math.max(1, Math.ceil(songs.data.total / songs.data.page_size)) : 1

  return (
    <>
      <PageHeader
        crumb={['片单', title]}
        title={title}
        hint={songs.data ? `${formatThousand(songs.data.total)} 首` : undefined}
        tools={
          <Link className="btn btn--ghost" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'all', type: 'music' }}>
            返回列表
          </Link>
        }
      />

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="搜歌名"
          defaultValue={search.q}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            onSearch({ q: (event.target as HTMLInputElement).value.trim(), page: 1 })
          }}
        />
      </div>

      {songs.error ? <ErrorBlock error={songs.error as Error & { status?: number }} onRetry={() => songs.refetch()} /> : null}
      {songs.isLoading ? <LoadingBlock rows={8} columns={3} /> : null}

      {!songs.isLoading && songs.data && songs.data.items.length === 0 ? (
        <EmptyBlock title="这个片单还没有歌" hint="在音乐页把喜欢的歌加进来。" />
      ) : null}

      {songs.data && songs.data.items.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '52%' }}>歌曲</th>
                <th className="num" style={{ width: '14%' }}>时长</th>
                <th className="num" style={{ width: '14%' }}>收藏</th>
                <th style={{ width: '96px' }} className="cell-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {songs.data.items.map((song: import('@/api/types').MusicSong) => (
                <tr key={song.song_id}>
                  <td>
                    <Link to="/music/song/$songId" params={{ songId: String(song.song_id) }} className="cell-title__name" style={{ color: 'var(--fg)' }}>
                      {song.name}
                    </Link>
                    <span className="cell-title__code">
                      #{song.song_id}
                      {song.description ? ` · ${song.description.slice(0, 40)}` : ''}
                    </span>
                  </td>
                  <td className="num muted">
                    {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.round(song.duration % 60)).padStart(2, '0')}` : '—'}
                  </td>
                  <td className="num muted">{song.count_medias ?? 0}</td>
                  <td className="cell-right">
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
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot">
            <span className="muted">
              共 {formatThousand(songs.data.total)} 首 · 第 {search.page} / {totalPages} 页
            </span>
            <Pager
              total={songs.data.total}
              page={search.page}
              pageSize={search.page_size}
              onPage={(page) => onSearch({ page })}
              onPageSize={(size) => onSearch({ page_size: size, page: 1 })}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
