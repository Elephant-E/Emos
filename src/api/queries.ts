import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { banApi, carrotApi, inviteApi, lineApi, liveApi, mediaApi, musicApi, payApi, rankApi, seekApi, sessionApi, shopApi, subtitleApi, userApi, videoApi, watchApi, type SeekQuery } from './endpoints'
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

const SESSION_CACHE_KEY = 'emos_admin_profile'

export function useSession() {
  return useQuery({
    queryKey: qk.session,
    staleTime: 5 * 60_000,
    placeholderData: () => {
      try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY)
        return raw ? (JSON.parse(raw) as Awaited<ReturnType<typeof sessionApi.profile>>) : undefined
      } catch {
        return undefined
      }
    },
    queryFn: async () => {
      const profile = await sessionApi.profile()
      try {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(profile))
      } catch {
        /* 忽略 */
      }
      return profile
    },
  })
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

export function useWatchPage(params: { page: number; page_size: number; type?: 'video' | 'music' }) {
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

export function useVideoDetail(videoId: number) {
  return useQuery({
    queryKey: ['video', videoId, 'detail'] as const,
    queryFn: async () => {
      const res = await videoApi.list({ video_id: videoId, page: 1, page_size: 1 })
      return res.items[0] ?? null
    },
    enabled: videoId > 0,
  })
}

export function useSeasons(videoId: number) {
  return useQuery({ queryKey: ['video', videoId, 'seasons'] as const, queryFn: () => videoApi.seasons(videoId), enabled: videoId > 0 })
}

export function useEpisodes(videoId: number, seasonNumber: number) {
  return useQuery({
    queryKey: ['video', videoId, 'episodes', seasonNumber] as const,
    queryFn: () => videoApi.episodes(videoId, seasonNumber),
    enabled: videoId > 0 && seasonNumber >= 0,
  })
}

export function useMediaList(params: { video_list_id: number; video_season_id?: number; video_episode_id?: number }) {
  return useQuery({
    queryKey: ['media', params] as const,
    queryFn: async () => {
      const res = (await mediaApi.list(params)) as unknown
      if (Array.isArray(res)) return res as Array<Record<string, unknown>>
      const obj = res as { data?: unknown; items?: unknown }
      if (Array.isArray(obj.items)) return obj.items as Array<Record<string, unknown>>
      if (Array.isArray(obj.data)) return obj.data as Array<Record<string, unknown>>
      return []
    },
  })
}

export function useSubtitles(params: { video_list_id: number; video_episode_id?: number }) {
  return useQuery({
    queryKey: ['subtitles', params] as const,
    queryFn: () => subtitleApi.list(params),
    enabled: params.video_list_id > 0,
  })
}

export function usePersons(videoId: number) {
  return useQuery({
    queryKey: ['video', videoId, 'persons'] as const,
    queryFn: () => videoApi.persons({ video_list_id: videoId }),
    enabled: videoId > 0,
  })
}

export function useVideoMutations(videoId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['video', videoId] })
    qc.invalidateQueries({ queryKey: ['media'] })
    qc.invalidateQueries({ queryKey: ['subtitles'] })
  }

  return {
    syncVideo: useMutation({ mutationFn: () => videoApi.sync({ todb_id: videoId }), onSuccess: invalidate }),
    removeVideo: useMutation({ mutationFn: () => videoApi.remove(videoId), onSuccess: invalidate }),
    playUrl: useMutation({ mutationFn: (mediaId: string) => mediaApi.playUrl(mediaId) }),
    renameMedia: useMutation({ mutationFn: (p: { mediaId: string; name: string }) => mediaApi.rename(p.mediaId, p.name), onSuccess: invalidate }),
    removeMedia: useMutation({ mutationFn: (mediaId: string) => mediaApi.remove(mediaId), onSuccess: invalidate }),
    syncMetadata: useMutation({ mutationFn: (mediaId: string) => mediaApi.syncMetadata(mediaId), onSuccess: invalidate }),
    renameSubtitle: useMutation({ mutationFn: (p: { id: string; title: string }) => subtitleApi.rename(p.id, p.title), onSuccess: invalidate }),
    removeSubtitle: useMutation({ mutationFn: (id: string) => subtitleApi.remove(id), onSuccess: invalidate }),
  }
}

export function useInviteInfo() {
  return useQuery({ queryKey: ['invite', 'info'] as const, queryFn: () => inviteApi.info() })
}

export function useInviteHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['invite', 'history', page] as const,
    queryFn: () => inviteApi.history({ page, page_size: pageSize }),
    placeholderData: (prev) => prev,
  })
}

export function useInviteTree() {
  return useQuery({ queryKey: ['invite', 'tree'] as const, queryFn: () => inviteApi.tree() })
}

export function useCarrotHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['carrot', 'history', page] as const,
    queryFn: () => carrotApi.history({ page, page_size: pageSize }),
    placeholderData: (prev) => prev,
  })
}

export function useBanList() {
  return useQuery({ queryKey: ['ban', 'list'] as const, queryFn: () => banApi.list() })
}

export function useAccountMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['session'] })
    qc.invalidateQueries({ queryKey: ['invite'] })
    qc.invalidateQueries({ queryKey: ['carrot'] })
    qc.invalidateQueries({ queryKey: ['ban'] })
  }

  return {
    setPseudonym: useMutation({ mutationFn: (name: string) => userApi.pseudonym(name), onSuccess: invalidate }),
    setShowEmpty: useMutation({ mutationFn: (value: boolean) => userApi.showEmpty(value), onSuccess: invalidate }),
    temporaryPassword: useMutation({ mutationFn: () => userApi.passwordTemporary() }),
    resetPassword: useMutation({ mutationFn: (password: string) => userApi.passwordReset(password), onSuccess: invalidate }),
    sign: useMutation({ mutationFn: () => userApi.sign(), onSuccess: invalidate }),
    invite: useMutation({ mutationFn: (payload: { id: string; remark: string }) => inviteApi.create(payload.id, payload.remark || null), onSuccess: invalidate }),
    revoke: useMutation({ mutationFn: (userId: string) => inviteApi.revoke(userId), onSuccess: invalidate }),
    transfer: useMutation({ mutationFn: (payload: { userId: string; carrot: number }) => carrotApi.transfer(payload.userId, payload.carrot), onSuccess: invalidate }),
    banChange: useMutation({ mutationFn: (payload: { type: string; userId: string; reason?: string }) => banApi.change(payload.type, payload.userId, payload.reason), onSuccess: invalidate }),
  }
}

export function useShopSeller() {
  return useQuery({ queryKey: ['shop', 'seller'] as const, queryFn: () => shopApi.sellerBase() })
}

export function useShopCategories(sellerId?: number) {
  return useQuery({
    queryKey: ['shop', 'categories', sellerId ?? 0] as const,
    queryFn: () => shopApi.categories(sellerId),
    enabled: Boolean(sellerId),
  })
}

export function useShopProducts(page: number, categoryId: number, pageSize = 12) {
  return useQuery({
    queryKey: ['shop', 'products', page, categoryId] as const,
    queryFn: () => shopApi.products({ page, page_size: pageSize, category_id: categoryId || undefined, sort_by: 'sort', sort_order: 'asc' }),
    placeholderData: (prev) => prev,
  })
}

export function useShopOrders(page: number, filter: { is_pay?: string; is_delivery?: string }, pageSize = 10) {
  return useQuery({
    queryKey: ['shop', 'orders', page, filter] as const,
    queryFn: () => shopApi.ordersShop({ page, page_size: pageSize, ...filter }),
    placeholderData: (prev) => prev,
  })
}

export function useShopMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shop'] })
    qc.invalidateQueries({ queryKey: ['session'] })
  }
  return {
    toggleUp: useMutation({ mutationFn: (productId: number) => shopApi.productUp(productId), onSuccess: invalidate }),
    setSort: useMutation({ mutationFn: (p: { productId: number; sort: number }) => shopApi.productSort(p.productId, p.sort), onSuccess: invalidate }),
    setCategory: useMutation({ mutationFn: (p: { productId: number; categoryId: number }) => shopApi.productCategory(p.productId, p.categoryId), onSuccess: invalidate }),
    removeProduct: useMutation({ mutationFn: (productId: number) => shopApi.deleteProduct(productId), onSuccess: invalidate }),
    saveProduct: useMutation({ mutationFn: (payload: Record<string, unknown>) => shopApi.saveProduct(payload), onSuccess: invalidate }),
    createCategory: useMutation({ mutationFn: (p: { name: string; sort: number }) => shopApi.createCategory(p.name, p.sort), onSuccess: invalidate }),
    removeCategory: useMutation({ mutationFn: (categoryId: number) => shopApi.deleteCategory(categoryId), onSuccess: invalidate }),
    saveSeller: useMutation({ mutationFn: (payload: { name: string; description: string }) => shopApi.sellerUpdate(payload), onSuccess: invalidate }),
    applySeller: useMutation({ mutationFn: (p: { name: string; description: string }) => shopApi.sellerApply(p.name, p.description), onSuccess: invalidate }),
    deliver: useMutation({ mutationFn: (orderNo: string) => shopApi.delivery(orderNo, true), onSuccess: invalidate }),
    remark: useMutation({ mutationFn: (p: { orderNo: string; remark: string }) => shopApi.remarkOrder(p.orderNo, p.remark), onSuccess: invalidate }),
    removeOrder: useMutation({ mutationFn: (orderNo: string) => shopApi.deleteOrder(orderNo), onSuccess: invalidate }),
  }
}

export function useLiveList(page: number, libraryId: number, pageSize = 10) {
  return useQuery({
    queryKey: ['live', 'list', page, libraryId] as const,
    queryFn: () => liveApi.list({ page, page_size: pageSize, library_id: libraryId || undefined }),
    placeholderData: (prev) => prev,
  })
}

export function useLiveLibrary() {
  return useQuery({ queryKey: ['live', 'library'] as const, queryFn: () => liveApi.library(), staleTime: 5 * 60_000 })
}

export function useLiveMedia(liveListId: number) {
  return useQuery({
    queryKey: ['live', 'media', liveListId] as const,
    queryFn: () => liveApi.media(liveListId, { page: 1, page_size: 50 }),
    enabled: liveListId > 0,
  })
}

export function useLineList() {
  return useQuery({ queryKey: ['line', 'list'] as const, queryFn: () => lineApi.list() })
}

export function useLiveMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['live'] })
  return {
    saveChannel: useMutation({ mutationFn: (payload: Record<string, unknown>) => liveApi.save(payload), onSuccess: invalidate }),
    removeChannel: useMutation({ mutationFn: (id: number) => liveApi.remove(id), onSuccess: invalidate }),
    addMedia: useMutation({ mutationFn: (payload: Record<string, unknown>) => liveApi.addMedia(payload), onSuccess: invalidate }),
    removeMedia: useMutation({ mutationFn: (id: string) => liveApi.removeMedia(id), onSuccess: invalidate }),
    updateMedia: useMutation({ mutationFn: (payload: { live_list_id: number; medias: unknown[] }) => liveApi.updateMedia(payload), onSuccess: invalidate }),
  }
}

export function useLineMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['line'] })
  return {
    create: useMutation({ mutationFn: (payload: { name: string; url: string; tagline?: string }) => lineApi.create(payload), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number) => lineApi.remove(id), onSuccess: invalidate }),
  }
}

export function useMusicSongs(page: number, term: string, pageSize = 20) {
  return useQuery({
    queryKey: ['music', 'songs', page, term] as const,
    queryFn: () => musicApi.songs({ page, page_size: pageSize, name: term || undefined }),
    placeholderData: (prev) => prev,
  })
}

export function useMusicAlbums(page: number, term: string, pageSize = 20) {
  return useQuery({
    queryKey: ['music', 'albums', page, term] as const,
    queryFn: () => musicApi.albums({ page, page_size: pageSize, name: term || undefined }),
    placeholderData: (prev) => prev,
  })
}

export function useMusicPersons(page: number, term: string, pageSize = 20) {
  return useQuery({
    queryKey: ['music', 'persons', page, term] as const,
    queryFn: () => musicApi.persons({ page, page_size: pageSize, name: term || undefined }),
    placeholderData: (prev) => prev,
  })
}

export function useSongLyrics(songId: number) {
  return useQuery({
    queryKey: ['music', 'lyrics', songId] as const,
    queryFn: async () => (await musicApi.lyrics(songId)) as unknown as Array<Record<string, unknown>>,
    enabled: songId > 0,
  })
}

export function useSongMedia(songId: number) {
  return useQuery({
    queryKey: ['music', 'media', songId] as const,
    queryFn: async () => (await musicApi.media(songId)) as unknown as Array<Record<string, unknown>>,
    enabled: songId > 0,
  })
}

export function useMusicMutations(songId = 0) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['music'] })
  return {
    favorite: useMutation({ mutationFn: (p: { type: string; value: number }) => musicApi.favorite(p.type, p.value), onSuccess: invalidate }),
    rating: useMutation({ mutationFn: (p: { type: string; value: number; rating: number }) => musicApi.rating(p.type, p.value, p.rating), onSuccess: invalidate }),
    sync: useMutation({ mutationFn: (p: { type: string; value: string }) => musicApi.sync(p.type, p.value), onSuccess: invalidate }),
    deleteSong: useMutation({ mutationFn: () => musicApi.deleteSong(songId), onSuccess: invalidate }),
  }
}

export function usePayBase() {
  return useQuery({ queryKey: ['pay', 'base'] as const, queryFn: () => payApi.base() })
}

export function usePayOrder(no: string) {
  return useQuery({
    queryKey: ['pay', 'order', no] as const,
    queryFn: () => payApi.query(no),
    enabled: no.trim().length > 0,
    retry: false,
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
