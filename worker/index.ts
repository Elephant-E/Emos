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

    if (url.pathname.startsWith('/api/')) {
      return proxyApi(request, url, env)
    }

    return env.ASSETS.fetch(request)
  },
}

async function proxyApi(request: Request, url: URL, env: Env): Promise<Response> {
  const target = new URL(url.pathname + url.search, env.API_ORIGIN)
  const headers = new Headers(request.headers)
  headers.set('Host', target.host)
  if (env.EMOS_PROXY_NAME) headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME)
  if (env.EMOS_PROXY_ID) headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID)
  // wiki/proxy 要求必须传递 X-FORWARDED-FOR，否则调用方 IP 记不到真实来源
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? '')

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(new Request(target, init))
  } catch (error) {
    return new Response(JSON.stringify({ message: `接口不可达：${(error as Error).message}` }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  if (upstream.status === 204) return new Response(null, { status: 204 })

  const contentType = upstream.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await upstream.text()
    return new Response(JSON.stringify({ message: text || `接口返回了非 JSON 响应（${upstream.status}）` }), {
      status: upstream.status >= 400 ? upstream.status : 502,
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
