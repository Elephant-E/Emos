import { onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

/**
 * 通用滚动触底分页 composable。
 * 统一 6 处重复的滚动加载 handler 与生命周期注册/注销。
 *
 * 用法：
 *   useInfiniteScroll({
 *     // 触底时调用（内部应自行处理 loading/hasMore/页码）
 *     loadMore: () => loadData(false),
 *
 *     // 可选守卫：返回 false 则不触发（用于多数据源分派 / 额外条件）
 *     shouldLoad: () => !loading.value && hasMore.value,
 *
 *     // 可选：返回滚动元素（null/省略 = window 滚动）
 *     getContainer: () => document.getElementById('scrollable-page'),
 *
 *     // 可选：触底阈值（默认 200）
 *     threshold: 240,
 *   })
 *
 * 生命周期：自动在 onMounted/onActivated 添加监听，onUnmounted/onDeactivated 移除。
 * 与原实现行为一致：window 滚动用 scrollY/innerHeight/scrollHeight，
 * 元素滚动用 scrollTop/clientHeight/scrollHeight。
 */
export function useInfiniteScroll({ loadMore, shouldLoad = null, getContainer = null, threshold = 200 }) {
  const isNearBottom = () => {
    const container = getContainer ? getContainer() : null

    if (container) {
      const scrollTop = container.scrollTop
      const clientHeight = container.clientHeight
      const scrollHeight = container.scrollHeight
      return scrollHeight - scrollTop - clientHeight < threshold
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    return scrollTop + windowHeight >= documentHeight - threshold
  }

  const handleScroll = () => {
    if (shouldLoad && !shouldLoad()) return
    if (!isNearBottom()) return
    loadMore()
  }

  const addListener = () => {
    const container = getContainer ? getContainer() : null
    if (container) {
      container.addEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll)
    }
  }

  const removeListener = () => {
    const container = getContainer ? getContainer() : null
    if (container) {
      container.removeEventListener('scroll', handleScroll)
    } else {
      window.removeEventListener('scroll', handleScroll)
    }
  }

  onMounted(addListener)
  onActivated(addListener)
  onDeactivated(removeListener)
  onUnmounted(removeListener)

  return { handleScroll }
}

export default useInfiniteScroll