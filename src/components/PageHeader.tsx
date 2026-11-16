import { Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { IconGrid } from './icons'
import { useMediaQuery } from '@/lib/useMediaQuery'

interface PageHeaderProps {
  crumb: string[]
  title: string
  hint?: ReactNode
  /** 主要工具：始终显示 */
  tools?: ReactNode
  /** 次要工具：收起端（手机）折进「更多」，展开端常显 */
  more?: ReactNode
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
  // 「运营」在侧栏没有对应入口（榜单/抽奖/投票/红包分散在社区），根节点不做跳转
  运营: '',
  资金: '/fund',
  支付: '/fund',
  悄悄话: '/whisper',
  账号: '/account',
  回收站: '/recycle',
}

/** 过滤掉条件渲染留下的 null，工具按钮之间不留空档（fragment 也要拆开看） */
function childrenOf(node: ReactNode): ReactNode {
  const isNull = (child: ReactNode) => child === null || child === undefined || child === false
  if (Array.isArray(node)) return node.filter((child) => !isNull(child))
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) {
    const inner = node.props.children
    const list = (Array.isArray(inner) ? inner : [inner]).filter((child) => !isNull(child))
    return list.length > 0 ? list : null
  }
  return node
}

export function PageHeader({ crumb, title, hint, tools, more }: PageHeaderProps) {
  // 手机端把次要工具收进「更多」：由调用方声明主次，比让组件按数量猜可靠
  const [moreOpen, setMoreOpen] = useState(false)
  const compact = useMediaQuery('(max-width: 600px)')
  const root = crumb[0]
  // 传了 fragment 但内容全是 null 时不渲染容器（否则右上角留一个 0×4 的空盒）
  const toolNodes = tools ? childrenOf(tools) : null
  const moreNodes = more ? childrenOf(more) : null
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
    // 依赖数组留空：tools 在调用点普遍是内联 fragment，每次渲染都是新引用，
    // 挂上去会让 ResizeObserver 与 resize 监听随每次键入重建（元素引用由 ref 拿）
  }, [])
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
      {toolNodes || moreNodes ? (
        <div className="head-tools" ref={toolsRef}>
          {toolNodes}
          {moreNodes && (!compact || moreOpen) ? moreNodes : null}
          {moreNodes && compact ? (
            <button
              type="button"
              className="btn btn--quiet"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              {moreOpen ? '收起' : '更多'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
