import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { banApi, carrotApi, inviteApi, lineApi, liveApi, mediaApi, musicApi, payApi, recordApi, seekApi, sessionApi, shopApi, subtitleApi, userApi, videoApi, watchApi, type SeekQuery } from './endpoints'
import type { VideoType } from './types'

export const qk = {
  session: ['session'] as const,
  carrot: ['carrot', 'current'] as const,
  videos: (p: object) => ['videos', p] as const,
  seeks: (p: object) => ['seeks', p] as const,
  watches: (p: object) => ['watches', p] as const,
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

export interface Capabilities {
  isAdmin: boolean
  canView: boolean
  canUpload: boolean
  canDown: boolean
  slotRemaining: number
  inviteRemaining: number | null
  sizeUpload: number
  signedToday: boolean
  isMerchant: boolean
}

export function useCapabilities(): Capabilities {
  const { data } = useSession()
  // 与 useShopSeller() 是同一个接口，共用一份缓存（否则每个页面各拉一次）
  const seller = useShopSeller()

  const isAdmin = Boolean(data?.roles?.includes('admin'))
  return {
    isAdmin,
    canView: Boolean(data?.is_viewing),
    canUpload: Boolean(data?.is_can_upload),
    canDown: Boolean(data?.is_can_down),
    slotRemaining: data?.slot_remaining ?? 0,
    // 后端对管理员也返回具体数字（当前 1），不是「不限」的哨兵值
    inviteRemaining: data?.invite_remaining ?? 0,
    sizeUpload: data?.size_upload ?? 0,
    signedToday: Boolean(data?.sign),
    isMerchant: Boolean(seller.data?.is_self) || isAdmin,
  }
}

export interface WatchStats {
  byDate: Record<string, number>
  totalSeconds: number
  activeDays: number
  days: number
  weeks: Array<Array<{ date: string; seconds: number }>>
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useWatchStats(weeks = 4) {
  return useQuery({
    queryKey: ['watch', 'stats', weeks] as const,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<WatchStats> => {
      const total = weeks * 7
      const today = new Date()
      const dates: string[] = []
      for (let i = total - 1; i >= 0; i -= 1) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        dates.push(isoDate(d))
      }

      const chunks: string[][] = []
      for (let i = 0; i < dates.length; i += 7) chunks.push(dates.slice(i, i + 7))

      const responses = await Promise.all(
        chunks.map((chunk) =>
          userApi.statsVideoHistory(chunk).then((rows) => (rows as unknown as Array<Record<string, unknown>>) ?? []),
        ),
      )

      const byDate: Record<string, number> = {}
      for (const rows of responses) {
        for (const row of rows) {
          const date = String(row.date ?? '')
          if (!date) continue
          byDate[date] = (byDate[date] ?? 0) + Number(row.video_watch_second_real ?? 0)
        }
      }

      const weekRows: WatchStats['weeks'] = []
      for (let w = 0; w < weeks; w += 1) {
        const row = dates.slice(w * 7, w * 7 + 7).map((date) => ({ date, seconds: byDate[date] ?? 0 }))
        weekRows.push(row)
      }

      return {
        byDate,
        weeks: weekRows,
        days: total,
        totalSeconds: Object.values(byDate).reduce((a, b) => a + b, 0),
        activeDays: Object.values(byDate).filter((v) => v > 0).length,
      }
    },
  })
}

export function useContinueWatching() {
  return useQuery({
    queryKey: ['record', 'list'] as const,
    queryFn: async () => {
      const res = (await recordApi.list({ page: 1, page_size: 6 })) as unknown as { items?: Array<Record<string, unknown>> }
      return (res.items ?? []).filter((row) => !row.is_complete).slice(0, 3)
    },
    staleTime: 60_000,
  })
}

export function useCarrot() {
  return useQuery({ queryKey: qk.carrot, queryFn: () => carrotApi.current(), staleTime: 60_000 })
}

export function useTodos() {
  return useQuery({
    queryKey: ['todos'] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const safe = async (run: () => Promise<number>) => {
        try {
          return await run()
        } catch {
          return null
        }
      }
      const [seeks, orders, bans] = await Promise.all([
        safe(() => seekApi.list({ status: ['default'], page: 1, page_size: 1 }).then((r) => r.total)),
        safe(() => shopApi.ordersShop({ page: 1, page_size: 1, is_pay: true, is_delivery: false }).then((r) => r.total)),
        safe(() => banApi.list().then((r) => r.length)),
      ])
      return { seeks, orders, bans }
    },
  })
}

export function useVideoPage(params: {
  page: number
  page_size: number
  title?: string
  type?: VideoType
  tmdb_id?: number
  /** 纯数字搜索：先当站内 video_id，查不到再当 tmdb_id（两个 id 空间不重叠） */
  numericId?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: qk.videos(params),
    queryFn: async () => {
      if (params.numericId) {
        const byVideoId = await videoApi.list({ ...params, video_id: params.numericId, tmdb_id: undefined })
        if ((byVideoId.total ?? 0) > 0) return byVideoId
        return videoApi.list({ ...params, video_id: undefined, tmdb_id: params.numericId })
      }
      return videoApi.list(params)
    },
    enabled: params.enabled ?? true,
  })
}

export function useSeekPage(params: SeekQuery) {
  return useQuery({
    queryKey: qk.seeks(params),
    queryFn: () => seekApi.list({ ...params, sort_order: 'desc' }),
  })
}

export function useUserRecords(userId: string) {
  return useQuery({
    queryKey: ['user', userId, 'records'] as const,
    queryFn: () => recordApi.requests({ user_id: userId, page: 1, page_size: 10 }),
    enabled: Boolean(userId),
  })
}

export function useSeekApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { item_type: string; item_id: number }) => seekApi.apply(p.item_type, p.item_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seeks'] }),
  })
}

/** 轮询只看比 lastId 更新的求片，有新的才让列表重查，避免每 30 秒白刷 2.4 万条。 */
export function useSeekPoll(lastId: number) {
  return useQuery({
    queryKey: ['seek', 'poll', lastId] as const,
    queryFn: () => seekApi.poll(lastId, 20),
    enabled: lastId > 0,
    refetchInterval: 30_000,
  })
}

export function useWatchPage(
  params: {
    page: number
    page_size: number
    type?: 'video' | 'music'
    is_self?: boolean
    is_subscribe?: boolean
    name?: string
  },
  enabled = true,
) {
  return useQuery({
    queryKey: qk.watches(params),
    queryFn: () => watchApi.list(params),
    enabled,
  })
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
  })
}

export function useWatchMusic(
  watchId: number,
  params: { page: number; page_size: number; song_name?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['watch', watchId, 'music', params] as const,
    queryFn: () => watchApi.music(watchId, params),
    enabled,
  })
}

export function useWatchMusicMutations(watchId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['watch', watchId, 'music'] })
    qc.invalidateQueries({ queryKey: ['watch', watchId] })
  }
  return {
    addSong: useMutation({
      mutationFn: (songId: number) => watchApi.addMusic(watchId, songId),
      onSuccess: invalidate,
    }),
    removeSong: useMutation({
      mutationFn: (songId: number) => watchApi.removeMusic(watchId, songId),
      onSuccess: invalidate,
    }),
  }
}

export function useWatchMusicSearch(watchId: number, title: string) {
  return useQuery({
    queryKey: ['watch', watchId, 'musicSearch', title] as const,
    queryFn: () => watchApi.searchMusic(watchId, { song_name: title, page_size: 8 }),
    enabled: title.trim().length > 0,
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

export function useMediaList(
  params: { video_list_id: number; video_season_id?: number; video_episode_id?: number },
  /** 剧集要等选中集才查；否则 media/list 会返回整部剧所有集的资源 */
  enabled = true,
) {
  return useQuery({
    queryKey: ['media', params] as const,
    // 接口返回的是数组本身，不是 { items } 信封
    queryFn: () => mediaApi.list(params) as unknown as Promise<Array<Record<string, unknown>>>,
    enabled: params.video_list_id > 0 && enabled,
  })
}

export function useSubtitles(
  params: { video_list_id: number; video_episode_id?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ['subtitles', params] as const,
    queryFn: () => subtitleApi.list(params),
    enabled: params.video_list_id > 0 && enabled,
  })
}

export function usePersons(videoId: number) {
  return useQuery({
    queryKey: ['video', videoId, 'persons'] as const,
    queryFn: () => videoApi.persons({ video_list_id: videoId, page: 1, page_size: 20 }),
    enabled: videoId > 0,
  })
}

export function useVideoMutations(videoId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['video', videoId] })
    qc.invalidateQueries({ queryKey: ['videos'] })      // 媒体库列表（删除影片后要消失）
    qc.invalidateQueries({ queryKey: ['media'] })
    qc.invalidateQueries({ queryKey: ['subtitles'] })
    qc.invalidateQueries({ queryKey: ['session'] })     // 删除会扣胡萝卜
    qc.invalidateQueries({ queryKey: ['carrot'] })
  }

  return {
    syncVideo: useMutation({
      mutationFn: (todbId: number) => videoApi.sync({ todb_id: todbId }),
      onSuccess: invalidate,
    }),
    removeVideo: useMutation({ mutationFn: () => videoApi.remove(videoId), onSuccess: invalidate }),
    renameMedia: useMutation({ mutationFn: (p: { mediaId: string; name: string }) => mediaApi.rename(p.mediaId, p.name), onSuccess: invalidate }),
    removeMedia: useMutation({
      mutationFn: (p: { mediaId: string; reason: string }) => mediaApi.remove(p.mediaId, p.reason),
      onSuccess: invalidate,
    }),
    syncMetadata: useMutation({ mutationFn: (mediaId: string) => mediaApi.syncMetadata(mediaId), onSuccess: invalidate }),
    renameSubtitle: useMutation({ mutationFn: (p: { id: string; title: string }) => subtitleApi.rename(p.id, p.title), onSuccess: invalidate }),
    removeSubtitle: useMutation({
      mutationFn: (p: { subtitleId: string; reason: string }) => subtitleApi.remove(p.subtitleId, p.reason),
      onSuccess: invalidate,
    }),
  }
}

export function useInviteInfo() {
  return useQuery({ queryKey: ['invite', 'info'] as const, queryFn: () => inviteApi.info() })
}

export function useInviteHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['invite', 'history', page] as const,
    queryFn: () => inviteApi.history({ page, page_size: pageSize }),
  })
}

export function useInviteTree() {
  return useQuery({ queryKey: ['invite', 'tree'] as const, queryFn: () => inviteApi.tree() })
}

export function useCarrotHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['carrot', 'history', page, pageSize] as const,
    queryFn: () => carrotApi.history({ page, page_size: pageSize }),
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
    toggleOriginalImage: useMutation({ mutationFn: () => userApi.originalImage(), onSuccess: invalidate }),
    unbindTelegram: useMutation({ mutationFn: () => userApi.unbindTelegram(), onSuccess: invalidate }),
    agreeUpload: useMutation({ mutationFn: () => userApi.agreeUpload(), onSuccess: invalidate }),
    agreeDown: useMutation({ mutationFn: () => userApi.agreeDown(), onSuccess: invalidate }),
    exchangeSlot: useMutation({ mutationFn: () => watchApi.slot(), onSuccess: invalidate }),
    temporaryPassword: useMutation({ mutationFn: () => userApi.passwordTemporary() }),
    resetPassword: useMutation({ mutationFn: (password: string) => userApi.passwordReset(password), onSuccess: invalidate }),
    sign: useMutation({ mutationFn: (content?: string) => userApi.sign(content), onSuccess: invalidate }),
    remarkInvite: useMutation({
      mutationFn: (p: { userId: string; remark: string }) => inviteApi.remark(p.userId, p.remark),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['invite'] })
      },
    }),
    // 传 null 表示把该账号在所有设备上踢下线
    logoutDevice: useMutation({
      mutationFn: (deviceId: string | null) => userApi.videoLogout(deviceId),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'devices'] }),
    }),
    invite: useMutation({ mutationFn: (payload: { id: string; remark: string }) => inviteApi.create(payload.id, payload.remark || null), onSuccess: invalidate }),
    revoke: useMutation({ mutationFn: (userId: string) => inviteApi.revoke(userId), onSuccess: invalidate }),
    exitInvite: useMutation({ mutationFn: () => inviteApi.exit(), onSuccess: invalidate }),
    inviteEmps: useMutation({ mutationFn: (userId: string) => inviteApi.emps(userId), onSuccess: invalidate }),
    transfer: useMutation({ mutationFn: (payload: { userId: string; carrot: number }) => carrotApi.transfer(payload.userId, payload.carrot), onSuccess: invalidate }),
    banChange: useMutation({ mutationFn: (payload: { type: 'disable' | 'unblock'; userId: string; reason?: string }) => banApi.change(payload.type, payload.userId, payload.reason), onSuccess: invalidate }),
  }
}

/** 不传 sellerId 就是自己的店；传了就查别人的 */
export function useShopSeller(sellerId?: number) {
  return useQuery({
    queryKey: ['shop', 'seller', sellerId ?? 0] as const,
    queryFn: () => shopApi.sellerBase(sellerId),
  })
}

export function useShopCategories(sellerId?: number) {
  return useQuery({
    queryKey: ['shop', 'categories', sellerId ?? 0] as const,
    queryFn: () => shopApi.categories(sellerId),
    enabled: Boolean(sellerId),
  })
}

/** 商品列表查询参数：分页与滚动加载两条路径共用，字段名只写一处 */
function shopProductsQuery(p: {
  sellerId: number
  page: number
  pageSize: number
  categoryId?: number
  name?: string
  sortBy?: '' | 'sales' | 'price'
  onlyUp?: boolean
}) {
  return shopApi.products({
    seller_id: p.sellerId || undefined,
    page: p.page,
    page_size: p.pageSize,
    category_id: p.categoryId || undefined,
    name: p.name || undefined,
    is_up: p.onlyUp ? true : undefined,
    // sort_by 只认 sales / price / sort，传 updated_at / created_at 会 422
    sort_by: p.sortBy || 'sort',
    sort_order: p.sortBy ? 'desc' : 'asc',
  })
}

export function useShopProducts({
  page,
  sellerId,
  categoryId = 0,
  pageSize = 12,
  name = '',
  sortBy = '',
  /** 只查上架商品；管理自己店铺时不传，才能看到下架商品 */
  onlyUp = false,
  enabled = true,
}: {
  page: number
  sellerId: number
  categoryId?: number
  pageSize?: number
  name?: string
  sortBy?: '' | 'sales' | 'price'
  onlyUp?: boolean
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['shop', 'products', sellerId, page, categoryId, name, sortBy, onlyUp] as const,
    queryFn: () => shopProductsQuery({ sellerId, page, pageSize, categoryId, name, sortBy, onlyUp }),
    enabled,
  })
}

/** 商品列表用滚动加载：卡片网格没有页码概念；sellerId 传 0 表示全站。 */
export function useShopProductsInfinite(params: {
  sellerId: number
  categoryId?: number
  name?: string
  sortBy?: '' | 'sales' | 'price'
  onlyUp?: boolean
  pageSize?: number
  enabled?: boolean
}) {
  const { sellerId, categoryId = 0, name = '', sortBy = '', onlyUp = false, pageSize = 24, enabled = true } = params
  return useInfiniteQuery({
    queryKey: ['shop', 'productsInfinite', sellerId, categoryId, name, sortBy, onlyUp] as const,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      shopProductsQuery({ sellerId, page: pageParam, pageSize, categoryId, name, sortBy, onlyUp }),
    // 后端可能收敛 page_size（片单影片固定 15 条），末页按响应里的实际条数判断，
    // 否则请求 24 条只回 15 条时会被误判成「没有下一页」
    getNextPageParam: (last, pages) => {
      const actual = Number(last.page_size) || pageSize
      if (last.items.length < actual) return undefined
      return pages.length + 1
    },
  })
}

export function useShopCounts(sellerId: number) {
  const enabled = sellerId > 0
  const productsAll = useQuery({
    queryKey: ['shop', 'count', 'products', sellerId] as const,
    queryFn: () => shopApi.products({ seller_id: sellerId, page: 1, page_size: 1, sort_by: 'sort', sort_order: 'asc' }),
    enabled,
  })
  const productsOnSale = useQuery({
    queryKey: ['shop', 'count', 'onSale', sellerId] as const,
    queryFn: () =>
      shopApi.products({ seller_id: sellerId, is_up: true, page: 1, page_size: 1, sort_by: 'sort', sort_order: 'asc' }),
    enabled,
  })
  const ordersAll = useQuery({
    queryKey: ['shop', 'count', 'orders', sellerId] as const,
    queryFn: () => shopApi.ordersShop({ page: 1, page_size: 1 }),
    enabled,
  })
  const ordersPending = useQuery({
    queryKey: ['shop', 'count', 'pending', sellerId] as const,
    queryFn: () => shopApi.ordersShop({ page: 1, page_size: 1, is_pay: true, is_delivery: false }),
    enabled,
  })
  // 没有销量统计接口，只能把商品拉回来自己加。
  // 服务端 page_size 硬顶 100（实测传 200 只回 100），所以按响应里的实际条数判是否被截断
  const salesRows = useQuery({
    queryKey: ['shop', 'count', 'sales', sellerId] as const,
    queryFn: () => shopApi.products({ seller_id: sellerId, page: 1, page_size: 100, sort_by: 'sort', sort_order: 'asc' }),
    enabled,
  })
  const salesTotal = salesRows.data?.items.reduce((sum, p) => sum + (p.sales ?? 0), 0)
  const salesCapped = (salesRows.data?.total ?? 0) > (salesRows.data?.page_size ?? 100)
  return {
    productsAll: productsAll.data?.total,
    productsOnSale: productsOnSale.data?.total,
    ordersAll: ordersAll.data?.total,
    ordersPending: ordersPending.data?.total,
    salesTotal,
    salesCapped,
    isLoading: productsAll.isLoading || productsOnSale.isLoading || ordersAll.isLoading || ordersPending.isLoading,
  }
}

/** 商品详情：列表里的字段不全，详情页与下单前各取一次 */
export function useShopProduct(productId: number) {
  return useQuery({
    queryKey: ['shop', 'product', productId] as const,
    queryFn: () => shopApi.product(productId),
    enabled: productId > 0,
    staleTime: 60_000,
  })
}

export function useShopMineOrders(
  page: number,
  filter: { is_pay?: boolean; is_delivery?: boolean; order_no?: string; order_title?: string } = {},
  pageSize = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: ['shop', 'mineOrders', page, pageSize, filter] as const,
    queryFn: () => shopApi.ordersUser({ page, page_size: pageSize, ...filter }),
    enabled,
  })
}

export function useShopOrders(
  page: number,
  filter: { is_pay?: boolean; is_delivery?: boolean; order_no?: string; order_title?: string },
  pageSize = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: ['shop', 'orders', page, pageSize, filter] as const,
    queryFn: () => shopApi.ordersShop({ page, page_size: pageSize, ...filter }),
    enabled,
  })
}

export function useShopMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    // 只失效商品与统计：['shop'] 前缀会连带 seller/categories/orders 等 12 个 query
    qc.invalidateQueries({ queryKey: ['shop', 'products'] })
    qc.invalidateQueries({ queryKey: ['shop', 'productsInfinite'] })
    qc.invalidateQueries({ queryKey: ['shop', 'count'] })
    qc.invalidateQueries({ queryKey: ['shop', 'product'] })
    qc.invalidateQueries({ queryKey: ['shop', 'mineOrders'] })
    qc.invalidateQueries({ queryKey: ['shop', 'orders'] })
    qc.invalidateQueries({ queryKey: ['session'] })
    qc.invalidateQueries({ queryKey: ['carrot'] })   // 下单/退款都会动余额
  }
  return {
    toggleUp: useMutation({ mutationFn: (productId: number) => shopApi.productUp(productId), onSuccess: invalidate }),
    setSort: useMutation({ mutationFn: (p: { productId: number; sort: number }) => shopApi.productSort(p.productId, p.sort), onSuccess: invalidate }),
    setCategory: useMutation({ mutationFn: (p: { productId: number; categoryId: number }) => shopApi.productCategory(p.productId, p.categoryId), onSuccess: invalidate }),
    removeProduct: useMutation({ mutationFn: (productId: number) => shopApi.deleteProduct(productId), onSuccess: invalidate }),
    saveProduct: useMutation({ mutationFn: (payload: Record<string, unknown>) => shopApi.saveProduct(payload), onSuccess: invalidate }),
    sortCategory: useMutation({
      mutationFn: (p: { categoryId: number; sort: number }) => shopApi.sortCategory(p.categoryId, p.sort),
      onSuccess: invalidate,
    }),
    createCategory: useMutation({ mutationFn: (p: { name: string; sort: number }) => shopApi.createCategory(p.name, p.sort), onSuccess: invalidate }),
    removeCategory: useMutation({ mutationFn: (categoryId: number) => shopApi.deleteCategory(categoryId), onSuccess: invalidate }),
    saveSeller: useMutation({ mutationFn: (payload: { name: string; description: string }) => shopApi.sellerUpdate(payload), onSuccess: invalidate }),
    applySeller: useMutation({ mutationFn: (p: { name: string; description: string }) => shopApi.sellerApply(p.name, p.description), onSuccess: invalidate }),
    deliver: useMutation({
      mutationFn: (p: { orderNo: string; sent: boolean }) => shopApi.delivery(p.orderNo, p.sent),
      onSuccess: invalidate,
    }),
    remark: useMutation({ mutationFn: (p: { orderNo: string; remark: string }) => shopApi.remarkOrder(p.orderNo, p.remark), onSuccess: invalidate }),
    // 商户侧：删自己的店铺订单
    deleteOrder: useMutation({ mutationFn: (orderNo: string) => shopApi.deleteOrder(orderNo), onSuccess: invalidate }),
    // 买家侧：删我下的单、催发货、关闭订单
    removeOrder: useMutation({ mutationFn: (orderNo: string) => shopApi.removeOrder(orderNo), onSuccess: invalidate }),
    urgeOrder: useMutation({
      mutationFn: (orderNo: string) => shopApi.urgeOrder(orderNo),
      onSuccess: () => invalidate(),
    }),
    closeOrder: useMutation({ mutationFn: (orderNo: string) => shopApi.closeOrder(orderNo), onSuccess: invalidate }),
    // 下单改库存与销量，付款改订单状态：商品网格、商品详情、两个视角的订单列表
    // 与「我的店铺」的四张统计卡都会变，统一按 ['shop'] 前缀失效
    createOrder: useMutation({
      mutationFn: (p: { productId: number; buyNumber: number; remark?: string | null }) =>
        shopApi.createOrder(p.productId, p.buyNumber, p.remark),
      onSuccess: invalidate,
    }),
    payOrder: useMutation({
      mutationFn: (orderNo: string) => shopApi.payOrder(orderNo),
      onSuccess: invalidate,
    }),
  }
}

export function useLiveList(page: number, libraryId: number, pageSize = 15) {
  return useQuery({
    queryKey: ['live', 'list', page, libraryId] as const,
    queryFn: () => liveApi.list({ page, page_size: pageSize, library_id: libraryId || undefined }),
  })
}

export function useLiveLibrary() {
  return useQuery({ queryKey: ['live', 'library'] as const, queryFn: () => liveApi.library(), staleTime: 5 * 60_000 })
}

export function useLiveMedia(liveListId: number, page = 1) {
  return useQuery({
    queryKey: ['live', 'media', liveListId, page] as const,
    // 该接口的 page_size 被后端固定成 15，传别的也没用
    queryFn: () => liveApi.media(liveListId, { page }),
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

export function useMusicSongs(
  page: number,
  term: string,
  enabled = true,
  pageSize = 20,
  filter: '' | 'no_media' | 'favorite' = '',
) {
  return useQuery({
    queryKey: ['music', 'songs', page, pageSize, term, filter] as const,
    queryFn: () =>
      musicApi.songs({
        page,
        page_size: pageSize,
        name: term || undefined,
        has_media: filter === 'no_media' ? false : undefined,
        is_favorite: filter === 'favorite' ? true : undefined,
      }),
    enabled,
  })
}

export function useMusicAlbums(page: number, term: string, enabled = true, pageSize = 20) {
  return useQuery({
    queryKey: ['music', 'albums', page, pageSize, term] as const,
    queryFn: () => musicApi.albums({ page, page_size: pageSize, name: term || undefined }),
    enabled,
  })
}

export function useMusicPersons(page: number, term: string, enabled = true, pageSize = 20) {
  return useQuery({
    queryKey: ['music', 'persons', page, pageSize, term] as const,
    queryFn: () => musicApi.persons({ page, page_size: pageSize, name: term || undefined }),
    enabled,
  })
}

export function useSong(songId: number) {
  return useQuery({
    queryKey: ['music', 'song', songId] as const,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await musicApi.songs({ song_id: songId, page: 1, page_size: 1 })
      return res.items?.[0] ?? null
    },
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
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['music'] })
    qc.invalidateQueries({ queryKey: ['session'] })  // 删资源会扣胡萝卜
    qc.invalidateQueries({ queryKey: ['carrot'] })
  }
  return {
    favorite: useMutation({ mutationFn: (p: { type: string; value: number }) => musicApi.favorite(p.type, p.value), onSuccess: invalidate }),
    rating: useMutation({ mutationFn: (p: { type: string; value: number; rating: number }) => musicApi.rating(p.type, p.value, p.rating), onSuccess: invalidate }),
    sync: useMutation({ mutationFn: (p: { type: string; value: string }) => musicApi.sync(p.type, p.value), onSuccess: invalidate }),
    deleteSong: useMutation({ mutationFn: () => musicApi.deleteSong(songId), onSuccess: invalidate }),
    createLyric: useMutation({
      mutationFn: (p: { type: string; language: string; content: string }) => musicApi.createLyric(songId, p),
      onSuccess: invalidate,
    }),
    deleteLyric: useMutation({
      mutationFn: (lyricId: number) => musicApi.deleteLyric(songId, lyricId),
      onSuccess: invalidate,
    }),
    deleteMedia: useMutation({
      mutationFn: (p: { mediaId: string; reason: string }) => musicApi.deleteMedia(songId, p.mediaId, p.reason),
      onSuccess: invalidate,
    }),
  }
}

export function useDeletedMedia(page: number, pageSize = 20, q?: string, by: 'media_id' | 'user_id' = 'media_id', enabled = true) {
  return useQuery({
    queryKey: ['recycle', 'media', page, pageSize, q ?? '', by] as const,
    enabled,
    queryFn: async () => {
      const params: Record<string, unknown> = { only_delete: true, page, page_size: pageSize }
      if (q) params[by] = q
      const res = (await mediaApi.listAll(params as Parameters<typeof mediaApi.listAll>[0])) as unknown as {
        items?: Array<Record<string, unknown>>
        total?: number
        page_size?: number
      }
      return { items: res.items ?? [], total: res.total ?? 0, page_size: res.page_size ?? pageSize }
    },
  })
}

export function useDeletedVideos(page: number, pageSize = 20, q?: string, enabled = true) {
  return useQuery({
    queryKey: ['recycle', 'video', page, pageSize, q ?? ''] as const,
    enabled,
    queryFn: () => videoApi.list({ only_delete: true, page, page_size: pageSize, title: q || undefined }),
  })
}

export function useRecycleMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['recycle'] })
    qc.invalidateQueries({ queryKey: ['videos'] })
    qc.invalidateQueries({ queryKey: ['video'] })
    qc.invalidateQueries({ queryKey: ['session'] })  // 恢复会扣胡萝卜
    qc.invalidateQueries({ queryKey: ['carrot'] })
  }
  return {
    restoreMedia: useMutation({ mutationFn: (mediaId: string) => mediaApi.restore(mediaId), onSuccess: invalidate }),
    restoreVideo: useMutation({ mutationFn: (videoId: number) => videoApi.remove(videoId), onSuccess: invalidate }),
  }
}

export function useUserPayInfo(userId: string) {
  return useQuery({
    queryKey: ['user', userId, 'pay'] as const,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        return (await payApi.userInfo({ user_id: userId })) as unknown as import('./types').UserDetail | null
      } catch (error) {
        if ((error as { status?: number }).status === 403) return null
        throw error
      }
    },
  })
}

export function useVideoDevices() {
  return useQuery({
    queryKey: ['user', 'devices'] as const,
    queryFn: () => userApi.videoHistory(),
    staleTime: 60_000,
  })
}

export function useUserInvite(userId: string) {
  return useQuery({
    queryKey: ['user', userId, 'invite'] as const,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: () => inviteApi.history({ user_id: userId, page: 1, page_size: 5 })
        .then((res) => (res?.items?.[0] ?? null) as Record<string, unknown> | null)
        .catch(() => null),
  })
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
    qc.invalidateQueries({ queryKey: ['watch', watchId] })
    qc.invalidateQueries({ queryKey: ['watches'] })
  }

  const addVideo = useMutation({
    mutationFn: (p: { videoId: number; sort?: number }) => watchApi.addVideo(watchId, p.videoId, p.sort ?? 80),
    onSuccess: invalidate,
  })
  const removeVideo = useMutation({
    mutationFn: (videoId: number) => watchApi.removeVideo(watchId, videoId),
    onSuccess: invalidate,
  })
  // POST 同一个 video_id 就是更新这一行的 sort / remark
  const updateVideoEntry = useMutation({
    mutationFn: (p: { videoId: number; sort: number; remark: string | null }) =>
      watchApi.addVideo(watchId, p.videoId, p.sort, p.remark),
    onSuccess: invalidate,
  })
  const addMusic = useMutation({
    mutationFn: (songId: number) => watchApi.addMusic(watchId, songId),
    onSuccess: invalidate,
  })
  const removeMusic = useMutation({
    mutationFn: (songId: number) => watchApi.removeMusic(watchId, songId),
    onSuccess: invalidate,
  })
  // 清空内容：影视、音乐各一个接口；invalidate 的 ['watch'] 前缀同时覆盖 videos 与 music 两个列表
  const clearVideos = useMutation({ mutationFn: () => watchApi.emptyVideos(watchId), onSuccess: invalidate })
  const clearMusic = useMutation({ mutationFn: () => watchApi.emptyMusic(watchId), onSuccess: invalidate })
  const subscribe = useMutation({ mutationFn: () => watchApi.subscribe(watchId), onSuccess: invalidate })
  const toggleShow = useMutation({ mutationFn: () => watchApi.show(watchId), onSuccess: invalidate })
  const setDynamic = useMutation({ mutationFn: (url: string | null) => watchApi.dynamic(watchId, url), onSuccess: invalidate })
  // 编辑：POST /api/watch 带 id 就是更新
  const setMaintainers = useMutation({
    mutationFn: (userIds: string[]) => watchApi.maintainer(watchId, userIds),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: (v: {
      type: 'video' | 'music'
      is_show_empty: boolean
      name: string
      description: string
      is_public: boolean
      point: number
      tags: string[]
      image_poster_url: string | null
    }) =>
      watchApi.createOrUpdate({
        id: watchId,
        type: v.type,
        name: v.name,
        description: v.description.trim() || undefined,
        is_public: v.is_public,
        point: v.point,
        tags: v.tags,
        image_poster_url: v.image_poster_url,
        is_show_empty: v.is_show_empty,
      }),
    onSuccess: invalidate,
  })
  const sort = useMutation({ mutationFn: (value: number) => watchApi.sort(watchId, value), onSuccess: invalidate })

  return {
    addVideo, removeVideo, updateVideoEntry, addMusic, removeMusic, clearVideos, clearMusic,
    subscribe, toggleShow, setDynamic, sort, update, setMaintainers,
  }
}
