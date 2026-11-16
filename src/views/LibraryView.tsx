import { Link } from '@tanstack/react-router'
import { PAGE_SIZE } from '@/lib/search'
import { ListSection } from '@/components/ListSection'
import { RecordGrid } from '@/components/RecordGrid'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { fetchVideoPage, qk } from '@/api/queries'
import { usePagedInfinite } from '@/lib/usePagedInfinite'
import { useSearchTerm } from '@/lib/useSearchTerm'
import { VIDEO_TYPE_LABEL } from '@/lib/format'
import type { VideoType } from '@/api/types'

export interface LibrarySearch {
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

  // 路由 schema 里 season/episode 是必填，所以统一带 1/1；电影到详情页会忽略这两个值
  const openDetail = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  // 纯数字：先当站内 ID 查，查不到再当 TMDB ID（见 useVideoPage）；其余按片名
  const numeric = /^\d{1,12}$/.test(search.q.trim())
  // 两端都是滚动加载：不再有分页器，也就不分「桌面用分页查询」这条路
  const list = usePagedInfinite(
    (page) =>
      fetchVideoPage({
        page,
        page_size: PAGE_SIZE,
        numericId: numeric ? Number(search.q) : undefined,
        title: numeric ? undefined : search.q || undefined,
        type: (search.type || undefined) as VideoType | undefined,
      }),
    { queryKey: [...qk.videos, { q: search.q, type: search.type }] },
  )
  const items = list.items


  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? VIDEO_TYPE_LABEL[search.type] : '全部']}
        title="媒体库"
        tools={
          <Link className="btn btn--ghost" to="/recycle" search={{ tab: 'media', q: '', by: 'media_id' }}>
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
      loadingKind="grid"
        isLoading={list.loading && list.items.length === 0}
        error={list.error}
        onRetry={() => list.retry()}
        items={items}
        infinite={{ hasMore: list.hasMore, loading: list.loadingMore, onLoadMore: list.loadMore }}
        loadingRows={8}
        emptyTitle={
          search.q ? `没有找到「${search.q}」` : search.type ? '这个类型下还没有影片' : '片库还是空的'
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
                <span className="chip">{VIDEO_TYPE_LABEL[video.video_type]}</span>
                {/* 只有类型与年份：都是定长，两列卡片的信息行永远对得齐 */}
                {video.video_date_air ? <span>{video.video_date_air.slice(0, 4)}</span> : null}
              </>
            )}
          />
      </ListSection>
    </>
  )
}
