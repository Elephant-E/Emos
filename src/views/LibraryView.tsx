import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ListSection } from '@/components/ListSection'
import { RecordList } from '@/components/RecordList'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { fetchVideoPage, useVideoPage } from '@/api/queries'
import { usePagedInfinite } from '@/lib/usePagedInfinite'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useDebounced } from '@/lib/useDebounced'
import {VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
import type { VideoType } from '@/api/types'

export interface LibrarySearch {
  page: number
  page_size: number
  q: string
  type: '' | VideoType
}

const TABS: Array<{ key: '' | VideoType; label: string }> = [
  { key: '', label: '全部' },
  { key: 'movie', label: '电影' },
  { key: 'tv', label: '剧集' },
]

export function LibraryView({ search, onSearch }: { search: LibrarySearch; onSearch: (patch: Partial<LibrarySearch>) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q)
  useEffect(() => setQuery(search.q), [search.q])

  useDebounced(query, (next) => onSearch({ q: next, page: 1 }), { current: search.q })

  const openDetail = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  // 纯数字：先当站内 ID 查，查不到再当 TMDB ID（见 useVideoPage）；其余按片名
  const numeric = /^\d{1,12}$/.test(search.q.trim())
  const compact = useMediaQuery('(max-width: 600px)')
  // 桌面：分页查询（URL 里的 page 有意义）
  const paged = useVideoPage({
    page: search.page,
    page_size: search.page_size,
    numericId: numeric ? Number(search.q) : undefined,
    title: numeric ? undefined : search.q || undefined,
    type: (search.type || undefined) as VideoType | undefined,
    enabled: !compact,
  })
  // 手机：滚动加载，首屏取第 1 页，滑到底续下一页
  const infinite = usePagedInfinite(
    (page) =>
      fetchVideoPage({
        page,
        page_size: search.page_size,
        numericId: numeric ? Number(search.q) : undefined,
        title: numeric ? undefined : search.q || undefined,
        type: (search.type || undefined) as VideoType | undefined,
      }),
    { enabled: compact, resetKey: `${search.q}|${search.type}|${search.page_size}` },
  )
  const data = compact ? { items: infinite.items, total: infinite.total, page_size: infinite.pageSize } : paged.data
  const isLoading = compact ? infinite.loading : paged.isLoading
  const error = compact ? infinite.error : paged.error
  const refetch = compact ? infinite.retry : paged.refetch
  const items = data?.items ?? []


  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? VIDEO_TYPE_LABEL[search.type] : '全部']}
        title="媒体库"
        tools={
          <Link className="btn btn--ghost" to="/recycle" search={{ tab: 'media', page: 1, page_size: 20, q: '', by: 'media_id' }}>
            回收站
          </Link>
        }
      />

      <div className="toolbar">
        <Tabs items={TABS} value={search.type} onChange={(type) => onSearch({ type, page: 1 })} label="类型" />
        <span className="spacer" />
        <input
          className="input"
          type="search"
            aria-label="片名或 TMDB ID"
          value={query}
          placeholder="片名或 TMDB ID"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            onSearch({ q: query.trim(), page: 1 })
          }}
        />
        <button type="button" className="btn btn--primary" onClick={() => navigate({ to: '/upload' })}>
          <IconPlus />
          上传
        </button>
      </div>

      <ListSection
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        items={data?.items ?? []}
        total={data?.total ?? 0}
        page={search.page}
        pageSize={data?.page_size ?? search.page_size}
        onPage={(page) => onSearch({ page })}
        onPageSize={(page_size) => onSearch({ page: 1, page_size })}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        sizes={[20, 50]}
        idKey={(v) => v.video_id}
        scope={`${search.type}-${search.q}`}
        cardList
        loadingRows={8}
        loadingCols={5}
        emptyTitle={
          search.q || search.type ? '没有找到匹配的影片' : '片库还是空的'
        }
        emptyAction={
          search.q || search.type ? (
            <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '', page: 1 })}>
              清空筛选
            </button>
          ) : (
            <Link to="/upload" className="btn btn--primary">
              上传
            </Link>
          )
        }
      >
          <RecordList
            rows={items}
            idKey={(v) => v.video_id}
            onOpen={(v) => openDetail(v.video_id)}
            columns={[
              {
                key: 'title',
                label: '片名',
                thClass: 'th-thumb',
                mobile: 'primary',
                render: (video, { mobile }) => (
                  <div className="cell-title">
                    {mobile ? (
                      // 卡片里缺图不占位（表格里必须占位，否则标题起点会跳）
                      <Poster src={video.video_image_poster} name={video.video_title} collapseOnEmpty />
                    ) : video.video_image_poster ? (
                      <Poster src={video.video_image_poster} name={video.video_title} />
                    ) : (
                      <span className="thumb">{video.video_title.slice(0, 1)}</span>
                    )}
                    <span>
                      <span className="cell-title__name">{video.video_title}</span>
                      {(() => {
                        const genres = video.genres ?? []
                        const sub = [
                          video.video_origin_title,
                          genres.length ? genres.slice(0, 2).map((g) => g.name).join('/') : null,
                        ].filter(Boolean)
                        return sub.length ? <span className="cell-title__code">{sub.join(' · ')}</span> : null
                      })()}
                    </span>
                  </div>
                ),
              },
              {
                key: 'type',
                label: '类型',
                mobileLabel: null,
                mobile: 'inline',
                render: (video) => (
                  <span className="zone">
                    <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                    {VIDEO_TYPE_LABEL[video.video_type]}
                  </span>
                ),
              },
              {
                key: 'medias',
                label: '资源',
                mobileLabel: null,
                thClass: 'num',
                mobile: 'inline',
                render: (video, { mobile }) =>
                  mobile ? (
                    <>{video.medias_count} 个资源</>
                  ) : (
                    <>
                      {video.medias_count} 个 · 字幕 {video.subtitles_count}
                    </>
                  ),
              },
              {
                key: 'requests',
                label: '求片',
                mobileLabel: null,
                thClass: 'num',
                mobile: 'inline',
                render: (video, { mobile }) =>
                  video.request_count > 0 ? (
                    <span className="badge badge--wait">
                      <i />
                      {video.request_count} 人求
                    </span>
                  ) : mobile ? null : (
                    <span className="muted">—</span>
                  ),
              },
              {
                key: 'air',
                label: '上映',
                mobileLabel: null,
                thClass: 'num',
                render: (video) => <span className="muted">{video.video_date_air ?? '—'}</span>,
              },
            ]}
          />
      </ListSection>
    </>
  )
}
