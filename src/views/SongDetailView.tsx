import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { useMusicMutations, useSong, useSongLyrics, useSongMedia } from '@/api/queries'
import { musicApi } from '@/api/endpoints'
import { uploadSong } from '@/lib/uploader'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatSize } from '@/lib/format'
import { Modal } from '@/components/Modal'

export function SongDetailView({ songId }: { songId: number }) {
  const song = useSong(songId)
  const lyrics = useSongLyrics(songId)
  const media = useSongMedia(songId)
  const actions = useMusicMutations(songId)
  const [tab, setTab] = useState<'lyrics' | 'media'>('lyrics')
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lyricForm, setLyricForm] = useState({ type: 'text', language: 'zh-CN', content: '' })

  return (
    <>
      <PageHeader
        crumb={['音乐', song.data?.name ?? `#${songId}`]}
        title={song.data?.name ?? '歌曲详情'}
        hint={
          song.data
            ? `${song.data.duration ? `${Math.floor(song.data.duration / 60)}:${String(Math.round(song.data.duration % 60)).padStart(2, '0')}` : '时长未知'} · #${songId}`
            : `#${songId}`
        }
        tools={
          <>
            <Link className="btn btn--ghost" to="/music" search={{ page: 1, tab: 'songs', q: '', filter: '' }}>
              返回列表
            </Link>
            <button
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
            <select
              className="input"
              style={{ width: 100, height: 30 }}
              value={song.data?.rating ?? ''}
              aria-label="评分"
              onChange={(e) =>
                actions.rating.mutate(
                  { type: 'ms', value: songId, rating: Number(e.target.value) },
                  { onSuccess: () => toast('已评分', 'success') },
                )
              }
            >
              <option value="">未评分</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} 星
                </option>
              ))}
            </select>
            <button
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

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="详情分区">
          <button className="tab" role="tab" aria-selected={tab === 'lyrics'} onClick={() => setTab('lyrics')}>
            歌词
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'media'} onClick={() => setTab('media')}>
            资源
          </button>
        </div>
      </div>

      {tab === 'lyrics' ? (
        <section className="cards cards--wide">
          <article className="card">
            {lyrics.error ? <ErrorBlock bare error={lyrics.error as Error & { status?: number }} onRetry={() => lyrics.refetch()} /> : null}
            {lyrics.isLoading ? <LoadingBlock bare rows={4} columns={2} /> : null}
            {lyrics.data && lyrics.data.length === 0 ? (
              <EmptyBlock
                bare
                title="还没有歌词"
                action={
                  <button className="btn btn--primary" onClick={() => setAdding(true)}>
                    添加歌词
                  </button>
                }
              />
            ) : null}
            {(lyrics.data ?? []).length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn--ghost" onClick={() => setAdding(true)}>
                  添加歌词
                </button>
              </div>
            ) : null}
            {(lyrics.data ?? []).map((row, index) => (
              <div key={String(row.lyric_id ?? index)} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: 'var(--fg-2)' }}>{String(row.type ?? 'text').toUpperCase()}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {String(row.language ?? '—')} · {String(row.name ?? '—')} · {formatDateTime(String(row.created_at ?? ''))}
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 320,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.9,
                    fontSize: 13,
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
            {media.error ? <ErrorBlock bare error={media.error as Error & { status?: number }} onRetry={() => media.refetch()} /> : null}
            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
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
            </div>
            {media.data && media.data.length === 0 ? <EmptyBlock bare title="还没有音频资源" /> : null}
            {(media.data ?? []).length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>文件</th>
                    <th style={{ width: 140 }}>音质</th>
                    <th className="num" style={{ width: 100 }}>大小</th>
                    <th style={{ width: 110 }}>码率</th>
                    <th style={{ width: 110 }}>上传者</th>
                    <th style={{ width: 130 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(media.data ?? []).map((row, index) => (
                    <tr key={String(row.media_id ?? index)}>
                      <td>
                        <span className="cell-title__name">
                          {String(row.name ?? '—')}
                          {row.is_primary ? <span className="badge badge--ok" style={{ marginLeft: 8 }}><i />主资源</span> : null}
                        </span>
                        <span className="cell-title__code">
                          {String(row.media_id ?? '')}
                          {row.file_duration ? ` · ${Math.floor(Number(row.file_duration) / 60)}:${String(Math.round(Number(row.file_duration) % 60)).padStart(2, '0')}` : ''}
                        </span>
                      </td>
                      <td className="muted">
                        {String(row.file_suffix ?? '—')}
                        {row.file_quality === 'lossless' ? ' · 无损' : row.file_quality === 'high' ? ' · 高品质' : ''}
                      </td>
                      <td className="num muted">{formatSize(row.file_size == null ? null : Number(row.file_size))}</td>
                      <td className="num muted">
                        {row.meta_rate_bit ? `${Math.round(Number(row.meta_rate_bit) / 1000)} kbps` : '—'}
                      </td>
                      <td className="muted">{String((row.user as { username?: string } | undefined)?.username ?? '—')}</td>
                      <td>
                        <span className="action-group">
                          <button
                            className="btn btn--quiet"
                            onClick={async () => {
                              try {
                                const res = await musicApi.playUrl(songId, String(row.media_id))
                                await navigator.clipboard?.writeText(res.url)
                                toast('播放地址已复制', 'success')
                              } catch (error) {
                                toast(error instanceof Error ? error.message : '取播放地址失败', 'error')
                              }
                            }}
                          >
                            播放地址
                          </button>
                          <button
                            className="btn btn--danger-text"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: '删除这个资源？',
                                message: '歌曲本身不会被删除，只删这一份音频。',
                                hint: '会扣除相应胡萝卜。',
                                confirmText: '删除',
                                danger: true,
                              })
                              if (!ok) return
                              actions.deleteMedia.mutate(String(row.media_id), {
                                onSuccess: () => toast('已删除', 'success'),
                              })
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

      {adding ? (
        <Modal
          title="添加歌词"
          width={560}
          onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setAdding(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!lyricForm.content.trim() || actions.createLyric.isPending}
                onClick={() =>
                  actions.createLyric.mutate(lyricForm, {
                    onSuccess: (res) => {
                      toast(`已添加歌词${res.carrot ? `，+${res.carrot} 胡萝卜` : ''}`, 'success')
                      setAdding(false)
                      setLyricForm({ type: 'text', language: 'zh-CN', content: '' })
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
    </>
  )
}
