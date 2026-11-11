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
      // 视图声明了自己处理提示（如签到 429），让位给它，否则同一件事弹两条
      if (mutation.meta?.skipErrorToast) return
      const status = (error as { status?: number }).status
      const message = error instanceof Error ? error.message : '操作失败'
      if (status === 401) return
      // client 在没有 message 时已经写成「请求失败（404）」，别再叠一个状态码
      const withStatus = status && !message.includes(`（${status}）`) ? `${message}（${status}）` : message
      toast(withStatus, 'error')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
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
