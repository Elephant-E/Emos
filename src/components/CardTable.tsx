import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from './StateBlock'

/**
 * 卡片里的表格：加载 / 出错 / 空 / 有数据四种状态。
 *
 * 账号页的「已登录设备」和用户详情页的「最近播放」是同一套四态写法，
 * 每处都是四行条件判断，而且「有数据」那支要自己数一遍条数。
 */
export function CardTable({
  loading,
  error,
  onRetry,
  empty,
  count,
  loadingRows = 2,
  loadingCols = 3,
  children,
}: {
  loading?: boolean
  /** 取数失败。有它就不再落到「没有…」那支，把「取不到」说成「本来没有」 */
  error?: unknown
  onRetry?: () => void
  /** 没有数据时的提示 */
  empty: string
  count: number
  loadingRows?: number
  loadingCols?: number
  children: ReactNode
}) {
  if (loading) return <LoadingBlock bare rows={loadingRows} columns={loadingCols} />
  if (error) return <ErrorBlock bare error={error} onRetry={onRetry} />
  if (count === 0) return <EmptyBlock bare title={empty} />
  return <>{children}</>
}
