import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'
import { readFile } from 'node:fs/promises'

/**
 * dev 代理目标。
 * 注意不能直接读 `process.env.VITE_API_ORIGIN`：Vite 是在解析完配置**之后**才加载
 * `.env*` 的，那时这里已经执行过了。改成由 defineConfig 回调传入 loadEnv 的结果。
 */
const DEFAULT_API_ORIGIN = 'https://emos.best'

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN

  return {
  plugins: [react(), fixturesPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '0.0.0.0',
    port: 5273,
    proxy: {
      '/api': {
        target: apiOrigin,
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
        // 改为 504（与 worker 的不可达状态码一致），由 client 的重试集合接手。
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
  // 生产不产出 sourcemap：dist 会整目录上传到 Cloudflare Assets，
  // .map 会连同源码一起被公开下载
  build: { target: 'es2020', sourcemap: mode !== 'production' },
  }
})
