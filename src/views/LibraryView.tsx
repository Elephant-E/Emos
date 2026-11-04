import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconArrowDown, IconDots, IconFilter, IconLeft, IconPlus, IconRight, IconSort } from '@/components/icons'
import { useVideos } from '@/api/queries'
import { formatCount, formatRelative, ZONE_COLOR, ZONE_LABEL } from '@/lib/format'

export interface LibrarySearch {
  page: number
  page_size: number
  q: string
  type: string
}

const TABS = [
  { key: '', label: '全部' },
  { key: 'movie', label: '电影' },
  { key: 'series', label: '剧集' },
  { key: 'documentary', label: '纪录片' },
  { key: 'variety', label: '综艺' },
  { key: 'short', label: '短片' },
]

export function LibraryView({
  search,
  onSearch,
}: {
  search: LibrarySearch
  onSearch: (patch: Partial<LibrarySearch>) => void
}) {
  const [query, setQuery] = useState(search.q)
  useEffect(() => setQuery(search.q), [search.q])

  const { data, isLoading, error, refetch, isFetching } = useVideos({
    page: search.page,
    page_size: search.page_size,
    title: search.q || undefined,
    type: search.type || undefined,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <>
      <PageHeader
        crumb={['媒体库', search.type ? ZONE_LABEL[search.type] : '全部']}
        title="媒体库"
        hint={data ? `${data.total.toLocaleString('zh-CN')} 部` : undefined}
        tools={
          <span className="stamp">
            <i />
            {isFetching ? '同步中' : '数据已同步'}
          </span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="分区">
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch({ q: query.trim(), page: 1 })
          }}
        />
        <button className="btn btn--ghost" onClick={() => onSearch({ q: query.trim(), page: 1 })}>
          <IconFilter />
          筛选
        </button>
        <button className="btn btn--primary">
          <IconPlus />
          新增入库
        </button>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}

      {!error && isLoading ? <LoadingBlock rows={8} columns={5} /> : null}

      {!error && !isLoading && data && data.data.length === 0 ? (
        <EmptyBlock
          title="没有匹配的影片"
          hint={search.q ? `「${search.q}」在${search.type ? ZONE_LABEL[search.type] : '全部分区'}里没有结果，换个关键词或清空筛选。` : '这个分区还是空的。可以先上传，或从 TMDB 检索入库。'}
          action={
            <>
              {search.q || search.type ? (
                <button className="btn btn--ghost" onClick={() => onSearch({ q: '', type: '', page: 1 })}>
                  清空筛选
                </button>
              ) : null}
              <button className="btn btn--primary">新增入库</button>
            </>
          }
        />
      ) : null}

      {!error && !isLoading && data && data.data.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input className="cbx" type="checkbox" aria-label="全选本页" />
                </th>
                <th style={{ width: '30%' }}>片名</th>
                <th style={{ width: '14%' }}>分区</th>
                <th className="num" style={{ width: '15%' }}>
                  <button className="th-sort" aria-sort="none">
                    集 / 资源
                    <IconSort />
                  </button>
                </th>
                <th className="num" style={{ width: '14%' }}>
                  <button className="th-sort" aria-sort="descending">
                    播放
                    <IconArrowDown />
                  </button>
                </th>
                <th className="num" style={{ width: '14%' }}>
                  <button className="th-sort" aria-sort="none">
                    更新时间
                    <IconSort />
                  </button>
                </th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {data.data.map((video) => {
                const plays = formatCount(video.play_count)
                return (
                  <tr key={video.video_id}>
                    <td>
                      <input className="cbx" type="checkbox" aria-label={`选择《${video.title}》`} />
                    </td>
                    <td>
                      <div className="cell-title">
                        <span className="thumb" aria-hidden="true">
                          {video.poster ? <img src={video.poster} alt="" /> : video.title.slice(0, 1)}
                        </span>
                        <span>
                          <span className="cell-title__name">{video.title}</span>
                          <span className="cell-title__code">
                            {video.video_id}
                            {video.year ? ` · ${video.year}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="zone">
                        <span className="rail__dot" style={{ color: ZONE_COLOR[video.type ?? 'movie'] }} />
                        {ZONE_LABEL[video.type ?? 'movie']}
                      </span>
                    </td>
                    <td className="num">
                      {video.episode_count ?? 0} 集 · {video.media_count ?? 0} 资源
                    </td>
                    <td className="num">
                      {plays.unit ? `${plays.value} ${plays.unit}` : plays.value}
                    </td>
                    <td className="num muted">{formatRelative(video.updated_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="row-menu" aria-label={`《${video.title}》的更多操作`}>
                        <IconDots />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              共 {data.total.toLocaleString('zh-CN')} 部 · 第 {search.page} / {totalPages} 页
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
