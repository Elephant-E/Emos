import { CardHead } from '@/components/CardHead'
import { RecordList } from '@/components/RecordList'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
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

/**
 * 字幕卡：上传按钮 + 表（字幕/格式/上传者/行内菜单）。
 * 上传的动作与进度留在页面上（要按「电影挂影片级、剧集挂当前集」判断落点），
 * 这里只负责呈现。
 */
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

      {error ? <ErrorBlock bare error={error} onRetry={onRetry} /> : null}
      {loading ? <LoadingBlock bare rows={2} columns={3} /> : null}
      {!error && !loading && rows.length === 0 ? <EmptyBlock bare title="还没有字幕" /> : null}

      {rows.length > 0 ? (
        <RecordList
          rows={rows}
          idKey={(row) => String(row.subtitle_id)}
          className="table table--inset"
          columns={[
            {
              key: 'title',
              label: '字幕',
              mobile: 'primary',
              render: (row) => (
                <span className="cell-title">
                  <span>
                    <span className="cell-title__name">{String(row.subtitle_title)}</span>
                    <span className="cell-title__code">{formatDateTime(String(row.created_at ?? ''))}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'codec',
              label: '格式',
              mobileLabel: null,
              thWidth: 70,
              mobile: 'inline',
              render: (row) => <span className="muted">{String(row.subtitle_codec ?? '—')}</span>,
            },
            {
              key: 'owner',
              label: '上传者',
              mobileLabel: null,
              thWidth: 96,
              mobile: 'inline',
              render: (row) => <span className="muted">{String(row.user_pseudonym ?? '—')}</span>,
            },
            {
              key: 'actions',
              label: '',
              thWidth: 48,
              mobile: 'block',
              mobileAlign: 'end',
              render: (row) =>
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
                ) : null,
            },
          ]}
        />
      ) : null}
    </article>
  )
}
