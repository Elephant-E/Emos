export function asPage(value: unknown, fallback = 1): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/** 全站允许的每页条数。30 是基金订单的上限，100 是商品列表的上限 */
export const PAGE_SIZE = 20

/**
 * 每页条数现在是固定值：分页器已全站移除，列表靠滚动加载续页，
 * 界面上没有任何地方能改这个数。保留函数是为了 URL 里旧的 page_size 不至于报错。
 */
export function asPageSize(_value: unknown): number {
  return PAGE_SIZE
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
