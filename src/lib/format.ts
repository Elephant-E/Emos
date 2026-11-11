export function formatThousand(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('zh-CN')
}

export function formatSize(bytes: number | null | undefined): string {
  // 0 是合法的「没有体积」，只有缺失才显示 —；否则用户无法区分「空」与「取不到」
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
  // 调用点常写成 String(x)，null 会变成字面量 "null"，必须挡掉
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

export function formatRelative(iso: string | null | undefined): string {
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const then = new Date(iso.replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) return iso
  const raw = Date.now() - then
  // 未来时间不能显示成「刚刚」，那会掩盖过期/预告类字段
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
export const VIDEO_TYPE_COLOR: Record<string, string> = { movie: 'var(--c-yellow)', tv: 'var(--c-green)' }

export const SEEK_STATUS: Record<string, { label: string; cls: string }> = {
  default: { label: '求片中', cls: 'badge--wait' },
  upload: { label: '已认领', cls: 'badge--run' },
  complete: { label: '已完成', cls: 'badge--ok' },
  cancel: { label: '已取消', cls: 'badge--off' },
  forget: { label: '已遗忘', cls: 'badge--off' },
}

// 依据 wiki「萝卜 → 境界」对照表
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

const VIDEO_EXT = ['mp4', 'mkv', 'avi', 'mov', 'ts', 'm2ts', 'wmv', 'flv', 'webm', 'rmvb']

/** 是不是能当视频上传的文件。mkv 在部分系统上 mime 是 application/octet-stream，按扩展名兜一下 */
export function isVideoFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith('video/')) return true
  const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  return VIDEO_EXT.includes(ext)
}

/** 给人看的文件类别：MIME（video/mp4）在界面上没有信息量 */
export function fileKind(name: string, mime: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (mime.startsWith('video/') || VIDEO_EXT.includes(ext)) return '视频'
  if (mime.startsWith('audio/') || ['mp3', 'flac', 'm4a', 'wav', 'aac'].includes(ext)) return '音频'
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return '图片'
  if (['srt', 'ass', 'ssa', 'vtt', 'sub'].includes(ext) || mime.includes('subrip') || mime.includes('ssa')) return '字幕'
  return '其他'
}
