import type { ReactNode } from 'react'
import { EmptyBlock, LoadingBlock } from './StateBlock'

/**
 * 卡片里的表格：加载 / 空 / 有数据三种状态。
 *
 * 账号页的「已登录设备」和用户详情页的「最近播放」是同一套三态写法，
 * 每处都是三行条件判断，而且「有数据」那支要自己数一遍条数。
 */
export function CardTable({
  loading,
  empty,
  count,
  loadingRows = 2,
  loadingCols = 3,
  children,
}: {
  loading?: boolean
  /** 没有数据时的提示 */
  empty: string
  count: number
  loadingRows?: number
  loadingCols?: number
  children: ReactNode
}) {
  if (loading) return <LoadingBlock bare rows={loadingRows} columns={loadingCols} />
  if (count === 0) return <EmptyBlock bare title={empty} />
  return <>{children}</>
}
