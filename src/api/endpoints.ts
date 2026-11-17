import { request } from './client'
import type {
  BanItem, CarrotDelta, RecognizeResult, UserDetail, CarrotHistory, IdResult, LineItem, ListResult, LiveListItem, LiveMedia, LotteryCreateBody, LotteryWinner, MessageResult, RankCarrotRow, RankPlayingLiveRow, RankPlayingVideoRow, RankSignRow, RankUploadRow, RedPacketCreateBody, RedPacketReceiver, VoteCreateBody, VoteResult, SeekItem, SeekStatus, ShopOrder, VideoPerson, ShopCategory, ShopProduct, ShopSeller, SignCheck, UserInfo, VideoEpisode, VideoItem, VideoMedia, VideoSeason, VideoType, WatchItem, WatchVideo, WatchVideoCandidate, VideoSearchItem } from './types'


export const sessionApi = {
  /** 验 token：只回 { is_sign, user_id }，比拉整份 /api/user 轻得多 */
  check: (token?: string) =>
    request<SignCheck>('/api/sign/check', { token, silent401: true, signal: AbortSignal.timeout(12_000) }),
  profile: () => request<UserInfo>('/api/user'),
}

export const userApi = {
  videoHistory: () =>
    request<Array<{ device_client: string; device_name: string; device_id: string; device_version: string; last_used_at: string }>>(
      '/api/user/server/videoHistory',
    ),
  videoLogout: (deviceId: string | null = null) =>
    request<{ logout_count: number }>('/api/user/server/videoLogout', { method: 'POST', body: { device_id: deviceId } }),
  showEmpty: (isShowEmpty: boolean) => request<{ is_show_empty: boolean }>('/api/user/showEmpty', { method: 'PUT', body: { is_show_empty: isShowEmpty } }),
  pseudonym: (name: string) => request<{ pseudonym: string }>('/api/user/pseudonym', { method: 'PUT', query: { name } }),
  /** 同意上传须知：须用户确认后调用，不代同意 */
  agreeUpload: () => request<unknown>('/api/user/agreeUploadAgreement', { method: 'PUT' }),
  /** 同意下载须知：契约未收录 */
  agreeDown: () => request<unknown>('/api/user/agreeDownAgreement', { method: 'PUT' }),
  sign: (content?: string) => request<{ sign_index: number; earn_point: number; continuous_days: number }>('/api/user/sign', { method: 'PUT', query: { content } }),
  // must_otp 未启用时 password 为 null
  passwordTemporary: () => request<{ password: number | null; second: number }>('/api/user/passwordTemporary'),
  passwordReset: (password: string) => request<unknown>('/api/user/passwordReset', { method: 'PUT', query: { password } }),
  // originalImage 是 toggle：请求体参数被忽略，返回翻转后的值。
  originalImage: () => request<{ is_original_image: boolean }>('/api/user/originalImage', { method: 'PUT', body: {} }),
  /** 同样是 toggle：忽略请求体，返回翻转后的值 */
  showAdult: () => request<{ is_show_adult: boolean }>('/api/user/showAdult', { method: 'PUT', body: {} }),
  unbindTelegram: () => request<unknown>('/api/user/telegram', { method: 'DELETE' }),
  statsVideoHistory: (dates: string[]) => request<Array<Record<string, unknown>>>('/api/user/stats/video/history', { query: { dates } }),
}

export const inviteApi = {
  remark: (userId: string, remark: string) =>
    request<unknown>('/api/invite/remark', { method: 'PUT', body: { user_id: userId, remark } }),
  info: () => request<{ invite_at: string; invite_remaining: number; invite_count: number; parent: { user_id: string; pseudonym: string | null } }>('/api/invite/info'),
  history: (params: { username?: string; page?: number; page_size?: number; user_id?: string; telegram_user_id?: string }) =>
    request<ListResult<Record<string, unknown>>>('/api/invite/history', { query: params }),
  create: (inviteUserId: string, inviteRemark?: string | null) =>
    request<unknown>('/api/invite', { method: 'POST', body: { invite_user_id: inviteUserId, invite_remark: inviteRemark ?? null } }),
  revoke: (userId: string) => request<{ invite_remaining: number }>('/api/invite/revoke', { method: 'POST', body: { user_id: userId } }),
  /** 退出被邀请的关系；退出后要重新找人邀请 */
  exit: () => request<unknown>('/api/invite/exit', { method: 'POST' }),
  /** 邀请某人进入 EMOS，返回花掉的胡萝卜（负数） */
  emps: (inviteUserId: string) => request<{ carrot: number }>('/api/invite/emps', { method: 'POST', body: { invite_user_id: inviteUserId } }),
  // 返回全站扁平树（3000+ 节点），前端按 invite_user_id 自行拼子树
  tree: () =>
    request<Array<{ user_id: string; username: string; invite_user_id: string | null; join_at: string; is_disabled?: boolean }>>(
      '/api/invite/tree',
    ),
}

export const uploadApi = {
  videoBase: (itemType: string, itemId: number) =>
    request<{ title: string; video_medias: VideoMedia[] }>('/api/upload/video/base', {
      query: { item_type: itemType, item_id: itemId },
    }),
  recognize: (fileName: string, provider = 'binary') =>
    request<RecognizeResult>('/api/upload/video/recognize', { query: { file_name: fileName, provider } }),
  saveVideo: (itemType: string, itemId: number, fileId: string) =>
    request<{ count: number; media_id: string; carrot: number }>('/api/upload/video/save', { method: 'POST', body: { item_type: itemType, item_id: itemId, file_id: fileId } }),
  saveSubtitle: (itemType: string, itemId: number, fileId: string) =>
    request<{ carrot: number; subtitle_id: string }>('/api/upload/subtitle/save', { method: 'POST', body: { item_type: itemType, item_id: itemId, file_id: fileId } }),
  // multipart：服务端分片上传（R2 S3 预签名）。token 返回 type=multipart 时走这条路
  multipartPresign: (fileId: string, number: number) =>
    request<Array<{ number: number; upload_url: string }>>(`/api/upload/multipart/${fileId}/presign`, {
      method: 'POST',
      body: { number },
    }),
  multipartComplete: (fileId: string, parts: Array<{ number: number; etag: string }>) =>
    request<{ file_id: string }>(`/api/upload/multipart/${fileId}/complete`, { method: 'POST', body: { parts } }),
  multipartAbort: (fileId: string) => request<unknown>(`/api/upload/multipart/${fileId}/abort`, { method: 'DELETE' }),

  // 图库：上传后 image/list 可查；服务端每页固定 15 条（传别的值被压回），只能靠 page 翻页
  images: (params: { name?: string; date?: string; page?: number; page_size?: number }) =>
    request<ListResult<{ file_id: string; url: string; file_name: string; file_size: number; file_type: string; created_at: string }>>(
      '/api/upload/image/list',
      { query: params },
    ),
  removeImage: (fileId: string) => request<unknown>('/api/upload/image/delete', { method: 'DELETE', query: { file_id: fileId } }),

  // file_size 必填（字节），缺省会 422；file_storage 决定文件落到哪：global 国际 /
  // internal 国内 / default 默认 / zn_r2_upload Zn 存档服 / google_drive 谷歌盘，不传为 default
  uploadToken: (type: string, fileType: string, fileName: string, fileSize: number, fileStorage?: string) =>
    request<Record<string, unknown>>('/api/upload/getUploadToken', {
      method: 'POST',
      body: { type, file_type: fileType, file_name: fileName, file_size: fileSize, file_storage: fileStorage },
    }),
}

export const videoApi = {
  list: (params: { page?: number; page_size?: number; title?: string; type?: VideoType; tmdb_id?: number; todb_id?: number; video_id?: number; only_delete?: boolean; with_media?: boolean }) =>
    request<ListResult<VideoItem>>('/api/video/list', { query: params }),
  /** 只回 5 个字段（video_id/type/title/todb_id/tmdb_id），不是完整 VideoItem */
  search: (params: { title?: string; page?: number; page_size?: number; sort_by?: string; type?: VideoType }) =>
    request<ListResult<VideoSearchItem>>('/api/video/search', { query: params }),
  sync: (params: { tmdb_id?: number; todb_id?: number }) => request<Array<Record<string, unknown>>>('/api/video/sync', { method: 'PATCH', query: params }),
  remove: (videoId: number) => request<{ carrot: number; is_delete: boolean }>(`/api/video/${videoId}/delete`, { method: 'PUT' }),
  seasons: (videoId: number) => request<VideoSeason[]>(`/api/video/${videoId}/season`),
  // with_seek 会带回每集的认领信息，用于在集号上标记「这集被求片」
  episodes: (videoId: number, seasonNumber?: number) =>
    request<VideoEpisode[]>(`/api/video/${videoId}/episode`, {
      query: { season_number: seasonNumber, with_seek: true, with_seek_is_request: true },
    }),
  // 该接口默认 page_size=1（实测 total 8 只回 1 条），必须显式传分页
  persons: (params: { video_list_id: number; video_season_id?: number; video_episode_id?: number; page?: number; page_size?: number }) =>
    request<ListResult<VideoPerson>>('/api/video/persons', { query: { page: 1, page_size: 20, ...params } }),
}

export const mediaApi = {
  // 上游返回数组本身，不是 { medias }
  list: (params: { video_list_id?: number; video_season_id?: number; video_episode_id?: number; video_part_id?: number; include_metadata?: boolean }) =>
    request<VideoMedia[]>('/api/video/media/list', { query: params }),
  // 除了固定字段，还能按任意媒资属性过滤（回收站按媒体名称/ID/上传者搜），故留一个索引签名
  listAll: (params: { only_delete?: boolean; page?: number; page_size?: number; [key: string]: string | number | boolean | undefined }) =>
    request<ListResult<Record<string, unknown>>>('/api/video/media/listAll', { query: params }),
  remove: (mediaId: string, reason = '后台删除') => request<CarrotDelta>('/api/video/media/delete', { method: 'DELETE', body: { media_id: mediaId, reason } }),
  restore: (mediaId: string) => request<CarrotDelta>('/api/video/media/restore', { method: 'PUT', body: { media_id: mediaId } }),
  move: (mediaId: string, itemType: string, itemId: number) =>
    request<CarrotDelta>('/api/video/media/move', { method: 'PUT', query: { media_id: mediaId, item_type: itemType, item_id: itemId } }),
  rename: (mediaId: string, name: string) => request<CarrotDelta>('/api/video/media/rename', { method: 'PUT', query: { media_id: mediaId, name } }),
  // 已有 metadata 的视频回 422「此视频已存在 metadata 信息」——已是目标状态，按成功处理
  syncMetadata: async (mediaId: string) => {
    try {
      return await request<CarrotDelta>('/api/video/media/syncMetadata', { method: 'PUT', query: { media_id: mediaId } })
    } catch (error) {
      if (error instanceof Error && error.message.includes('已存在 metadata')) return { carrot: 0 } as CarrotDelta
      throw error
    }
  },
}

export const subtitleApi = {
  list: (params: { video_list_id?: number; video_episode_id?: number; video_part_id?: number; media_id?: string }) =>
    request<Array<Record<string, unknown>>>('/api/video/subtitle/list', { query: params }),
  remove: (subtitleId: string, reason = '后台删除') => request<CarrotDelta>('/api/video/subtitle/delete', { method: 'DELETE', body: { subtitle_id: subtitleId, reason } }),
  rename: (subtitleId: string, title: string) => request<CarrotDelta>('/api/video/subtitle/rename', { method: 'PUT', query: { subtitle_id: subtitleId, title } }),
}

export const recordApi = {
  requests: (params: { page?: number; page_size?: number; user_id?: string }) =>
    request<ListResult<Record<string, unknown>>>('/api/video/record/request', { query: params }),
  list: (params: { page?: number; page_size?: number }) => request<ListResult<Record<string, unknown>>>('/api/video/record/list', { query: params }),
}

export const watchApi = {
  maintainer: (watchId: number, maintainers: string[]) =>
    request<{ maintainers_count: number }>(`/api/watch/${watchId}/maintainer`, { method: 'PUT', body: { maintainers } }),
  emptyVideos: (watchId: number) => request<{ count: number }>(`/api/watch/${watchId}/video/empty`, { method: 'DELETE' }),
  subscribers: (watchId: number, params: { page?: number; page_size?: number } = {}) =>
    request<ListResult<{ username: string; avatar: string | null; carrot: number; expiration_date: string | null; created_at: string }>>(
      `/api/watch/${watchId}/user`,
      { query: params },
    ),
  list: (params: { watch_id?: number; name?: string; author_id?: string; author_username?: string; is_public?: boolean; is_self?: boolean; is_subscribe?: boolean; page?: number; page_size?: number }) =>
    request<ListResult<WatchItem>>('/api/watch', { query: params }),
  createOrUpdate: (payload: { id?: number | null; name: string; description?: string; is_public?: boolean; point?: number; tags?: string[]; is_show_empty?: boolean; image_poster_url?: string | null }) =>
    request<{ watch_id: number; count: number }>('/api/watch', { method: 'POST', body: { ...payload, type: 'video' } }),
  remove: (watchId: number) => request<unknown>(`/api/watch/${watchId}`, { method: 'DELETE' }),
  slot: () => request<{ slot_remaining: number }>('/api/watch/slot', { method: 'POST' }),
  sort: (watchId: number, sort: number) => request<unknown>(`/api/watch/${watchId}/sort`, { method: 'PUT', query: { sort } }),
  show: (watchId: number) => request<{ is_show: boolean }>(`/api/watch/${watchId}/show`, { method: 'PUT' }),
  subscribe: (watchId: number, sort?: number) => request<{ is_subscribe: boolean }>(`/api/watch/${watchId}/subscribe`, { method: 'PUT', query: { sort } }),
  dynamic: (watchId: number, url: string | null) => request<{ url: string | null }>(`/api/watch/${watchId}/dynamic`, { method: 'PUT', body: { url } }),
  videos: (watchId: number, params: { video_title?: string; page?: number; page_size?: number }) =>
    request<ListResult<WatchVideo>>(`/api/watch/${watchId}/video`, { query: params }),
  searchVideos: (watchId: number, params: { title?: string; type?: VideoType }) =>
    request<WatchVideoCandidate[]>(`/api/watch/${watchId}/video/search`, { query: params }),
  addVideo: (watchId: number, videoId: number, sort = 80, remark: string | null = null) =>
    request<{ count: number }>(`/api/watch/${watchId}/video/${videoId}`, { method: 'POST', body: { sort, remark } }),
  removeVideo: (watchId: number, videoId: number) =>
    request<{ count: number }>(`/api/watch/${watchId}/video/${videoId}`, { method: 'DELETE' }),
}

export const lineApi = {
  list: (onlySelf?: boolean) => request<LineItem[]>('/api/proxy/line', { query: { only_self: onlySelf } }),
  create: (payload: { name: string; url: string; tagline?: string }) => request<IdResult>('/api/proxy/line', { method: 'POST', body: payload }),
  remove: (id: number) => request<unknown>('/api/proxy/line', { method: 'DELETE', query: { id } }),
}

interface SeekQuery {
  video_type?: VideoType | null
  sort_by?: 'count_request' | 'seek_carrot' | 'upload_expired_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
  status?: SeekStatus[]
  upload_self?: boolean
  video_title?: string | null
  with_user?: boolean
  page?: number
  page_size?: number
}

export const seekApi = {
  /** 增量拉取：只回比 last_id 更新的求片 */
  poll: (lastId?: number, pageSize = 10) =>
    request<SeekItem[]>('/api/seek/poll', { query: { last_id: lastId, page_size: pageSize } }),
  apply: (itemType: string, itemId: number) =>
    request<{ seek_is_request: boolean }>('/api/seek/apply', { method: 'PUT', query: { item_type: itemType, item_id: itemId } }),
  // 后端要求 sort_by/sort_order 必填，缺省会 422
  list: (body: SeekQuery) =>
    request<ListResult<SeekItem>>('/api/seek', {
      method: 'POST',
      body: { sort_by: 'updated_at', sort_order: 'desc', ...body },
    }),
  claim: (seekId: number, type: 'confirm' | 'cancel') => request<{ status: string }>('/api/seek/claim', { method: 'PUT', body: { seek_id: seekId, type } }),
  urge: (seekId: number, carrot: number) => request<unknown>('/api/seek/urge', { method: 'PUT', body: { seek_id: seekId, carrot } }),
}

export const carrotApi = {
  current: () => request<{ carrot: number }>('/api/carrot/current'),
  history: (params: { type?: string; user_id?: string; page?: number; page_size?: number }) =>
    request<ListResult<CarrotHistory>>('/api/carrot/history', { query: params }),
  transfer: (userId: string, carrot: number) => request<{ carrot: number }>('/api/carrot/transfer', { method: 'PUT', body: { user_id: userId, carrot } }),
}

export const liveApi = {
  list: (params: { library_id?: number; code?: string; title?: string; page?: number; page_size?: number }) =>
    request<ListResult<LiveListItem>>('/api/live/list', { query: params }),
  save: (payload: Record<string, unknown>) => request<{ count: number }>('/api/live/list', { method: 'POST', body: payload }),
  remove: (liveListId: number) => request<unknown>(`/api/live/list/${liveListId}`, { method: 'DELETE' }),
  media: (liveListId: number, params: { page?: number; page_size?: number } = {}) =>
    request<ListResult<LiveMedia>>('/api/live/media', { query: { live_list_id: liveListId, ...params } }),
  addMedia: (payload: Record<string, unknown>) => request<{ live_media_id: string; carrot: number }>('/api/live/media', { method: 'POST', body: payload }),
  removeMedia: (liveMediaId: string) => request<CarrotDelta>(`/api/live/media/${liveMediaId}`, { method: 'DELETE' }),
  updateMedia: (payload: { live_list_id: number; medias: unknown[] }) => request<{ delete_count: number }>('/api/live/media/update', { method: 'POST', body: payload }),
  library: () => request<Array<{ id: number; title: string; image_poster_url: string | null }>>('/api/live/library'),
}

export const payApi = {
  update: (payload: Record<string, unknown>) => request<unknown>('/api/pay/update', { method: 'POST', body: payload }),
  close: (no: string) => request<{ is_close: boolean }>('/api/pay/close', { method: 'PUT', query: { no } }),
  userCarrot: (userId: string) => request<{ carrot: number }>('/api/pay/getUserCarrot', { query: { user_id: userId } }),
  base: () => request<{ name: string; description: string; total_revenue: number; total_expenditure: number; notify_url: string | null; status: string }>('/api/pay/base'),
  apply: (name: string, description: string) => request<unknown>('/api/pay/apply', { method: 'POST', body: { name, description } }),
  query: (no: string) => request<Record<string, unknown>>('/api/pay/query', { query: { no } }),
  userInfo: (params: { user_id?: string; username?: string; telegram_user_id?: string }) =>
    request<UserDetail>('/api/pay/getUserInfo', { query: params }),
  /** 查别人的签到信息（服务商权限；非服务商 403） */
  userSign: (userId: string) =>
    request<{ sign_index: number; sign_at: string; earn_point: number; continuous_days: number; content: string | null }>(
      '/api/pay/getUserSign',
      { query: { user_id: userId } },
    ),
  /** 服务商把钱转给用户，费率千六；返回本次消耗与剩余 */
  transfer: (payload: { user_id: string; carrot: number }) =>
    request<{ deduct: number; carrot: number }>('/api/pay/transfer', { method: 'POST', body: payload }),
  /** 建支付单：web 方式返回 pay_url，tg 机器人方式返回跳转信息 */
  createOrder: (payload: { pay_way: 'telegram_bot' | 'web'; price: number; name: string; param?: string | null; callback_telegram_bot_name?: string | null }) =>
    request<{ no: string; pay_way: string; pay_url?: string; expired?: string }>('/api/pay/create', { method: 'POST', body: payload }),
  /** 给用户发邮件通知，扣 10 胡萝卜 */
  sendNotifyEmail: (payload: { user_id: string; subject: string; body: string }) =>
    request<CarrotDelta>('/api/pay/sendNotifyEmail', { method: 'POST', body: payload }),
}

export const shopApi = {
  sortCategory: (categoryId: number, sort: number) =>
    request<{ sort: number }>('/api/shop/category/sort', { method: 'PUT', body: { category_id: categoryId, sort } }),
  product: (productId: number) =>
    request<ShopProduct>('/api/shop/product/info', { query: { product_id: productId } }),
  sellerBase: (sellerId?: number) => request<ShopSeller>('/api/shop/seller/base', { query: { seller_id: sellerId } }),
  sellerApply: (name: string, description: string) => request<unknown>('/api/shop/seller/apply', { method: 'POST', body: { name, description } }),
  sellerUpdate: (payload: Record<string, unknown>) => request<{ name: string; description: string; cover: string; cover_url: string }>('/api/shop/seller/update', { method: 'POST', body: payload }),

  categories: (sellerId?: number) => request<ShopCategory[]>('/api/shop/category/list', { query: { seller_id: sellerId } }),
  createCategory: (name: string, sort: number) => request<{ category_id: number }>('/api/shop/category/create', { method: 'POST', body: { name, sort } }),
  deleteCategory: (categoryId: number) => request<unknown>('/api/shop/category/delete', { method: 'DELETE', query: { category_id: categoryId } }),
  products: (params: { seller_id?: number; category_id?: number; name?: string; sort_by?: string; sort_order?: 'asc' | 'desc'; is_up?: boolean; page?: number; page_size?: number }) => {
    // 后端把 sort_by / sort_order 当必填：都不传也 422。这里无条件补齐：
    // 不排序时 sort/asc，指定了排序字段则倒序，调用方不用记规则。
    const sortBy = params.sort_by || 'sort'
    const sortOrder = params.sort_order || (params.sort_by ? 'desc' : 'asc')
    return request<ListResult<ShopProduct>>('/api/shop/product/list', {
      query: { ...params, sort_by: sortBy, sort_order: sortOrder },
    })
  },
  saveProduct: (payload: Record<string, unknown>) => request<{ product_id: number }>('/api/shop/product/createOrUpdate', { method: 'POST', body: payload }),
  deleteProduct: (productId: number) => request<unknown>('/api/shop/product/delete', { method: 'DELETE', query: { product_id: productId } }),
  productSort: (productId: number, sort: number) => request<{ sort: number }>('/api/shop/product/sort', { method: 'PUT', query: { product_id: productId, sort } }),
  productUp: (productId: number) => request<{ is_up: boolean }>('/api/shop/product/up', { method: 'PUT', query: { product_id: productId } }),

  // 买家侧：管理员也是用户，后台要能像用户端一样下单
  ordersUser: (params: { seller_id?: number; product_id?: number; order_title?: string; order_no?: string; is_pay?: boolean; is_delivery?: boolean; page?: number; page_size?: number }) =>
    request<ListResult<ShopOrder>>('/api/shop/order/user/list', { query: params }),
  createOrder: (productId: number, buyNumber: number, remark?: string | null) =>
    request<{ no: string; buy_number: number; price: number; expired: string }>('/api/shop/order/user/create', {
      method: 'POST',
      body: { product_id: productId, buy_number: buyNumber, remark: remark ?? null },
    }),
  payOrder: (orderNo: string) => request<MessageResult>('/api/shop/order/user/pay', { method: 'POST', body: { order_no: orderNo } }),
  urgeOrder: (orderNo: string) => request<{ urge_number: number }>('/api/shop/order/user/urge', { method: 'PUT', body: { order_no: orderNo } }),
  closeOrder: (orderNo: string) => request<unknown>('/api/shop/order/user/close', { method: 'POST', body: { order_no: orderNo } }),
  removeOrder: (orderNo: string) => request<unknown>('/api/shop/order/user/order', { method: 'DELETE', query: { order_no: orderNo } }),

  ordersShop: (params: { user_id?: string; order_no?: string; order_title?: string; is_pay?: boolean; is_delivery?: boolean; product_id?: number; page?: number; page_size?: number }) =>
    request<ListResult<ShopOrder>>('/api/shop/order/shop/order', { query: params }),
  delivery: (orderNo: string, isDelivery: boolean) => request<{ time_delivery: string }>('/api/shop/order/shop/delivery', { method: 'PUT', body: { order_no: orderNo, is_delivery: isDelivery } }),
  remarkOrder: (orderNo: string, remark: string) => request<unknown>('/api/shop/order/shop/remark', { method: 'POST', body: { order_no: orderNo, remark } }),
  deleteOrder: (orderNo: string) => request<{ is_delete: boolean }>('/api/shop/order/shop/order', { method: 'DELETE', query: { order_no: orderNo } }),

}

export const banApi = {
  list: () => request<BanItem[]>('/api/ban/list'),
  // reason 对 disable 与 unblock 都是必填，缺了直接 422
  change: (type: 'disable' | 'unblock', userId: string, reason = '后台操作') =>
    request<CarrotDelta>('/api/ban/change', { method: 'PUT', query: { type, user_id: userId, reason } }),
}

export const redPacketApi = {
  create: (body: RedPacketCreateBody) => request<{ red_packet_id: string }>('/api/redPacket/create', { method: 'POST', body }),
  receive: (params: { red_packet_id: string; page?: number; page_size?: number }) =>
    request<ListResult<RedPacketReceiver>>('/api/redPacket/receive', { query: params }),
}

export const rankApi = {
  carrot: () => request<RankCarrotRow[]>('/api/rank/carrot'),
  upload: () => request<RankUploadRow[]>('/api/rank/upload'),
  sign: () => request<RankSignRow[]>('/api/rank/sign'),
  playingVideo: () => request<RankPlayingVideoRow[]>('/api/rank/userVideoRecordPlaying'),
  playingLive: () => request<RankPlayingLiveRow[]>('/api/rank/userLiveRecordPlaying'),
}

export const lotteryApi = {
  create: (body: LotteryCreateBody) => request<{ lottery_id: string }>('/api/lottery/create', { method: 'POST', body }),
  win: (lotteryId: string) => request<LotteryWinner>('/api/lottery/win', { query: { lottery_id: lotteryId } }),
  cancel: (lotteryId: string) => request<{ is_success: boolean }>('/api/lottery/cancel', { method: 'PUT', query: { lottery_id: lotteryId } }),
  stop: (lotteryId: string) => request<unknown>('/api/lottery/stop', { method: 'PUT', query: { lottery_id: lotteryId } }),
}

export const voteApi = {
  create: (body: VoteCreateBody) =>
    request<{ vote_id: number; time_end: string }>('/api/telegram/vote/create', { method: 'POST', body }),
  result: (voteId: string) => request<VoteResult>('/api/telegram/vote/result', { query: { vote_id: voteId } }),
}

export const fundApi = {
  orders: (params: { page?: number; page_size?: number } = {}) => request<ListResult<Record<string, unknown>>>('/api/fund/order/list', { query: params }),
  create: (fundActivityCode: string, carrot: number) => request<{ no: string }>('/api/fund/order/create', { method: 'POST', body: { fund_activity_code: fundActivityCode, carrot } }),
  /** 下单前的资格检查：返回 message 说明不能参与（如「活动仅可以参与 1 次」） */
  check: (fundActivityCode: string) =>
    request<{ message?: string }>('/api/fund/order/check', { method: 'POST', body: { fund_activity_code: fundActivityCode } }),
  evidence: (payload: { order_no: string; images: string[]; remark: string }) =>
    request<{ payout_status: string }>('/api/fund/order/evidence', { method: 'POST', body: payload }),
}

export const whisperApi = {
  create: (payload: { receiver_user_id: string; content: string }) =>
    request<{ whisper_id: number }>('/api/whisper/create', { method: 'POST', body: payload }),
  sender: () => request<Array<Record<string, unknown>>>('/api/whisper/sender'),
  receiver: () => request<Array<Record<string, unknown>>>('/api/whisper/receiver'),
  reply: (whisperId: number, content: string) => request<{ whisper_id: number }>('/api/whisper/reply', { method: 'POST', body: { whisper_id: whisperId, content } }),
}

