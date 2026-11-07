import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconDots, IconFilter, IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { useVideoPage } from '@/api/queries'
import { Pager } from '@/components/Pager'
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

  const openDetail = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  const { data, isLoading, error, refetch, isFetching, isPlaceholderData } = useVideoPage({
    page: search.page,
    page_size: search.page_size,
    title: search.q || undefined,
    type: (search.type || undefined) as VideoType | undefined,
  })


  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? VIDEO_TYPE_LABEL[search.type] : '全部']}
        title="媒体库"
        tools={
          <>
            {isFetching ? (
              <span className="stamp">
                <i />
                同步中
              </span>
            ) : (
              <span className="head-note">已同步</span>
            )}
            <Link className="btn btn--ghost" to="/recycle" search={{ tab: 'media', page: 1, size: 20, q: '', by: 'media_id' }}>
              回收站
            </Link>
          </>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="类型">
          {TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              className="tab"
              role="tab"
              aria-selected={search.type === tab.key}
              onClick={() => onSearch({ type: tab.key, page: 1 })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <input
          className="input"
          type="search"
          value={query}
          placeholder="搜索片名"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch({ q: query.trim(), page: 1 })}
        />
        <button className="btn btn--ghost" onClick={() => onSearch({ q: query.trim(), type: '', page: 1 })}>
          <IconFilter />
          重置
        </button>
        <button className="btn btn--primary" onClick={() => navigate({ to: '/upload' })}>
          <IconPlus />
          新增入库
        </button>
      </div>

      {error ? <ErrorBlock error={error as Error & { status?: number }} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={8} columns={5} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        <EmptyBlock
          title="没有匹配的影片"
          hint={search.q ? `「${search.q}」没有结果，换个关键词或清空筛选。` : '片库还是空的，先上传或从 TMDB 检索入库。'}
          action={<button className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '', page: 1 })}>清空筛选</button>}
        />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className={`table-card content-in${isPlaceholderData ? ' is-stale' : ''}`} key={`${data.items.length}-${data.items[0]?.video_id}-${data.total}`}>
          <table className="table table--fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input className="cbx" type="checkbox" aria-label="全选本页" />
                </th>
                <th style={{ width: '36%' }} className="th-thumb">片名</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '13%' }}>资源</th>
                <th className="num" style={{ width: '12%' }}>求片</th>
                <th className="num" style={{ width: '13%' }}>上映</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((video) => (
                <tr
                  key={video.video_id}
                  tabIndex={0}
                  role="link"
                  onClick={() => openDetail(video.video_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetail(video.video_id)
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <input className="cbx" type="checkbox" aria-label={`选择《${video.video_title}》`} />
                  </td>
                  <td>
                    <div className="cell-title">
                      {video.video_image_poster ? (
                        <Poster src={video.video_image_poster} name={video.video_title} />
                      ) : (
                        <span className="thumb">{video.video_title.slice(0, 1)}</span>
                      )}
                      <span>
                        <span className="cell-title__name">{video.video_title}</span>
                        <span className="cell-title__code">
                          #{video.video_id} · TODB {video.todb_id}
                          {video.video_origin_title ? ` · ${video.video_origin_title}` : ''}
                          {video.genres.length ? ` · ${video.genres.slice(0, 2).map((g) => g.name).join('/')}` : ''}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="zone">
                      <span className="rail__dot" style={{ color: VIDEO_TYPE_COLOR[video.video_type] }} />
                      {VIDEO_TYPE_LABEL[video.video_type]}
                    </span>
                  </td>
                  <td className="num">
                    {video.medias_count} 个 · 字幕 {video.subtitles_count}
                  </td>
                  <td className="num">
                    {video.seek_is_request ? (
                      <span className="badge badge--wait">
                        <i />
                        {video.request_count} 人求
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num muted">{video.video_date_air ?? '—'}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button className="row-menu" aria-label={`打开《${video.video_title}》详情`} onClick={() => openDetail(video.video_id)}>
                      <IconDots />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            total={data.total}
            page={search.page}
            pageSize={search.page_size}
            onPage={(page) => onSearch({ page })}
            onPageSize={(page_size) => onSearch({ page: 1, page_size })}
          />
        </div>
      ) : null}
    </>
  )
}
