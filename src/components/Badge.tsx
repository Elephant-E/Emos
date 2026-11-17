import type { ReactNode } from 'react'

import type { BadgeTone } from '@/lib/tones'

/** 状态徽标：圆点 + 文案，色调只允许这几种，状态映射表留在各页的字典里。 */
export function Badge({
  tone = 'off',
  children,
  dot = true,
  title,
}: {
  tone?: BadgeTone
  children: ReactNode
  /** 需要纯文字标签（如「官方」）时关掉圆点 */
  dot?: boolean
  title?: string
}) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {dot ? <i /> : null}
      {children}
    </span>
  )
}
