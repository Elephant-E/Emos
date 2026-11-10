import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { useVideoPage } from '@/api/queries'
import { useDebounced } from '@/lib/useDebounced'
import { formatThousand } from '@/lib/format'
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

  useDebounced(query, (next) => onSearch({ q: next, page: 1 }), { current: search.q })

  const openDetail = (videoId: number) =>
    navigate({ to: '/media/$videoId', params: { videoId: String(videoId) }, search: { season: 1, episode: 1 } })

  // 纯数字按 TMDB ID 搜，其余按片名
  const numeric = /^\d{1,12}$/.test(search.q.trim())
  const { data, isLoading, error, refetch, isFetching } = useVideoPage({
    page: search.page,
    page_size: search.page_size,
    tmdb_id: numeric ? Number(search.q) : undefined,
    title: numeric ? undefined : search.q || undefined,
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
                拉取中
              </span>
            ) : null}
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
          placeholder="片名或 TMDB ID"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            onSearch({ q: query.trim(), page: 1 })
          }}
        />
        <button className="btn btn--primary" onClick={() => navigate({ to: '/upload' })}>
          <IconPlus />
          新增入库
        </button>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={8} columns={5} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        // 区分「真没有数据」和「页码越界」：后者总条数是有值的
        data.total > 0 ? (
          <>
            <EmptyBlock
              title="这一页没有内容"
              hint={`共 ${formatThousand(data.total)} 条，当前在第 ${search.page} 页`}
              action={<button className="btn btn--ghost" onClick={() => onSearch({ page: 1 })}>回到第一页</button>}
            />
            <div className="table-foot">
              <span>共 {formatThousand(data.total)} 条</span>
              <Pager total={data.total} page={search.page} pageSize={search.page_size} onPage={(page) => onSearch({ page })} />
            </div>
          </>
        ) : (
          <EmptyBlock
            title={search.q ? `没有找到「${search.q}」` : '片库还是空的'}
            action={<button className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '', page: 1 })}>清空筛选</button>}
          />
        )
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className="table-card content-in" key={`${data.items.length}-${data.items[0]?.video_id}-${data.total}`}>
          <table className="table table--fixed">
            <thead>
              <tr>
                <th className="th-thumb" style={{ width: '42%' }}>片名</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '13%' }}>资源</th>
                <th className="num" style={{ width: '11%' }}>求片</th>
                <th className="num" style={{ width: '16%' }}>上映</th>
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
                    <div className="cell-title">
                      {video.video_image_poster ? (
                        <Poster src={video.video_image_poster} name={video.video_title} />
                      ) : (
                        <span className="thumb">{video.video_title.slice(0, 1)}</span>
                      )}
                      <span>
                        <span className="cell-title__name">{video.video_title}</span>
                        {(() => {
                          const sub = [
                            video.video_origin_title,
                            video.genres.length ? video.genres.slice(0, 2).map((g) => g.name).join('/') : null,
                          ].filter(Boolean)
                          return sub.length ? <span className="cell-title__code">{sub.join(' · ')}</span> : null
                        })()}
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
                    {video.request_count > 0 ? (
                      <span className="badge badge--wait">
                        <i />
                        {video.request_count} 人求
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num muted">{video.video_date_air ?? '—'}</td>
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
