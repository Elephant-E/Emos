import type { ListResult, MusicSong, SeekItem, UserInfo, VideoItem, WatchItem, WatchVideo, WatchVideoCandidate } from './types'
import { USE_FIXTURES } from './client'

type Fixture = { method: string; pattern: string; name: string; body: unknown; re: RegExp }
let fixtureCache: Fixture[] | null = null

async function loadFixtures(): Promise<Fixture[]> {
  if (fixtureCache) return fixtureCache
  const res = await fetch('/__fixtures.json')
  const raw = (await res.json()) as Array<Omit<Fixture, 're'>>
  fixtureCache = raw.map((item) => ({ ...item, re: new RegExp(item.pattern) }))
  return fixtureCache
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const user: UserInfo = {
  user_id: 'eXD3VD3Y1s',
  username: 'sorakand',
  avatar: null,
  pseudonym: '陈曦',
  is_show_empty: true,
  is_can_upload: true,
  is_can_down: true,
  is_original_image: false,
  roles: ['admin'],
  must_otp: false,
  is_viewing: false,
  invite_remaining: 3,
  is_have_emps: false,
  slot_remaining: 2,
  password: '123456',
  size_upload: 0,
  carrot: 4210,
  sign: { sign_index: 12, sign_at: '2026-11-04 09:00:00', earn_point: 2, continuous_days: 7 },
  server_video: 'https://video.emos.best',
  server_live: null,
  server_music: null,
  telegram_group_url: 'https://t.me/emospg',
  telegram_bind_url: null,
  telegram_user_id: null,
}

const poster = (seed: string) => `https://picsum.photos/seed/${seed}/200/300`

const TITLES: Array<[string, string, VideoItem['video_type']]> = [
  ['夜航西飞', 'Night Flight West', 'movie'],
  ['雾港', 'Fog Harbor', 'tv'],
  ['静默频率', 'Silent Frequency', 'movie'],
  ['白色跑道', 'White Runway', 'movie'],
  ['山海之间', 'Between Mountains', 'tv'],
  ['漫长的告别', 'The Long Goodbye', 'movie'],
  ['冬泳', 'Winter Swim', 'movie'],
  ['玻璃动物园', 'Glass Menagerie', 'tv'],
  ['无人区来信', 'Letters from No Man Land', 'movie'],
  ['昼颜', 'Hirugao', 'tv'],
]

const videos: VideoItem[] = TITLES.map(([title, origin, type], i) => ({
  item_id: `vl-${i + 1}`,
  todb_id: 1000 + i,
  tmdb_id: 63247 + i,
  tmdb_url: `https://www.themoviedb.org/${type}/${63247 + i}`,
  video_id: i + 1,
  video_type: type,
  video_title: title,
  video_origin_title: origin,
  video_description: null,
  video_tagline: null,
  video_image_logo: null,
  video_image_poster: poster(`emos${i}`),
  video_image_backdrop: null,
  video_date_air: `${2026 - (i % 5)}-0${(i % 9) + 1}-15`,
  video_is_adult: false,
  seek_is_request: i % 4 === 0,
  seek_id: null,
  request_count: (i * 3) % 7,
  parts_count: 0,
  medias_count: 2 + (i % 5),
  subtitles_count: 1 + (i % 3),
  titles: [],
  genres: [{ id: i + 1, name: ['剧情', '悬疑', '纪录片', '科幻'][i % 4] }],
  is_delete: false,
}))

const watches: WatchItem[] = [
  {
    subscribe_id: null, id: 1000, type: 'video' as const, name: '本周新片', description: '每周更新的院线新片合集',
    is_public: true, carrot: 0, tags: ['院线', '追新'], image_poster_url: poster('watch1'),
    is_show_empty: true, is_self: true, is_edit_video: true, is_subscribe: false, user_is_show: true,
    user_sort: 80, subscribe_count: 128, video_count: 24, maintainers: [], author: { username: 'sorakand' },
    updated_at: '2026-11-04T09:12:00Z',
  },
  {
    subscribe_id: 77, id: 1001, type: 'video' as const, name: '4K 修复计划', description: '老片 4K 修复，按年份推进',
    is_public: true, carrot: 10, tags: ['修复', '4K'], image_poster_url: poster('watch2'),
    is_show_empty: false, is_self: true, is_edit_video: true, is_subscribe: true, user_is_show: true,
    user_sort: 70, subscribe_count: 42, video_count: 12, maintainers: [{ username: 'lin' }], author: { username: 'sorakand' },
    updated_at: '2026-11-02T12:40:00Z',
  },
  {
    subscribe_id: null, id: 1002, type: 'video' as const, name: '纪录片精选', description: null,
    is_public: false, carrot: 0, tags: ['纪录片'], image_poster_url: poster('watch3'),
    is_show_empty: true, is_self: false, is_edit_video: false, is_subscribe: false, user_is_show: false,
    user_sort: 80, subscribe_count: 6, video_count: 31, maintainers: [], author: { username: 'zhou' },
    updated_at: '2026-10-28T18:20:00Z',
  },
  {
    subscribe_id: null, id: 1004, type: 'video' as const, name: '只看一遍的', description: '自己留着，不公开',
    is_public: false, carrot: 0, tags: [], image_poster_url: null,
    is_show_empty: true, is_self: true, is_edit_video: true, is_subscribe: false, user_is_show: false,
    user_sort: 70, subscribe_count: 0, video_count: 0, maintainers: [], author: { username: '陈曦' },
    updated_at: '2026-11-08T10:00:00Z',
  },
  {
    subscribe_id: null, id: 1003, type: 'music' as const, name: '夜间通勤', description: '适合路上听的歌单',
    is_public: true, carrot: 0, tags: ['通勤'], image_poster_url: poster('watch4'),
    is_show_empty: true, is_self: false, is_edit_video: false, is_subscribe: false, user_is_show: true,
    user_sort: 80, subscribe_count: 12, video_count: 3, maintainers: [], author: { username: 'lin' },
    updated_at: '2026-11-01T08:00:00Z',
  },
]

const songs: MusicSong[] = [
  { song_id: 2001, name: '夜航', image_poster_url: poster('song1'), description: '专辑《潮汐》第一首', tagline: null,
    duration: 254, video_list_id: null, rating: 4.6, is_adult: false, count_medias: 2, person_artists: [{ name: '陈曦' }] },
  { song_id: 2002, name: '雾中列车', image_poster_url: poster('song2'), description: null, tagline: null,
    duration: 312, video_list_id: null, rating: 4.2, is_adult: false, count_medias: 1, person_artists: [{ name: '林一' }] },
  { song_id: 2003, name: '晨间信号', image_poster_url: poster('song3'), description: null, tagline: null,
    duration: 198, video_list_id: null, rating: null, is_adult: false, count_medias: 0, person_artists: [] },
]

const watchVideos: WatchVideo[] = videos.slice(0, 6).map((v, i) => ({
  video_id: v.video_id,
  todb_id: v.todb_id,
  tmdb_id: v.tmdb_id,
  video_type: v.video_type,
  video_title: v.video_title,
  video_origin_title: v.video_origin_title,
  video_image_poster: v.video_image_poster,
  video_date_air: v.video_date_air,
  video_is_adult: false,
  genres: v.genres,
  video_is_delete: false,
  sort: 80 + i * 10,
  remark: i === 0 ? '首推' : null,
  user_id: user.user_id,
  user_username: user.username,
  user_avatar: null,
  updated_at: v.video_date_air,
}))

const seekStatuses: SeekItem['status'][] = ['default', 'upload', 'complete', 'default', 'default', 'upload', 'complete', 'cancel']

const seeks: SeekItem[] = videos.map((v, i) => ({
  id: i + 1,
  video_type: v.video_type,
  todb_id: v.todb_id,
  tmdb_id: v.tmdb_id,
  video_title_display: v.video_title,
  video_list_id: v.video_id,
  video_season_id: null,
  video_season_number: null,
  video_episode_id: null,
  video_episode_number: null,
  count_request: [1, 3, 8, 12, 2, 5, 1, 4, 9, 2][i],
  status: seekStatuses[i],
  upload_expired_at: null,
  updated_at: new Date(Date.now() - i * 5400000).toISOString(),
  video_title: v.video_title,
  video_date_air: v.video_date_air,
  video_image_logo: null,
  video_image_poster: v.video_image_poster,
  video_image_backdrop: null,
  tmdb_url: v.tmdb_url,
  upload_username: i % 3 === 1 ? (i % 6 === 1 ? '陈曦' : 'lin') : null,
  is_can_claim: i % 3 !== 2,
  item_id: `vl-${i + 1}`,
  seek_carrot: [120, 80, 60, 200, 40, 90, 150, 20][i] ?? 0,
}))

const playing = [
  { video_title: '雾港', video_type: 'tv' as const, todb_id: 1001, tmdb_id: 63248, season_number: 2, episode_number: 4, play_speed: 10, upload_pseudonym: 'lin', ua: 'SenPlayer/5.7.4', video_image_logo: null, video_image_poster: poster('play1'), video_image_backdrop: null },
  { video_title: '冬泳', video_type: 'movie' as const, todb_id: 1006, tmdb_id: 63253, season_number: null, episode_number: null, play_speed: 10, upload_pseudonym: 'zhou', ua: 'Hills/1.4.7', video_image_logo: null, video_image_poster: poster('play2'), video_image_backdrop: null },
  { video_title: '山海之间', video_type: 'tv' as const, todb_id: 1004, tmdb_id: 63251, season_number: 1, episode_number: 2, play_speed: 20, upload_pseudonym: 'chen', ua: 'Infuse/7.8', video_image_logo: null, video_image_poster: poster('play3'), video_image_backdrop: null },
]

const rankUpload = [
  { index: 1, size: 182, username: 'lin', avatar: null },
  { index: 2, size: 140, username: 'zhou', avatar: null },
  { index: 3, size: 96, username: 'sorakand', avatar: null },
  { index: 4, size: 61, username: 'chen', avatar: null },
  { index: 5, size: 48, username: 'kai', avatar: null },
]

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return h
}

function paginate<T>(items: T[], page = 1, pageSize = 20): ListResult<T> {
  const start = (page - 1) * pageSize
  return { page, page_size: pageSize, total: items.length, items: items.slice(start, start + pageSize) }
}

export async function mockRequest<T>(
  path: string,
  opts: { method?: string; query?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  await delay(80 + Math.random() * 160)

  if (USE_FIXTURES) {
    const [rawPath] = path.split('?')
    const list = await loadFixtures()
    const hit = list.find((item) => item.method === (opts.method ?? 'GET') && item.re.test(rawPath))
    if (hit) return hit.body as T
  }

  const [clean] = path.split('?')
  const method = opts.method ?? 'GET'
  const query = (opts.query ?? {}) as Record<string, string | number | boolean | undefined>
  const body = (opts.body ?? {}) as Record<string, unknown>

  if (clean === '/api/sign/check') return { is_sign: true, user_id: user.user_id } as T
  if (clean === '/api/user/server/videoHistory') {
    return [
      { device_client: 'SenPlayer', device_name: 'MacBook Pro', device_id: 'dev_1', device_version: '5.7.4', last_used_at: '2026-11-07T21:00:00Z' },
      { device_client: 'Infuse', device_name: 'iPad Air', device_id: 'dev_2', device_version: '8.0.2', last_used_at: '2026-11-05T09:20:00Z' },
    ] as T
  }
  if (clean === '/api/user/server/videoLogout') return { logout_count: 1 } as T
  if (clean === '/api/user/base') return { user_id: user.user_id, username: user.username, avatar: null } as T
  if (clean === '/api/user') return user as T
  if (clean === '/api/carrot/current') return { carrot: user.carrot } as T
  if (clean === '/api/rank/upload') return rankUpload as T
  if (clean === '/api/rank/carrot') return rankUpload.map((r) => ({ index: r.index, carrot: r.size * 40, username: r.username, avatar: null })) as T
  if (clean === '/api/rank/userVideoRecordPlaying') return playing as T

  if (clean === '/api/video/list') {
    const wantDeleted = String(query.only_delete ?? '') === '1' || query.only_delete === true
    let rows = videos.filter((v) => (wantDeleted ? v.is_delete : !v.is_delete))
    const title = String(query.title ?? '').trim()
    if (title) rows = rows.filter((v) => v.video_title.includes(title))
    if (query.type) rows = rows.filter((v) => v.video_type === query.type)
    if (query.video_id) rows = rows.filter((v) => v.video_id === Number(query.video_id))
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  if (clean === '/api/pay/base') {
    return {
      name: '我的支付服务', description: '由后台发起申请', notify_url: null,
      total_revenue: 0, total_expenditure: 0, status: 'review',
    } as T
  }
  if (clean === '/api/pay/update') return {} as T
  if (clean === '/api/pay/close') return { is_close: true } as T
  if (clean === '/api/whisper/create') return { whisper_id: 9001 } as T
  if (clean === '/api/video/record/request') {
    return {
      page: 1, page_size: 10, total: 24,
      items: [
        { video_media_id: '1ro3z92r0pgl', range: null, is_proxy: true, video_id: 3854, video_type: 'tv', video_title: 'MobLand', ip: '123.152.142.217', ua: 'Rex-Standard/1.1', time: '2026-11-10 18:09:22' },
        { video_media_id: 'md_3854a', range: '00:12:30', is_proxy: false, video_id: 2581, video_type: 'tv', video_title: '罗小黑战记', ip: '58.246.11.9', ua: 'SenPlayer/5.7.4', time: '2026-11-09 21:40:03' },
      ],
    } as T
  }
  if (clean === '/api/seek/poll') return [] as T
  if (clean === '/api/seek/apply') return { seek_is_request: true } as T
  if (clean === '/api/seek') {
    const statuses = (body.status as string[] | undefined) ?? ['default', 'upload', 'complete']
    let rows = seeks.filter((s) => statuses.includes(s.status))
    if (body.video_title) rows = rows.filter((s) => s.video_title_display.includes(String(body.video_title)))
    if (body.video_type) rows = rows.filter((s) => s.video_type === body.video_type)
    if (body.upload_self) rows = rows.filter((s) => Boolean(s.upload_username))
    return paginate(rows, Number(body.page ?? 1), Number(body.page_size ?? 20)) as T
  }

  if (clean === '/api/watch') {
    // 真机后端不会把别人的私密片单返回给当前账号
    let rows = watches.filter((w) => w.is_public || w.is_self)
    if (query.watch_id) rows = rows.filter((w) => w.id === Number(query.watch_id))
    if (query.type) rows = rows.filter((w) => w.type === query.type)
    if (query.name) rows = rows.filter((w) => w.name.includes(String(query.name)))
    if (query.is_self) rows = rows.filter((w) => w.is_self)
    if (query.is_subscribe) rows = rows.filter((w) => w.is_subscribe)
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  const seasonMatch = clean.match(/^\/api\/video\/(\d+)\/season$/)
  if (seasonMatch) {
    const video = videos.find((v) => v.video_id === Number(seasonMatch[1]))
    const count = video?.video_type === 'movie' ? 1 : 2
    return Array.from({ length: count }, (_, i) => ({
      item_id: `vs-${i + 1}`,
      season_id: 100 + i,
      season_title: video?.video_type === 'movie' ? '正片' : `第 ${i + 1} 季`,
      season_number: video?.video_type === 'movie' ? 0 : i + 1,
      season_description: null,
      video_image_poster: video?.video_image_poster ?? null,
      date_air: video?.video_date_air ?? null,
      has_media: true,
      episodes_count: video?.video_type === 'movie' ? 1 : 4,
    })) as T
  }

  const episodeMatch = clean.match(/^\/api\/video\/(\d+)\/episode$/)
  if (episodeMatch) {
    const video = videos.find((v) => v.video_id === Number(episodeMatch[1]))
    const seasonNumber = Number(query.season_number ?? 1)
    const count = video?.video_type === 'movie' ? 1 : 18
    return Array.from({ length: count }, (_, i) => ({
      item_id: `ve-${seasonNumber}-${i + 1}`,
      season_id: 100 + Math.max(0, seasonNumber - 1),
      season_number: seasonNumber,
      episode_id: 500 + i,
      episode_title: video?.video_type === 'movie' ? '正片' : (i === 0 ? '这集vlog我们拍了十年，致最美好的青春（上）——记一次说走就走的旅行' : `第 ${i + 1} 集`),
      episode_number: i + 1,
      episode_description: null,
      video_image_poster: video?.video_image_poster ?? null,
      date_air: video?.video_date_air ?? null,
      runtime: 45 + i * 3,
      parts_count: 0,
      medias_count: 2,
      subtitles_count: 1,
    })) as T
  }

  const songMedia = clean.match(/^\/api\/music\/song\/(\d+)\/media\/list$/)
  if (songMedia) {
    return [
      { media_id: '2g598yxqwqzr', file_suffix: 'mp3', file_type: 'audio/mpeg', file_size: 13_767_777,
        file_duration: 330, file_quality: 'high', is_primary: true, name: '陈曦 上传', created_at: '2026-06-09T10:18:20Z',
        user: { user_id: user.user_id, username: user.username, avatar: null } },
      { media_id: '9x111aa22bb', file_suffix: 'flac', file_type: 'audio/flac', file_size: 41_234_567,
        file_duration: 332, file_quality: 'lossless', is_primary: false, name: 'lin 上传', created_at: '2026-05-01T09:00:00Z',
        user: { user_id: 'eK98L0NEMs', username: 'lin', avatar: null } },
    ] as T
  }

  if (clean === '/api/music/song/list') {
    const name = String(query.name ?? '').trim()
    let rows = name ? songs.filter((x) => x.name.includes(name)) : songs
    const truthy = (v: unknown) => v === true || v === '1' || v === 'true'
    const falsy = (v: unknown) => v === false || v === '0' || v === 'false'
    if (falsy(query.has_media)) rows = rows.filter((x) => x.has_media === false)
    if (truthy(query.has_media)) rows = rows.filter((x) => x.has_media !== false)
    if (truthy(query.is_favorite)) rows = rows.filter((x) => x.is_favorite === true)
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }
  if (clean === '/api/music/album/list') {
    const rows = [
      { album_id: 3001, name: '潮汐', image_poster_url: poster('album1'), release_date: '2026-03-01', count_song: 10, person_artists: [{ name: '陈曦' }] },
      { album_id: 3002, name: '夜行记', image_poster_url: poster('album2'), release_date: '2025-11-12', count_song: 8, person_artists: [{ name: 'lin' }] },
    ]
    return paginate(rows, 1, 20) as T
  }
  if (clean === '/api/music/person/list') {
    const rows = [
      { person_id: 4001, name: '陈曦', image_profile: 'profile1', count_medias: 12 },
      { person_id: 4002, name: 'lin', image_profile: 'profile2', count_medias: 7 },
    ]
    return paginate(rows, 1, 20) as T
  }
  if (clean === '/api/music/favorite') return { is_favorite: true } as T
  if (clean === '/api/music/rating') return { rating: Number(query.rating ?? 5) } as T
  if (clean === '/api/music/sync') return {} as T
  if (clean === '/api/seek/history') return [] as T
  if (clean === '/api/seek/claim') return { seek_id: 1 } as T
  if (clean === '/api/invite/remark') return {} as T
  if (clean === '/api/pay/query') return { pay_status: 'pay', price_order: 68, pay_way: 'alipay', order_name: '限量海报 A3' } as T
  if (clean === '/api/pay/getUserInfo') return { user_id: 'e1000Xs', username: 'lin', carrot: 120, is_viewing: true, size_upload: 1024, created_at: '2026-01-01T00:00:00Z' } as T
  if (clean === '/api/pay/getUserCarrot') return { carrot: 120 } as T
  if (clean === '/api/pay/apply') return { status: 'review' } as T
  if (clean === '/api/fund/order/create') return { no: '20261110180000fundMOCK' } as T
  if (clean === '/api/fund/order/evidence') return { payout_status: 'reviewing' } as T
  // ── 补上此前缺失的接口，让 mock 下这些页面能真正验证 ──
  if (clean === '/api/video/record/list') {
    return paginate([
      { video_id: 1, video_title: '夜航西飞', video_type: 'movie', record_time: '2026-11-10 21:00:00', play_seconds: 1280, media_seconds: 2700, season_number: 1, episode_number: 1, video_username: 'sorakand' },
      { video_id: 2, video_title: '雾港', video_type: 'tv', record_time: '2026-11-09 20:10:00', play_seconds: 2400, media_seconds: 2700, season_number: 1, episode_number: 2, video_username: 'lin' },
    ], 1, 6) as T
  }
  if (clean === '/api/user/stats/video/history') {
    return Array.from({ length: 7 }, (_, i) => ({
      date: `2026-11-0${i + 4}`, video_watch_second_real: 600 + i * 900, video_watch_count: 1 + i,
    })) as T
  }
  if (clean === '/api/video/media/listAll') {
    return paginate([
      { media_id: 'md_del_1', media_name: '4K HDR · h265', media_file_size: 8_589_934_592, user_pseudonym: 'sorakand', is_self_upload: true, is_can_restore: true, created_at: '2026-10-01T10:00:00Z', deleted_at: '2026-11-01T10:00:00Z' },
      { media_id: 'md_del_2', media_name: '1080p · h264', media_file_size: 2_147_483_648, user_pseudonym: 'lin', is_self_upload: false, is_can_restore: false, created_at: '2026-09-01T10:00:00Z', deleted_at: '2026-10-20T10:00:00Z' },
    ], Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }
  if (clean === '/api/video/media/restore') return { carrot: 3 } as T
  if (clean === '/api/seek/query') {
    return { seek_id: Number(query.seek_id ?? 1), status: 'default', video_title: '夜航西飞', count_request: 3, seek_carrot: 120, created_at: '2026-11-01T10:00:00Z' } as T
  }
  if (clean === '/api/seek/urge') return { seek_carrot: 130 } as T
  if (clean === '/api/whisper/receiver') {
    return [{
      whisper_id: 1, sender_content: '请问这个资源还在吗', sender_at: '2026-11-01T10:00:00Z',
      sender_user: { id: 'e1000Xs', username: 'lin' }, receiver_content: null, receiver_at: null,
      sender_is_anonymous: false,
    }] as T
  }
  if (clean === '/api/whisper/sender') {
    return [{
      whisper_id: 2, sender_content: '已收到，稍后处理', sender_at: '2026-11-02T10:00:00Z',
      receiver_user: { id: 'e1001Xs', username: 'zhou' }, receiver_content: null, receiver_at: null,
      sender_is_anonymous: false,
    }] as T
  }
  if (clean === '/api/whisper/reply') return { whisper_id: Number(body.whisper_id ?? 1) } as T
  if (clean === '/api/user/originalImage') return { is_original_image: true } as T
  if (clean === '/api/user/telegram') return {} as T
  const watchDelete = clean.match(/^\/api\/watch\/(\d+)$/)
  if (watchDelete && method === 'DELETE') {
    const id = Number(watchDelete[1])
    const index = watches.findIndex((w) => w.id === id)
    if (index >= 0) watches.splice(index, 1)
    return {} as T
  }
  if (/^\/api\/watch\/\d+\/music\/\d+$/.test(clean) && method === 'DELETE') return { count: 1 } as T

  if (clean === '/api/upload/music/save') return { carrot: 1, media_id: 'mock-music-media' } as T
  if (clean === '/api/upload/video/base') {
    const id = Number(query.item_id ?? 0)
    const video = videos.find((v) => v.video_id === id)
    return {
      title: video ? (video.video_type === 'tv' ? `${video.video_title} - S01E01 - 第 1 集` : video.video_title) : '未知影片',
      video_medias: [],
    } as T
  }
  if (clean === '/api/video/media/list') {
    const seed = String(query.video_episode_id ?? '') + String(query.video_season_id ?? '')
    return [
      { media_id: `md_${Math.abs(hash(seed)) % 9999}a`, media_name: '4K HDR · h265 · 中字', media_file_size: 8_589_934_592, media_file_second: 2760, media_status: 'ready', user_pseudonym: 'sorakand', is_self_upload: true, created_at: '2026-11-01T10:00:00Z', media_file_metadata: {} },
      { media_id: `md_${Math.abs(hash(seed)) % 9999}b`, media_name: '1080p · h264', media_file_size: 2_147_483_648, media_file_second: 2760, media_status: 'ready', user_pseudonym: 'lin', is_self_upload: false, created_at: '2026-10-20T10:00:00Z', media_file_metadata: {} },
    ] as T
  }

  if (clean === '/api/video/subtitle/list') {
    return [
      { subtitle_id: 'sub_1', subtitle_title: '简中 - sorakand 上传', subtitle_codec: 'srt', user_pseudonym: 'sorakand', is_self_upload: true, created_at: '2026-11-01T10:05:00Z' },
      { subtitle_id: 'sub_2', subtitle_title: '繁中', subtitle_codec: 'ass', user_pseudonym: 'lin', is_self_upload: false, created_at: '2026-10-22T12:00:00Z' },
    ] as T
  }

  if (clean === '/api/video/persons') {
    return {
      page: 1,
      page_size: 20,
      total: 4,
      items: [
        { id: 1, person_id: 101, name: '沈亦舟', original_name: 'Shen Yizhou', image_profile: poster('cast1'), job: 'Director', title: null, tagline: null, birthday: null, gender: 2, birthplace: null, biography: null, is_adult: false },
        { id: 2, person_id: 102, name: '周砚', original_name: null, image_profile: poster('cast2'), job: 'Actor', title: '机长', tagline: null, birthday: null, gender: 1, birthplace: null, biography: null, is_adult: false },
        { id: 3, person_id: 103, name: '程未', original_name: null, image_profile: poster('cast3'), job: 'Actor', title: '乘客', tagline: null, birthday: null, gender: 2, birthplace: null, biography: null, is_adult: false },
      ],
    } as T
  }

  if (clean === '/api/video/media/playUrl') return { url: 'http://emos.local/play/mock' } as T
  if (clean === '/api/video/media/move') return { carrot: 0 } as T
  if (clean === '/api/video/media/rename') return { carrot: 1 } as T
  if (clean === '/api/video/media/delete') return { carrot: 3 } as T
  if (clean === '/api/video/subtitle/rename') return { carrot: 1 } as T
  if (clean === '/api/video/subtitle/delete') return { carrot: 1 } as T
  if (clean === '/api/video/sync') return [] as T
  if (/^\/api\/video\/\d+\/delete$/.test(clean)) return { carrot: 1, is_delete: true } as T

  const watchMaintainerMatch = clean.match(/^\/api\/watch\/(\d+)\/maintainer$/)
  if (watchMaintainerMatch) {
    const list = (body.maintainers as unknown[]) ?? []
    return { maintainers_count: list.length } as T
  }
  const watchEmptyMatch = clean.match(/^\/api\/watch\/(\d+)\/video\/empty$/)
  if (watchEmptyMatch) return { count: 0 } as T

  const watchMusicSearchMatch = clean.match(/^\/api\/watch\/(\d+)\/music\/search$/)
  if (watchMusicSearchMatch) {
    const title = String(query.song_title ?? '').trim()
    const rows = title ? songs.filter((x) => x.name.includes(title)) : songs
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  const watchMusicMatch = clean.match(/^\/api\/watch\/(\d+)\/music$/)
  if (watchMusicMatch) {
    const title = String(query.song_title ?? '').trim()
    const rows = title ? songs.filter((x) => x.name.includes(title)) : songs
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  const watchVideoMatch = clean.match(/^\/api\/watch\/(\d+)\/video$/)
  if (watchVideoMatch) {
    const title = String(query.video_title ?? '').trim()
    const rows = title ? watchVideos.filter((v) => v.video_title.includes(title)) : watchVideos
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  const watchSearchMatch = clean.match(/^\/api\/watch\/(\d+)\/video\/search$/)
  if (watchSearchMatch) {
    const title = String(query.title ?? '').trim()
    const rows: WatchVideoCandidate[] = videos
      .filter((v) => !title || v.video_title.includes(title))
      .map((v) => ({
        video_id: v.video_id,
        todbv_id: v.todb_id,
        video_type: v.video_type,
        video_title: v.video_title,
        video_origin_title: v.video_origin_title,
        video_date_air: v.video_date_air,
        video_is_adult: false,
        video_image_poster: v.video_image_poster,
      }))
    return rows as T
  }

  if (clean === '/api/live/library') {
    return [
      { id: 100, title: '央视', image_poster_url: null },
      { id: 101, title: '卫视', image_poster_url: null },
    ] as T
  }
  if (clean === '/api/live/list') {
    const rows = [
      { id: 1, live_library_id: 100, code: 'cctv1', title: 'CCTV-1 综合', description: '央视综合频道', tagline: '三网直达', image_poster_url: poster('live1'), sort: 80, is_can_edit: true, media_count: 2, updated_at: '2026-11-03T10:00:00Z' },
      { id: 2, live_library_id: 100, code: 'cctv5', title: 'CCTV-5 体育', description: null, tagline: null, image_poster_url: poster('live2'), sort: 70, is_can_edit: true, media_count: 2, updated_at: '2026-11-02T18:00:00Z' },
      { id: 3, live_library_id: 101, code: 'hunan', title: '湖南卫视', description: null, tagline: null, image_poster_url: poster('live3'), sort: 60, is_can_edit: false, media_count: 1, updated_at: '2026-10-28T09:00:00Z' },
    ]
    const filtered = query.library_id ? rows.filter((r) => r.live_library_id === Number(query.library_id)) : rows
    return paginate(filtered, Number(query.page ?? 1), Number(query.page_size ?? 10)) as T
  }
  if (clean === '/api/live/media') {
    return paginate(
      [
        { media_id: 'lgqjrvnnwzxd', name: '三网直达 1080p', path_type: 'm3u8', path_url: 'http://live.local/cctv1.m3u8', status: 'normal', pseudonym: 'sorakand', is_can_edit: true, created_at: '2026-11-01T10:00:00Z' },
        { media_id: 'mgqjrvnnwzxe', name: '电信线路', path_type: 'flv', path_url: 'http://live.local/cctv1.flv', status: 'normal', pseudonym: 'lin', is_can_edit: false, created_at: '2026-10-30T10:00:00Z' },
      ],
      1,
      50,
    ) as T
  }
  if (/^\/api\/live\/list\/\d+$/.test(clean)) return {} as T
  if (/^\/api\/live\/media\/.+$/.test(clean)) return { carrot: 1 } as T
  if (clean === '/api/live/list') return { count: 1 } as T
  if (clean === '/api/live/media/update') return { delete_count: 0 } as T
  if (clean === '/api/proxy/line') {
    if (opts.method === 'DELETE') return {} as T
    if (opts.method === 'POST') return { id: 1001 } as T
    return [
      { id: 1000, name: '@proxy', url: 'http://proxy.local', tagline: '三网绕路', is_self: true, created_at: '2026-09-20T18:00:24.000000Z' },
      { id: 1001, name: '@hk', url: 'http://hk.local', tagline: '香港直连', is_self: true, created_at: '2026-10-05T09:00:00.000000Z' },
    ] as T
  }

  if (clean === '/api/shop/seller/base') {
    const id = Number(query.seller_id ?? 0)
    if (id && id !== 1002) {
      return { seller_id: id, name: '洛圣都军火商', description: '不买真军火的店铺是好店铺', cover_url: poster('shop2'), status: 'pass', is_self: false } as T
    }
    return { seller_id: 1002, name: '幕间小店', description: '周边与兑换码，工作日当天发货。', cover_url: poster('seller-banner'), status: 'pass', is_self: true } as T
  }
  if (clean === '/api/shop/category/list') {
    return [
      { category_id: 1000, name: '周边', sort: 80 },
      { category_id: 1001, name: '兑换码', sort: 70 },
      { category_id: 1002, name: '会员', sort: 60 },
    ] as T
  }
  if (clean === '/api/shop/product/info') {
    const id = Number(query.product_id ?? 0)
    return ({
      product_id: id, category_id: 1000, category_name: '周边',
      cover_url: poster('shop1'), name: '限量海报 A3', price: 68, price_origin: 98,
      stock: 24, sales: 132, is_up: true, sort: 80,
      seller: { seller_id: 1002, name: '幕间小店', description: '只卖自己喜欢的东西', cover_url: poster('seller-banner') },
      description: '美术馆授权的限量印刷版，A3 尺寸 250g 哑粉纸。',
      exchange_way: '下单后凭订单号联系商户自提',
      up_time: '2026-10-20 10:00:00', time_start: null, time_end: null,
      user_buy_max: 2, updated_at: '2026-11-01T10:00:00Z',
    } as T)
  }
  if (clean === '/api/shop/product/list') {
    const rows = [
      { product_id: 1000, category_id: 1000, cover_url: poster('shop1'), name: '限量海报 A3', price: 68, price_origin: 98, stock: 24, sales: 132, is_up: true, up_time: '2026-10-20 10:00:00', time_start: null, time_end: null, user_buy_max: 2, sort: 80, updated_at: '2026-11-01T10:00:00Z' },
      { product_id: 1001, category_id: 1001, cover_url: poster('shop2'), name: '一年会员兑换码', price: 198, price_origin: 268, stock: 500, sales: 61, is_up: true, up_time: '2026-10-18 09:00:00', time_start: null, time_end: null, user_buy_max: 1, sort: 70, updated_at: '2026-10-28T09:00:00Z' },
      { product_id: 1002, category_id: 1000, cover_url: poster('shop3'), name: '亚克力立牌', price: 39, price_origin: 59, stock: 0, sales: 240, is_up: false, up_time: null, time_start: null, time_end: null, user_buy_max: 3, sort: 60, updated_at: '2026-09-30T09:00:00Z' },
    ]
    // 不传 seller_id 就是全站商品；mock 里再补两条别家的，好看出区别
    const otherRows = query.seller_id
      ? []
      : [
          { product_id: 2000, category_id: 1000, cover_url: poster('shop3'), name: '别家的立牌', price: 45, price_origin: 60, stock: 12, sales: 33, is_up: true, up_time: '2026-10-01 10:00:00', time_start: null, time_end: null, user_buy_max: 1, sort: 80, updated_at: '2026-10-01T10:00:00Z' },
          { product_id: 2001, category_id: 1001, cover_url: poster('shop1'), name: '别家的海报', price: 88, price_origin: 120, stock: 5, sales: 9, is_up: true, up_time: '2026-09-20 10:00:00', time_start: null, time_end: null, user_buy_max: 1, sort: 70, updated_at: '2026-09-20T10:00:00Z' },
        ]
    const bulk = query.seller_id ? [] : Array.from({ length: 40 }, (_, i) => ({
      product_id: 3000 + i, category_id: 1000, cover_url: poster('shop' + ((i % 3) + 1)),
      name: `${['限量徽章', '亚克力钥匙扣', '明信片套装', '帆布袋', '贴纸包'][i % 5]} ${i + 1}`, price: 10 + i, price_origin: 20 + i, stock: 100 - i,
      sales: i * 3, is_up: true, up_time: '2026-10-01 10:00:00', time_start: null, time_end: null,
      user_buy_max: 99, sort: 80, updated_at: '2026-10-01T10:00:00Z',
    }))
    let filtered: typeof rows = query.category_id ? rows.filter((r) => r.category_id === Number(query.category_id)) : rows
    filtered = [...filtered, ...bulk]
    filtered = [...filtered, ...otherRows]
    if (query.is_up !== undefined) filtered = filtered.filter((r) => r.is_up === (String(query.is_up) === '1' || query.is_up === true))
    if (query.name) filtered = filtered.filter((r) => r.name.includes(String(query.name)))
    return paginate(filtered, Number(query.page ?? 1), Number(query.page_size ?? 12)) as T
  }
  if (clean === '/api/shop/product/up') return { is_up: true } as T
  if (clean === '/api/shop/product/sort') return { sort: Number(body.sort ?? 80) } as T
  if (clean === '/api/shop/product/createOrUpdate') return { product_id: 1000 } as T
  if (clean === '/api/shop/product/delete') return {} as T
  if (clean === '/api/shop/category/create') return { category_id: 1003 } as T
  if (clean === '/api/shop/category/delete') return {} as T
  if (clean === '/api/shop/category/sort') return { sort: 80 } as T
  if (clean === '/api/shop/seller/update' || clean === '/api/shop/seller/apply') {
    return { name: String(body.name ?? ''), description: String(body.description ?? ''), cover: '', cover_url: '' } as T
  }
  if (clean === '/api/shop/order/shop/order') {
    // ?nonadmin 用于在 mock 下预览普通用户视角（这两个接口对普通用户 403）
    if (new URLSearchParams(location.search).has('nonadmin')) throw Object.assign(new Error('无权限'), { status: 403 })
    const rows = [
      { user: { username: 'lin' }, order_no: '20261101093012shopA1', product_id: 1000, price_order: 68, price_settle: 60, order_title: '限量海报 A3', order_cover_url: poster('shop1'), status_pay: 'pay', urge_number: 0, buy_number: 1, time_pay: '2026-11-01 09:31:00', time_delivery: null, time_urge: null, remark_shop: null, remark_user: null, created_at: '2026-11-01T09:30:12Z' },
      { user: { username: 'zhou' }, order_no: '20261030201455shopB2', product_id: 1001, price_order: 198, price_settle: 180, order_title: '一年会员兑换码', order_cover_url: poster('shop2'), status_pay: 'pay', urge_number: 2, buy_number: 1, time_pay: '2026-10-30 20:15:00', time_delivery: '2026-10-31 09:00:00', time_urge: '2026-10-31 08:00:00', remark_shop: '已发邮箱', remark_user: null, created_at: '2026-10-30T20:14:55Z' },
      { user: { username: 'chen' }, order_no: '20261028113300shopC3', product_id: 1000, price_order: 68, price_settle: 60, order_title: '限量海报 A3', order_cover_url: poster('shop1'), status_pay: 'default', urge_number: 0, buy_number: 2, time_pay: null, time_delivery: null, time_urge: null, remark_shop: null, remark_user: null, created_at: '2026-10-28T11:33:00Z' },
    ]
    let filtered = rows
    const truthy = (v: unknown) => v === true || v === '1' || v === 'true'
    const falsy = (v: unknown) => v === false || v === '0' || v === 'false'
    if (truthy(query.is_pay)) filtered = filtered.filter((r) => r.status_pay === 'pay')
    if (falsy(query.is_pay)) filtered = filtered.filter((r) => r.status_pay !== 'pay')
    if (truthy(query.is_delivery)) filtered = filtered.filter((r) => Boolean(r.time_delivery))
    if (falsy(query.is_delivery)) filtered = filtered.filter((r) => !r.time_delivery)
    if (query.order_title) filtered = filtered.filter((r) => r.order_title.includes(String(query.order_title)))
    if (query.order_no) filtered = filtered.filter((r) => r.order_no === String(query.order_no))
    return paginate(filtered, Number(query.page ?? 1), Number(query.page_size ?? 10)) as T
  }
  if (clean === '/api/shop/order/user/create') {
    return { no: '20261110190000shopMOCK', buy_number: Number(body.buy_number ?? 1), price: 68, expired: '2026-11-10 19:30:00' } as T
  }
  if (clean === '/api/shop/order/user/pay') return { message: '支付成功' } as T
  if (clean === '/api/shop/order/user/urge') return { urge_number: 1 } as T
  if (clean === '/api/shop/order/user/close') return {} as T
  if (clean === '/api/shop/order/user/order') return {} as T
  if (clean === '/api/shop/order/user/list') {
    const truthy = (v: unknown) => v === true || v === '1' || v === 'true'
    const falsy = (v: unknown) => v === false || v === '0' || v === 'false'
    let rows = [
      { user: { username: 'sorakand' }, order_no: '20261110190000shopMOCK', product_id: 1000, price_order: 68, price_settle: 60, order_title: '限量海报 A3', order_cover_url: poster('shop1'), status_pay: 'default', urge_number: 0, buy_number: 1, time_pay: null, time_delivery: null, remark_shop: null, remark_user: null, created_at: '2026-11-10T19:00:00Z' },
      { user: { username: 'sorakand' }, order_no: '20261109120000shopPAID', product_id: 1001, price_order: 198, price_settle: 180, order_title: '一年会员兑换码', order_cover_url: poster('shop2'), status_pay: 'pay', urge_number: 0, buy_number: 1, time_pay: '2026-11-09 12:01:00', time_delivery: null, remark_shop: null, remark_user: null, created_at: '2026-11-09T12:00:00Z' },
    ]
    if (truthy(query.is_pay)) rows = rows.filter((r) => r.status_pay === 'pay')
    if (falsy(query.is_pay)) rows = rows.filter((r) => r.status_pay !== 'pay')
    if (truthy(query.is_delivery)) rows = rows.filter((r) => Boolean(r.time_delivery))
    if (falsy(query.is_delivery)) rows = rows.filter((r) => !r.time_delivery)
    if (query.order_title) rows = rows.filter((r) => r.order_title.includes(String(query.order_title)))
    if (query.order_no) rows = rows.filter((r) => r.order_no === String(query.order_no))
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 10)) as T
  }
  if (clean === '/api/shop/order/shop/delivery') return { time_delivery: new Date().toISOString() } as T
  if (clean === '/api/shop/order/shop/remark') return {} as T

  if (clean === '/api/invite/info') return { invite_at: '2026-01-16 09:06:31', invite_remaining: 3, invite_count: 12, parent: { pseudonym: null } } as T
  if (clean === '/api/invite/history') {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      user_id: `e${1000 + i}Xs`,
      username: ['lin', 'zhou', 'chen', 'kai', 'mu', 'su'][i],
      telegram_user_id: null,
      invite_at: `2026-10-0${i + 1} 10:00:00`,
      invite_remark: i % 3 === 0 ? '同事' : null,
      join_at: `2026-10-0${i + 1} 10:05:00`,
      last_video_player: '2026-11-02 21:00:00',
      last_telegram_message: null,
      last_user_sign: '2026-11-03 09:00:00',
    }))
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 10)) as T
  }
  if (clean === '/api/invite/tree') {
    return [
      { user_id: 'eXD3VD3Y1s', username: 'sorakand', invite_at: '2026-01-17 10:10:10', invite_user_id: 'emos', is_disabled: false, join_at: '2026-01-17 00:06:35', last_video_player: '2026-11-02 12:42:04', last_telegram_message: '2026-10-14 15:16:27', last_user_sign: '2026-11-03 15:34:57' },
      { user_id: 'e1000Xs', username: 'lin', invite_at: '2026-10-01 10:00:00', invite_user_id: 'eXD3VD3Y1s', is_disabled: false, join_at: '2026-10-01 10:05:00', last_video_player: '2026-11-01 20:00:00', last_telegram_message: null, last_user_sign: '2026-11-03 08:00:00' },
      { user_id: 'e1001Xs', username: 'zhou', invite_at: '2026-10-02 10:00:00', invite_user_id: 'eXD3VD3Y1s', is_disabled: false, join_at: '2026-10-02 10:05:00', last_video_player: '2026-10-30 19:00:00', last_telegram_message: null, last_user_sign: '2026-11-01 09:00:00' },
      { user_id: 'e1004Xs', username: 'xuan', invite_at: '2026-10-08 09:00:00', invite_user_id: 'eXD3VD3Y1s', is_disabled: true, join_at: '2026-10-08 09:02:00', last_video_player: null, last_telegram_message: null, last_user_sign: null },
      { user_id: 'e1002Xs', username: 'chen', invite_at: '2026-10-03 10:00:00', invite_user_id: 'e1000Xs', is_disabled: false, join_at: '2026-10-03 10:05:00', last_video_player: null, last_telegram_message: null, last_user_sign: null },
      { user_id: 'e1003Xs', username: 'kai', invite_at: '2026-10-04 10:00:00', invite_user_id: 'e1001Xs', is_disabled: false, join_at: '2026-10-04 10:05:00', last_video_player: null, last_telegram_message: null, last_user_sign: null },
    ] as T
  }
  if (clean === '/api/fund/order/list') {
    const rows = [
      { activity_code: 'anniv-1', activity_name: 'EMOS 一周年', order_no: '20260814221653fundLKoR0', order_title: '使用 100🥕 兑换最高 1¥ 补贴', tier_name: '🍿 入场礼', tier_carrot: 100, tier_price: 1, payed_at: '2026-08-14 22:16:53', payout_status: 'reviewing', payout_status_string: '审核中', reward_code: null },
      { activity_code: 'anniv-1', activity_name: 'EMOS 一周年', order_no: '20260814220110fundXa9b', order_title: '使用 600🥕 兑换最高 6¥ 补贴', tier_name: '🎬 观影礼', tier_carrot: 600, tier_price: 6, payed_at: '2026-08-14 22:01:10', payout_status: 'pass', payout_status_string: '已打款', reward_code: null },
      { activity_code: 'anniv-1', activity_name: 'EMOS 一周年', order_no: '20260813093012fundQ1c', order_title: '使用 100🥕 兑换最高 1¥ 补贴', tier_name: '🍿 入场礼', tier_carrot: 100, tier_price: 1, payed_at: '2026-08-13 09:30:12', payout_status: 'default', payout_status_string: '待提交', reward_code: null },
    ]
    return paginate(rows, 1, 20) as T
  }
  if (clean === '/api/carrot/history') {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      trigger_type: i % 2 ? 'upload' : 'sign',
      trigger_type_string: i % 2 ? '上传奖励' : '签到',
      type: i % 2 ? 'in' : 'in',
      point: i % 2 ? 3 : 2,
      expired_at: null,
      created_at: `2026-11-0${(i % 9) + 1}T08:00:00.000000Z`,
    }))
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 10)) as T
  }
  if (clean === '/api/ban/list') {
    // ?nonadmin 用于在 mock 下预览普通用户视角（这两个接口对普通用户 403）
    if (new URLSearchParams(location.search).has('nonadmin')) throw Object.assign(new Error('无权限'), { status: 403 })
    return [
      { user_id: 'e0E4MKO96s', username: 'dajun7095', avatar: null, invite_user_id: 'eK98JXQ9Ms', invite_pseudonym: '咸鱼翻身计划', invite_at: '2026-01-22 17:39:27', telegram_user_id: '6181680957', disable_reason: '请求数异常', created_at: '2026-01-21T15:27:08.000000Z' },
    ] as T
  }
  if (clean === '/api/ban/change') return { carrot: -1 } as T
  if (clean === '/api/invite') return {} as T
  if (clean === '/api/invite/revoke') return { invite_remaining: 4 } as T
  if (clean === '/api/carrot/transfer') return { carrot: 4000 } as T
  if (clean === '/api/user/pseudonym') return { pseudonym: String(query.name ?? '') } as T
  if (clean === '/api/user/showEmpty') return { is_show_empty: Boolean((body as { is_show_empty?: boolean }).is_show_empty) } as T
  if (clean === '/api/user/passwordTemporary') return { password: 481, second: 45 } as T
  if (clean === '/api/user/passwordReset') return {} as T
  if (clean === '/api/user/sign') return { sign_index: 1, earn_point: 2, continuous_days: 7 } as T

  if (/\/api\/music\/song\/\d+\/media\/list$/.test(clean)) {
    return [
      {
        media_id: '2g598yxqwqzr', name: 'sorakand 上传', file_suffix: 'flac', file_size: 42_000_000,
        file_duration: 330, file_quality: 'lossless', meta_rate_bit: 900_000, is_primary: true,
        user: { username: 'sorakand' },
      },
      {
        media_id: '9b31xkq2mz', name: 'lin 上传', file_suffix: 'mp3', file_size: 13_767_777,
        file_duration: 330, file_quality: 'high', meta_rate_bit: 320_000, is_primary: false,
        user: { username: 'lin' },
      },
    ] as T
  }
  if (/\/api\/music\/song\/\d+\/media\/playUrl$/.test(clean)) return { url: 'https://music.emosstore.sbs/files/test/mock.flac' } as T
  if (/\/api\/music\/song\/\d+\/media\/delete$/.test(clean)) return { carrot: -1 } as T

  if (/\/api\/music\/song\/\d+\/lyric\/list$/.test(clean)) {
    return [
      {
        lyric_id: 9001,
        type: 'text',
        language: 'zh-CN',
        name: '简体中文',
        content: '抬头的一片天\n是男儿的一片天\n曾经在满天的星光下\n做梦的少年',
        created_at: '2026-10-20T10:00:00Z',
      },
    ] as T
  }
  if (/\/api\/music\/song\/\d+\/lyric\/create$/.test(clean)) return { lyric_id: 9002, carrot: 2 } as T
  if (/\/api\/music\/song\/\d+\/lyric\/delete$/.test(clean)) return { carrot: 2 } as T

  if (clean === '/api/upload/image/list') {
    const name = String(query.name ?? '').trim()
    const rows = Array.from({ length: 8 }, (_, i) => ({
      file_id: `img_${1000 + i}`,
      url: poster(`gallery${i + 1}`),
      file_name: ['封面-01.jpg', '封面-02.jpg', '海报-a.png', '海报-b.png', '横幅.png', '图标.png', '活动图.jpg', '周边.jpg'][i],
      file_size: 120_000 + i * 9000,
      created_at: '2026-11-0' + ((i % 5) + 1) + 'T10:00:00Z',
    }))
    return paginate(name ? rows.filter((r) => r.file_name.includes(name)) : rows, 1, 40) as T
  }
  if (clean === '/api/upload/image/delete') return { is_delete: true } as T
  if (clean === '/api/upload/store/disk') return ['local_emos_1', 'local_emos_2'] as T
  if (clean === '/api/upload/store/file') {
    return [
      { file_name: '夜航西飞.2026.2160p.WEB-DL.H265.mp4', file_size: 8_589_934_592, mime_type: 'video/mp4' },
      { file_name: '雾港.S02E04.1080p.mp4', file_size: 1_287_278_592, mime_type: 'video/mp4' },
    ] as T
  }
  if (clean === '/api/upload/store/archive') return { media_id: 'mock-media-archive', carrot: 2 } as T
  if (clean === '/api/upload/video/recognize') {
    const name = String(query.file_name ?? '')
    if (name.includes('雾港')) return { item_type: 've', item_id: 1002, title: '雾港 S2E04' } as T
    return { message: '未找到对应的视频, 请先同步后使用.' } as T
  }
  if (clean === '/api/upload/getUploadToken') return { file_id: `mock-${Math.random().toString(36).slice(2, 10)}` } as T
  if (/^\/api\/upload\/multipart\/.+\/presign$/.test(clean)) {
    const number = Number((body as { number?: number }).number ?? 1)
    return Array.from({ length: number }, (_, i) => ({ number: i + 1, upload_url: 'https://mock.invalid/put', upload_data: {} })) as T
  }
  if (/^\/api\/upload\/multipart\/.+\/complete$/.test(clean)) return { file_id: 'mock-file' } as T
  if (clean === '/api/upload/video/save') return { count: 1, media_id: 'mock-media', carrot: 3 } as T
  if (clean === '/api/user/agreeUploadAgreement') return {} as T

  if (/^\/api\/watch\/\d+\/video\/\d+$/.test(clean)) return { count: 1 } as T
  if (/^\/api\/watch\/\d+\/subscribe$/.test(clean)) return { is_subscribe: true } as T
  if (/^\/api\/watch\/\d+\/show$/.test(clean)) return { is_show: true } as T
  if (/^\/api\/watch\/\d+\/dynamic$/.test(clean)) return { url: (body.url as string | null) ?? null } as T
  if (/^\/api\/watch\/\d+\/sort$/.test(clean)) return {} as T

  throw Object.assign(new Error(`未模拟的接口：${clean}`), { status: 404 })
}
