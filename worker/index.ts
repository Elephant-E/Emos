import { searchArtists, resolveSpotifyId } from './spotify'

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  API_ORIGIN: string
  EMOS_PROXY_NAME?: string
  EMOS_PROXY_ID?: string
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/favicon.ico' || url.pathname.startsWith('/cdn-cgi/')) {
      return new Response(null, { status: 204 })
    }

    if (url.pathname === '/api/spotify/search') {
      const { status, body } = await searchArtists(url.searchParams.get('q') ?? '')
      return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
    }

    if (url.pathname === '/api/spotify/lookup') {
      const { status, body } = await resolveSpotifyId(url.searchParams.get('mbid') ?? '')
      return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyApi(request, url, env)
    }

    return env.ASSETS.fetch(request)
  },
}

async function proxyApi(request: Request, url: URL, env: Env): Promise<Response> {
  const target = new URL(url.pathname + url.search, env.API_ORIGIN)
  const headers = new Headers(request.headers)
  if (env.EMOS_PROXY_NAME) headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME)
  if (env.EMOS_PROXY_ID) headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID)
  // wiki/proxy 要求必须传 X-Forwarded-For，否则记不到调用方真实 IP
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? '')

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(new Request(target, init))
  } catch (error) {
    // 与 vite dev 的代理口径一致：连不上上游一律 504，客户端按重试集合处理
    return new Response(JSON.stringify({ message: '上游响应超时，已重试' }), {
      status: 504,
      headers: JSON_HEADERS,
    })
  }

  if (upstream.status === 204) return new Response(null, { status: 204 })

  const contentType = upstream.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await upstream.text()
    return new Response(JSON.stringify({ message: text || '接口返回了非 JSON 响应' }), {
      // 保留上游状态码：状态码本身已经表达了结果，不再改写
      status: upstream.status,
      headers: JSON_HEADERS,
    })
  }

  const forwarded = new Headers(upstream.headers)
  forwarded.delete('cf-ray')
  forwarded.delete('cf-cache-status')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwarded,
  })
}
