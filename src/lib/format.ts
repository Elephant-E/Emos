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
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (v: number) => String(v).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
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
export const ZONE_LABEL: Record<string, string> = {
  movie: '电影',
  series: '剧集',
  documentary: '纪录片',
  variety: '综艺',
  short: '短片',
}
export const ZONE_COLOR: Record<string, string> = {
  movie: 'var(--c-yellow)',
  series: 'var(--c-green)',
  documentary: 'var(--c-blue)',
  variety: 'var(--c-pink)',
  short: 'var(--c-purple)',
}
