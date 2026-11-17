/**
 * 行数据转换的唯一出口：后端大量列表是「弱类型记录」（字段随业务变化），
 * 列表组件统一按 `Record<string, unknown>[]` 消费，调用点写 `rowsOf(x)`。
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
