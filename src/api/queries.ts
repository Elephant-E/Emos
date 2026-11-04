import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { carrotApi, rankApi, seekApi, sessionApi, videoApi, watchApi, type SeekQuery } from './endpoints'
import type { SeekStatus, VideoType } from './types'

export const qk = {
  session: ['session'] as const,
  carrot: ['carrot', 'current'] as const,
  zoneCounts: ['zones', 'counts'] as const,
  rankUpload: ['rank', 'upload'] as const,
  playing: ['rank', 'playing'] as const,
  videos: (p: Record<string, unknown>) => ['videos', p] as const,
  seeks: (p: Record<string, unknown>) => ['seeks', p] as const,
  watches: (p: Record<string, unknown>) => ['watches', p] as const,
  watchVideos: (id: number, p: Record<string, unknown>) => ['watch', id, 'videos', p] as const,
  watchSearch: (id: number, title: string) => ['watch', id, 'search', title] as const,
}

export function useSession() {
  return useQuery({ queryKey: qk.session, queryFn: () => sessionApi.profile(), staleTime: 5 * 60_000 })
}

export function useCarrot() {
  return useQuery({ queryKey: qk.carrot, queryFn: () => carrotApi.current(), staleTime: 60_000 })
}

export const ZONES: Array<{ type: VideoType | 'documentary'; label: string; color: string }> = [
  { type: 'movie', label: '电影', color: 'var(--c-yellow)' },
  { type: 'tv', label: '剧集', color: 'var(--c-green)' },
]

export function useZoneCounts() {
  return useQuery({
    queryKey: qk.zoneCounts,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [movie, tv, all] = await Promise.all([
        videoApi.list({ page: 1, page_size: 1, type: 'movie' }),
        videoApi.list({ page: 1, page_size: 1, type: 'tv' }),
        videoApi.list({ page: 1, page_size: 1 }),
      ])
      return { movie: movie.total, tv: tv.total, total: all.total }
    },
  })
}

export function useSeekOpen() {
  return useQuery({
    queryKey: ['seeks', 'open-count'] as const,
    queryFn: async () => (await seekApi.list({ status: ['default'], page: 1, page_size: 1 })).total,
    staleTime: 60_000,
  })
}

export function useRankUpload() {
  return useQuery({ queryKey: qk.rankUpload, queryFn: () => rankApi.upload(), staleTime: 60_000 })
}

export function usePlayingNow() {
  return useQuery({ queryKey: qk.playing, queryFn: () => rankApi.playingVideo(), refetchInterval: 30_000 })
}

export function useVideoPage(params: { page: number; page_size: number; title?: string; type?: VideoType }) {
  return useQuery({ queryKey: qk.videos(params), queryFn: () => videoApi.list(params), placeholderData: (prev) => prev })
}

export function useSeekPage(params: { page: number; page_size: number; status: SeekStatus[]; sort_by?: SeekQuery['sort_by'] }) {
  return useQuery({
    queryKey: qk.seeks(params),
    queryFn: () => seekApi.list({ ...params, sort_order: 'desc' }),
    placeholderData: (prev) => prev,
  })
}

export function useWatchPage(params: { page: number; page_size: number }) {
  return useQuery({ queryKey: qk.watches(params), queryFn: () => watchApi.list(params), placeholderData: (prev) => prev })
}

export function useWatch(watchId: number) {
  return useQuery({
    queryKey: ['watch', watchId, 'meta'] as const,
    queryFn: () => watchApi.list({ watch_id: watchId }),
    enabled: Number.isFinite(watchId) && watchId > 0,
  })
}

export function useWatchVideos(watchId: number, params: { page: number; page_size: number; video_title?: string }) {
  return useQuery({
    queryKey: qk.watchVideos(watchId, params),
    queryFn: () => watchApi.videos(watchId, params),
    placeholderData: (prev) => prev,
  })
}

export function useWatchSearch(watchId: number, title: string) {
  return useQuery({
    queryKey: qk.watchSearch(watchId, title),
    queryFn: () => watchApi.searchVideos(watchId, { title }),
    enabled: title.trim().length > 0,
  })
}

export function useWatchMutations(watchId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['watch'] })
    qc.invalidateQueries({ queryKey: ['watches'] })
  }

  const addVideo = useMutation({
    mutationFn: (videoId: number) => watchApi.addVideo(watchId, videoId),
    onSuccess: invalidate,
  })
  const removeVideo = useMutation({
    mutationFn: (videoId: number) => watchApi.removeVideo(watchId, videoId),
    onSuccess: invalidate,
  })
  const subscribe = useMutation({ mutationFn: () => watchApi.subscribe(watchId), onSuccess: invalidate })
  const toggleShow = useMutation({ mutationFn: () => watchApi.show(watchId), onSuccess: invalidate })
  const setDynamic = useMutation({ mutationFn: (url: string | null) => watchApi.dynamic(watchId, url), onSuccess: invalidate })
  const sort = useMutation({ mutationFn: (value: number) => watchApi.sort(watchId, value), onSuccess: invalidate })

  return { addVideo, removeVideo, subscribe, toggleShow, setDynamic, sort }
}
