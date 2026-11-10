import type { ReactNode } from 'react'

/**
 * 卡片头：左边一个标题，右边一处操作（按钮、链接或一行说明）。
 *
 * 这个结构在十几个地方各写了一遍 —— 里面的按钮写法有五种（quiet / ghost /
 * 纯文字 / 不加样式），间距和基线因此不一致。收成一个组件后，
 * 右侧样式只需要在 CSS 里管一次。
 */
export function CardHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="card-head">
      <p className="stat__label">{title}</p>
      {children}
    </div>
  )
}
