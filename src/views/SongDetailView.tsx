import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { useMusicMutations, useSong, useSongLyrics, useSongMedia } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatSize } from '@/lib/format'

export function SongDetailView({ songId }: { songId: number }) {
  const song = useSong(songId)
  const lyrics = useSongLyrics(songId)
  const media = useSongMedia(songId)
  const actions = useMusicMutations(songId)
  const [tab, setTab] = useState<'lyrics' | 'media'>('lyrics')

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
            <Link className="btn btn--ghost" to="/music" search={{ page: 1, tab: 'songs', q: '' }}>
              返回列表
            </Link>
            <button
              className="btn btn--ghost"
              onClick={() =>
                actions.favorite.mutate(
                  { type: 'mp', value: songId },
                  { onSuccess: () => toast('已切换收藏', 'success'), onError: () => toast('操作失败', 'error') },
                )
              }
            >
              收藏
            </button>
            <button
              className="btn btn--ghost"
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
            {lyrics.data && lyrics.data.length === 0 ? <EmptyBlock bare title="还没有歌词" hint="可在上传页或客户端提交歌词。" /> : null}
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
            {media.data && media.data.length === 0 ? <EmptyBlock bare title="还没有音频资源" /> : null}
            {(media.data ?? []).length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>文件</th>
                    <th style={{ width: 90 }}>格式</th>
                    <th className="num" style={{ width: 110 }}>大小</th>
                    <th style={{ width: 120 }}>码率</th>
                    <th style={{ width: 120 }}>上传者</th>
                  </tr>
                </thead>
                <tbody>
                  {(media.data ?? []).map((row, index) => (
                    <tr key={String(row.media_id ?? index)}>
                      <td>
                        <span className="cell-title__name">{String(row.name ?? '—')}</span>
                        <span className="cell-title__code">{String(row.media_id ?? '')}</span>
                      </td>
                      <td className="muted">{String(row.file_suffix ?? '—')}</td>
                      <td className="num muted">{formatSize(row.file_size == null ? null : Number(row.file_size))}</td>
                      <td className="num muted">
                        {row.meta_rate_bit ? `${Math.round(Number(row.meta_rate_bit) / 1000)} kbps` : '—'}
                      </td>
                      <td className="muted">{String((row.user as { username?: string } | undefined)?.username ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </article>
        </section>
      ) : null}
    </>
  )
}
