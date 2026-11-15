import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { musicApi } from '@/api/endpoints'
import { PickList } from '@/components/PickList'
import { Tabs } from '@/components/Tabs'
import { CardHead } from '@/components/CardHead'
import { PageHeader } from '@/components/PageHeader'
import { MUSIC_DISABLED, MUSIC_DISABLED_HINT, MUSIC_DISABLED_TITLE } from '@/lib/feature-flags'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { useMusicMutations, useSession, useSong, useSongLyrics, useSongMedia } from '@/api/queries'
import { uploadSong } from '@/lib/uploader'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { confirmDelete } from '@/ui/confirm-delete'
import { formatDateTime, formatSize, duration } from '@/lib/format'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { VideoPicker } from '@/components/VideoPicker'

const SONG_TABS = [
  { key: 'lyrics', label: '歌词' },
  { key: 'media', label: '资源' },
] as const

export function SongDetailView({ songId }: { songId: number }) {
  const song = useSong(songId)
  const lyrics = useSongLyrics(songId)
  const media = useSongMedia(songId)
  const session = useSession()
  const actions = useMusicMutations(songId)
  const [tab, setTab] = useState<'lyrics' | 'media'>('lyrics')
  const [adding, setAdding] = useState(false)
  const [mvOpen, setMvOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lyricForm, setLyricForm] = useState({ type: 'text', language: 'zh-CN', content: '' })

  const removeLyric = async (lyricId: number) => {
    const ok = await confirmDialog({
      title: '删除这份歌词？',
      message: '删除后不可恢复。',
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    actions.deleteLyric.mutate(lyricId, { onSuccess: () => toast('已删除', 'success') })
  }
  // music_song_id 是目标歌曲的 id（契约原话「将资源移动到当前歌曲下」）
  const [moving, setMoving] = useState<{ mediaId: string; name: string } | null>(null)
  const [moveTerm, setMoveTerm] = useState('')
  const moveTargets = useQuery({
    queryKey: ['music', 'move-target', moveTerm],
    queryFn: () => musicApi.songSearch({ name: moveTerm, page_size: 10 }),
    enabled: Boolean(moving) && moveTerm.trim().length > 0,
  })
  /** 挪到当前这首歌下面没有意义，过滤掉 */
  const moveTargetsCandidates = (moveTargets.data?.items ?? []).filter((row) => row.song_id !== songId)

  // 上游停用音乐域：详情、歌词、资源都不再请求
  if (MUSIC_DISABLED) {
    return (
      <>
        <PageHeader crumb={['音乐', `#${songId}`]} title="歌曲详情" />
        <EmptyBlock title={MUSIC_DISABLED_TITLE} hint={MUSIC_DISABLED_HINT} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        crumb={['音乐', song.data?.name ?? `#${songId}`]}
        title={song.data?.name ?? '歌曲详情'}
        hint={
          song.data?.duration ? duration(song.data.duration) : undefined
        }
        tools={
          <>
            <Link className="btn btn--ghost" to="/music" search={{ page_size: 20, tab: 'songs', q: '', filter: '' }}>
              返回列表
            </Link>
            <button type="button" className="btn btn--ghost" onClick={() => setMvOpen(true)}>
              关联 MV
            </button>
            <button type="button"
              className="btn btn--ghost"
              onClick={() =>
                actions.favorite.mutate(
                  { type: 'ms', value: songId },
                  { onSuccess: () => toast('已切换收藏', 'success') },
                )
              }
            >
              收藏
            </button>
            <button type="button"
              className="btn btn--danger-text"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: '删除这首歌曲？',
                  message: '歌曲会从音乐库标记删除。',
                  hint: '已上传的音频资源不会被立即清除。',
                  confirmText: '删除',
                  danger: true,
                })
                if (ok) actions.deleteSong.mutate(undefined, { onSuccess: () => toast('已删除', 'success') })
              }}
            >
              删除
            </button>
          </>
        }
      />

      {song.data ? (
        <section className="detail-head">
          <div className="detail-head__row">
            <div style={{ display: 'grid', gap: 'var(--sp-2)', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                {song.data.is_favorite ? (
                  <span className="badge badge--ok">
                    <i />
                    已收藏
                  </span>
                ) : null}
                {(song.data.person_artists ?? []).length === 0 ? <span className="meta-sm">还没有填写艺人</span> : null}
              </div>
              {song.data.description ? <p className="detail-desc">{song.data.description}</p> : null}
              {song.data.tagline ? <p className="meta-sm">{song.data.tagline}</p> : null}
              <div className="detail-stats">
                <div className="detail-stat">
                  <b>{(song.data.person_artists ?? []).map((x) => x.name).filter(Boolean).join('/') || '—'}</b>
                  <span>艺人</span>
                </div>
                <div className="detail-stat">
                  <b>{media.data?.length ?? song.data.count_medias ?? 0}</b>
                  <span>资源</span>
                </div>
                <div className="detail-stat">
                  <button type="button" className="detail-stat__link" onClick={() => setRatingOpen(true)} title="改评分">
                    {song.data.rating ?? '—'}
                  </button>
                  <span>评分</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="toolbar">
        <Tabs items={SONG_TABS} value={tab} onChange={setTab} label="详情分区" />
      </div>

      {ratingOpen ? (
        <Modal title="评分" width={360} onClose={() => setRatingOpen(false)}>
          <div className="pick-list">
            {[5, 4, 3, 2, 1].map((n) => (
              <button
                type="button"
                key={n}
                className="pick-row"
                onClick={() =>
                  actions.rating.mutate(
                    { type: 'ms', value: songId, rating: n },
                    { onSuccess: () => { toast(`已评 ${n} 星`, 'success'); setRatingOpen(false) } },
                  )
                }
              >
                <span className="pick-row__text">
                  <span className="pick-row__title">{n} 星</span>
                  {song.data?.rating_user === n ? <span className="pick-row__sub">你打的分</span> : null}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="pick-row"
              onClick={() =>
                actions.rating.mutate(
                  { type: 'ms', value: songId, rating: 0 },
                  { onSuccess: () => { toast('已清除评分', 'success'); setRatingOpen(false) } },
                )
              }
            >
              <span className="pick-row__text">
                <span className="pick-row__title">清除评分</span>
              </span>
            </button>
          </div>
        </Modal>
      ) : null}

      {tab === 'lyrics' ? (
        <section className="cards cards--wide">
          <article className="card">
            <CardHead title="歌词">
              {(lyrics.data ?? []).length > 0 ? (
                <button type="button" className="btn btn--quiet" onClick={() => setAdding(true)}>
                  添加歌词
                </button>
              ) : null}
            </CardHead>
            {lyrics.error ? <ErrorBlock bare error={lyrics.error} onRetry={() => lyrics.refetch()} /> : null}
            {lyrics.isLoading ? <LoadingBlock bare rows={4} columns={2} /> : null}
            {lyrics.data && lyrics.data.length === 0 ? (
              <EmptyBlock
                bare
                title="还没有歌词"
                action={
                  <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
                    添加歌词
                  </button>
                }
              />
            ) : null}
            {(lyrics.data ?? []).map((row, index) => (
              <div key={String(row.lyric_id ?? index)} style={{ marginBottom: 'var(--gap-card)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                  <span style={{ color: 'var(--fg-2)' }}>{String(row.type ?? 'text').toUpperCase()}</span>
                  <span className="meta-sm">
                    {String(row.language ?? '—')}
                    {(row.user as { username?: string } | undefined)?.username
                      ? ` · ${String((row.user as { username?: string }).username)}`
                      : ''}
                    {' · '}
                    {formatDateTime(String(row.created_at ?? ''))}
                  </span>
                  <button type="button"
                    className="btn btn--quiet"
                    style={{ marginLeft: 'auto' }}
                    disabled={actions.deleteLyric.isPending}
                    onClick={() => void removeLyric(Number(row.lyric_id))}
                  >
                    删除
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 320,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.9,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--fg-2)',
                    fontFamily: 'inherit',
                  }}
                >
                  {String(row.content ?? '')}
                </pre>
              </div>
            ))}
          </article>
        </section>
      ) : null}

      {tab === 'media' ? (
        <section className="cards cards--wide">
          <article className="card">
            {media.error ? <ErrorBlock bare error={media.error} onRetry={() => media.refetch()} /> : null}
            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            <CardHead title="资源">
              <button type="button" className="btn btn--quiet" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? `上传中 ${Math.round(progress * 100)}%` : '上传音频'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setUploading(true)
                  setProgress(0)
                  try {
                    const res = await uploadSong(file, songId, setProgress)
                    toast(`已上传，+${res.carrot} 胡萝卜`, 'success')
                    media.refetch()
                  } catch (error) {
                    toast(error instanceof Error ? error.message : '上传失败', 'error')
                  } finally {
                    setUploading(false)
                    setProgress(0)
                  }
                }}
              />
            </CardHead>
            {media.data && media.data.length === 0 ? <EmptyBlock bare title="还没有音频资源" /> : null}
            {(media.data ?? []).length > 0 ? (
              <table className="table table--inset">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>文件</th>
                    <th style={{ width: '14%' }}>音质</th>
                    <th className="num" style={{ width: '11%' }}>大小</th>
                    <th className="num" style={{ width: '11%' }}>码率</th>
                    <th style={{ width: '14%' }}>上传者</th>
                    <th style={{ width: '1%' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(media.data ?? []).map((row, index) => (
                    <tr key={String(row.media_id ?? index)}>
                      <td>
                        <span className="cell-title__name">
              {String(row.name ?? '—')}
              {row.is_primary ? <span className="badge badge--ok" style={{ marginLeft: 'var(--sp-2)' }}><i />主资源</span> : null}
                        </span>
                        <span className="cell-title__code">
              {row.file_duration ? duration(Number(row.file_duration)) : String(row.file_suffix ?? '')}
                        </span>
                      </td>
                      <td className="muted">{String(row.file_suffix ?? '—')}</td>
                      <td className="num muted">{formatSize(row.file_size == null ? null : Number(row.file_size))}</td>
                      <td className="num muted">
                        {row.meta_rate_bit ? `${Math.round(Number(row.meta_rate_bit) / 1000)} kbps` : '—'}
                      </td>
                      <td className="muted">{String((row.user as { username?: string } | undefined)?.username ?? '—')}</td>
                      <td>
                        <span className="action-group">
              <button type="button"
              className="btn btn--quiet"
              onClick={() => {
              setMoving({ mediaId: String(row.media_id), name: String(row.name ?? '这份音频') })
              setMoveTerm('')
              }}
              >
              移动
              </button>
              <button type="button"
              className="btn btn--danger-text"
              onClick={async () => {
              // 音频列表没有 is_self_upload，归属看 user
              const ownerUser = row.user as { user_id?: string; username?: string } | undefined
              const reason = await confirmDelete({
              title: '删除这个资源？',
              message: '歌曲本身不会被删除，只删这一份音频，会扣除相应胡萝卜。',
              isSelf: Boolean(ownerUser?.user_id) && ownerUser?.user_id === session.data?.user_id,
              owner: ownerUser?.username ?? null,
              })
              if (reason === null) return
              actions.deleteMedia.mutate(
              { mediaId: String(row.media_id), reason },
              { onSuccess: () => toast('已删除', 'success') },
              )
              }}
              >
              删除
              </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </article>
        </section>
      ) : null}

      {moving ? (
        <Modal
          title={`移动 · ${moving.name}`}
          hint="音频会挪到选中的那首歌下面，本页的资源列表会少一条。"
          width={460}
          onClose={() => setMoving(null)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setMoving(null)}>
              取消
            </button>
          }
        >
          <label className="field">
            <span>目标歌曲</span>
            <input
              className="input"
              autoFocus
              value={moveTerm}
              onChange={(e) => setMoveTerm(e.target.value)}
              placeholder="按歌名搜索"
            />
          </label>
          <PickList
            loading={moveTargets.isFetching}
            query={moveTerm}
            // 计数按过滤后的算：只剩当前这首歌时显示「没有」
            count={moveTargetsCandidates.length}
            emptyText={
              (moveTargets.data?.items ?? []).length > 0 ? '已经在这首歌下面了' : undefined
            }
          >
            {moveTargetsCandidates.map((row) => (
                <div key={row.song_id} className="pick-row">
                  <span className="pick-row__title">{row.name}</span>
                  <span className="muted text-xs">
                    {(row.person_artists ?? []).map((artist) => artist.name).join(' / ')}
                  </span>
                  <button type="button"
                    className="btn btn--ghost"
                    style={{ marginLeft: 'auto' }}
                    onClick={() =>
                      musicApi
                        .moveMedia(row.song_id, moving.mediaId)
                        .then(() => {
              toast('已移动', 'success')
              setMoving(null)
              void media.refetch()
                        })
                        .catch((error) => toast(error instanceof Error ? error.message : '移动失败', 'error'))
                    }
                  >
                    移到这里
                  </button>
              </div>
            ))}
          </PickList>
        </Modal>
      ) : null}

      {adding ? (
        <Modal
          title="添加歌词"
          width={560}
          onClose={() => setAdding(false)}
          footer={
            <ModalFooter
              onCancel={() => setAdding(false)}
              onConfirm={() =>
                                  actions.createLyric.mutate(lyricForm, {
                                    onSuccess: (res) => {
                                      toast(`已添加歌词${res.carrot ? `，+${res.carrot} 胡萝卜` : ''}`, 'success')
                                      setAdding(false)
                                      setLyricForm({ type: 'text', language: 'zh-CN', content: '' })
                                    },
                                  })}
              confirmText="保存"
              pending={actions.createLyric.isPending}
              disabled={!lyricForm.content.trim() || actions.createLyric.isPending}
            />
          }
        >
          <label className="field">
            <span>语言</span>
            <select
              className="input"
              value={lyricForm.language}
              onChange={(e) => setLyricForm({ ...lyricForm, language: e.target.value })}
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </label>
          <label className="field">
            <span>歌词内容</span>
            <textarea
              className="input"
              style={{ minHeight: 220, resize: 'vertical' }}
              value={lyricForm.content}
              placeholder="直接粘贴歌词文本，换行会原样保留"
              onChange={(e) => setLyricForm({ ...lyricForm, content: e.target.value })}
            />
          </label>
        </Modal>
      ) : null}
    
      {mvOpen ? (
        <VideoPicker
          title="关联 MV · 选择影片"
          onClose={() => setMvOpen(false)}
          onPick={async (video) => {
            const ok = await confirmDialog({
              title: `把这首歌唱的 MV 关联到「${video.title}」？`,
              message: '关联后播放页会带上这支 MV。',
              hint: '服务端会按规则结算胡萝卜。',
              confirmText: '关联',
            })
            if (!ok) return
            actions.updateSongVideoId.mutate(video.videoId, {
              onSuccess: () => {
                toast('已关联', 'success')
                setMvOpen(false)
              },
            })
          }}
        />
      ) : null}
</>
  )
}
