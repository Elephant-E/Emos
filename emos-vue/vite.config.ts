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
    }
  ],
  server: {
    host: '0.0.0.0', // 监听所有网络接口，允许局域网访问
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:61680',
        changeOrigin: true
      }
    }
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
