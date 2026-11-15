import type { ReactNode } from 'react'
import { Poster } from './Poster'

/**
 * 图片型列表的统一形态：一套结构，两端只差列数。
 *
 * 以前这类页面（媒体库、片单、求片、直播……）在桌面渲染表格、手机渲染卡片，
 * 列定义只有一份，但**布局规则是两份**：省略号、触控尺寸、间距、分页/滚动加载
 * 都要在两端各写一遍，改一侧就会漏另一侧。图片型内容本来也不依赖表格的列对齐，
 * 所以这里直接用网格卡片，列数交给 CSS 断点：
 *
 *   桌面 ≥1240  4 列
 *   平板 900+   3 列
 *   手机 ≤900   2 列
 *
 * 数值型列表（订单、资金、回收站、线路）仍用 RecordList：
 * 那些页面要靠数字横向对比，表格密度是刚需。
 */
export interface RecordGridProps<T> {
  rows: readonly T[]
  idKey: (row: T) => string | number
  onOpen?: (row: T) => void
  /** 封面。没有可传空，卡片会自己收起来 */
  poster?: (row: T) => string | null | undefined
  /** 标题（一行，超长省略） */
  title: (row: T) => ReactNode
  /** 徽标/类型这类次要信息，会排成一行 */
  meta?: (row: T) => ReactNode
  /** 第三行：日期、作者等更弱的信息 */
  sub?: (row: T) => ReactNode
  /** 卡片底部操作 */
  actions?: (row: T) => ReactNode
}

export function RecordGrid<T>({ rows, idKey, onOpen, poster, title, meta, sub, actions }: RecordGridProps<T>) {
  return (
    <div className="record-grid">
      {rows.map((row) => {
        const clickable = Boolean(onOpen)
        return (
          <article
            key={idKey(row)}
            className={`record-tile${clickable ? ' is-clickable' : ''}`}
            {...(clickable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: (event: React.MouseEvent) => {
                    // 卡片里的按钮自己处理点击，别把整卡跳转也触发
                    if ((event.target as HTMLElement).closest('button, a')) return
                    onOpen?.(row)
                  },
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen?.(row)
                    }
                  },
                }
              : {})}
          >
            {poster ? (
              <Poster src={poster(row)} shape="wide" className="record-tile__poster" collapseOnEmpty />
            ) : null}
            <div className="record-tile__body">
              <h3 className="record-tile__title">{title(row)}</h3>
              {meta ? <p className="record-tile__meta">{meta(row)}</p> : null}
              {sub ? <p className="record-tile__sub">{sub(row)}</p> : null}
              {actions ? <div className="record-tile__actions">{actions(row)}</div> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
