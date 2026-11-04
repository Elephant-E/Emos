export function formatCount(n: number | null | undefined): { value: string; unit: string } {
  if (n === null || n === undefined || Number.isNaN(n)) return { value: '—', unit: '' }
  if (Math.abs(n) >= 100_000_000) return { value: (n / 100_000_000).toFixed(2), unit: '亿' }
  if (Math.abs(n) >= 10_000) return { value: (n / 10_000).toFixed(0), unit: '万' }
  return { value: n.toLocaleString('zh-CN'), unit: '' }
}

export function formatThousand(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('zh-CN')
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—'
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
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  const p = (v: number) => String(v).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso.replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(0, Date.now() - then)
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
