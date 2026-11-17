import { CardHead } from '@/components/CardHead'
import { RecordRow } from '@/components/RecordRow'
import { EmptyBlock, ErrorBlock, LoadingRows } from '@/components/StateBlock'
import { IconDots } from '@/components/icons'
import { formatDateTime } from '@/lib/format'

export interface SubtitleRow {
  subtitle_id: string | number
  subtitle_title: string
  subtitle_codec?: string | null
  user_pseudonym?: string | null
  is_self_upload?: boolean
  created_at?: string | null
}

/** 字幕卡：上传按钮 + 列表（字幕/格式/上传者/行内菜单）；上传动作与进度留在页面（落点要按电影/剧集判断）。 */
export function VideoSubtitles({
  rows,
  error,
  loading,
  onRetry,
  canEdit,
  onEdit,
  onUpload,
  uploading,
  progress,
}: {
  rows: SubtitleRow[]
  error: unknown
  loading: boolean
  onRetry: () => void
  canEdit: boolean
  onEdit: (row: { id: string; title: string; isSelf: boolean; owner: string | null }) => void
  onUpload: (file: File) => void
  uploading: boolean
  progress: number
}) {
  return (
    <article className="card">
      <CardHead title="字幕">
        <label className="btn btn--quiet" aria-disabled={uploading}>
          {uploading ? `上传中 ${Math.round(progress * 100)}%` : '上传字幕'}
          <input
            type="file"
            accept=".srt,.ass,.ssa,.vtt,text/plain"
            hidden
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) onUpload(file)
            }}
          />
        </label>
      </CardHead>

      {error ? <ErrorBlock error={error} onRetry={onRetry} /> : null}
      {loading ? <LoadingRows count={2} poster="none" lines={2} actions={canEdit ? 1 : 0} /> : null}
      {!error && !loading && rows.length === 0 ? <EmptyBlock title="还没有字幕" /> : null}

      {rows.length > 0 ? (
        <RecordRow
          rows={rows}
          idKey={(row) => String(row.subtitle_id)}
          title={(row) => String(row.subtitle_title)}
          facts={(row) => (
            <>
              <span>{formatDateTime(String(row.created_at ?? ''))}</span>
              <span>{String(row.subtitle_codec ?? '—')}</span>
              <span>{String(row.user_pseudonym ?? '—')}</span>
            </>
          )}
          actions={(row) =>
            row.is_self_upload || canEdit ? (
              <button
                type="button"
                className="row-menu"
                aria-label="编辑字幕"
                onClick={() =>
                  onEdit({
                    id: String(row.subtitle_id),
                    title: String(row.subtitle_title),
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
