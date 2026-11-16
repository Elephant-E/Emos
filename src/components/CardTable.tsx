import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from './StateBlock'

/**
 * 卡片里的表格：加载 / 出错 / 空 / 有数据四种状态。
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
  /** 取数失败。有它时渲染错误态，不落到空态 */
  error?: unknown
  onRetry?: () => void
  /** 没有数据时的提示 */
  empty: string
  count: number
  loadingRows?: number
  loadingCols?: number
  children: ReactNode
}) {
  if (loading) return <LoadingBlock rows={loadingRows} columns={loadingCols} />
  if (error) return <ErrorBlock error={error} onRetry={onRetry} />
  if (count === 0) return <EmptyBlock title={empty} />
  return <>{children}</>
}
