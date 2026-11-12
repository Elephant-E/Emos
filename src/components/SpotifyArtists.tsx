import { useQuery } from '@tanstack/react-query'

interface SpotifyArtist {
  id: string
  name: string
  images?: Array<{ url: string }>
}

/**
 * Spotify 歌手搜索：走同源 `/api/spotify/search`（Worker / dev 中间件）。
 * 密钥在服务端，前端只拿结果；服务端没配密钥时接口返回 501，这里给一句提示。
 */
export function SpotifyArtists({ query, onPick }: { query: string; onPick: (id: string) => void }) {
  const { data, isFetching, error } = useQuery({
    queryKey: ['spotify', 'artist', query] as const,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=artist&limit=8`)
      const body = (await res.json()) as { artists?: { items?: SpotifyArtist[] }; message?: string }
      if (!res.ok) {
        const raw = body.message ?? `搜索失败（${res.status}）`
        // 配额被用尽是上游的常态故障，翻译成人能看懂的一句
        throw new Error(/429|QUOTA/i.test(raw) ? 'Spotify 配额已用尽，请直接填链接或 ID' : raw)
      }
      return body.artists?.items ?? []
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
