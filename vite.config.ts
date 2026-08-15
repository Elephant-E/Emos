import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

/**
 * 读取 Cloudflare 的 .dev.vars（KEY=VALUE 格式），
 * 与 vite 环境变量合并，保证 dev 与 wrangler 共用同一配置源。
 */
function loadDevVars() {
  const file = fileURLToPath(new URL('./.dev.vars', import.meta.url))
  const vars = {}
  if (!existsSync(file)) return vars
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

export default defineConfig(({ mode }) => {
  // 从 .env* 与 .dev.vars 注入密钥，不再硬编码
  const env = { ...loadEnv(mode, process.cwd(), ''), ...loadDevVars() }
  const tmdbApiKey = env.TMDB_API_KEY || ''
  const spotifyAnonKey = env.SPOTIFY_ANON_KEY || ''
  const emosProxyName = env.EMOS_PROXY_NAME || ''
  const emosProxyId = env.EMOS_PROXY_ID || ''

  return {
    plugins: [
      vue(),
      {
        name: 'login-rewrite',
        configureServer(server) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url && (req.url === '/login' || req.url.startsWith('/login?'))) {
              req.url = req.url.replace('/login', '/login.html')
            }
            next()
          })
        },
      },
      {
        name: 'identify-api',
        configureServer(server) {
          server.middlewares.use(async (req: any, res: any, next: any) => {
            const url: string = req.url || ''
            const isIdentify = url === '/api/identify' && req.method === 'POST'
            const isSpotify = url.startsWith('/api/spotify/search') && req.method === 'GET'

            if (!isIdentify && !isSpotify) {
              next()
              return
            }

            try {
              if (isIdentify) {
                const chunks: Buffer[] = []
                for await (const chunk of req) {
                  chunks.push(chunk)
                }
                const input = JSON.parse(Buffer.concat(chunks).toString())
                const { identify } = await import('./share/identify-core.js')
                const { status, body } = await identify(input, {
                  tmdbApiKey,
                  authHeader: req.headers['authorization'] || '',
                  emosProxyName,
                  emosProxyId,
                })
                res.statusCode = status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(body))
                return
              }

              if (isSpotify) {
                const spotifyUrl = new URL(url, 'http://localhost')
                const { spotifySearch } = await import('./share/spotify-core.js')
                const { status, body, cacheControl } = await spotifySearch(
                  {
                    q: spotifyUrl.searchParams.get('q') || '',
                    type: spotifyUrl.searchParams.get('type') || 'artist',
                    limit: spotifyUrl.searchParams.get('limit') || '15',
                  },
                  { anonKey: spotifyAnonKey }
                )
                res.statusCode = status
                res.setHeader('Content-Type', 'application/json')
                if (cacheControl) res.setHeader('Cache-Control', cacheControl)
                res.end(body)
                return
              }
            } catch (e: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: `中间件内部错误: ${e.message || '未知错误'}` }))
            }
          })
        },
      },
    ],
    esbuild: {
      // 维持原有行为；console 策略调整在 Phase 4 单独处理
      drop: ['console', 'debugger']
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'https://emos.best',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          login: fileURLToPath(new URL('./public/login.html', import.meta.url)),
        },
      },
    },
  }
})