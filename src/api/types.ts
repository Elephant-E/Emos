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

interface UserBase {
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
  password: string | null
  carrot: number
  sign: { sign_index: number; sign_at: string | null; earn_point: number; continuous_days: number } | null
}

export type VideoType = 'movie' | 'tv'

interface Genre {
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
  /** 本地人物 id：来自 TMDb 的人没有，实测 39/39 为 null */
  id: number | null
  person_id: number | null
  /** TMDb 人物 id，实际能用来做唯一标识的是它 */
  person_id_tmdb: number | null
  name: string
  original_name: string | null
  job: string | null
  title: string | null
  tagline: string | null
  birthday: string | null
  /** 契约里是 unknow / male / female / other 这样的字符串 */
  gender: string | null
  birthplace: string | null
  biography: string | null
  is_adult: boolean | null
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

interface WatchAuthor {
  user_id?: string
  username?: string
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
  live_library_id: number | null
  /** 非空表示官方频道（如 CCTV1），不可删除 */
  code: string | null
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
  price: number
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
  /** 只有 product/info 会返回（Postman 契约未收录） */
  seller?: { seller_id: number; name: string; description: string | null; cover_url: string | null } | null
  category_name?: string
  description: string | null
  exchange_way: string | null
}

export interface ShopSeller {
  seller_id: number
  /** 未开店时后端返回 status: default，以下字段可能为 null */
  name: string | null
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
  urge_number: number | null
  /** 店铺侧接口返回的结算价（胡萝卜），买家侧没有 */
  price_settle?: number | null
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
  /** 平均分（可能是小数，如 4.6） */
  rating: number | null
  /** 自己打的分（1–5 整数，没打过为 null） */
  rating_user?: number | null
  has_media?: boolean
  is_adult: boolean
  is_favorite?: boolean
  count_medias?: number
  person_artists: Array<{ person_id?: number; name: string }>
}

export interface UserDetail {
  user_id: string
  /** 只有服务商身份查得到；非服务商时接口 403，不会有这个对象 */
  carrot?: number | null
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

export interface RedPacketReceiver {
  user_id: string
  username: string | null
  avatar: string | null
  carrot: number
  receive_at: string
}

export interface RedPacketCreateBody {
  /** default 普通 / password 口令 */
  type: 'default' | 'password'
  /** average 均分 / random 随机 */
  receive: 'average' | 'random'
  /** 总金额 1-60000 胡萝卜 */
  carrot: number
  /** 可领人数 1-10000 */
  number: number
  /** 寄语 50 字内 */
  blessing: string
  /** 口令内容，type=password 时必填，1-50 字符 */
  text?: string
  /** 到期时间 60-172800 秒，默认 24 小时 */
  seconds?: number
  /** 封面直链（temporary.emos.best 上传或外链） */
  file_url?: string
  /** image / audio，给了 file_url 就必填 */
  file_type?: 'image' | 'audio'
  /** 独占：bot 只显示封面文件、不显示寄语 */
  is_exclusive?: boolean
}

/** 萝卜排行榜（GET /api/rank/carrot） */
export interface RankCarrotRow {
  index: number
  carrot: number
  username: string
  avatar: string | null
  level_name?: string | null
}

/** 上传量排行榜（GET /api/rank/upload），size 是字节 */
export interface RankUploadRow {
  index: number
  size: number
  username: string
  avatar: string | null
}

/** 签到排行榜（GET /api/rank/sign） */
export interface RankSignRow {
  sign_index: number
  sign_content: string | null
  sign_at: string
  earn_point: number
  continuous_days: number
  username: string
  avatar: string | null
}

/** 正在播放 · 影片（最近 3 分钟） */
export interface RankPlayingVideoRow {
  username: string
  video_title: string
  video_type: 'movie' | 'tv'
  todb_id: number | null
  tmdb_id: number | null
  season_number: number | null
  episode_number: number | null
  /** 10 = 1 倍速，20 = 2 倍速 */
  play_speed: number | null
  play_seconds: number | null
  ua: string | null
  upload_pseudonym?: string | null
  video_image_poster?: string | null
  video_image_logo?: string | null
}

/** 正在播放 · 直播 */
export interface RankPlayingLiveRow {
  username: string
  live_title: string
  play_durations: number
  ua: string | null
  provider_pseudonym?: string | null
}

export interface VoteCreateBody {
  /** 问题 100 字内 */
  question: string
  /** 简介 200 字内 */
  description?: string
  /** 选项 2-12 个 */
  options: string[]
  /** 过期时间，最低 60 秒 */
  seconds: number
  /** 是否允许撤回 */
  allows_revoting?: boolean
  /** 是否投票结束后才公布结果 */
  hide_results_until_closes?: boolean
}

export interface VoteResult {
  vote_id: string
  question: string
  options: string[]
  time_start: string
  time_end: string
  users: Array<{
    index: number
    option_index: string
    user_id: string
    username: string
    avatar: string | null
    telegram_id: string | null
  }>
}

export interface LotteryPrize {
  name: string
  description?: string | null
  /** 数量 1-100 */
  number: number
  /** 自动发奖内容；给了就要和 number 对上 */
  bodys?: string[]
}

export interface LotteryCreateBody {
  name: string
  description?: string
  /** YYYY-MM-DD HH:mm:ss */
  time_start: string
  /** YYYY-MM-DD HH:mm:ss，一周内 */
  time_end: string
  /** 参加费用 1-5w */
  amount: number
  /** 0 = 时间开奖；>0 = 人数开奖 */
  number?: number
  rule_carrot?: number
  rule_sign?: number
  prizes: LotteryPrize[]
}

export interface LotteryWinner {
  lottery_name: string
  lottery_description: string | null
  time_start: string
  time_end: string
  amount: number
  number: number
  users: Array<{
    user_id: string
    user_username: string
    user_avatar: string | null
    prize_name: string
    prize_description: string | null
    join_index: number
    join_at: string
    /** 真机响应里没有该字段 */
    prize_body?: string | null
  }>
}
