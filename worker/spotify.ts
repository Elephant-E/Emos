/**
 * Spotify 歌手搜索：client_credentials 换 token（服务端缓存到过期），再查 /v1/search。
 *
 * 密钥只在服务端（`wrangler secret put SPOTIFY_CLIENT_ID/SECRET` 或本地 `.dev.vars`）。
 * 已知限制：Spotify 要求「App 所有者有 Premium 订阅」，否则搜索返回
 * `Active premium subscription required for the owner of the app.`，
 * 这里把原因原样带出来，界面据此提示，而不是静默失败。
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

let cache: { token: string; expires: number } | null = null

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (cache && Date.now() < cache.expires) return cache.token
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })
  if (!res.ok) throw new Error(`换取 Spotify token 失败（${res.status}）`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  // 提前 60 秒过期，避免边界上用到失效 token
  cache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return data.access_token
}

export interface SpotifyArtist {
  id: string
  name: string
  image?: string | null
}

export async function searchArtists(
  q: string,
  clientId: string,
  clientSecret: string,
): Promise<{ status: number; body: { artists?: SpotifyArtist[]; message?: string } }> {
  if (!q.trim()) return { status: 400, body: { message: '缺少搜索词' } }
  if (!clientId || !clientSecret) {
    return { status: 501, body: { message: '服务端未配置 SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET' } }
  }

  let token: string
  try {
    token = await getToken(clientId, clientSecret)
  } catch (error) {
    return { status: 502, body: { message: (error as Error).message } }
  }

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q.trim())}&type=artist&limit=8`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (!res.ok) {
    // 403/429 的 message 是英文长句，原样带回，由前端翻成人话
    const text = await res.text()
    return { status: res.status, body: { message: text.slice(0, 200) } }
  }

  const data = (await res.json()) as { artists?: { items?: Array<{ id: string; name: string; images?: Array<{ url: string }> }> } }
  const artists = (data.artists?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url ?? null,
  }))
  return { status: 200, body: { artists } }
}
