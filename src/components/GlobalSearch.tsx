import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/Modal'
import { Poster } from '@/components/Poster'
import { musicApi, seekApi, videoApi, watchApi } from '@/api/endpoints'
import { formatThousand } from '@/lib/format'

const PAGE_SIZE = 5
const MIN_LENGTH = 2

type Group = 'video' | 'song' | 'watch' | 'seek'

interface Hit {
  key: string
  group: Group
  title: string
  sub: string
  poster?: string | null
  open: () => void
}

const GROUP_LABEL: Record<Group, string> = {
  video: '影片',
  song: '音乐',
  watch: '片单',
  seek: '求片',
}

/** 「查看全部」跳的是列表页，用页面名而不是结果类型名 */
const ALL_LABEL: Record<Group, string> = {
  video: '媒体库',
  song: '音乐',
  watch: '片单',
  seek: '求片',
}

/**
 * 全局搜索面板（⌘K）。四类数据各自独立查询、谁先到谁先显示：
 * 四个搜索接口在真机上是 1.2–1.8 秒，等齐再渲染会有明显空窗。
 *
 * 商品与用户不在这里：商品搜索必须带 seller_id，用户没有全局搜索接口。
 */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const q = term.trim()
  const ready = open && q.length >= MIN_LENGTH

  const videos = useQuery({
    queryKey: ['global-search', 'video', q] as const,
    queryFn: () => videoApi.search({ title: q, page: 1, page_size: PAGE_SIZE }),
    enabled: ready,
    staleTime: 60_000,
  })
  const songs = useQuery({
    queryKey: ['global-search', 'song', q] as const,
    queryFn: () => musicApi.songSearch({ name: q, page: 1, page_size: PAGE_SIZE }),
    enabled: ready,
    staleTime: 60_000,
  })
  const watches = useQuery({
    queryKey: ['global-search', 'watch', q] as const,
    queryFn: () => watchApi.list({ name: q, page: 1, page_size: PAGE_SIZE }),
    enabled: ready,
    staleTime: 60_000,
  })
  const seeks = useQuery({
    queryKey: ['global-search', 'seek', q] as const,
    queryFn: () => seekApi.list({ video_title: q, page: 1, page_size: PAGE_SIZE, status: ['default', 'upload', 'complete'] }),
    enabled: ready,
    staleTime: 60_000,
  })

  // 关面板并清空，再跳转；跳转本身用各调用点的内联写法，保持路由类型推导
  const close = () => {
    onClose()
    setTerm('')
  }

  const groups = useMemo(() => {
    const list: Array<{ group: Group; loading: boolean; hits: Hit[]; all: () => void; total: number }> = [
      {
        group: 'video',
        loading: videos.isFetching,
        total: videos.data?.total ?? 0,
        hits: (videos.data?.items ?? []).map((row) => ({
          key: `video-${row.video_id}`,
          group: 'video' as const,
          title: row.video_title,
          sub: [row.video_type === 'movie' ? '电影' : '剧集', row.video_origin_title ?? ''].filter(Boolean).join(' · '),
          poster: row.video_image_poster,
          open: () => {
            close()
            void navigate({ to: '/media/$videoId', params: { videoId: String(row.video_id) }, search: { season: 1, episode: 1 } })
          },
        })),
        all: () => {
          close()
          void navigate({ to: '/library', search: { page: 1, page_size: 20, q, type: '' } })
        },
      },
      {
        group: 'song',
        loading: songs.isFetching,
        total: songs.data?.total ?? 0,
        hits: (songs.data?.items ?? []).map((row) => ({
          key: `song-${row.song_id}`,
          group: 'song' as const,
          title: row.name,
          sub: (row.person_artists ?? []).map((p) => p.name).filter(Boolean).slice(0, 2).join(' / '),
          poster: row.image_poster_url,
          open: () => {
            close()
            void navigate({ to: '/music/song/$songId', params: { songId: String(row.song_id) } })
          },
        })),
        all: () => {
          close()
          void navigate({ to: '/music', search: { page: 1, tab: 'songs', q, filter: '' } })
        },
      },
      {
        group: 'watch',
        loading: watches.isFetching,
        total: watches.data?.total ?? 0,
        hits: (watches.data?.items ?? []).map((row) => ({
          key: `watch-${row.id}`,
          group: 'watch' as const,
          title: String(row.name ?? ''),
          sub: [`${formatThousand(row.video_count)} 部`, row.carrot > 0 ? `${row.carrot} 胡萝卜` : '免费'].join(' · '),
          poster: row.image_poster_url,
          open: () => {
            close()
            void navigate({
              to: '/watchlists/$watchId',
              params: { watchId: String(row.id) },
              search: { page: 1, page_size: 20, q: '' },
            })
          },
        })),
        all: () => {
          close()
          void navigate({ to: '/watchlists', search: { page: 1, page_size: 20, q, scope: 'all', type: 'video' } })
        },
      },
      {
        group: 'seek',
        loading: seeks.isFetching,
        total: seeks.data?.total ?? 0,
        hits: (seeks.data?.items ?? []).map((row) => ({
          key: `seek-${row.id}`,
          group: 'seek' as const,
          title: row.video_title_display,
          sub: [row.video_type === 'movie' ? '电影' : '剧集', `${formatThousand(row.count_request)} 人求`].join(' · '),
          poster: row.video_image_poster,
          open: () => {
            close()
            void navigate({
              to: '/seek',
              search: { page: 1, page_size: 20, tab: 'all', q: row.video_title_display, type: '', mine: false },
            })
          },
        })),
        all: () => {
          close()
          void navigate({ to: '/seek', search: { page: 1, page_size: 20, tab: 'all', q, type: '', mine: false } })
        },
      },
    ]
    return list
  }, [videos.data, videos.isFetching, songs.data, songs.isFetching, watches.data, watches.isFetching, seeks.data, seeks.isFetching, q])

  const hits = useMemo(() => groups.flatMap((group) => group.hits), [groups])

  // 结果变化后把选中项拉回可视范围
  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, hits.length - 1)))
  }, [hits.length])

  useEffect(() => {
    if (!open) {
      setTerm('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    const row = bodyRef.current?.querySelector(`[data-hit="${active}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const searching = ready && (videos.isFetching || songs.isFetching || watches.isFetching || seeks.isFetching)
  const empty = ready && !searching && hits.length === 0

  // 关闭时不渲染（浮层与查询都在上面按 open 判断过，这里只负责卸载 DOM）
  if (!open) return null

  return (
    <Modal
      title="搜索"
      width={640}
      onClose={onClose}
      onSubmit={() => hits[active]?.open()}
    >
      <input
        className="input"
        type="search"
        aria-label="搜索影片、音乐、片单、求片"
        placeholder="搜索影片、音乐、片单、求片"
        value={term}
        autoFocus
        onChange={(event) => {
          setTerm(event.target.value)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((index) => Math.min(index + 1, Math.max(0, hits.length - 1)))
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          }
        }}
      />

      <div ref={bodyRef} className="search-panel">
        {!ready ? <p className="card-note">输入至少 {MIN_LENGTH} 个字</p> : null}
        {empty ? <p className="card-note">没有找到「{q}」</p> : null}

        {ready
          ? groups.map((group) => {
              if (!group.loading && group.hits.length === 0) return null
              return (
                <section key={group.group} className="search-panel__group">
                  <p className="search-panel__label">
                    {GROUP_LABEL[group.group]}
                    {group.total > group.hits.length ? <span> · 共 {formatThousand(group.total)}</span> : null}
                  </p>
                  {group.hits.map((hit) => {
                    const index = hits.indexOf(hit)
                    return (
                      <button
                        type="button"
                        key={hit.key}
                        data-hit={index}
                        className={`search-panel__row${index === active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => hit.open()}
                      >
                        {hit.group === 'watch' && hit.poster ? (
                          <Poster src={hit.poster} name={hit.title} shape="wide" className="search-panel__poster" />
                        ) : hit.group === 'seek' && hit.poster ? (
                          <Poster src={hit.poster} name={hit.title} className="search-panel__poster" />
                        ) : null}
                        <span>
                          <span className="cell-title__name">{hit.title}</span>
                          {hit.sub ? <span className="cell-title__code">{hit.sub}</span> : null}
                        </span>
                      </button>
                    )
                  })}
                  {group.loading && group.hits.length === 0 ? <p className="search-panel__loading">查询中…</p> : null}
                  {group.hits.length > 0 ? (
                    <button type="button" className="search-panel__all" onClick={group.all}>
                      在{ALL_LABEL[group.group]}中查看全部
                    </button>
                  ) : null}
                </section>
              )
            })
          : null}
      </div>
    </Modal>
  )
}
