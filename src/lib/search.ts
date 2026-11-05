type Search = Record<string, unknown>

export const PAGE_SIZES = [20, 50, 100] as const

export function asPage(value: unknown, fallback = 1): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function asPageSize(value: unknown, fallback = 20): number {
  const n = Number(value)
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function asNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export type { Search }
