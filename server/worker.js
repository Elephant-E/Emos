/**
 * Cloudflare Worker：前端静态资源 + 服务端能力 + 上游代理。
 *
 * 与旧项目（main 分支 worker.js）的分工一致，但去掉了资源内嵌那套构建：
 * 静态资源交给 Workers Assets（binding: ASSETS）。
 *
 * 职责：
 *   1. /api/identify        文件名识别（guessit → TMDB → 上游 getVideoId）
 *   2. /api/spotify/search  Spotify 搜索（密钥只在服务端）
 *   3. 其余 /api/*           反向代理到上游 API，浏览器侧同源、不再有 CORS
 *   4. 其它路径             交给 ASSETS（SPA 回退由 assets 配置负责）
 *
 * 需要的配置：
 *   wrangler secret put TMDB_API_KEY
 *   wrangler secret put SPOTIFY_ANON_KEY
 *   [vars] EMOS_PROXY_NAME / EMOS_PROXY_ID / API_ORIGIN
 * 缺密钥时对应接口返回 501，前端据此退回「手动填」路径。
 */

import { identify } from './identify-core.js'
import { spotifySearch } from './spotify-core.js'

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/api/identify') return handleIdentify(request, env)
    if (path === '/api/spotify/search') return handleSpotify(url, env)
    if (path.startsWith('/api/')) return handleProxy(request, url, env)

    if (env.ASSETS) return env.ASSETS.fetch(request)
    return new Response('Not Found', { status: 404 })
  },
}

async function handleIdentify(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  if (!env.TMDB_API_KEY) {
    return new Response(JSON.stringify({ success: false, message: '服务端未配置 TMDB_API_KEY' }), {
      status: 501,
      headers: JSON_HEADERS,
    })
  }
  const payload = await request.json().catch(() => ({}))
  const { status, body } = await identify(payload, {
    tmdbApiKey: env.TMDB_API_KEY,
    authHeader: request.headers.get('Authorization') || '',
    emosProxyName: env.EMOS_PROXY_NAME || '',
    emosProxyId: env.EMOS_PROXY_ID || '',
  })
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function handleSpotify(url, env) {
  if (!env.SPOTIFY_ANON_KEY) {
    return new Response(JSON.stringify({ success: false, message: '服务端未配置 SPOTIFY_ANON_KEY' }), {
      status: 501,
      headers: JSON_HEADERS,
    })
  }
  const params = Object.fromEntries(url.searchParams.entries())
  const { status, body, cacheControl } = await spotifySearch(params, { anonKey: env.SPOTIFY_ANON_KEY })
  return new Response(body, {
    status,
    headers: { ...JSON_HEADERS, ...(cacheControl ? { 'Cache-Control': cacheControl } : {}) },
  })
}

/** 反向代理：保留方法、查询串与请求体，只改目标源 */
async function handleProxy(request, url, env) {
  const origin = env.API_ORIGIN || 'https://emos.best'
  const target = new URL(url.pathname + url.search, origin)
  const upstream = new Request(target, request)
  upstream.headers.set('Host', new URL(origin).host)
  return fetch(upstream)
}
