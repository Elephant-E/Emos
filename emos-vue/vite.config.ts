import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'login-rewrite',
      configureServer(server) {
        server.middlewares.use((req: any, res: any, next: any) => {
          // 匹配 /login 或 /login?... 的路径
          if (req.url && (req.url === '/login' || req.url.startsWith('/login?'))) {
            req.url = req.url.replace('/login', '/login.html')
          }
          next()
        })
      }
    },
    {
      name: 'api-fallback',
      configureServer(server) {
        server.middlewares.use((req: any, res: any, next: any) => {
          // 如果是 API 请求，不要返回 index.html
          if (req.url && req.url.startsWith('/api/')) {
            // 让请求继续，如果后端没有处理，会返回 404
            return next()
          }
          next()
        })
      }
    }
  ],
  server: {
    host: '0.0.0.0', // 监听所有网络接口，允许局域网访问
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./public/login.html', import.meta.url))
      }
    }
  }
})
