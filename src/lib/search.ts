type Search = Record<string, unknown>

export function asPage(value: unknown, fallback = 1): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

const PAGE_SIZES = [10, 20, 50, 100] as const

export function asPageSize(value: unknown, fallback = 20): number {
  const n = Number(value)
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}


export type { Search }
