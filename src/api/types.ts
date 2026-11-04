export type Zone = 'movie' | 'series' | 'documentary' | 'variety' | 'short'
export interface UserProfile {
  id: string
  username: string
  pseudonym?: string | null
  avatar?: string | null
  is_admin?: boolean
  carrot?: number
}
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}
export interface Video {
  video_id: string
  title: string
  original_title?: string | null
  type?: Zone
  year?: number | null
  tmdb_id?: string | null
  todb_id?: string | null
  poster?: string | null
  season_count?: number
  episode_count?: number
  media_count?: number
  play_count?: number
  is_delete?: boolean
  created_at?: string
  updated_at?: string
}
export interface SeekItem {
  seek_id: string
  video_list_id?: string
  video_season_id?: string
  video_episode_id?: string
  title: string
  type?: Zone
  status: 'open' | 'claimed' | 'done' | 'closed'
  carrot?: number
  urge_count?: number
  claim_user?: Pick<UserProfile, 'id' | 'username' | 'pseudonym'> | null
  created_at: string
}
export interface Watchlist {
  watch_id: string
  name: string
  type?: 'video' | 'music'
  video_count?: number
  author?: Pick<UserProfile, 'id' | 'username' | 'pseudonym'> | null
  is_public?: boolean
  is_self?: boolean
  is_subscribe?: boolean
  sort?: number
  updated_at?: string
}
export interface SeriesPoint {
  key: string
  label: string
  color: string
  values: number[]
}
export interface Overview {
  months: string[]
  series: SeriesPoint[]
  kpis: {
    play_total: number
    play_delta: number
    media_total: number
    media_delta: number
    seek_open: number
    seek_delta: number
    carrot_total: number
  }
  updated_at: string
}
export interface ApiError extends Error {
  status: number
  code?: string
  payload?: unknown
}
