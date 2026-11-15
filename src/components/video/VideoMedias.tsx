import { CardHead } from '@/components/CardHead'
import { RecordRow } from '@/components/RecordRow'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconDots } from '@/components/icons'
import { formatDateTime, formatSize } from '@/lib/format'
import type { MediaTarget } from './MediaEditModal'

/**
 * 资源卡：表（资源名/大小/上传者/行内菜单）。
 * 空态文案按「电影挂影片级、剧集挂当前集」区分，标题右侧显示当前集标题。
 */
export function VideoMedias({
  rows,
  error,
  loading,
  onRetry,
  canEdit,
  onEdit,
  isMovie,
  episodeTitle,
}: {
  rows: Array<Record<string, unknown>>
  error: unknown
  loading: boolean
  onRetry: () => void
  canEdit: boolean
  onEdit: (target: MediaTarget) => void
  isMovie: boolean
  episodeTitle?: string | null
}) {
  return (
    <article className="card">
      <CardHead title="资源">
        {episodeTitle && !isMovie ? <span className="muted text-xs">{episodeTitle}</span> : null}
      </CardHead>

      {error ? <ErrorBlock bare error={error} onRetry={onRetry} /> : null}
      {/* 剧集还没选中具体某集时请求被 enabled 挡住，此时按加载态占位，避免卡片空着 */}
      {loading ? <LoadingBlock bare rows={3} columns={3} /> : null}

      {!error && !loading && rows.length === 0 ? (
        <EmptyBlock
          bare
          title={isMovie ? '这部影片还没有资源' : '这一集还没有资源'}
          hint="去上传页把文件入库到这里。"
        />
      ) : null}

      {rows.length > 0 ? (
        <RecordRow
          rows={rows}
          idKey={(row) => String(row.media_id ?? '')}
          title={(row) => String(row.media_name ?? '—')}
          facts={(row) => (
            <>
              <span>{formatDateTime(String(row.created_at ?? ''))}</span>
              <span>{formatSize(row.media_file_size == null ? null : Number(row.media_file_size))}</span>
              <span>{String(row.user_pseudonym ?? '—')}</span>
            </>
          )}
          actions={(row) =>
            row.is_self_upload || canEdit ? (
              <button
                type="button"
                className="row-menu"
                aria-label="编辑资源"
                onClick={() =>
                  onEdit({
                    mediaId: String(row.media_id ?? ''),
                    name: String(row.media_name ?? ''),
                    isSelf: Boolean(row.is_self_upload),
                    owner: row.user_pseudonym ? String(row.user_pseudonym) : null,
                  })
                }
              >
                <IconDots />
              </button>
            ) : null
          }
        />
      ) : null}
    </article>
  )
}
