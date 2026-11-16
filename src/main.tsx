import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from './ui/toast'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './api/mutation-meta'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // 视图自己处理提示时（如签到 429）跳过全局提示，避免同一件事弹两条
      if (mutation.meta?.skipErrorToast) return
      const status = (error as { status?: number }).status
      const message = error instanceof Error ? error.message : '操作失败'
      if (status === 401) return
      // client 在没有 message 时已写成「请求失败（404）」，此处不再重复追加状态码
      const withStatus = status && !message.includes(`（${status}）`) ? `${message}（${status}）` : message
      toast(withStatus, 'error')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      // 重试发生在 api/client 里（GET 对 502/503/504 与网络失败重试 3 次），
      // 这里关掉 TanStack 自带的重试，否则同一请求最多会被放大成 3×3 次
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
