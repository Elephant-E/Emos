import type { ReactNode } from 'react'
import { Poster } from './Poster'

/**
 * 信息量大的列表：一行一条，左图右文，底部放主要动作。
 *
 * 求片这类页面「图片不是主要信息」——要看状态、求片人数、悬赏、到期时间，
 * 还要在列表里直接认领/催片，所以不能用网格卡片（网格只适合看图浏览）。
 * 结构与 RecordGrid 一致：一套实现，桌面与手机同一形态，不再分表格式/卡片式。
 */
export interface RecordRowProps<T> {
  rows: readonly T[]
  idKey: (row: T) => string | number
  onOpen?: (row: T) => void
  poster?: (row: T) => string | null | undefined
  title: (row: T) => ReactNode
  /** 第一行次要信息：状态徽标、类型等 */
  meta?: (row: T) => ReactNode
  /** 第二行：数量、悬赏、时间等 */
  facts?: (row: T) => ReactNode
  /** 封面底部的角标（状态这类） */
  posterOverlay?: (row: T) => ReactNode
  /** 跨整行的信息块（如「求片记录」），放在正文与动作之间 */
  extra?: (row: T) => ReactNode
  /** 底部主要动作；传了 fullActions 就等分成整行按钮 */
  actions?: (row: T) => ReactNode
  fullActions?: boolean
}

export function RecordRow<T>({
  rows,
  idKey,
  onOpen,
  poster,
  title,
  meta,
  facts,
  posterOverlay,
  extra,
  actions,
  fullActions = false,
}: RecordRowProps<T>) {
  return (
    <div className="record-rows">
      {rows.map((row) => {
        const metaNode = meta?.(row)
        const factsNode = facts?.(row)
        return (
          <article
            key={idKey(row)}
            className={`record-row${onOpen ? ' is-clickable' : ''}${poster ? '' : ' record-row--plain'}`}
            {...(onOpen
              ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: (event: React.MouseEvent) => {
                    // 卡片里的按钮自己处理点击，别把整卡跳转也触发
                    if ((event.target as HTMLElement).closest('button, a')) return
                    onOpen(row)
                  },
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen(row)
                    }
                  },
                }
              : {})}
          >
            {poster ? (
              <div className="record-row__media">
                <Poster src={poster(row)} shape="poster" className="record-row__poster" collapseOnEmpty />
                {posterOverlay ? <div className="record-row__overlay">{posterOverlay(row)}</div> : null}
              </div>
            ) : null}
            <div className="record-row__body">
              <h3 className="record-row__title">{title(row)}</h3>
              {metaNode ? <div className="record-row__meta">{metaNode}</div> : null}
              {factsNode ? <div className="record-row__facts">{factsNode}</div> : null}
            </div>
            {/* 信息块跨整行：文字列只有 128px 宽，三行标签值放不进去会乱折 */}
            {extra ? <div className="record-row__extra">{extra(row)}</div> : null}
            {actions ? (
              <div className={`record-row__actions${fullActions ? ' record-row__actions--full' : ''}`}>{actions(row)}</div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
