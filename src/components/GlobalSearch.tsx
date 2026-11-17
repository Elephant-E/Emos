import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/Modal'
import { Poster } from '@/components/Poster'
import { rowsOf } from '@/lib/rows'
import { mediaApi, recordApi, seekApi, videoApi, watchApi } from '@/api/endpoints'
import { useSession } from '@/api/queries'
import { formatThousand, episodeCode } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'

const PAGE_SIZE = 5
const RECENT_SIZE = 4
const MIN_LENGTH = 2

type PosterShape = 'poster' | 'wide' | 'square'

interface Hit {
  key: string
  title: string
  sub: string
  poster?: string | null
  shape: PosterShape
  open: () => void
}

interface Block {
  key: string
  label: string
  loading: boolean
  hits: Hit[]
  /** 搜索命中才有「在 X 中查看全部」 */
  all?: () => void
}

/**
 * 全局搜索面板（⌘K）。
 *
 * 输入 ≥2 字：四类并行查询，谁先到谁先显示 —— 四个搜索接口真机各 1.2–1.8 秒，
 * 等齐再渲染会有明显空窗。
 * 未输入时：显示最近看过 / 我上传的 / 我的片单，让空状态有用。
 *
 * 商品与用户不在这里：商品搜索必须带 seller_id，用户没有全局搜索接口。
 */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const session = useSession()
  const userId = String(session.data?.user_id ?? '')
  const [term, setTerm] = useState('')
  // 输入停手 250ms 才发查询：全局搜索一次要打三个接口，逐键请求太浪费
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  useDebounced(term, setDebounced, { delay: 250 })

  const q = debounced.trim()
  const searching = open && q.length >= MIN_LENGTH
  const showingRecents = open && !searching

  const videos = useQuery({
    queryKey: ['global-search', 'video', q] as const,
    queryFn: () => videoApi.search({ title: q, page_size: PAGE_SIZE }),
    enabled: searching,
    staleTime: 60_000,
  })
  const watches = useQuery({
    queryKey: ['global-search', 'watch', q] as const,
    queryFn: () => watchApi.list({ name: q, page_size: PAGE_SIZE }),
    enabled: searching,
    staleTime: 60_000,
  })
  const seeks = useQuery({
    queryKey: ['global-search', 'seek', q] as const,
    queryFn: () => seekApi.list({ video_title: q, status: ['default', 'upload', 'complete', 'cancel', 'forget'] }),
    enabled: searching,
    staleTime: 60_000,
  })

  // 最近看过：自己的观影记录（接口只回我自己的，>10 秒才算）
  const recentViews = useQuery({
    queryKey: ['global-search', 'recent-views'] as const,
    queryFn: () => recordApi.list({ page: 1, page_size: RECENT_SIZE * 2 }),
    enabled: showingRecents,
    staleTime: 60_000,
  })
  // 我上传的资源：listAll 按 user_id 过滤，返回顺序是入库时间正序，取最后几条再看时间倒序
  const recentUploads = useQuery({
    queryKey: ['global-search', 'recent-uploads', userId] as const,
    queryFn: () => mediaApi.listAll({ user_id: userId }),
    enabled: showingRecents && Boolean(userId),
    staleTime: 60_000,
  })
  const myWatchlists = useQuery({
    queryKey: ['global-search', 'my-watchlists'] as const,
    queryFn: () => watchApi.list({ is_self: true, page_size: RECENT_SIZE }),
    enabled: showingRecents,
    staleTime: 60_000,
  })

  // 关面板并清空，再跳转；跳转用各调用点的内联写法，保持路由类型推导
  const close = () => {
    onClose()
    setTerm('')
    setDebounced('')
  }

  const blocks = useMemo<Block[]>(() => {
    if (searching) {
      return [
        {
          key: 'video',
          label: '影片',
          loading: videos.isFetching,
          hits: (videos.data?.items ?? []).map((row) => ({
            key: `video-${row.video_id}`,
            title: row.video_title,
            sub: row.video_type === 'movie' ? '电影' : '剧集',
            shape: 'poster' as const,
            open: () => {
              close()
              void navigate({ to: '/media/$videoId', params: { videoId: String(row.video_id) }, search: { season: 1, episode: 1 } })
            },
          })),
          all: () => {
            close()
            void navigate({ to: '/library', search: { q, type: '' } })
          },
        },
        {
          key: 'watch',
          label: '片单',
          loading: watches.isFetching,
          hits: (watches.data?.items ?? []).map((row) => ({
            key: `watch-${row.id}`,
            title: String(row.name ?? ''),
            sub: [`${formatThousand(row.video_count)} 部`, row.carrot > 0 ? `${row.carrot} 胡萝卜` : '免费'].join(' · '),
            poster: row.image_poster_url,
            shape: 'wide' as const,
            open: () => {
              close()
              void navigate({
                to: '/watchlists/$watchId',
                params: { watchId: String(row.id) },
                search: { q: '' },
              })
            },
          })),
          all: () => {
            close()
            void navigate({ to: '/watchlists', search: { q, scope: 'all' } })
          },
        },
        {
          key: 'seek',
          label: '求片',
          loading: seeks.isFetching,
          hits: (seeks.data?.items ?? []).map((row) => ({
            key: `seek-${row.id}`,
            title: row.video_title_display,
            sub: [row.video_type === 'movie' ? '电影' : '剧集', `${formatThousand(row.count_request)} 人求`].join(' · '),
            poster: row.video_image_poster,
            shape: 'poster' as const,
            open: () => {
              close()
              void navigate({
                to: '/seek',
                search: { tab: 'all', q: String(row.video_title ?? ''), type: '', mine: false },
              })
            },
          })),
          all: () => {
            close()
            void navigate({ to: '/seek', search: { tab: 'all', q, type: '', mine: false } })
          },
        },
      ]
    }

    // 未输入：最近的活动
    const views = rowsOf(recentViews.data?.items)
    const uploads = (recentUploads.data?.items ?? []).slice().sort((a, b) =>
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
    )

    return [
      {
        key: 'recent-views',
        label: '最近看过',
        loading: recentViews.isFetching,
        hits: views.slice(0, RECENT_SIZE).map((row, index) => {
          const season = Number(row.season_number ?? 1)
          const episode = Number(row.episode_number ?? 1)
          const played = Number(row.play_seconds ?? 0)
          const total = Number(row.media_seconds ?? 0)
          const percent = total > 0 ? Math.min(99, Math.round((played / total) * 100)) : 0
          return {
            key: `recent-view-${String(row.video_media_id ?? row.video_id)}-${index}`,
            title: String(row.video_title ?? '—'),
            sub: [episodeCode(season, episode), percent ? `${percent}%` : '']
              .filter(Boolean)
              .join(' · '),
            poster: row.video_image_poster ? String(row.video_image_poster) : null,
            shape: 'poster' as const,
            open: () => {
              close()
              void navigate({ to: '/media/$videoId', params: { videoId: String(row.video_id) }, search: { season, episode } })
            },
          }
        }),
      },
      {
        key: 'recent-uploads',
        label: '我上传的',
        loading: recentUploads.isFetching,
        hits: uploads.slice(0, RECENT_SIZE).map((row, index) => {
          const season = Number(row.season_number ?? 0)
          const episode = Number(row.episode_number ?? 0)
          // media_name 形如「4K - h265 - HDR - 🐘 上传」，尾部的落款对判断没帮助
          const mediaName = String(row.media_name ?? '').replace(/\s*[-–—]?\s*\S*\s*上传\s*$/, '').trim()
          return {
            key: `recent-upload-${String(row.media_id)}-${index}`,
            title: String(row.video_title ?? mediaName ?? '—'),
            sub: [episodeCode(season, episode), mediaName]
              .filter(Boolean)
              .join(' · '),
            shape: 'poster' as const,
            open: () => {
              close()
              void navigate({
                to: '/media/$videoId',
                params: { videoId: String(row.video_id) },
                search: { season: season || 1, episode: episode || 1 },
              })
            },
          }
        }),
      },
      {
        key: 'my-watchlists',
        label: '我的片单',
        loading: myWatchlists.isFetching,
        hits: (myWatchlists.data?.items ?? []).slice(0, RECENT_SIZE).map((row) => ({
          key: `my-watch-${row.id}`,
          title: String(row.name ?? ''),
          sub: `${formatThousand(row.video_count)} 部`,
          poster: row.image_poster_url,
          shape: 'wide' as const,
          open: () => {
            close()
            void navigate({
              to: '/watchlists/$watchId',
              params: { watchId: String(row.id) },
              search: { q: '' },
            })
          },
        })),
      },
    ]
  }, [searching, videos.data, videos.isFetching, watches.data, watches.isFetching, seeks.data, seeks.isFetching, recentViews.data, recentViews.isFetching, recentUploads.data, recentUploads.isFetching, myWatchlists.data, myWatchlists.isFetching, q])

  const hits = useMemo(() => blocks.flatMap((block) => block.hits), [blocks])

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

  const busy = blocks.some((b) => b.loading)
  const nothing = !busy && hits.length === 0

  // 关闭时不渲染（浮层与查询都在上面按 open 判断过，这里只负责卸载 DOM）
  if (!open) return null

  return (
    <Modal title="搜索" width={640} onClose={onClose} onSubmit={() => hits[active]?.open()}>
      <input
        className="input"
        type="search"
        aria-label="搜索影片、片单、求片"
        placeholder="搜索影片、片单、求片"
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

      <div ref={bodyRef} className="search-panel" role="listbox" aria-label="搜索结果">
        {showingRecents ? null : q.length > 0 && q.length < MIN_LENGTH ? (
          <p className="card-note">输入至少 {MIN_LENGTH} 个字</p>
        ) : null}
        {nothing ? <p className="card-note">{searching ? `没有找到「${q}」` : '还没有可显示的记录'}</p> : null}

        {blocks.map((block) => {
          if (!block.loading && block.hits.length === 0) return null
          return (
            <section key={block.key} className="search-panel__group">
              <p className="search-panel__label">{block.label}</p>
              {block.hits.map((hit) => {
                const index = hits.indexOf(hit)
                return (
                  <button
                    type="button"
                    key={hit.key}
                    data-hit={index}
                    role="option"
                    aria-selected={index === active}
                    className={`search-panel__row${index === active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => hit.open()}
                  >
                    {/* 没有图就不占位：不画方框、也不留空白 */}
                    {hit.poster ? (
                      <Poster src={hit.poster} name={hit.title} shape="square" className="search-panel__poster" />
                    ) : null}
                    <span>
                      <span className="cell-title__name">{hit.title}</span>
                      {hit.sub ? <span className="cell-title__code">{hit.sub}</span> : null}
                    </span>
                  </button>
                )
              })}
              {block.loading && block.hits.length === 0 ? <p className="search-panel__loading">查询中…</p> : null}
              {block.all && block.hits.length > 0 ? (
                <button type="button" className="search-panel__all" onClick={block.all}>
                  在{block.key === 'video' ? '媒体库' : block.key === 'watch' ? '片单' : '求片'}中查看全部
                </button>
              ) : null}
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
