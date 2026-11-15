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
  /**
   * 封面比例按数据本身的形状来，不强行统一：
   * - poster 2:3  影片、求片（TMDB w185 实际 185×278）
   * - wide 16:9   片单封面
   * - square 1:1  直播频道 logo、商品封面
   */
  shape?: 'poster' | 'wide' | 'square'
  /** 封面。没有可传空，卡片会自己收起来 */
  poster?: (row: T) => string | null | undefined
  /** 标题（一行，超长省略） */
  title: (row: T) => ReactNode
  /** 时间：与标题同一行、靠右（上映日期、更新时间、创建时间） */
  time?: (row: T) => ReactNode
  /** 徽标/类型这类次要信息，会排成一行 */
  meta?: (row: T) => ReactNode
  /** 第三行：日期、作者等更弱的信息 */
  sub?: (row: T) => ReactNode
  /** 封面右上角的角标（数量这类信息放图上，不占文字行） */
  badges?: (row: T) => ReactNode
  /**
   * 卡片底部操作。只有「详情页没有等价入口」的动作才放这里，
   * 能在详情页做的事就不要在卡片上重复（片单的删除就是这样去掉的）。
   */
  actions?: (row: T) => ReactNode
}

export function RecordGrid<T>({
  rows,
  idKey,
  onOpen,
  shape = 'wide',
  poster,
  title,
  time,
  meta,
  sub,
  badges,
  actions,
}: RecordGridProps<T>) {
  return (
    <div className={`record-grid record-grid--${shape}`}>
      {rows.map((row) => {
        const clickable = Boolean(onOpen)
        const subNode = sub?.(row)
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
              /*
               * 图片位始终占位（按比例），不能因为「图还没到/没有图」就收起来：
               * 一列里有的卡有图、有的没有，标题与信息行就会一高一低，
               * 视觉上就是「右侧的年份没对齐」。
               */
              <div className={`record-tile__media record-tile__media--${shape}`}>
                <Poster src={poster(row)} shape={shape} className="record-tile__poster" collapseOnEmpty />
                {badges ? <div className="record-tile__badges">{badges(row)}</div> : null}
              </div>
            ) : null}
            <div className="record-tile__body">
              <div className="record-tile__head">
                <h3 className="record-tile__title">{title(row)}</h3>
                {time ? <span className="record-tile__time">{time(row)}</span> : null}
              </div>
              {meta ? <p className="record-tile__meta">{meta(row)}</p> : null}
              {subNode ? <p className="record-tile__sub">{subNode}</p> : null}
              {actions ? <div className="record-tile__actions">{actions(row)}</div> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
