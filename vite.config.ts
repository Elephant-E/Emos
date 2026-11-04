import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/** 开发期把 /api 转发到测试服；生产由 Worker 同域提供静态资源与反代。 */
const API_ORIGIN = process.env.VITE_API_ORIGIN || 'https://test.emos.best'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5273, proxy: { '/api': { target: API_ORIGIN, changeOrigin: true, secure: true } } },
  build: { target: 'es2020', sourcemap: true },
})
