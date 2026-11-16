import { useState } from 'react'
import { mediaApi, videoApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton } from '@/components/StateBlock'
import { RecordRow } from '@/components/RecordRow'
import { useRecycleMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useSearchTerm } from '@/lib/useSearchTerm'
import { formatRelative, formatSize, formatThousand, VIDEO_TYPE_LABEL } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

type Tab = 'media' | 'video'

export interface RecycleSearch {
  tab: 'media' | 'video'
  page_size: number
  q: string
  by: 'media_id' | 'user_id'
}

const RECYCLE_TABS = [
  { key: 'media', label: '资源' },
  { key: 'video', label: '影片' },
] as const

export function RecycleView({ tab, onTab, pageSize, q, by, onQuery }: {
  tab: Tab
  onTab: (tab: Tab) => void
  pageSize: number
  q: string
  by: 'media_id' | 'user_id'
  onQuery: (q: string, by: 'media_id' | 'user_id') => void
}) {
  // 只查当前 tab；两端都滚动加载
  const infinite = usePagedInfinite<Record<string, unknown>>(
    (next) =>
      tab === 'media'
        ? mediaApi
            .listAll({ only_delete: true, page: next, page_size: pageSize, ...(q ? { [by]: q } : {}) } as never)
            .then((res) => {
              const r = res as unknown as { items?: Array<Record<string, unknown>>; total?: number; page_size?: number }
              return { items: r.items ?? [], total: r.total ?? 0, page_size: r.page_size ?? pageSize }
            })
        : videoApi
            .list({ only_delete: true, page: next, page_size: pageSize, ...(q ? { title: q } : {}) })
            .then((r) => ({ items: r.items as unknown as Array<Record<string, unknown>>, total: r.total, page_size: r.page_size })),
    { resetKey: `${tab}|${q}|${by}|${pageSize}` },
  )
  const actions = useRecycleMutations()
  const [busy, setBusy] = useState<string | null>(null)
  // 输入即搜：停手 350ms 后发起查询，不需要回车确认
  const [term, setTerm] = useSearchTerm(q, (next) => onQuery(next, by))

  const rows = infinite.items as Array<Record<string, unknown>>
  // 恢复口径按契约：只有 is_can_restore 为 true 的资源可恢复。
  // 实测现在全为 false（含本人上传），所以这一列当前不显示——
  // 与其给一排点了必然 422 的按钮，不如不显示，等上游放开后自然出现。
  const canRestoreRow = (row: Record<string, unknown>) => row.is_can_restore === true
  const restorable = rows.some(canRestoreRow)

  const restoreMedia = async (mediaId: string, label: string) => {
    const ok = await confirmDialog({
      title: '恢复这个资源？',
      message: `「${label}」会回到原来的影片下，播放端立即可见。`,
      hint: '恢复会扣除胡萝卜，金额见恢复后的提示。',
      confirmText: '恢复',
      danger: true,
    })
    if (!ok) return
    setBusy(mediaId)
    try {
      // 接口返回本次额度变化（恢复为负值）
      const res = await actions.restoreMedia.mutateAsync(mediaId)
      const spent = -(Number((res as { carrot?: number } | null)?.carrot) || 0)
      toast(spent > 0 ? `已恢复，扣除 ${formatThousand(spent)} 胡萝卜` : '已恢复', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败', 'error')
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
      // 该接口是 toggle：只有返回 is_delete 为 false 才算真的恢复
      const res = await actions.restoreVideo.mutateAsync(videoId)
      if (res?.is_delete) toast('这部影片仍是删除状态，请重试', 'error')
      else toast('已恢复', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        crumb={['回收站', tab === 'media' ? '资源' : '影片']}
        title="回收站"
      />

      <div className="toolbar">
        <Tabs items={RECYCLE_TABS} value={tab} onChange={onTab} label="回收类型" />
        <span className="spacer" />

        {tab === 'media' ? (
          <select
            className="input"
            defaultValue={by}
            style={{ width: 130 }}
            onChange={(event) => onQuery(q, event.target.value as 'media_id' | 'user_id')}
            aria-label="搜索范围"
          >
            <option value="media_id">资源 ID</option>
            <option value="user_id">上传者 ID</option>
          </select>
        ) : null}

        <label className="field">
          <span className="visually-hidden">搜索</span>
          <input
            className="input"
            type="search"
            aria-label="搜索"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={tab === 'media' ? (by === 'media_id' ? '搜资源 ID' : '搜上传者 ID') : '搜片名'}
            style={{ width: 280 }}
          />
        </label>

      </div>

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={rows}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        loadingRows={8}
        loadingKind="rows"
        emptyTitle={q ? `没有找到「${q}」` : '回收站是空的'}
        emptyAction={q ? <ClearSearchButton onClick={() => onQuery('', by)} /> : undefined}
      >
          {tab === 'media' ? (
            <RecordRow<Record<string, unknown>>
              rows={rows}
              idKey={(row) => String(row.media_id ?? '')}
              title={(row) => String(row.media_name ?? row.media_id ?? '')}
              meta={(row) => (
                <>
                  <span>
                    {String(row.video_title ?? '—')}
                    {row.season_number ? ` S${row.season_number}` : ''}
                    {row.episode_number ? ` E${row.episode_number}` : ''}
                  </span>
                  <span>{formatSize(row.media_file_size == null ? null : Number(row.media_file_size))}</span>
                </>
              )}
              facts={(row) => (
                <>
                  <span>{String(row.storage_title ?? '未指定存储')}</span>
                  <span>{formatRelative(String(row.created_at ?? ''))} 入库</span>
                </>
              )}
              actions={
                restorable
                  ? (row) => {
                      const mediaId = String(row.media_id ?? '')
                      const name = String(row.media_name ?? mediaId)
                      return canRestoreRow(row) ? (
                        <button
                          type="button"
                          className="btn btn--quiet"
                          disabled={busy === mediaId}
                          onClick={() => restoreMedia(mediaId, name)}
                        >
                          {busy === mediaId ? '恢复中…' : '恢复'}
                        </button>
                      ) : null
                    }
                  : undefined
              }
            />
          ) : (
            <RecordRow<Record<string, unknown>>
              rows={rows}
              idKey={(row) => String(row.video_id ?? '')}
              poster={(row) => (row.video_image_poster ? String(row.video_image_poster) : null)}
              title={(row) => String(row.video_title ?? '—')}
              meta={(row) => (
                <>
                  <span>{VIDEO_TYPE_LABEL[row.video_type as keyof typeof VIDEO_TYPE_LABEL]}</span>
                  {row.user_pseudonym ? <span>{String(row.user_pseudonym)}</span> : null}
                </>
              )}
              facts={(row) => (
                <>
                  <span>TODB {String(row.todb_id ?? '—')}</span>
                  <span>上映 {String(row.video_date_air ?? '—')}</span>
                </>
              )}
              actions={(row) => {
                const videoId = Number(row.video_id ?? 0)
                const title = String(row.video_title ?? '—')
                // 影片接口目前不返回 is_can_restore：给明确状态，不要留空白格
                return row.is_can_restore === undefined ? (
                  <span className="meta-sm">暂不支持自助恢复</span>
                ) : canRestoreRow(row) ? (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    disabled={busy === String(videoId)}
                    onClick={() => restoreVideo(videoId, title)}
                  >
                    恢复
                  </button>
                ) : null
              }}
            />
          )}
      </ListSection>

    </>
  )
}
