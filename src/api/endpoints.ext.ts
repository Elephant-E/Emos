import { request } from './client'
import type {
  CarrotDelta, ListResult, MessageResult, MusicSong, SeekItem, ShopOrder, ShopProduct, SignCheck, UserBase, VideoMedia,
} from './types'

/**
 * 后台没有接入、但接口存在的客户端侧能力（排行 / 红包 / 抽奖 / 短视频 / 设备管理等）。
 * endpoints.ts 只保留真正被 UI 调用的端点，这里作为完整 typed client 的第二部分。
 */
export const clientApi = {
  session: {
    check: () => request<SignCheck>('/api/sign/check'),
    base: () => request<UserBase>('/api/user/base'),
  },
  user: {
    videoHistory: () => request<Array<{ device_client: string; device_name: string; device_id: string; device_version: string; last_used_at: string }>>('/api/user/server/videoHistory'),
    videoLogout: (deviceId: string | null = null) => request<{ logout_count: number }>('/api/user/server/videoLogout', { method: 'POST', body: { device_id: deviceId } }),
  },
  invite: {
    emps: (inviteUserId: string) => request<unknown>('/api/invite/emps', { method: 'POST', body: { invite_user_id: inviteUserId } }),
    remark: (userId: string, remark: string) => request<unknown>('/api/invite/remark', { method: 'PUT', body: { user_id: userId, remark } }),
  },
  upload: {
    videoBase: (itemType: string, itemId: number) =>
      request<{ title: string; video_medias: VideoMedia[] }>('/api/upload/video/base', { query: { item_type: itemType, item_id: itemId } }),
    imageList: (params: { name?: string; date?: string }) =>
      request<ListResult<{ file_id: string; url: string; file_type: string; file_name: string; file_size: number; created_at: string }>>('/api/upload/image/list', { query: params }),
    deleteImage: (fileId: string) => request<{ is_delete: boolean }>('/api/upload/image/delete', { method: 'DELETE', query: { file_id: fileId } }),
    saveMusic: (musicSongId: number, fileId: string) =>
      request<{ carrot: number; media_id: string }>('/api/upload/music/save', { method: 'POST', body: { music_song_id: musicSongId, file_id: fileId } }),
    saveMusicHeadless: (payload: Record<string, unknown>) =>
      request<{ carrot: number; media_id: string }>('/api/upload/music/saveHeadless', { method: 'POST', body: payload }),
  },
  video: {
    tree: (params: { type?: string; title?: string; tmdb_id?: number; todb_id?: number; video_id?: number }) =>
      request<Array<Record<string, unknown>>>('/api/video/tree', { query: params }),
    getVideoId: (params: { video_id_type: string; video_id_value: string; season_number?: number; episode_number?: number; tmdb_type?: string }) =>
      request<Record<string, unknown>>('/api/video/getVideoId', { query: params }),
  },
  record: {
    requests: (params: { page?: number; page_size?: number; user_id?: string }) =>
      request<ListResult<Record<string, unknown>>>('/api/video/record/request', { query: params }),
    change: (mode: string, type: string, id: number) => request<{ count: number }>('/api/video/record/change', { method: 'PUT', query: { mode, type, id } }),
  },
  watch: {
    maintainer: (watchId: number, maintainers: string[]) =>
      request<{ maintainers_count: number }>(`/api/watch/${watchId}/maintainer`, { method: 'PUT', body: { maintainers } }),
    users: (watchId: number, params: { page?: number; page_size?: number }) =>
      request<ListResult<Record<string, unknown>>>(`/api/watch/${watchId}/user`, { query: params }),

    emptyVideos: (watchId: number) => request<{ count: number }>(`/api/watch/${watchId}/video/empty`, { method: 'DELETE' }),
    updateVideos: (watchId: number, items: Array<{ type: 'tmdb_tv' | 'tmdb_movie' | 'todb' | 'video_id'; value: string }>) =>
      request<Array<{ id: number; title: string }>>(`/api/watch/${watchId}/video/update`, { method: 'POST', body: items }),    emptyMusic: (watchId: number) => request<{ count: number }>(`/api/watch/${watchId}/music/empty`, { method: 'DELETE' }),
  },
  seek: {
    poll: (lastId?: number, pageSize = 10) => request<SeekItem[]>('/api/seek/poll', { query: { last_id: lastId, page_size: pageSize } }),
    apply: (itemType: string, itemId: number) => request<{ seek_is_request: boolean }>('/api/seek/apply', { method: 'PUT', query: { item_type: itemType, item_id: itemId } }),
  },
  pay: {
    update: (payload: Record<string, unknown>) => request<unknown>('/api/pay/update', { method: 'POST', body: payload }),
    transfer: (userId: string, carrot: number) => request<{ deduct: number; carrot: number }>('/api/pay/transfer', { method: 'POST', body: { user_id: userId, carrot } }),
    create: (payload: Record<string, unknown>) => request<{ no: string; pay_way: string; pay_url: string; expired: string }>('/api/pay/create', { method: 'POST', body: payload }),
    close: (no: string) => request<{ is_close: boolean }>('/api/pay/close', { method: 'PUT', query: { no } }),
    testNotify: (no: string) => request<unknown>('/api/pay/testNotify', { method: 'POST', body: [no] }),
    userCarrot: (userId: string) => request<{ carrot: number }>('/api/pay/getUserCarrot', { query: { user_id: userId } }),
    userSign: (userId: string) => request<Record<string, unknown>>('/api/pay/getUserSign', { query: { user_id: userId } }),
    notifyEmail: (payload: { user_id: string; subject: string; body: string; [k: string]: unknown }) =>
      request<CarrotDelta>('/api/pay/sendNotifyEmail', { method: 'POST', body: payload }),
  },
  shop: {
    sortCategory: (categoryId: number, sort: number) => request<{ sort: number }>('/api/shop/category/sort', { method: 'PUT', body: { category_id: categoryId, sort } }),

    product: (productId: number) => request<ShopProduct & { category_name?: string; description?: string; exchange_way?: string }>('/api/shop/product/info', { query: { product_id: productId } }),
    ordersUser: (params: Record<string, unknown>) => request<ListResult<ShopOrder>>('/api/shop/order/user/list', { query: params }),
    createOrder: (productId: number, buyNumber: number, remark?: string) =>
      request<{ no: string; buy_number: number; price: number; expired: string }>('/api/shop/order/user/create', { method: 'POST', body: { product_id: productId, buy_number: buyNumber, remark: remark ?? null } }),
    payOrder: (orderNo: string) => request<MessageResult>('/api/shop/order/user/pay', { method: 'POST', body: { order_no: orderNo } }),
    urgeOrder: (orderNo: string) => request<{ urge_number: number }>('/api/shop/order/user/urge', { method: 'PUT', body: { order_no: orderNo } }),
    closeOrder: (orderNo: string) => request<unknown>('/api/shop/order/user/close', { method: 'POST', body: { order_no: orderNo } }),
  },
  music: {
    searchSongs: (params: Record<string, unknown>) => request<ListResult<MusicSong>>('/api/music/song/search', { query: params }),
    syncSpotifyArtist: (artistId: string) => request<unknown>('/api/music/syncSpotifyArtist', { method: 'PATCH', body: { artist_id: artistId } }),
    createLyric: (songId: number, payload: Record<string, unknown>) => request<{ lyric_id: number; carrot: number }>(`/api/music/song/${songId}/lyric/create`, { method: 'POST', body: payload }),
    deleteLyric: (songId: number, lyricId: number) => request<CarrotDelta>(`/api/music/song/${songId}/lyric/delete`, { method: 'DELETE', query: { lyric_id: lyricId } }),
    deleteMedia: (songId: number, mediaId: string, reason?: string) => request<CarrotDelta>(`/api/music/song/${songId}/media/delete`, { method: 'DELETE', query: { media_id: mediaId, reason } }),
    playUrl: (songId: number, mediaId: string) => request<{ url: string }>(`/api/music/song/${songId}/media/playUrl`, { query: { media_id: mediaId } }),
    moveMedia: (songId: number, mediaId: string) => request<CarrotDelta>(`/api/music/song/${songId}/media/move`, { method: 'PUT', query: { media_id: mediaId } }),
    updateVideoId: (songId: number, videoId: number) => request<CarrotDelta>(`/api/music/song/${songId}/updateVideoId`, { method: 'PUT', query: { video_id: videoId } }),
    batchHashExist: (hashs: string[]) => request<Array<Record<string, unknown>>>('/api/music/song/batchHashExist', { method: 'POST', body: { hashs } }),
    updateAlbumVideoId: (albumId: number, videoId: number) => request<CarrotDelta>(`/api/music/album/${albumId}/updateVideoId`, { method: 'PUT', query: { video_id: videoId } }),
  },
  fund: {
    check: (fundActivityCode: string) => request<MessageResult>('/api/fund/order/check', { method: 'POST', body: { fund_activity_code: fundActivityCode } }),
  },
  whisper: {
    create: (payload: Record<string, unknown>) => request<{ whisper_id: number }>('/api/whisper/create', { method: 'POST', body: payload }),
  },
}
