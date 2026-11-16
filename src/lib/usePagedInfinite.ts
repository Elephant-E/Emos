import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

/**
 * 滚动加载：把分页接口当无限列表用。
 *
 * 内部走 `useInfiniteQuery`，**queryKey 由调用方给**——这一点很关键：
 * 早先这层用 `useState` 自持数据，与 QueryClient 毫无连接，
 * 于是所有 `invalidateQueries` 对这些列表全部空转（改了数据列表不动）。
 * 现在列表本身就是缓存条目，mutation 的失效立刻见效。
 *
 * - 首屏取第 1 页
 * - `loadMore()` 取下一页并追加，直到 total 取完
 * - `loading` 是「有请求在飞」，`loadingMore` 只在续页时为真
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
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
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
