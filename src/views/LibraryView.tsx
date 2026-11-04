import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconArrowDown, IconDots, IconFilter, IconLeft, IconPlus, IconRight, IconSort } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { useVideoPage } from '@/api/queries'
import { formatThousand, VIDEO_TYPE_COLOR, VIDEO_TYPE_LABEL } from '@/lib/format'
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

  const { data, isLoading, error, refetch, isFetching } = useVideoPage({
    page: search.page,
    page_size: search.page_size,
    title: search.q || undefined,
    type: (search.type || undefined) as VideoType | undefined,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? VIDEO_TYPE_LABEL[search.type] : '全部']}
        title="媒体库"
        hint={data ? `${formatThousand(data.total)} 部` : undefined}
        tools={
          <span className="stamp">
            <i />
            {isFetching ? '同步中' : '已同步'}
          </span>
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
        <button className="btn btn--primary">
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
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input className="cbx" type="checkbox" aria-label="全选本页" />
                </th>
                <th style={{ width: '34%' }}>片名</th>
                <th style={{ width: '12%' }}>类型</th>
                <th className="num" style={{ width: '14%' }}>
                  <button className="th-sort" aria-sort="none">
                    资源
                    <IconSort />
                  </button>
                </th>
                <th className="num" style={{ width: '14%' }}>
                  <button className="th-sort" aria-sort="descending">
                    求片
                    <IconArrowDown />
                  </button>
                </th>
                <th className="num" style={{ width: '14%' }}>
                  <button className="th-sort" aria-sort="none">
                    上映
                    <IconSort />
                  </button>
                </th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((video) => (
                <tr
                  key={video.video_id}
                  onClick={() =>
                    navigate({
                      to: '/media/$videoId',
                      params: { videoId: String(video.video_id) },
                      search: { season: 1, episode: 1 },
                    })
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <input className="cbx" type="checkbox" aria-label={`选择《${video.video_title}》`} />
                  </td>
                  <td>
                    <div className="cell-title">
                      {video.video_image_poster ? (
                        <img className="poster-img" src={video.video_image_poster} alt="" loading="lazy" />
                      ) : (
                        <span className="thumb">{video.video_title.slice(0, 1)}</span>
                      )}
                      <span>
                        <span className="cell-title__name">{video.video_title}</span>
                        <span className="cell-title__code">
                          #{video.video_id} · todb {video.todb_id}
                          {video.video_origin_title ? ` · ${video.video_origin_title}` : ''}
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
                  <td style={{ textAlign: 'right' }}>
                    <button className="row-menu" aria-label={`《${video.video_title}》的更多操作`}>
                      <IconDots />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              共 {formatThousand(data.total)} 部 · 第 {search.page} / {totalPages} 页
            </span>
            <div className="pager">
              <button disabled={search.page <= 1} onClick={() => onSearch({ page: search.page - 1 })} aria-label="上一页">
                <IconLeft />
              </button>
              <button aria-current="page">{search.page}</button>
              <button disabled={search.page >= totalPages} onClick={() => onSearch({ page: search.page + 1 })} aria-label="下一页">
                <IconRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
