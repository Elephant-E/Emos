/**
 * 歌手名 → Spotify artist id。
 *
 * 走 MusicBrainz：免费、无需密钥。歌手的 url 关系里通常带 open.spotify.com 链接，
 * 先按名字查 mbid，再取详情里的 Spotify 链接。
 *
 * 为什么不直连 Spotify：Spotify 现在要求「App 所有者有 Premium 订阅」，
 * 否则 `/v1/search` 一律 403（Active premium subscription required for the owner of the app），
 * 与其保留一条永远失败的路径，不如只留能用的这条。
 *
 * 约束：MusicBrainz 限 1 请求/秒，必须带可联系的 User-Agent；连发会 503。
 */

const MB = 'https://musicbrainz.org/ws/2'
const MB_UA = 'emos-admin/2.0 (https://github.com/Elephant-E)'
const TIMEOUT_MS = 12_000

/** 模块级限速：同一 isolate 内两次请求至少隔 1.1 秒 */
let lastAt = 0
async function throttle(): Promise<void> {
  const wait = 1100 - (Date.now() - lastAt)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastAt = Date.now()
}

/** 结果缓存：同一关键词/条目在 TTL 内不再打 MusicBrainz（它限 1 请求/秒） */
const searchCache = new Map<string, { at: number; hits: ArtistHit[] }>()
const lookupCache = new Map<string, { at: number; id: string | null; name?: string }>()
const SEARCH_TTL = 5 * 60_000
const LOOKUP_TTL = 30 * 60_000

/** 带超时的 fetch；失败返回 null，由调用方给出人话原因 */
async function safeFetch(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface ArtistHit {
  /** MusicBrainz id：点选后再换 Spotify id */
  mbid: string
  name: string
  hint?: string
}

export async function searchArtists(q: string): Promise<{ status: number; body: { artists?: ArtistHit[]; message?: string } }> {
  const term = q.trim()
  if (!term) return { status: 400, body: { message: '缺少搜索词' } }

  const cached = searchCache.get(term)
  if (cached && Date.now() - cached.at < SEARCH_TTL) return { status: 200, body: { artists: cached.hits } }

  // MusicBrainz 偶发慢或 503：给一次重试机会
  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await throttle()
    res = await safeFetch(`${MB}/artist?query=${encodeURIComponent(term)}&fmt=json&limit=8`)
    if (res && res.ok) break
    if (res && res.status !== 503 && res.status !== 429) break
  }
  if (!res) return { status: 502, body: { message: 'MusicBrainz 请求超时，稍后重试' } }
  if (res.status === 503) return { status: 503, body: { message: 'MusicBrainz 限流（1 请求/秒），稍等一下再搜' } }
  if (!res.ok) return { status: 502, body: { message: `MusicBrainz 搜索失败（${res.status}）` } }

  const data = (await res.json().catch(() => null)) as {
    artists?: Array<{ id: string; name: string; country?: string; disambiguation?: string; type?: string }>
  } | null
  const artists = (data?.artists ?? []).map((a) => ({
    mbid: a.id,
    name: a.name,
    hint: [a.type, a.country, a.disambiguation].filter(Boolean).join(' · '),
  }))
  if (artists.length === 0) return { status: 200, body: { artists: [], message: '没有找到歌手，检查拼写或直接填链接' } }
  searchCache.set(term, { at: Date.now(), hits: artists })
  return { status: 200, body: { artists } }
}

/** 从 MusicBrainz 的 url 关系里取 Spotify artist id */
export async function resolveSpotifyId(mbid: string): Promise<{ status: number; body: { id?: string; name?: string; message?: string } }> {
  const target = mbid.trim()
  if (!target) return { status: 400, body: { message: '缺少 mbid' } }

  const cached = lookupCache.get(target)
  if (cached && Date.now() - cached.at < LOOKUP_TTL) {
    return cached.id
      ? { status: 200, body: { id: cached.id, name: cached.name } }
      : { status: 404, body: { message: '这个歌手在 MusicBrainz 上没有 Spotify 链接，请直接填 ID' } }
  }

  await throttle()
  const res = await safeFetch(`${MB}/artist/${encodeURIComponent(target)}?inc=url-rels&fmt=json`)
  if (!res) return { status: 502, body: { message: 'MusicBrainz 请求超时，稍后重试' } }
  if (res.status === 503) return { status: 503, body: { message: 'MusicBrainz 限流，稍等一下再试' } }
  if (!res.ok) return { status: 502, body: { message: `MusicBrainz 详情失败（${res.status}）` } }

  const data = (await res.json().catch(() => null)) as { name?: string; relations?: Array<{ url?: { resource?: string } }> } | null
  const spotifyUrl = (data?.relations ?? []).map((r) => r.url?.resource ?? '').find((u) => u.includes('open.spotify.com/artist/'))
  const match = spotifyUrl?.match(/artist\/([A-Za-z0-9]+)/)
  if (!match) {
    lookupCache.set(target, { at: Date.now(), id: null })
    return { status: 404, body: { message: '这个歌手在 MusicBrainz 上没有 Spotify 链接，请直接填 ID' } }
  }
  lookupCache.set(target, { at: Date.now(), id: match[1], name: data?.name })
  return { status: 200, body: { id: match[1], name: data?.name } }
}
