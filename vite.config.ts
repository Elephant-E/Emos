import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/** 开发期把 /api 转发到测试服；生产由 Worker 同域提供静态资源与反代。 */
const API_ORIGIN = process.env.VITE_API_ORIGIN || 'https://test.emos.best'

function fixturesPlugin() {
  return {
    name: 'emos-fixtures',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/__fixtures.json') return next()
        const { readFile } = await import('node:fs/promises')
        const body = await readFile(fileURLToPath(new URL('./dev/fixtures.json', import.meta.url)), 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.end(body)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), fixturesPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5273, proxy: { '/api': { target: API_ORIGIN, changeOrigin: true, secure: true } } },
  build: { target: 'es2020', sourcemap: true },
})
