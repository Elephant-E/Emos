
interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  API_ORIGIN: string
  EMOS_PROXY_NAME?: string
  EMOS_PROXY_ID?: string
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

/**
 * 静态资源的安全响应头。
 *
 * 这是个纯前端管理台：令牌放 localStorage，所以必须尽量避免 XSS 与点击劫持。
 * - script-src 只允许同源（没有内联脚本，Vite 产物是外链 module）
 * - style-src 放开 inline：卡片样式用了大量 style 属性，改成 nonce 成本过高
 * - connect-src 放开 https:：接口走同源 /api 代理，上传直连 temporary.emos.best
 * - frame-ancestors 'none'：后台不允许被任何页面嵌套
 */
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/favicon.ico' || url.pathname.startsWith('/cdn-cgi/')) {
      return new Response(null, { status: 204 })
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyApi(request, url, env)
    }

    const asset = await env.ASSETS.fetch(request)
    // 只在静态资源上补安全头；/api 是 JSON 代理，不需要（也不该）套 CSP
    const headers = new Headers(asset.headers)
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value)
    return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers })
  },
}

async function proxyApi(request: Request, url: URL, env: Env): Promise<Response> {
  const target = new URL(url.pathname + url.search, env.API_ORIGIN)
  const headers = new Headers(request.headers)
  // 鉴权走 Authorization；Cookie 不该跟到上游去
  headers.delete('Cookie')
  if (env.EMOS_PROXY_NAME) headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME)
  if (env.EMOS_PROXY_ID) headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID)
  // 上游按 X-Forwarded-For 记调用方 IP。只信 Cloudflare 写进来的 CF-Connecting-IP：
  // 客户端自带的 X-Forwarded-For 可以被任意伪造，转发过去等于让上游记假 IP。
  const clientIp = request.headers.get('CF-Connecting-IP')
  if (clientIp) headers.set('X-Forwarded-For', clientIp)
  else headers.delete('X-Forwarded-For')

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
