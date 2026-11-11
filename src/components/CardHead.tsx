import type { ReactNode } from 'react'

/**
 * 卡片头：左边一个标题，右边一处操作（按钮、链接或一行说明）。
 * 右侧样式由 `.card-head` 统一管理。
 */
export function CardHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="card-head">
      <p className="stat__label">{title}</p>
      {children}
    </div>
  )
}
