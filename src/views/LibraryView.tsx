import { Link } from '@tanstack/react-router'
import { ListSection } from '@/components/ListSection'
import { RecordGrid } from '@/components/RecordGrid'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { fetchVideoPage } from '@/api/queries'
import { usePagedInfinite } from '@/lib/usePagedInfinite'
import { useSearchTerm } from '@/lib/useSearchTerm'
import {VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
import type { VideoType } from '@/api/types'

export interface LibrarySearch {
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
  const [query, setQuery] = useSearchTerm(search.q, (next) => onSearch({ q: next }))

  const openDetail = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  // 纯数字：先当站内 ID 查，查不到再当 TMDB ID（见 useVideoPage）；其余按片名
  const numeric = /^\d{1,12}$/.test(search.q.trim())
  // 两端都是滚动加载：不再有分页器，也就不分「桌面用分页查询」这条路
  const list = usePagedInfinite(
    (page) =>
      fetchVideoPage({
        page,
        page_size: search.page_size,
        numericId: numeric ? Number(search.q) : undefined,
        title: numeric ? undefined : search.q || undefined,
        type: (search.type || undefined) as VideoType | undefined,
      }),
    { resetKey: `${search.q}|${search.type}|${search.page_size}` },
  )
  const items = list.items


  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? VIDEO_TYPE_LABEL[search.type] : '全部']}
        title="媒体库"
        tools={
          <Link className="btn btn--ghost" to="/recycle" search={{ tab: 'media', page_size: 20, q: '', by: 'media_id' }}>
            回收站
          </Link>
        }
      />

      <div className="toolbar">
        <Tabs items={TABS} value={search.type} onChange={(type) => onSearch({ type })} label="类型" />
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
            onSearch({ q: query.trim() })
          }}
        />
        <button type="button" className="btn btn--primary" onClick={() => navigate({ to: '/upload' })}>
          <IconPlus />
          上传
        </button>
      </div>

      <ListSection
        isLoading={list.loading && list.items.length === 0}
        error={list.error}
        onRetry={() => list.retry()}
        items={items}
        infinite={{ hasMore: list.hasMore, loading: list.loadingMore, onLoadMore: list.loadMore }}
        scope={`${search.type}-${search.q}`}
        bare
        loadingRows={8}
        loadingCols={5}
        emptyTitle={
          search.q || search.type ? '没有找到匹配的影片' : '片库还是空的'
        }
        emptyAction={
          search.q || search.type ? (
            <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '' })}>
              清空筛选
            </button>
          ) : (
            <Link to="/upload" className="btn btn--primary">
              上传
            </Link>
          )
        }
      >
          <RecordGrid
            rows={items}
            idKey={(video) => video.video_id}
            onOpen={(video) => openDetail(video.video_id)}
            shape="poster"
            poster={(video) => video.video_image_poster}
            title={(video) => video.video_title}
            meta={(video) => (
              <>
                <span className="zone">
                  <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                  {VIDEO_TYPE_LABEL[video.video_type]}
                </span>
                {/* 只有类型与年份：都是定长，两列卡片的信息行永远对得齐 */}
                {video.video_date_air ? <span>{video.video_date_air.slice(0, 4)}</span> : null}
              </>
            )}
          />
      </ListSection>
    </>
  )
}
