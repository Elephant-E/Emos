import { onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

/**
 * 通用滚动触底分页 composable。
 * 统一页面级滚动加载 handler 与生命周期注册/注销。
 *
 * 滚动容器的归属是应用布局的单一事实，由本 composable 内置解析，
 * 调用点无需（也不应）各自传容器：
 *   1. 显式传入 container（函数或元素）优先
 *   2. 应用主布局滚动通道 #scrollable-page（MainLayout 唯一可滚动容器）
 *   3. 不存在（独立页）时回退 window 滚动
 *
 * 用法：
 *   useInfiniteScroll({
 *     // 触底时调用（内部应自行处理 loading/hasMore/页码）
 *     loadMore: () => loadData(false),
 *
 *     // 可选守卫：返回 false 则不触发（用于多数据源分派 / 额外条件）
 *     shouldLoad: () => !loading.value && hasMore.value,
 *
 *     // 可选显式容器（默认自动解析，见上）
 *     container: () => document.getElementById('my-scroll-box'),
 *
 *     // 可选：触底阈值（默认 200）
 *     threshold: 240,
 *   })
 *
 * 生命周期：onMounted/onActivated 添加监听，onUnmounted/onDeactivated 移除。
 */
export function useInfiniteScroll({ loadMore, shouldLoad = null, container = null, threshold = 200 }) {
  // 解析实际滚动容器（单一事实源）
  const resolveContainer = () => {
    if (container) {
      return typeof container === 'function' ? container() : container
    }
    // 应用布局主滚动通道：MainLayout 的 .main-content，外层高度钉死 100vh，
    // window/documentElement 不滚动，监听 window 会永远空转。
    return document.getElementById('scrollable-page') || null
  }

  const isNearBottom = () => {
    const el = resolveContainer()

    if (el) {
      const scrollTop = el.scrollTop
      const clientHeight = el.clientHeight
      const scrollHeight = el.scrollHeight
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
    const el = resolveContainer()
    if (el) {
      el.addEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll)
    }
  }

  const removeListener = () => {
    const el = resolveContainer()
    if (el) {
      el.removeEventListener('scroll', handleScroll)
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