import { request } from './client'
import type {
  BanItem, CarrotDelta, CarrotHistory, IdResult, LineItem, ListResult, LiveListItem, LiveMedia, MessageResult, MusicSong, SeekItem, SeekStatus, ShopOrder, VideoPerson, ShopCategory, ShopProduct, ShopSeller, UserInfo, VideoEpisode, VideoItem, VideoMedia, VideoSeason, VideoType, WatchItem, WatchVideo, WatchVideoCandidate,
} from './types'

const q = (o: Record<string, unknown>) => o

export const sessionApi = {
  profile: () => request<UserInfo>('/api/user'),
}

export const userApi = {
  showEmpty: (isShowEmpty: boolean) => request<{ is_show_empty: boolean }>('/api/user/showEmpty', { method: 'PUT', body: { is_show_empty: isShowEmpty } }),
  pseudonym: (name: string) => request<{ pseudonym: string }>('/api/user/pseudonym', { method: 'PUT', query: { name } }),
  agreeUpload: () => request<unknown>('/api/user/agreeUploadAgreement', { method: 'PUT' }),
  agreeDown: () => request<unknown>('/api/user/agreeDownAgreement', { method: 'PUT' }),
  sign: (content?: string) => request<{ sign_index: number; earn_point: number; continuous_days: number }>('/api/user/sign', { method: 'PUT', query: { content } }),
  passwordTemporary: () => request<{ password: number; second: number }>('/api/user/passwordTemporary'),
  passwordReset: (password: string) => request<unknown>('/api/user/passwordReset', { method: 'PUT', query: { password } }),
  // 下面三个接口 Postman 未收录，旧项目在用；originalImage 是 toggle，
  // 请求体参数被忽略，返回翻转后的值。
  originalImage: () => request<{ is_original_image: boolean }>('/api/user/originalImage', { method: 'PUT', body: {} }),
  unbindTelegram: () => request<unknown>('/api/user/telegram', { method: 'DELETE' }),
  resetToken: () => request<unknown>('/api/user/resetToken', { method: 'PUT' }),
  statsVideoHistory: (dates: string[]) => request<Array<Record<string, unknown>>>('/api/user/stats/video/history', { query: { dates } }),
}

export const inviteApi = {
  info: () => request<{ invite_at: string; invite_remaining: number; invite_count: number; parent: { user_id: string; pseudonym: string | null } }>('/api/invite/info'),
  history: (params: { username?: string; page?: number; page_size?: number; user_id?: string; telegram_user_id?: string }) =>
    request<ListResult<Record<string, unknown>>>('/api/invite/history', { query: params }),
  create: (inviteUserId: string, inviteRemark?: string | null) =>
    request<unknown>('/api/invite', { method: 'POST', body: { invite_user_id: inviteUserId, invite_remark: inviteRemark ?? null } }),
  revoke: (userId: string) => request<{ invite_remaining: number }>('/api/invite/revoke', { method: 'POST', body: { user_id: userId } }),
  // 返回的是全站扁平树（3000+ 节点），用 invite_user_id 是可以自己按需建子树的
  tree: () =>
    request<Array<{ user_id: string; username: string; invite_user_id: string | null; join_at: string; is_disabled?: boolean }>>(
      '/api/invite/tree',
    ),
}

export const uploadApi = {
  recognize: (fileName: string, provider = 'binary') =>
    request<MessageResult>('/api/upload/video/recognize', { query: { file_name: fileName, provider } }),
  saveVideo: (itemType: string, itemId: number, fileId: string) =>
    request<{ count: number; media_id: string; carrot: number }>('/api/upload/video/save', { method: 'POST', body: { item_type: itemType, item_id: itemId, file_id: fileId } }),
  saveSubtitle: (itemType: string, itemId: number, fileId: string) =>
    request<{ carrot: number; subtitle_id: string }>('/api/upload/subtitle/save', { method: 'POST', body: { item_type: itemType, item_id: itemId, file_id: fileId } }),
  disks: () => request<string[]>('/api/upload/store/disk'),
  storeFiles: (pathType: string) =>
    request<Array<{ file_name: string; file_size: number; mime_type: string }>>('/api/upload/store/file', { query: { path_type: pathType } }),
  archive: (payload: Record<string, unknown>) => request<{ media_id: string; carrot: number }>('/api/upload/store/archive', { method: 'POST', body: payload }),
  // file_size 为必填（字节），缺省会 422
  uploadToken: (type: string, fileType: string, fileName: string, fileSize: number) =>
    request<Record<string, unknown>>('/api/upload/getUploadToken', {
      method: 'POST',
      body: { type, file_type: fileType, file_name: fileName, file_size: fileSize },
    }),
}

export const videoApi = {
  list: (params: { page?: number; page_size?: number; title?: string; type?: VideoType; tmdb_id?: number; todb_id?: number; video_id?: number; only_delete?: boolean; with_media?: boolean }) =>
    request<ListResult<VideoItem>>('/api/video/list', { query: params }),
  search: (params: { title?: string; page?: number; page_size?: number; sort_by?: string; type?: VideoType }) =>
    request<ListResult<VideoItem>>('/api/video/search', { query: params }),
  sync: (params: { tmdb_id?: number; todb_id?: number }) => request<Array<Record<string, unknown>>>('/api/video/sync', { method: 'PATCH', query: params }),
  remove: (videoId: number) => request<{ carrot: number; is_delete: boolean }>(`/api/video/${videoId}/delete`, { method: 'PUT' }),
  seasons: (videoId: number) => request<VideoSeason[]>(`/api/video/${videoId}/season`),
  // with_seek 会带回每集的认领信息，用于在集号上标记「这集被求片」
  episodes: (videoId: number, seasonNumber?: number) =>
    request<VideoEpisode[]>(`/api/video/${videoId}/episode`, {
      query: { season_number: seasonNumber, with_seek: true, with_seek_is_request: true },
    }),
  persons: (params: { video_list_id: number; video_season_id?: number; video_episode_id?: number }) =>
    request<ListResult<VideoPerson>>('/api/video/persons', { query: params }),
}

export const mediaApi = {
  list: (params: { video_list_id?: number; video_season_id?: number; video_episode_id?: number; video_part_id?: number; include_metadata?: boolean }) =>
    request<{ medias?: VideoMedia[] }>('/api/video/media/list', { query: params }),
  listAll: (params: { media_id?: string; user_id?: string; status?: string; only_delete?: boolean; include_metadata?: boolean; page?: number; page_size?: number }) =>
    request<ListResult<Record<string, unknown>>>('/api/video/media/listAll', { query: params }),
  remove: (mediaId: string, reason = '后台删除') => request<CarrotDelta>('/api/video/media/delete', { method: 'DELETE', body: { media_id: mediaId, reason } }),
  restore: (mediaId: string) => request<CarrotDelta>('/api/video/media/restore', { method: 'PUT', body: { media_id: mediaId } }),
  move: (mediaId: string, itemType: string, itemId: number) =>
    request<CarrotDelta>('/api/video/media/move', { method: 'PUT', query: { media_id: mediaId, item_type: itemType, item_id: itemId } }),
  rename: (mediaId: string, name: string) => request<CarrotDelta>('/api/video/media/rename', { method: 'PUT', query: { media_id: mediaId, name } }),
  playUrl: (mediaId: string) => request<{ url: string }>('/api/video/media/playUrl', { query: { media_id: mediaId } }),
  syncMetadata: (mediaId: string) => request<CarrotDelta>('/api/video/media/syncMetadata', { method: 'PUT', query: { media_id: mediaId } }),
}

export const subtitleApi = {
  list: (params: { video_list_id?: number; video_episode_id?: number; video_part_id?: number; media_id?: string }) =>
    request<Array<Record<string, unknown>>>('/api/video/subtitle/list', { query: params }),
  remove: (subtitleId: string, reason = '后台删除') => request<CarrotDelta>('/api/video/subtitle/delete', { method: 'DELETE', body: { subtitle_id: subtitleId, reason } }),
  rename: (subtitleId: string, title: string) => request<CarrotDelta>('/api/video/subtitle/rename', { method: 'PUT', query: { subtitle_id: subtitleId, title } }),
}

export const recordApi = {
  list: (params: { page?: number; page_size?: number }) => request<ListResult<Record<string, unknown>>>('/api/video/record/list', { query: params }),
}

export const watchApi = {
  list: (params: { watch_id?: number; type?: 'video' | 'music'; name?: string; author_id?: string; author_username?: string; is_public?: boolean; is_self?: boolean; is_subscribe?: boolean; page?: number; page_size?: number }) =>
    request<ListResult<WatchItem>>('/api/watch', { query: params }),
  createOrUpdate: (payload: { id?: number | null; type: 'video' | 'music'; name: string; description?: string; is_public?: boolean; point?: number; tags?: string[]; is_show_empty?: boolean; image_poster_url?: string | null }) =>
    request<{ watch_id: number; count: number }>('/api/watch', { method: 'POST', body: payload }),
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
  music: (watchId: number, params: { song_title?: string; page?: number; page_size?: number }) =>
    request<ListResult<MusicSong>>(`/api/watch/${watchId}/music`, { query: params }),
  removeMusic: (watchId: number, songId: number) => request<{ count: number }>(`/api/watch/${watchId}/music/${songId}`, { method: 'DELETE' }),
}

export const lineApi = {
  list: (onlySelf?: boolean) => request<LineItem[]>('/api/proxy/line', { query: { only_self: onlySelf } }),
  create: (payload: { name: string; url: string; tagline?: string }) => request<IdResult>('/api/proxy/line', { method: 'POST', body: payload }),
  remove: (id: number) => request<unknown>('/api/proxy/line', { method: 'DELETE', query: { id } }),
}

export interface SeekQuery {
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
  // 后端要求 sort_by/sort_order 必填，缺省会 422
  list: (body: SeekQuery) =>
    request<ListResult<SeekItem>>('/api/seek', {
      method: 'POST',
      body: { sort_by: 'updated_at', sort_order: 'desc', ...body },
    }),
  query: (seekId: number) => request<Record<string, unknown>>('/api/seek/query', { query: { seek_id: seekId } }),
  history: (seekId: number) => request<Array<{ username: string; carrot: number; created_at: string }>>('/api/seek/history', { query: { seek_id: seekId } }),
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
  base: () => request<{ name: string; description: string; total_revenue: number; total_expenditure: number; notify_url: string | null; status: string }>('/api/pay/base'),
  apply: (name: string, description: string) => request<unknown>('/api/pay/apply', { method: 'POST', body: { name, description } }),
  query: (no: string) => request<Record<string, unknown>>('/api/pay/query', { query: { no } }),
  userInfo: (params: { user_id?: string; username?: string; telegram_user_id?: string }) =>
    request<Record<string, unknown>>('/api/pay/getUserInfo', { query: params }),
}

export const shopApi = {
  sellerBase: (sellerId?: number) => request<ShopSeller>('/api/shop/seller/base', { query: { seller_id: sellerId } }),
  sellerApply: (name: string, description: string) => request<unknown>('/api/shop/seller/apply', { method: 'POST', body: { name, description } }),
  sellerUpdate: (payload: Record<string, unknown>) => request<{ name: string; description: string; cover: string; cover_url: string }>('/api/shop/seller/update', { method: 'POST', body: payload }),

  categories: (sellerId?: number) => request<ShopCategory[]>('/api/shop/category/list', { query: { seller_id: sellerId } }),
  createCategory: (name: string, sort: number) => request<{ category_id: number }>('/api/shop/category/create', { method: 'POST', body: { name, sort } }),
  deleteCategory: (categoryId: number) => request<unknown>('/api/shop/category/delete', { method: 'DELETE', query: { category_id: categoryId } }),
  products: (params: { seller_id?: number; category_id?: number; name?: string; sort_by?: string; sort_order?: 'asc' | 'desc'; is_up?: boolean; page?: number; page_size?: number }) =>
    request<ListResult<ShopProduct>>('/api/shop/product/list', { query: params }),
  saveProduct: (payload: Record<string, unknown>) => request<{ product_id: number }>('/api/shop/product/createOrUpdate', { method: 'POST', body: payload }),
  deleteProduct: (productId: number) => request<unknown>('/api/shop/product/delete', { method: 'DELETE', query: { product_id: productId } }),
  productCategory: (productId: number, categoryId: number) => request<{ category_id: number }>('/api/shop/product/category', { method: 'PUT', query: { product_id: productId, category_id: categoryId } }),
  productSort: (productId: number, sort: number) => request<{ sort: number }>('/api/shop/product/sort', { method: 'PUT', query: { product_id: productId, sort } }),
  productUp: (productId: number) => request<{ is_up: boolean }>('/api/shop/product/up', { method: 'PUT', query: { product_id: productId } }),

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

export const musicApi = {
  persons: (params: { person_id?: number; name?: string; page?: number; page_size?: number }) =>
    request<ListResult<Record<string, unknown>>>('/api/music/person/list', { query: params }),
  songs: (params: Record<string, unknown>) => request<ListResult<MusicSong>>('/api/music/song/list', { query: params }),
  albums: (params: Record<string, unknown>) => request<ListResult<Record<string, unknown>>>('/api/music/album/list', { query: params }),
  favorite: (type: string, value: number) => request<{ is_favorite: boolean }>('/api/music/favorite', { method: 'PUT', query: { type, value } }),
  rating: (type: string, value: number, rating: number) => request<{ rating: number | null }>('/api/music/rating', { method: 'PUT', query: { type, value, rating } }),
  sync: (type: string, value: string) => request<{ type: string; value: string }>('/api/music/sync', { method: 'PATCH', query: { type, value } }),
  lyrics: (songId: number) => request<Array<Record<string, unknown>>>(`/api/music/song/${songId}/lyric/list`),
  media: (songId: number) => request<Array<Record<string, unknown>>>(`/api/music/song/${songId}/media/list`),
  deleteSong: (songId: number) => request<CarrotDelta>(`/api/music/song/${songId}/delete`, { method: 'DELETE' }),
}

export const fundApi = {
  orders: (params: { page?: number; page_size?: number } = {}) => request<ListResult<Record<string, unknown>>>('/api/fund/order/list', { query: params }),
  create: (fundActivityCode: string, carrot: number) => request<{ no: string }>('/api/fund/order/create', { method: 'POST', body: { fund_activity_code: fundActivityCode, carrot } }),
  evidence: (payload: { order_no: string; images: string[]; remark: string }) =>
    request<{ payout_status: string }>('/api/fund/order/evidence', { method: 'POST', body: payload }),
}

export const whisperApi = {
  sender: () => request<Array<Record<string, unknown>>>('/api/whisper/sender'),
  receiver: () => request<Array<Record<string, unknown>>>('/api/whisper/receiver'),
  reply: (whisperId: number, content: string) => request<{ whisper_id: number }>('/api/whisper/reply', { method: 'POST', body: { whisper_id: whisperId, content } }),
}

export const api = {
  session: sessionApi, user: userApi, invite: inviteApi, upload: uploadApi, video: videoApi,
  media: mediaApi, subtitle: subtitleApi, record: recordApi, watch: watchApi, line: lineApi,
  seek: seekApi, carrot: carrotApi, live: liveApi, pay: payApi, shop: shopApi, ban: banApi,
  music: musicApi, fund: fundApi, whisper: whisperApi,
}

export { q }
