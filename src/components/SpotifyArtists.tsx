import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface ArtistHit {
  /** spotify 结果直接是 artist id；musicbrainz 结果是 mbid，点选时再换 id */
  id?: string
  mbid?: string
  name: string
  hint?: string
}

/**
 * 歌手搜索：走同源 `/api/spotify/search`（MusicBrainz，免费无密钥）。
 * 结果是 mbid，点选时再 `/api/spotify/lookup` 换成 Spotify artist id 填进输入框。
 */
export function SpotifyArtists({ query, onPick }: { query: string; onPick: (id: string) => void }) {
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const { data, isFetching, error } = useQuery({
    queryKey: ['spotify', 'artist', query] as const,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
      const body = (await res.json().catch(() => ({}))) as { artists?: ArtistHit[]; message?: string }
      if (!res.ok) throw new Error(body.message ?? `搜索失败（${res.status}）`)
      return body.artists ?? []
    },
  })

  const resolve = async (hit: ArtistHit) => {
    if (hit.id) {
      onPick(hit.id)
      return
    }
    if (!hit.mbid) return
    setResolving(hit.mbid)
    setResolveError(null)
    try {
      const res = await fetch(`/api/spotify/lookup?mbid=${encodeURIComponent(hit.mbid)}`)
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
      if (!res.ok || !body.id) throw new Error(body.message ?? '没查到对应的 Spotify artist id')
      onPick(body.id)
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : '解析失败')
    } finally {
      setResolving(null)
    }
  }

  if (isFetching) return <p className="card-note">搜索中…</p>
  if (error) return <p className="card-note">{error instanceof Error ? error.message : '搜索不可用'}</p>
  if (!data || data.length === 0) return <p className="card-note">没有找到歌手</p>

  return (
    <>
      <div className="pick-list">
        {data.map((hit) => (
          <button
            type="button"
            key={hit.id ?? hit.mbid ?? hit.name}
            className="pick-row"
            disabled={resolving === hit.mbid}
            onClick={() => void resolve(hit)}
          >
            <span className="pick-row__title">{hit.name}</span>
            <span className="muted text-xs">
              {resolving === hit.mbid ? '解析 Spotify ID…' : (hit.hint || (hit.id ? hit.id : ''))}
            </span>
          </button>
        ))}
      </div>
      {resolveError ? <p className="card-note">{resolveError}</p> : null}
    </>
  )
}
