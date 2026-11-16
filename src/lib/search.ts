/** 列表每页条数：全站固定值（分页器已移除，靠滚动加载续页） */
export const PAGE_SIZE = 20

export function asPage(value: unknown, fallback = 1): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}


export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}


/** 搜索参数里的布尔：URL 上可能是 1 / true / 'true'，统一成 boolean */
export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return fallback
}
