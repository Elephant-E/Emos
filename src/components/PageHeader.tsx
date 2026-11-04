import type { ReactNode } from 'react'
import { IconGrid } from './icons'
interface PageHeaderProps {
  crumb: string[]
  title: string
  hint?: ReactNode
  tools?: ReactNode
}
export function PageHeader({ crumb, title, hint, tools }: PageHeaderProps) {
  return (
    <div className="page__head">
      <div>
        <nav className="crumb" aria-label="面包屑">
          <IconGrid />
          <span>{crumb[0]}</span>
          {crumb[1] ? (
            <>
              <span className="crumb__sep">/</span>
              <span className="crumb__here">{crumb[1]}</span>
            </>
          ) : null}
        </nav>
        <h1 className="page-title">
          {title}
          {hint ? <span>{hint}</span> : null}
        </h1>
      </div>
      {tools ? <div className="head-tools">{tools}</div> : null}
    </div>
  )
}
