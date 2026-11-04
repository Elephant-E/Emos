import type { Overview, Paginated, SeekItem, UserProfile, Video } from './types'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const MONTHS = ['6 月', '7 月', '8 月', '9 月', '10 月', '11 月']
const overview: Overview = {
  months: MONTHS,
  series: [
    { key: 'movie', label: '电影', color: '#ffc53d', values: [38, 44, 61, 74, 92, 68] },
    { key: 'series', label: '剧集', color: '#34d399', values: [26, 31, 42, 51, 63, 47] },
    { key: 'documentary', label: '纪录片', color: '#5aa2ff', values: [11, 14, 19, 24, 30, 22] },
    { key: 'variety', label: '综艺', color: '#ff7ab0', values: [7, 9, 12, 15, 19, 14] },
    { key: 'short', label: '短片', color: '#b394fa', values: [3, 4, 5, 7, 9, 6] },
  ],
  kpis: {
    play_total: 124300000,
    play_delta: 4.2,
    media_total: 4820,
    media_delta: 12,
    seek_open: 12,
    seek_delta: -18,
    carrot_total: 186420,
  },
  updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
}
const ZONES: Video['type'][] = ['movie', 'series', 'documentary', 'variety', 'short']
const titles = [
  '夜航西飞', '雾港', '静默频率', '白色跑道', '第九个乘客', '山海之间', '漫长的告别',
  '冬泳', '玻璃动物园', '无人区来信', '昼颜', '沙丘之外', '雨中的便利店', '旧城故事',
  '极夜', '候鸟', '第三封信', '南方以南',
]
const ZONE_BY_TITLE: Record<string, Video['type']> = {
  夜航西飞: 'movie', 雾港: 'series', 静默频率: 'movie', 白色跑道: 'movie',
  第九个乘客: 'movie', 山海之间: 'documentary', 漫长的告别: 'movie', 冬泳: 'movie',
  玻璃动物园: 'series', 无人区来信: 'documentary', 昼颜: 'series', 沙丘之外: 'movie',
  雨中的便利店: 'movie', 旧城故事: 'documentary', 极夜: 'short', 候鸟: 'short',
  第三封信: 'short', 南方以南: 'variety',
}

const videos: Video[] = titles.map((title, i) => ({
  video_id: `vl_${1000 + i}`,
  title,
  type: ZONE_BY_TITLE[title] ?? ZONES[i % ZONES.length],
  year: 2026 - (i % 6),
  tmdb_id: String(63247 + i),
  season_count: i % 4 === 1 ? 2 : i % 5 === 2 ? 3 : 1,
  episode_count: 8 + (i % 5) * 4,
  media_count: 3 + (i % 7),
  play_count: 182400 - i * 7300,
  is_delete: i === 16,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date(Date.now() - i * 3600000).toISOString(),
}))
const seeks: SeekItem[] = [
  { seek_id: 'sk_01', title: '沙丘 第二部', type: 'movie', status: 'open', carrot: 120, urge_count: 8, created_at: '2026-11-04T09:12:00Z' },
  { seek_id: 'sk_02', title: '城市之光 第四季', type: 'series', status: 'claimed', carrot: 80, urge_count: 3, claim_user: { id: 'u_12', username: 'lin' }, created_at: '2026-11-03T22:40:00Z' },
  { seek_id: 'sk_03', title: '极地航线', type: 'documentary', status: 'open', carrot: 60, urge_count: 5, created_at: '2026-11-03T18:05:00Z' },
  { seek_id: 'sk_04', title: '海边的曼彻斯特 修复版', type: 'movie', status: 'done', carrot: 200, urge_count: 12, claim_user: { id: 'u_08', username: 'zhou' }, created_at: '2026-11-02T11:30:00Z' },
  { seek_id: 'sk_05', title: '深夜食堂 第十季', type: 'series', status: 'open', carrot: 40, urge_count: 2, created_at: '2026-11-02T08:20:00Z' },
  { seek_id: 'sk_06', title: '雨林纪事', type: 'documentary', status: 'claimed', carrot: 90, urge_count: 6, claim_user: { id: 'u_20', username: 'chen' }, created_at: '2026-11-01T16:44:00Z' },
  { seek_id: 'sk_07', title: '边境线', type: 'movie', status: 'open', carrot: 150, urge_count: 9, created_at: '2026-10-31T10:02:00Z' },
  { seek_id: 'sk_08', title: '综艺 · 一桌好菜', type: 'variety', status: 'closed', carrot: 20, urge_count: 1, created_at: '2026-10-30T19:15:00Z' },
]
const user: UserProfile = {
  id: 'u_001',
  username: 'chenxi',
  pseudonym: '陈曦',
  is_admin: true,
  carrot: 4210,
}
function paginate<T>(rows: T[], page = 1, pageSize = 20): Paginated<T> {
  const start = (page - 1) * pageSize
  return { data: rows.slice(start, start + pageSize), total: rows.length, page, page_size: pageSize }
}
export async function mockRequest<T>(
  path: string,
  opts: { method?: string; query?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  await delay(90 + Math.random() * 140)
  const q = (opts.query ?? {}) as Record<string, string | number | undefined>
  const [clean] = path.split('?')
  if (clean === '/api/sign/check') return { is_login: true } as T
  if (clean === '/api/user/base' || clean === '/api/user') return user as T
  if (clean === '/api/stats/overview') {
    return { ...overview, updated_at: new Date(Date.now() - 180000).toISOString() } as T
  }
  if (clean === '/api/video/list' || clean === '/api/video/search') {
    let rows = videos
    const title = String(q.title ?? '').trim()
    if (title) rows = rows.filter((v) => v.title.includes(title))
    if (q.type) rows = rows.filter((v) => v.type === q.type)
    if (String(q.only_delete ?? '') === 'true') rows = rows.filter((v) => v.is_delete)
    else rows = rows.filter((v) => !v.is_delete)
    return paginate(rows, Number(q.page ?? 1), Number(q.page_size ?? 20)) as T
  }
  if (clean === '/api/seek') {
    const body = (opts.body ?? {}) as { page?: number; page_size?: number; status?: string }
    let rows = seeks
    if (body.status && body.status !== 'all') rows = rows.filter((s) => s.status === body.status)
    return paginate(rows, body.page ?? 1, body.page_size ?? 20) as T
  }
  if (clean === '/api/watch') {
    const rows = [
      { watch_id: 'w_1', name: '本周新片', type: 'video', video_count: 12, is_public: true, is_self: true, updated_at: '2026-11-04T08:00:00Z' },
      { watch_id: 'w_2', name: '纪录片片单', type: 'video', video_count: 34, is_public: true, is_self: true, updated_at: '2026-11-02T12:00:00Z' },
      { watch_id: 'w_3', name: '4K 修复', type: 'video', video_count: 8, is_public: false, is_self: true, updated_at: '2026-10-28T09:00:00Z' },
    ]
    return paginate(rows, Number(q.page ?? 1), Number(q.page_size ?? 20)) as T
  }
  if (clean === '/api/rank/upload') {
    return {
      data: [
        { user_id: 'u_12', username: 'lin', upload_count: 182 },
        { user_id: 'u_08', username: 'zhou', upload_count: 140 },
        { user_id: 'u_001', username: 'chenxi', upload_count: 96 },
      ],
    } as T
  }
  if (clean === '/api/rank/carrot') {
    return {
      data: [
        { user_id: 'u_08', username: 'zhou', carrot: 12800 },
        { user_id: 'u_001', username: 'chenxi', carrot: 4210 },
      ],
    } as T
  }
  throw Object.assign(new Error(`未模拟的接口：${clean}`), { status: 404 })
}
