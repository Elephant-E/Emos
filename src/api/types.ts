export interface ListResult<T> {
  page: number
  page_size: number
  total: number
  items: T[]
}

export interface CarrotDelta {
  carrot: number
  sign: { sign_index: number; sign_at: string | null; earn_point: number; continuous_days: number } | null
}

export interface IdResult {
  id: number
}

export interface MessageResult {
  message: string
}

export interface SignCheck {
  is_sign: boolean
  user_id: string
}

export interface UserBase {
  user_id: string
  username: string
  avatar: string | null
}

export interface UserInfo extends UserBase {
  server_video: string | null
  server_live: string | null
  server_music: string | null
  telegram_group_url: string | null
  telegram_bind_url: string | null
  telegram_user_id: string | null
  pseudonym: string | null
  is_show_empty: boolean
  is_can_upload: boolean
  is_can_down: boolean
  is_original_image: boolean
  roles: string[]
  must_otp: boolean
  is_viewing: boolean
  invite_remaining: number
  is_have_emps: boolean
  slot_remaining: number
  size_upload: number
  /** 服的登录密码；must_otp 为 true 时是一次性密码 */
  password: string
  carrot: number
  sign: { sign_index: number; sign_at: string | null; earn_point: number; continuous_days: number } | null
}

export type VideoType = 'movie' | 'tv'

export interface Genre {
  id: number
  name: string
}

export interface VideoItem {
  item_id: string | null
  todb_id: number
  tmdb_id: number | null
  tmdb_url: string | null
  video_id: number
  video_type: VideoType
  video_title: string
  video_origin_title: string | null
  video_description: string | null
  video_tagline: string | null
  video_image_logo: string | null
  video_image_poster: string | null
  video_image_backdrop: string | null
  video_date_air: string | null
  video_is_adult: boolean
  seek_is_request: boolean
  seek_id: number | null
  request_count: number
  parts_count: number
  medias_count: number
  subtitles_count: number
  titles: unknown[]
  genres: Genre[]
  is_delete: boolean
}

export interface VideoSeason {
  item_id: string
  season_id: number
  season_title: string
  season_number: number
  season_description: string | null
  video_image_poster: string | null
  date_air: string | null
  has_media: boolean
  episodes_count: number
}

export interface VideoEpisode {
  item_id: string
  season_id: number
  season_number: number
  episode_id: number
  episode_title: string
  episode_number: number
  episode_description: string | null
  video_image_poster: string | null
  date_air: string | null
  runtime: number | null
  parts_count: number
  medias_count: number
  subtitles_count: number
  /** 该集的求片信息（with_seek 时才返回，无求片为 null） */
  seek?: {
    seek_id: number
    status: string
    upload_username: string | null
    upload_expired_at: string | null
    is_can_claim: boolean
    request_count: number
    seek_carrot: number
    updated_at: string
  } | null
  with_seek_is_request?: boolean | null
}

export interface VideoPerson {
  /** 文件 id（不是 URL），拼 https://image.theotherdb.org/original/{id} 使用 */
  image_profile: string | null
  id: number
  person_id: number
  name: string
  original_name: string | null
  image_profile_url: string | null
  job: string | null
  title: string | null
  tagline: string | null
  birthday: string | null
  gender: number | null
  birthplace: string | null
  biography: string | null
  is_adult: boolean
}

export interface VideoMedia {
  media_id: string
  media_name: string
  media_file_size: number
  media_status?: string
  media_file_second?: number
  user_pseudonym: string | null
  is_self_upload: boolean
  created_at?: string
}

export interface WatchAuthor {
  user_id?: string
  username?: string
  pseudonym?: string | null
  avatar?: string | null
}

export interface WatchItem {
  subscribe_id: number | null
  id: number
  type: 'video' | 'music'
  name: string
  description: string | null
  is_public: boolean
  carrot: number
  /** 不传 tags 时后端返回 null 而非 [] */
  tags: string[] | null
  image_poster: string | null
  image_poster_url: string | null
  is_show_empty: boolean
  is_self: boolean
  is_edit_video: boolean
  is_subscribe: boolean
  user_is_show: boolean
  user_sort: number
  subscribe_count: number
  video_count: number
  maintainers: WatchAuthor[]
  author: WatchAuthor | null
  updated_at: string | null
}

export interface WatchVideo {
  video_id: number
  todb_id: number | null
  tmdb_id: number | null
  video_type: VideoType
  video_title: string
  video_origin_title: string | null
  video_image_poster: string | null
  video_date_air: string | null
  video_is_adult: boolean
  genres: Genre[]
  video_is_delete: boolean
  sort: number
  remark: string | null
  user_id: string | null
  user_username: string | null
  user_avatar: string | null
  updated_at: string | null
}

export interface WatchVideoCandidate {
  video_id: number
  todbv_id: number
  video_type: VideoType
  video_title: string
  video_origin_title: string | null
  video_date_air: string | null
  video_is_adult: boolean
  video_image_poster: string | null
  /** with_genre 时才返回 */
  genres?: Array<{ name: string }>
}

export type SeekStatus = 'default' | 'upload' | 'complete' | 'cancel' | 'forget'

export interface SeekItem {
  id: number
  video_type: VideoType
  todb_id: number | null
  tmdb_id: number | null
  video_title_display: string
  video_list_id: number | null
  video_season_id: number | null
  video_season_number: number | null
  video_episode_id: number | null
  video_episode_number: number | null
  count_request: number
  status: SeekStatus
  upload_expired_at: string | null
  updated_at: string | null
  video_title: string
  video_date_air: string | null
  video_image_logo: string | null
  video_image_poster: string | null
  video_image_backdrop: string | null
  tmdb_url: string | null
  upload_username: string | null
  is_can_claim: boolean
  item_id: string
  seek_carrot: number
}

export interface RankUpload {
  index: number
  size: number
  username: string
  avatar: string | null
}

export interface RankCarrot {
  index: number
  carrot: number
  username: string
  avatar: string | null
}

export interface PlayingNow {
  video_title: string
  video_type: VideoType
  todb_id: number
  tmdb_id: number | null
  season_number: number | null
  episode_number: number | null
  play_speed: number
  upload_pseudonym: string | null
  ua: string
  video_image_logo: string | null
  video_image_poster: string | null
  video_image_backdrop: string | null
}

export interface CarrotHistory {
  trigger_type: string
  trigger_type_string: string
  type: string
  point: number
  expired_at: string | null
  created_at: string
}

export interface LineItem {
  id: number
  name: string
  url: string
  tagline: string | null
  is_self: boolean
  created_at: string
}

export interface LiveListItem {
  id: number
  live_library_id: number
  code: string
  title: string
  description: string | null
  tagline: string | null
  image_poster_url: string | null
  sort: number
  is_can_edit: boolean
  media_count: number
  updated_at: string
}

export interface LiveMedia {
  media_id: string
  name: string
  path_type: string
  path_url: string
  status: string
  pseudonym: string | null
  is_can_edit: boolean
  created_at: string
}

export interface ShopProduct {
  product_id: number
  category_id: number
  cover_url: string | null
  name: string
  price: number | null
  price_origin: number
  stock: number
  sales: number
  is_up: boolean
  up_time: string | null
  time_start: string | null
  time_end: string | null
  user_buy_max: number | null
  sort: number
  updated_at: string
}

export interface ShopSeller {
  seller_id: number
  name: string
  description: string | null
  cover_url: string | null
  status: string
  is_self: boolean
}

export interface ShopCategory {
  category_id: number
  name: string
  sort: number
}

export interface ShopOrder {
  user?: WatchAuthor
  seller?: unknown
  product?: unknown
  order_no: string
  product_id: number
  price_order: number
  order_title: string
  order_cover_url: string | null
  status_pay: string
  urge_number: number
  buy_number: number
  time_pay: string | null
  time_delivery: string | null
  time_urge: string | null
  remark_shop: string | null
  remark_user: string | null
  created_at: string
}

export interface MusicSong {
  song_id: number
  name: string
  image_poster_url: string | null
  description: string | null
  tagline: string | null
  duration: number | null
  video_list_id: number | null
  rating: number | null
  has_media?: boolean
  is_adult: boolean
  is_favorite?: boolean
  count_medias?: number
  person_artists: Array<{ person_id?: number; name: string }>
}

export interface MusicArtistRef {
  person_id?: number
  name: string
}

export interface UserDetail {
  user_id: string
  username: string
  avatar: string | null
  is_viewing: boolean
  invite_user_id: string | null
  size_upload: number
  telegram_user_id: string | null
  is_disable: boolean
  created_at: string
}

export interface BanItem {
  user_id: string
  username: string
  avatar: string | null
  invite_user_id: string | null
  invite_pseudonym: string | null
  invite_at: string | null
  telegram_user_id: string | null
  disable_reason: string | null
  created_at: string
}

export interface ApiError extends Error {
  status: number
  payload?: unknown
}
