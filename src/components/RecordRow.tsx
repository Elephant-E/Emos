import { memo, type ReactNode } from 'react'
import { Poster } from './Poster'

/**
 * 信息量大的列表：一行一条，左图右文，底部放主要动作。
 *
 * 求片这类页面图片不是主要信息——要看状态、求片人数、悬赏、到期时间，还要在列表里
 * 直接认领/催片，所以不能用网格卡片（网格只适合看图浏览）。
 */
interface RecordRowProps<T> {
  rows: readonly T[]
  idKey: (row: T) => string | number
  /** 管理型列表（片单里的影片等）用单列：一行一条，便于逐个处理 */
  single?: boolean
  /** 左侧图片的比例：影片海报 2:3、用户头像方图 */
  posterShape?: 'poster' | 'square'
  /** 没有图时的占位：媒体默认图，用户显示首字 */
  posterFallback?: 'media' | 'initial'
  /** 首字占位用的文字（用户列表传用户名，别拿 ReactNode 转字符串） */
  posterName?: (row: T) => string
  /** 标题允许两行（消息内容这类需要多行展示的） */
  wrapTitle?: boolean
  /** 待办型多列布局（求片这类字段少、按卡浏览的列表） */
  multi?: boolean
  onOpen?: (row: T) => void
  poster?: (row: T) => string | null | undefined
  title: (row: T) => ReactNode
  /** 第一行次要信息：状态徽标、类型等 */
  meta?: (row: T) => ReactNode
  /** 第二行：数量、悬赏、时间等 */
  facts?: (row: T) => ReactNode
  /** 卡片右上角的角标（状态点这类） */
  corner?: (row: T) => ReactNode
  /** 跨整行的信息块（如「求片记录」），放在正文与动作之间 */
  extra?: (row: T) => ReactNode
  /** 右侧的数值列：等宽数字、右对齐，跨行能竖着比（榜单名次/金额这类） */
  value?: (row: T) => ReactNode
  /** 底部主要动作；传了 fullActions 就等分成整行按钮 */
  actions?: (row: T) => ReactNode
  fullActions?: boolean
}

function RecordRowBase<T>({
  rows,
  idKey,
  single = false,
  posterShape = 'poster',
  posterFallback = 'media',
  posterName,
  wrapTitle = false,
  multi = false,
  onOpen,
  poster,
  title,
  meta,
  facts,
  corner,
  extra,
  value,
  actions,
  fullActions = false,
}: RecordRowProps<T>) {
  return (
    <div className={`record-rows${single ? ' record-rows--single' : ''}${multi ? ' record-rows--multi' : ''}`}>
      {rows.map((row) => {
        const metaNode = meta?.(row)
        const factsNode = facts?.(row)
        // 整行可点只是鼠标便利：行内还有真按钮时不要再宣告 role="button"
        //（ARIA 规定 button 的子节点是表现性的，读屏会把行内动作吞掉）
        return (
          <article
            key={idKey(row)}
            className={`record-row${onOpen ? ' is-clickable' : ''}${poster ? '' : ' record-row--plain'}`}
            {...(onOpen && !actions
              ? {
                  role: 'link',
                  tabIndex: 0,
                  onClick: (event: React.MouseEvent) => {
                    // 卡片内的控件（按钮、链接、输入框）自己处理交互，不要连带触发整卡跳转
                    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return
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
              <div className={`record-row__media record-row__media--${posterShape}`}>
                <Poster
                  src={poster(row)}
                  name={posterName ? posterName(row) : ''}
                  shape={posterShape}
                  className="record-row__poster"
                  fallback={posterFallback}
                />
              </div>
            ) : null}
            <div className="record-row__body">
              <h3 className={`record-row__title${wrapTitle ? ' record-row__title--wrap' : ''}`}>{title(row)}</h3>
              {metaNode ? <div className="record-row__meta">{metaNode}</div> : null}
              {factsNode ? <div className="record-row__facts">{factsNode}</div> : null}
            </div>
            {/* 信息块跨整行：文字列只有 128px 宽，三行标签值放不进去会乱折 */}
            {extra ? <div className="record-row__extra">{extra(row)}</div> : null}
            {corner ? <div className="record-row__corner">{corner(row)}</div> : null}
            {value || actions ? (
              <div className={`record-row__actions${fullActions ? ' record-row__actions--full' : ''}`}>
                {actions ? actions(row) : null}
                {/* 数值放在最后：右边缘就固定与容器对齐，不受按钮宽度影响 */}
                {value ? <span className="record-row__value tnum">{value(row)}</span> : null}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

/** 行/卡片只依赖 props：父组件其它 state 变化时不要重排整个列表 */
export const RecordRow = memo(RecordRowBase) as typeof RecordRowBase
