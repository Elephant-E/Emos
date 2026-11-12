import { useQuery } from '@tanstack/react-query'

interface SpotifyArtist {
  id: string
  name: string
  image?: string | null
}

/** 把服务端带回来的英文原因翻成人话，其他情况原样显示 */
function explain(message: string): string {
  if (/premium subscription/i.test(message)) return 'Spotify 要求 App 所有者开通 Premium，暂时无法按名字搜；请直接填链接或 ID'
  if (/QUOTA|429/.test(message)) return 'Spotify 配额已用尽，请直接填链接或 ID'
  if (/SPOTIFY_CLIENT/.test(message)) return '服务端未配置 Spotify 密钥，请直接填链接或 ID'
  return message
}

/**
 * Spotify 歌手搜索：走同源 `/api/spotify/search`（Worker 与 dev 中间件同一份实现）。
 * 密钥只在服务端，前端只拿结果；不可用时给一句原因并退回手动填。
 */
export function SpotifyArtists({ query, onPick }: { query: string; onPick: (id: string) => void }) {
  const { data, isFetching, error } = useQuery({
    queryKey: ['spotify', 'artist', query] as const,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
      const body = (await res.json().catch(() => ({}))) as { artists?: SpotifyArtist[]; message?: string }
      if (!res.ok) throw new Error(explain(body.message ?? `搜索失败（${res.status}）`))
      return body.artists ?? []
    },
  })

  if (isFetching) return <p className="card-note">搜索中…</p>
  if (error) return <p className="card-note">{error instanceof Error ? error.message : '搜索不可用'}</p>
  if (!data || data.length === 0) return <p className="card-note">没有找到歌手</p>

  return (
    <div className="pick-list">
      {data.map((artist) => (
        <button type="button" key={artist.id} className="pick-row" onClick={() => onPick(artist.id)}>
          <span className="pick-row__title">{artist.name}</span>
          <span className="muted text-xs">{artist.id}</span>
        </button>
      ))}
    </div>
  )
}
