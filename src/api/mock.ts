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
    if (query.video_id) rows = rows.filter((v) => v.video_id === Number(query.video_id))
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
    const count = video?.video_type === 'movie' ? 1 : 4
    return Array.from({ length: count }, (_, i) => ({
      item_id: `ve-${seasonNumber}-${i + 1}`,
      season_id: 100 + Math.max(0, seasonNumber - 1),
      season_number: seasonNumber,
      episode_id: 500 + i,
      episode_title: video?.video_type === 'movie' ? '正片' : `第 ${i + 1} 集`,
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
  if (clean === '/api/video/media/rename') return { carrot: 1 } as T
  if (clean === '/api/video/media/delete') return { carrot: 3 } as T
  if (clean === '/api/video/subtitle/rename') return { carrot: 1 } as T
  if (clean === '/api/video/subtitle/delete') return { carrot: 1 } as T
  if (clean === '/api/video/sync') return [] as T
  if (/^\/api\/video\/\d+\/delete$/.test(clean)) return { carrot: 1, is_delete: true } as T

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
