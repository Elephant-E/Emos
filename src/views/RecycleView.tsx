import { useState } from 'react'
import { PAGE_SIZE } from '@/lib/search'
import { pageOf } from '@/lib/rows'
import { mediaApi, videoApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { SearchField } from '@/components/SearchField'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton } from '@/components/StateBlock'
import { RecordRow } from '@/components/RecordRow'
import { qk, useRecycleMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative, formatSize, formatThousand, VIDEO_TYPE_LABEL } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

type Tab = 'media' | 'video'

export interface RecycleSearch {
  tab: 'media' | 'video'
  q: string
  by: 'media_id' | 'user_id'
}

const RECYCLE_TABS = [
  { key: 'media', label: '资源' },
  { key: 'video', label: '影片' },
] as const

export function RecycleView({ tab, onTab, q, by, onQuery }: {
  tab: Tab
  onTab: (tab: Tab) => void
  q: string
  by: 'media_id' | 'user_id'
  onQuery: (q: string, by: 'media_id' | 'user_id') => void
}) {
  // 只查当前 tab；两端都滚动加载
  const infinite = usePagedInfinite<Record<string, unknown>>(
    (next) =>
      tab === 'media'
        ? mediaApi
            .listAll({ only_delete: true, page: next, ...(q ? { [by]: q } : {}) })
            .then((res) => {
              const r = pageOf(res)
              return { ...r, page_size: r.page_size || PAGE_SIZE }
            })
        : videoApi
            .list({ only_delete: true, page: next, ...(q ? { title: q } : {}) })
            .then((r) => pageOf(r)),
    { queryKey: [...qk.recycle, { tab, q, by }] },
  )
  const actions = useRecycleMutations()
  const [busy, setBusy] = useState<string | null>(null)
  // 输入即搜：停手 350ms 后发起查询，不需要回车确认

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
          <SearchField
          label="搜索"
          placeholder=""
          value={q}
          onCommit={(next) => onQuery(next, by)}
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
        loadingPoster="none"
        loadingLines={3}
        loadingActions={1}
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
                    {row.season_number != null ? ` S${row.season_number}` : ''}
                    {row.episode_number != null ? ` E${row.episode_number}` : ''}
                  </span>
                  <span>{formatSize(row.media_file_size == null ? null : Number(row.media_file_size))}</span>
                </>
              )}
              facts={(row) => (
                <>
                  <span>{String(row.storage_title ?? '—')}</span>
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
                  <span className="chip">{VIDEO_TYPE_LABEL[row.video_type as keyof typeof VIDEO_TYPE_LABEL]}</span>
                  {row.user_pseudonym ? <span>{String(row.user_pseudonym)}</span> : null}
                </>
              )}
              facts={(row) => (
                <>
                  <span>TODB {String(row.todb_id ?? '—')}</span>
                  <span>上映 {String(row.video_date_air ?? '—')}</span>
                </>
              )}
              actions={() => {
                // 影片接口不返回 is_can_restore，没有可恢复的判据：
                // 与其留一个永远不会出现的按钮，不如把状态写出来
                return <span className="meta-sm">暂不支持自助恢复</span>
              }}
            />
          )}
      </ListSection>

    </>
  )
}
