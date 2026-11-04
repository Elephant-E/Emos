import { useQuery } from '@tanstack/react-query'
import { overviewApi, seekApi, sessionApi, videoApi, watchApi } from './endpoints'
import type { Overview } from './types'
export const qk = {
  session: ['session'] as const,
  overview: (range: string) => ['overview', range] as const,
  videos: (p: Record<string, unknown>) => ['videos', p] as const,
  seeks: (p: Record<string, unknown>) => ['seeks', p] as const,
  watches: (p: Record<string, unknown>) => ['watches', p] as const,
}
export function useSession() {
  return useQuery({ queryKey: qk.session, queryFn: () => sessionApi.base(), staleTime: 5 * 60_000 })
}
export function useOverview(range: '6m' | '12m') {
  return useQuery<Overview & { degraded?: boolean }, Error>({
    queryKey: qk.overview(range),
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await overviewApi.get(range)
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status !== 404 && status !== 501) throw err
        const [videos, seeks] = await Promise.all([
          videoApi.list({ page: 1, page_size: 1 }),
          seekApi.list({ page: 1, page_size: 1 }),
        ])
        return {
          months: [],
          series: [],
          kpis: {
            play_total: 0,
            play_delta: 0,
            media_total: videos.total,
            media_delta: 0,
            seek_open: seeks.total,
            seek_delta: 0,
            carrot_total: 0,
          },
          updated_at: new Date().toISOString(),
          degraded: true,
        }
      }
    },
  })
}
export function useVideos(params: { page: number; page_size: number; title?: string; type?: string; only_delete?: boolean }) {
  return useQuery({
    queryKey: qk.videos(params),
    queryFn: () => videoApi.list(params),
    placeholderData: (prev) => prev,
  })
}
export function useSeeks(params: { page: number; page_size: number; status?: string }) {
  return useQuery({
    queryKey: qk.seeks(params),
    queryFn: () => seekApi.list(params),
    placeholderData: (prev) => prev,
  })
}
export function useWatches(params: { page: number; page_size: number }) {
  return useQuery({ queryKey: qk.watches(params), queryFn: () => watchApi.list(params) })
}
