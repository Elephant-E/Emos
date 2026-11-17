import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

/**
 * 滚动加载：把分页接口当无限列表用。queryKey 必须由调用方给——列表本身要是缓存条目，
 * 否则 mutation 的 invalidateQueries 对这些列表全部空转。
 * `loading` 是「有请求在飞」，`loadingMore` 只在续页时为真。
 */
export function usePagedInfinite<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number; page_size: number }>,
  { enabled = true, queryKey }: { enabled?: boolean; queryKey: readonly unknown[] },
) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    // 已加载条数没到 total 就还有下一页；用 items 计数而不是页码，
    // 避免上游 page_size 与实际返回不一致时提前停
    getNextPageParam: (lastPage, allPages) => nextPageParam(allPages, lastPage.total),
  })

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const first = query.data?.pages[0]

  return {
    items,
    total: first?.total ?? 0,
    pageSize: first?.page_size ?? 20,
    page: query.data?.pages.length ?? 1,
    // 初始也算「加载中」：否则首帧 items 为空且不在加载，会先闪一下空态文案
    loading: query.isFetching || (enabled && query.isPending),
    error: query.error,
    hasMore: Boolean(query.hasNextPage),
    loadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.isFetching || !query.hasNextPage) return
      void query.fetchNextPage()
    },
    retry: () => {
      void query.refetch()
    },
  }
}

/**
 * 「还有没有下一页」的唯一判定：按已加载条数而非页码与 total 比较——上游常把 page_size
 * 压回自己的值（图库 15、商品 100），用页码算会提前停或重复翻同一页。
 */
export function nextPageParam(
  pages: ReadonlyArray<{ items: readonly unknown[] }>,
  total: number | undefined,
): number | undefined {
  if (total == null) return undefined
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
  return loaded < total ? pages.length + 1 : undefined
}
