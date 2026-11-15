import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { IconGrid } from './icons'

interface PageHeaderProps {
  crumb: string[]
  title: string
  hint?: ReactNode
  tools?: ReactNode
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

export function PageHeader({ crumb, title, hint, tools }: PageHeaderProps) {
  const root = crumb[0]
  // 传了 fragment 但里面全是 null 时不要渲染空容器（会留一块空白）
  const hasTools = Boolean(tools) && !(Array.isArray(tools) && tools.every((t) => t == null))
  const path = SECTION_PATH[root]
  // 工具横向溢出时才加渐隐：没溢出还渐隐会把最后一个按钮右边缘裁掉
  const toolsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = toolsRef.current
    if (!el) return
    const sync = () => el.classList.toggle('is-scrollable', el.scrollWidth > el.clientWidth + 1)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [tools])
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
          <h1 className="page-title">{title}</h1>
          {hint ? <span className="page-title__hint">{hint}</span> : null}
        </div>
      </div>
      {tools && hasTools ? (
        <div className="head-tools" ref={toolsRef}>
          {tools}
        </div>
      ) : null}
    </div>
  )
}
