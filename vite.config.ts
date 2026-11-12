import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'

const API_ORIGIN = process.env.VITE_API_ORIGIN || 'https://emos.best'

function fixturesPlugin() {
  return {
    name: 'emos-fixtures',
    apply: 'serve' as const,
    configureServer(server: {
      middlewares: {
        use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }, next: () => void) => void) => void
      }
    }) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/__fixtures.json') return next()
        const body = await readFile(fileURLToPath(new URL('./dev/fixtures.json', import.meta.url)), 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.end(body)
      })
    },
  }
}

/** 读取 .dev.vars（KEY=VALUE），与 wrangler 共用同一份配置源 */
function loadDevVars(): Record<string, string> {
  const file = fileURLToPath(new URL('./.dev.vars', import.meta.url))
  if (!existsSync(file)) return {}
  const vars: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

/**
 * dev 与线上同一份实现：`/api/spotify/search` 走 `worker/spotify.ts`，
 * 密钥从 `.dev.vars` 读；其余 `/api/*` 仍由下面的 proxy 转给上游。
 * 必须在 proxy 之前注册，否则会被转发到上游变成 404。
 */
function spotifyDevPlugin() {
  return {
    name: 'emos-spotify-dev',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      const env = { ...loadDevVars(), ...process.env }
      server.middlewares.use(async (req, res, next) => {
        if ((req.url || '').split('?')[0] !== '/api/spotify/search') return next()
        const { searchArtists } = await import('./worker/spotify')
        const q = new URL(req.url || '', 'http://localhost').searchParams.get('q') ?? ''
        const { status, body } = await searchArtists(q, env.SPOTIFY_CLIENT_ID || '', env.SPOTIFY_CLIENT_SECRET || '')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.statusCode = status
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), fixturesPlugin(), spotifyDevPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '0.0.0.0',
    port: 5273,
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false,
        // 上游偶发 10s+ 才响应，默认超时会被切断并变成 ECONNRESET
        timeout: 120_000,
        proxyTimeout: 120_000,
        headers: {
          'EMOS-PROXY-NAME': '@Elephant',
          'EMOS-PROXY-ID': 'e7E6K6OE4s',
        },
        // Node 代理默认复用 keep-alive 连接，上游（Cloudflare）会静默回收空闲连接，
        // 复用时抛 ECONNRESET。
        agent: new https.Agent({ keepAlive: false }),
        // 上游 ECONNRESET 时默认返回 500，客户端不会重试。
        // 改为 504，让 buildUrl 的重试逻辑（502/503/504）接手。
        configure: (proxy: { on: (event: string, handler: (...args: unknown[]) => void) => void }) => {
          proxy.on('error', (...args: unknown[]) => {
            const res = args[2] as { headersSent?: boolean; writeHead?: (code: number, headers: Record<string, string>) => void; end?: (body: string) => void }
            if (!res || res.headersSent) return
            res.writeHead?.(504, { 'Content-Type': 'application/json' })
            res.end?.(JSON.stringify({ message: '上游响应超时，已重试' }))
          })
        },
      },
    },
  },
  build: { target: 'es2020', sourcemap: true },
})
