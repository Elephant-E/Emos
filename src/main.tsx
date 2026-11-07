import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from './ui/toast'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      const status = (error as { status?: number }).status
      const message = error instanceof Error ? error.message : '操作失败'
      if (status === 401) return
      toast(status ? `${message}（${status}）` : message, 'error')
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
