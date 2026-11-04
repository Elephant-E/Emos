import { request } from './client'
import type { Overview, Paginated, SeekItem, UserProfile, Video, Watchlist } from './types'
export const sessionApi = {
  check: () => request<{ is_login: boolean }>('/api/sign/check', { silent401: true }),
  base: () => request<UserProfile>('/api/user/base'),
  profile: () => request<UserProfile>('/api/user'),
}
export const overviewApi = {
  get: (range: '6m' | '12m') => request<Overview>('/api/stats/overview', { query: { range } }),
}
export const videoApi = {
  list: (params: {
    page?: number
    page_size?: number
    title?: string
    type?: string
    with_media?: boolean
    only_delete?: boolean
  }) => request<Paginated<Video>>('/api/video/list', { query: params }),
  detail: (id: string) => request<Video>(`/api/video/${id}`),
  seasons: (id: string) => request<{ data: unknown[] }>(`/api/video/${id}/season`),
  episodes: (id: string, seasonNumber?: number) =>
    request<{ data: unknown[] }>(`/api/video/${id}/episode`, { query: { season_number: seasonNumber } }),
  media: (params: { video_list_id: string; video_season_id?: string; video_episode_id?: string }) =>
    request<{ data: unknown[] }>('/api/video/media/list', { query: params }),
  search: (params: { title?: string; page?: number; page_size?: number }) =>
    request<Paginated<Video>>('/api/video/search', { query: params }),
  remove: (id: string) => request<unknown>(`/api/video/${id}/delete`, { method: 'PUT' }),
}
export const seekApi = {
  list: (params: { page?: number; page_size?: number; status?: string } = {}) =>
    request<Paginated<SeekItem>>('/api/seek', { method: 'POST', body: params }),
  poll: (lastId?: string) => request<{ data: SeekItem[] }>('/api/seek/poll', { query: { last_id: lastId } }),
  apply: (itemType: string, itemId: string) =>
    request<unknown>('/api/seek/apply', { method: 'PUT', query: { item_type: itemType, item_id: itemId } }),
  claim: (seekId: string, type: 'confirm' | 'cancel' = 'confirm') =>
    request<unknown>('/api/seek/claim', { method: 'PUT', body: { seek_id: seekId, type } }),
  urge: (seekId: string, carrot?: number) =>
    request<unknown>('/api/seek/urge', { method: 'PUT', body: { seek_id: seekId, carrot } }),
}
export const watchApi = {
  list: (params: { page?: number; page_size?: number; type?: string } = {}) =>
    request<Paginated<Watchlist>>('/api/watch', { query: params }),
}
export const rankApi = {
  upload: () => request<{ data: Array<{ user_id: string; username: string; upload_count: number }> }>('/api/rank/upload'),
  carrot: () => request<{ data: Array<{ user_id: string; username: string; carrot: number }> }>('/api/rank/carrot'),
}
