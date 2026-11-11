import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ListCard } from '@/components/ListCard'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { useNavigate } from '@tanstack/react-router'
import { useVideoPage } from '@/api/queries'
import { rowLink } from '@/lib/rowLink'
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

  // 纯数字：先当站内 ID 查，查不到再当 TMDB ID（见 useVideoPage）；其余按片名
  const numeric = /^\d{1,12}$/.test(search.q.trim())
  const { data, isLoading, error, refetch, isFetching } = useVideoPage({
    page: search.page,
    page_size: search.page_size,
    numericId: numeric ? Number(search.q) : undefined,
    title: numeric ? undefined : search.q || undefined,
    type: (search.type || undefined) as VideoType | undefined,
  })

  // 分页器 props 只写一份：正常分支和「页码越界」分支共用，否则后者会漏掉每页条数
  const pagerProps = {
    total: data?.total ?? 0,
    page: search.page,
    pageSize: search.page_size,
    onPage: (page: number) => onSearch({ page }),
    onPageSize: (page_size: number) => onSearch({ page: 1, page_size }),
  }


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
          新增入库
        </button>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={8} columns={5} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        // 区分「真没有数据」和「页码越界」：后者总条数是有值的
        data.total > 0 ? (
          // 空态与分页器同属一张卡，两者都在卡内渲染
          <div className="table-card">
            <EmptyBlock
              bare
              title="这一页没有内容"
              hint={`共 ${formatThousand(data.total)} 条，当前在第 ${search.page} 页`}
              action={<button type="button" className="btn btn--ghost" onClick={() => onSearch({ page: 1 })}>回到第一页</button>}
            />
            <Pager {...pagerProps} />
          </div>
        ) : (
          <EmptyBlock
            title={search.q ? `没有找到「${search.q}」` : '片库还是空的'}
            action={<button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '', page: 1 })}>清空筛选</button>}
          />
        )
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <ListCard items={data.items} total={data.total} idKey={(v) => v.video_id}>
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
                <tr key={video.video_id} {...rowLink(() => openDetail(video.video_id))}>
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
                          const genres = video.genres ?? []
                          const sub = [
                            video.video_origin_title,
                            genres.length ? genres.slice(0, 2).map((g) => g.name).join('/') : null,
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
          <Pager {...pagerProps} />
        </ListCard>
      ) : null}
    </>
  )
}
