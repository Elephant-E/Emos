import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { IconGrid } from './icons'

interface PageHeaderProps {
  crumb: string[]
  title: string
  hint?: ReactNode
  tools?: ReactNode
  /** 标题左侧的小图（店铺封面、头像一类），和 h1 同一基线 */
  mark?: string | null
}

/** 面包屑首段对应的列表页，点它能回到那一级 */
const SECTION_PATH: Record<string, string> = {
  概览: '/',
  媒体库: '/library',
  片单: '/watchlists',
  求片: '/seek',
  音乐: '/music',
  上传: '/upload',
  直播: '/live',
  商城: '/shop',
  订单: '/orders',
  线路: '/lines',
  用户: '/users',
  资金: '/fund',
  支付: '/fund',
  悄悄话: '/whisper',
  账号: '/account',
  回收站: '/recycle',
}

export function PageHeader({ crumb, title, hint, tools, mark }: PageHeaderProps) {
  const root = crumb[0]
  const path = SECTION_PATH[root]
  return (
    <div className="page__head">
      <div>
        <nav className="crumb" aria-label="面包屑">
          <IconGrid />
          {path ? (
            <Link className="crumb__link" to={path}>
              {root}
            </Link>
          ) : (
            <span>{root}</span>
          )}
          {crumb[1] ? (
            <>
              <span className="crumb__sep">/</span>
              <span className="crumb__here">{crumb[1]}</span>
            </>
          ) : null}
        </nav>
        <div className="page-title__row">
          {mark ? <img className="page-title__mark" src={mark} alt="" /> : null}
          <h1 className="page-title">{title}</h1>
          {hint ? <span className="page-title__hint">{hint}</span> : null}
        </div>
      </div>
      {tools ? <div className="head-tools">{tools}</div> : null}
    </div>
  )
}
