import { useState } from 'react'
import { mediaApi, videoApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { ClearSearchButton } from '@/components/StateBlock'
import { RecordList } from '@/components/RecordList'
import { useRecycleMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useDebounced } from '@/lib/useDebounced'
import {formatRelative, formatSize, formatThousand, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

type Tab = 'media' | 'video'

export interface RecycleSearch {
  tab: 'media' | 'video'
  page: number
  page_size: number
  q: string
  by: 'media_id' | 'user_id'
}

const RECYCLE_TABS = [
  { key: 'media', label: '资源' },
  { key: 'video', label: '影片' },
] as const

export function RecycleView({ tab, onTab, page, onPage, pageSize, onPageSize, q, by, onQuery }: {
  tab: Tab
  onTab: (tab: Tab) => void
  page: number
  onPage: (page: number) => void
  pageSize: number
  onPageSize: (size: number) => void
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
  const [term, setTerm] = useState(q)

  // 输入即搜：停手 350ms 后发起查询，不需要回车确认
  useDebounced(term, (next) => onQuery(next, by), { current: q })

  const total = infinite.total
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
        total={total}
        page={page}
        pageSize={pageSize}
        onPage={onPage}
        onPageSize={onPageSize}
        idKey={(r) => String(r.media_id ?? r.video_id ?? '')}
        scope={tab}
        cardList
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        loadingRows={8}
        loadingCols={5}
        emptyTitle={q ? `没有找到「${q}」` : '回收站是空的'}
        emptyAction={q ? <ClearSearchButton onClick={() => onQuery('', by)} /> : undefined}
      >
          {tab === 'media' ? (
            <RecordList<Record<string, unknown>>
              rows={rows}
              idKey={(row) => String(row.media_id ?? '')}
              className="table table--auto"
              columns={[
                {
                  key: 'name',
                  label: '资源',
                  mobile: 'primary',
                  render: (row) => (
                    <span className="cell-title__name">{String(row.media_name ?? row.media_id ?? '')}</span>
                  ),
                },
                {
                  key: 'belongs',
                  label: '所属',
                  mobile: 'row',
                  render: (row) => (
                    <span className="muted">
                      {String(row.video_title ?? '—')}
                      {row.season_number ? ` S${row.season_number}` : ''}
                      {row.episode_number ? `E${row.episode_number}` : ''}
                    </span>
                  ),
                },
                {
                  key: 'size',
                  label: '大小',
                  thClass: 'num',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => (
                    <span className="muted">
                      {formatSize(row.media_file_size == null ? null : Number(row.media_file_size))}
                    </span>
                  ),
                },
                {
                  key: 'storage',
                  label: '存储',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted">{String(row.storage_title ?? '—')}</span>,
                },
                {
                  key: 'created',
                  label: '入库时间',
                  thClass: 'num',
                  mobile: 'hidden',
                  render: (row) => <span className="muted">{formatRelative(String(row.created_at ?? ''))}</span>,
                },
                ...(restorable
                  ? [
                      {
                        key: 'action',
                        label: '操作',
                        thWidth: 96,
                        mobile: 'block' as const,
                        mobileAlign: 'end' as const,
                        render: (row: Record<string, unknown>) => {
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
                        },
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            <RecordList<Record<string, unknown>>
              rows={rows}
              idKey={(row) => String(row.video_id ?? '')}
              className="table table--auto"
              columns={[
                {
                  key: 'video',
                  label: '影片',
                  thClass: 'th-thumb',
                  mobile: 'primary',
                  render: (row) => {
                    const title = String(row.video_title ?? '—')
                    return (
                      <div className="cell-title">
                        {row.video_image_poster ? (
                          <Poster src={String(row.video_image_poster)} name={title} collapseOnEmpty />
                        ) : null}
                        <span>
                          <span className="cell-title__name">{title}</span>
                          {row.user_pseudonym ? (
                            <span className="cell-title__code">{String(row.user_pseudonym)}</span>
                          ) : null}
                        </span>
                      </div>
                    )
                  },
                },
                {
                  key: 'type',
                  label: '类型',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => (
                    <span className="zone">
                      <span
                        className="rail__dot"
                        style={{ color: VIDEO_TYPE_COLOR[row.video_type as keyof typeof VIDEO_TYPE_COLOR] }}
                      />
                      {VIDEO_TYPE_LABEL[row.video_type as keyof typeof VIDEO_TYPE_LABEL]}
                    </span>
                  ),
                },
                {
                  key: 'todb',
                  label: 'TODB',
                  thClass: 'num',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted">{String(row.todb_id ?? '—')}</span>,
                },
                {
                  key: 'air',
                  label: '上映',
                  thClass: 'num',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted">{String(row.video_date_air ?? '—')}</span>,
                },
                {
                  key: 'action',
                  label: '操作',
                  thWidth: 96,
                  mobile: 'block',
                  mobileAlign: 'end',
                  render: (row) => {
                    const videoId = Number(row.video_id ?? 0)
                    const title = String(row.video_title ?? '—')
                    return canRestoreRow(row) ? (
                      <button
                        type="button"
                        className="btn btn--quiet"
                        disabled={busy === String(videoId)}
                        onClick={() => restoreVideo(videoId, title)}
                      >
                        恢复
                      </button>
                    ) : null
                  },
                },
              ]}
            />
          )}
      </ListSection>

    </>
  )
}
