import type { ListResult, SeekItem, UserInfo, VideoItem, WatchItem, WatchVideo, WatchVideoCandidate } from './types'

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
  roles: [],
  must_otp: false,
  is_viewing: false,
  invite_remaining: 3,
  is_have_emps: false,
  slot_remaining: 2,
  size_upload: 0,
  carrot: 4210,
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
    subscribe_id: null, id: 1000, name: '本周新片', description: '每周更新的院线新片合集',
    is_public: true, carrot: 0, tags: ['院线', '追新'], image_poster: null, image_poster_url: poster('watch1'),
    is_show_empty: true, is_self: true, is_edit_video: true, is_subscribe: false, user_is_show: true,
    user_sort: 80, subscribe_count: 128, video_count: 24, maintainers: [], author: { username: 'sorakand' },
    updated_at: '2026-11-04T09:12:00Z',
  },
  {
    subscribe_id: 77, id: 1001, name: '4K 修复计划', description: '老片 4K 修复，按年份推进',
    is_public: true, carrot: 10, tags: ['修复', '4K'], image_poster: null, image_poster_url: poster('watch2'),
    is_show_empty: false, is_self: true, is_edit_video: true, is_subscribe: true, user_is_show: true,
    user_sort: 70, subscribe_count: 42, video_count: 12, maintainers: [{ username: 'lin' }], author: { username: 'sorakand' },
    updated_at: '2026-11-02T12:40:00Z',
  },
  {
    subscribe_id: null, id: 1002, name: '纪录片精选', description: null,
    is_public: false, carrot: 0, tags: ['纪录片'], image_poster: null, image_poster_url: poster('watch3'),
    is_show_empty: true, is_self: false, is_edit_video: false, is_subscribe: false, user_is_show: false,
    user_sort: 80, subscribe_count: 6, video_count: 31, maintainers: [], author: { username: 'zhou' },
    updated_at: '2026-10-28T18:20:00Z',
  },
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
  upload_username: i % 3 === 1 ? 'lin' : null,
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

function paginate<T>(items: T[], page = 1, pageSize = 20): ListResult<T> {
  const start = (page - 1) * pageSize
  return { page, page_size: pageSize, total: items.length, items: items.slice(start, start + pageSize) }
}

export async function mockRequest<T>(
  path: string,
  opts: { method?: string; query?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  await delay(80 + Math.random() * 120)
  const [clean] = path.split('?')
  const query = (opts.query ?? {}) as Record<string, string | number | boolean | undefined>
  const body = (opts.body ?? {}) as Record<string, unknown>

  if (clean === '/api/sign/check') return { is_sign: true, user_id: user.user_id } as T
  if (clean === '/api/user/base') return { user_id: user.user_id, username: user.username, avatar: null } as T
  if (clean === '/api/user') return user as T
  if (clean === '/api/carrot/current') return { carrot: user.carrot } as T
  if (clean === '/api/rank/upload') return rankUpload as T
  if (clean === '/api/rank/carrot') return rankUpload.map((r) => ({ index: r.index, carrot: r.size * 40, username: r.username, avatar: null })) as T
  if (clean === '/api/rank/userVideoRecordPlaying') return playing as T

  if (clean === '/api/video/list') {
    let rows = videos.filter((v) => !v.is_delete)
    const title = String(query.title ?? '').trim()
    if (title) rows = rows.filter((v) => v.video_title.includes(title))
    if (query.type) rows = rows.filter((v) => v.video_type === query.type)
    return paginate(rows, Number(query.page ?? 1), Number(query.page_size ?? 20)) as T
  }

  if (clean === '/api/seek') {
    const statuses = (body.status as string[] | undefined) ?? ['default', 'upload', 'complete']
    const rows = seeks.filter((s) => statuses.includes(s.status))
    return paginate(rows, Number(body.page ?? 1), Number(body.page_size ?? 20)) as T
  }

  if (clean === '/api/watch') {
    let rows = watches
    if (query.watch_id) rows = rows.filter((w) => w.id === Number(query.watch_id))
    if (query.is_self) rows = rows.filter((w) => w.is_self)
    if (query.is_subscribe) rows = rows.filter((w) => w.is_subscribe)
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

  if (/^\/api\/watch\/\d+\/video\/\d+$/.test(clean)) return { count: 1 } as T
  if (/^\/api\/watch\/\d+\/subscribe$/.test(clean)) return { is_subscribe: true } as T
  if (/^\/api\/watch\/\d+\/show$/.test(clean)) return { is_show: true } as T
  if (/^\/api\/watch\/\d+\/dynamic$/.test(clean)) return { url: (body.url as string | null) ?? null } as T
  if (/^\/api\/watch\/\d+\/sort$/.test(clean)) return {} as T

  throw Object.assign(new Error(`未模拟的接口：${clean}`), { status: 404 })
}
