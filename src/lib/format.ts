import type { BadgeTone } from './tones'
export function formatThousand(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('zh-CN')
}

export function formatSize(bytes: number | null | undefined): string {
  // 0 是合法的「没有体积」，只有缺失才显示 —，两者要能区分开
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDateTime(iso: string | null | undefined): string {
  // 调用点会写成 String(x)，null 变成字面量 "null"，需一并挡掉
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  const p = (v: number) => String(v).padStart(2, '0')
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const date = `${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`
  if (iso.length <= 10) return sameYear ? date : `${d.getFullYear()}-${date}`
  return `${sameYear ? date : `${d.getFullYear()}-${date}`} ${time}`
}

/** 只到日：注册、加入、到期这类「身份/期限」时间不需要时分，且必须带年份 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(iso)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const then = new Date(iso.replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) return iso
  const raw = Date.now() - then
  // 未来时间显示成「刚刚」会掩盖过期/预告类字段，改走绝对时间
  if (raw < 0) return formatDateTime(iso)
  const diff = raw
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return formatDateTime(iso)
}

export const VIDEO_TYPE_LABEL: Record<string, string> = { movie: '电影', tv: '剧集' }
export const SEEK_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  default: { label: '求片中', tone: 'wait' },
  upload: { label: '已认领', tone: 'run' },
  complete: { label: '已完成', tone: 'ok' },
  cancel: { label: '已取消', tone: 'off' },
  forget: { label: '已遗忘', tone: 'off' },
}

// 萝卜 → 境界对照表，见 docs/WIKI-NOTES.md
const REALMS: Array<[number, string]> = [
  [100000000, '真仙'],
  [10000000, '大乘'],
  [1000000, '合体'],
  [500000, '炼虚'],
  [100000, '化神'],
  [60000, '元婴圆满'],
  [35000, '元婴后期'],
  [20000, '元婴中期'],
  [10000, '元婴初期'],
  [6000, '结丹圆满'],
  [3500, '结丹后期'],
  [2000, '结丹中期'],
  [1000, '结丹初期'],
  [600, '筑基圆满'],
  [300, '筑基后期'],
  [150, '筑基中期'],
  [100, '筑基初期'],
  [90, '练气期九层'],
  [80, '练气期八层'],
  [70, '练气期七层'],
  [60, '练气期六层'],
  [50, '练气期五层'],
  [40, '练气期四层'],
  [30, '练气期三层'],
  [20, '练气期二层'],
  [10, '练气期一层'],
  [0, '凡人期'],
]

export function realmOf(carrot: number): { name: string; next: number | null } {
  const index = REALMS.findIndex(([floor]) => carrot >= floor)
  const current = REALMS[index] ?? REALMS[REALMS.length - 1]
  const next = index > 0 ? REALMS[index - 1][0] : null
  return { name: current[1], next }
}

const VIDEO_EXT = ['mp4', 'mkv', 'avi', 'mov', 'ts', 'm2ts', 'wmv', 'flv', 'webm', 'rmvb', 'm4v']
const SUBTITLE_EXT = ['srt', 'ass', 'ssa', 'vtt', 'sub']

/** 上传支持的两类文件，其余一律拒绝 */
export type UploadKind = 'video' | 'subtitle'

export function detectUploadKind(file: { name: string; type: string }): UploadKind | null {
  if (isVideoFile(file)) return 'video'
  const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  if (SUBTITLE_EXT.includes(ext) || file.type.includes('subrip') || file.type.includes('ssa')) return 'subtitle'
  return null
}

/** 是不是能当视频上传的文件。mkv 在部分系统上 mime 是 application/octet-stream，按扩展名兜一下 */
function isVideoFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith('video/')) return true
  const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  return VIDEO_EXT.includes(ext)
}


/** 两位补零：集号、季号在多处要用（S01E03 这种） */
function pad2(n: number): string {
  return String(Math.max(0, Math.trunc(n))).padStart(2, '0')
}

/** 季集编号：只有季给 `S02`，两者都有给 `S02E05`；都没有返回空串 */
export function episodeCode(season?: number | null, episode?: number | null): string {
  const s = season ? `S${pad2(season)}` : ''
  const e = episode != null ? `E${pad2(episode)}` : ''
  return `${s}${e}`
}

/** 订单支付状态：后端 `pay` 与 `paid` 都表示已支付（字段名是 status_pay） */
export function isOrderPaid(status: unknown): boolean {
  return status === 'pay' || status === 'paid'
}

/** 支付记录的状态文案（字段名是 pay_status，取值与订单不同） */
export const PAY_STATUS_LABEL: Record<string, string> = {
  default: '待支付',
  pay: '已支付',
  paid: '已支付',
  close: '已关闭',
  refund: '已退款',
}

/** 数字输入框取值：空串与非法输入都返回 null（`Number('')` 是 0，不能直接用），由调用方决定是否提交 */
export function numberFromInput(raw: string): number | null {
  const text = raw.trim()
  if (!text) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}
