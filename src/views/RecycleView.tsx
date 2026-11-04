import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Pager } from '@/components/Pager'
import { useDeletedMedia, useDeletedVideos, useRecycleMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative, formatSize, formatThousand, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'

type Tab = 'media' | 'video'

export function RecycleView({ tab, onTab, page, onPage, pageSize, onPageSize }: {
  tab: Tab
  onTab: (tab: Tab) => void
  page: number
  onPage: (page: number) => void
  pageSize: number
  onPageSize: (size: number) => void
}) {
  const media = useDeletedMedia(page, pageSize)
  const videos = useDeletedVideos(page, pageSize)
  const actions = useRecycleMutations()
  const [busy, setBusy] = useState<string | null>(null)

  const active = tab === 'media' ? media : videos
  const total = active.data?.total ?? 0
  const rows = (active.data?.items ?? []) as Array<Record<string, unknown>>

  const restoreMedia = async (mediaId: string, label: string) => {
    const ok = await confirmDialog({
      title: '恢复这个资源？',
      message: `「${label}」会回到原来的影片下，播放端立即可见。`,
      hint: '恢复可能消耗胡萝卜，具体以后端返回为准。',
      confirmText: '恢复',
    })
    if (!ok) return
    setBusy(mediaId)
    try {
      await actions.restoreMedia.mutateAsync(mediaId)
      toast('已恢复', 'success')
    } catch {
      toast('恢复失败，可能没有权限', 'error')
    } finally {
      setBusy(null)
    }
  }

  const restoreVideo = async (videoId: number, label: string) => {
    const ok = await confirmDialog({
      title: '恢复这部影片？',
      message: `《${label}》会重新出现在媒体库里。`,
      confirmText: '恢复',
    })
    if (!ok) return
    setBusy(String(videoId))
    try {
      await actions.restoreVideo.mutateAsync(videoId)
      toast('已恢复', 'success')
    } catch {
      toast('恢复失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        crumb={['回收站', tab === 'media' ? '资源' : '影片']}
        title="回收站"
        hint={active.data ? `${formatThousand(total)} 条` : undefined}
        tools={
          <span className="stamp">
            <i />
            删除后可在这里恢复
          </span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="回收类型">
          <button className="tab" role="tab" aria-selected={tab === 'media'} onClick={() => onTab('media')}>
            资源
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'video'} onClick={() => onTab('video')}>
            影片
          </button>
        </div>
      </div>

      {active.error ? <ErrorBlock error={active.error as Error & { status?: number }} onRetry={() => active.refetch()} /> : null}
      {active.isLoading ? <LoadingBlock rows={8} columns={5} /> : null}

      {!active.isLoading && rows.length === 0 ? (
        <EmptyBlock
          title="回收站是空的"
          hint={tab === 'media' ? '删除的资源会先落在这里。' : '删除的影片会先落在这里。'}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="table-card">
          {tab === 'media' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>资源</th>
                  <th style={{ width: '22%' }}>所属</th>
                  <th className="num" style={{ width: '12%' }}>大小</th>
                  <th style={{ width: '14%' }}>存储</th>
                  <th className="num" style={{ width: '12%' }}>删除时间</th>
                  <th style={{ width: '96px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const mediaId = String(row.media_id ?? '')
                  const name = String(row.media_name ?? mediaId)
                  const canRestore = row.is_can_restore !== false
                  return (
                    <tr key={mediaId}>
                      <td>
                        <span className="cell-title__name">{name}</span>
                        <span className="cell-title__code">{mediaId}</span>
                      </td>
                      <td className="muted">
                        {String(row.video_title ?? '—')}
                        {row.season_number ? ` S${row.season_number}` : ''}
                        {row.episode_number ? `E${row.episode_number}` : ''}
                      </td>
                      <td className="num muted">{formatSize(Number(row.media_file_size ?? 0))}</td>
                      <td className="muted">{String(row.storage_title ?? '—')}</td>
                      <td className="num muted">{formatRelative(String(row.created_at ?? ''))}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canRestore ? (
                          <button
                            className="btn btn--quiet"
                            disabled={busy === mediaId}
                            onClick={() => restoreMedia(mediaId, name)}
                          >
                            {busy === mediaId ? '恢复中…' : '恢复'}
                          </button>
                        ) : (
                          <span className="muted" title="不是自己上传的资源，无法恢复">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '46%' }}>影片</th>
                  <th style={{ width: '14%' }}>类型</th>
                  <th className="num" style={{ width: '14%' }}>toDB</th>
                  <th className="num" style={{ width: '16%' }}>上映</th>
                  <th style={{ width: '96px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const videoId = Number(row.video_id ?? 0)
                  const title = String(row.video_title ?? '—')
                  return (
                    <tr key={videoId}>
                      <td>
                        <div className="cell-title">
                          {row.video_image_poster ? (
                            <img className="poster-img" src={String(row.video_image_poster)} alt="" loading="lazy" />
                          ) : (
                            <span className="thumb">{title.slice(0, 1)}</span>
                          )}
                          <span>
                            <span className="cell-title__name">{title}</span>
                            <span className="cell-title__code">#{videoId}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="zone">
                          <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[String(row.video_type)] }} />
                          {VIDEO_TYPE_LABEL[String(row.video_type)] ?? '—'}
                        </span>
                      </td>
                      <td className="num muted">{String(row.todb_id ?? '—')}</td>
                      <td className="num muted">{String(row.video_date_air ?? '—')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--quiet"
                          disabled={busy === String(videoId)}
                          onClick={() => restoreVideo(videoId, title)}
                        >
                          {busy === String(videoId) ? '恢复中…' : '恢复'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <Pager
            total={total}
            page={page}
            pageSize={pageSize}
            onPage={onPage}
            onPageSize={onPageSize}
          />
        </div>
      ) : null}
    </>
  )
}
