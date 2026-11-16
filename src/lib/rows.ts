/**
 * 行数据转换的唯一出口。
 *
 * 后台大量列表的后端形态是「弱类型记录」（字段随业务变化），而表格/卡片组件需要
 * `Record<string, unknown>[]`。这类转换以前散在各处写 `as unknown as`，
 * 既看不出意图也不好审计。统一收在这里，调用点写 `rowsOf(x)` 即可。
 */
export function rowsOf<T extends Record<string, unknown> = Record<string, unknown>>(
  input: unknown,
): T[] {
  return (Array.isArray(input) ? input : []) as T[]
}

/** 分页信封转换：`{items,total,page_size}` 形态 */
export function pageOf<T extends Record<string, unknown> = Record<string, unknown>>(input: unknown): {
  items: T[]
  total: number
  page_size: number
} {
  const page = (input ?? {}) as { items?: unknown; total?: unknown; page_size?: unknown }
  return {
    items: rowsOf<T>(page.items),
    total: Number(page.total ?? 0),
    page_size: Number(page.page_size ?? 0),
  }
}
