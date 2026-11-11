export function asPage(value: unknown, fallback = 1): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/** 全站允许的每页条数。30 是基金订单的上限，100 是商品列表的上限 */
export const PAGE_SIZES = [20, 30, 50, 100] as const

export function asPageSize(value: unknown, fallback = 20): number {
  const n = Number(value)
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback
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
