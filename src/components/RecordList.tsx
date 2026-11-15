import { Fragment, type ReactNode } from 'react'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { rowLink } from '@/lib/rowLink'

export interface RecordColumn<T> {
  key: string
  /** 桌面表头文字，也用作手机卡片上的字段名 */
  label: string
  /** mobile 为 true 表示正在渲染手机卡片，可据此调整（如缺图时不占位） */
  render: (row: T, ctx: { mobile: boolean }) => ReactNode
  /** 手机卡片上的字段名；null 表示不显示（值本身自解释时用） */
  mobileLabel?: string | null
  /** 独占一行时靠哪边（操作按钮用 end） */
  mobileAlign?: 'start' | 'end'
  /** 桌面表头附加类（如 num / th-thumb） */
  thClass?: string
  thWidth?: number | string
  /**
   * 手机卡片里怎么放：
   * - primary：卡片标题区（通常整行第一列，含缩略图）
   * - inline：跟在标题下方的次要信息，排成一行
   * - block：独占一行（徽标、按钮这类）
   * - hidden：手机上不显示（桌面仍显示）
   */
  mobile?: 'primary' | 'inline' | 'block' | 'hidden'
}

/**
 * 列表渲染：桌面是表格，手机是卡片。
 *
 * 卡片化不是把表格压扁就完事——手机上横向滚动没人愿意用，所以每个字段都要有名字、
 * 主要信息（标题+缩略图）放卡片头部，次要信息缩成一行，操作放底部。
 * 列的语义写在 columns 里，两边渲染共用同一份定义，不会出现「桌面改了手机没改」。
 */
export function RecordList<T>({
  rows,
  columns,
  idKey,
  onOpen,
  expandable,
  className,
}: {
  rows: readonly T[]
  columns: ReadonlyArray<RecordColumn<T>>
  idKey: (row: T) => string | number
  /** 手机端整张卡片可点（桌面不接管行点击，沿用调用方的 rowLink） */
  onOpen?: (row: T) => void
  /**
   * 可展开的行（如直播频道点开看源列表）。
   * 展开状态由调用方持有，这里只负责把内容渲染在行/卡片下面。
   */
  expandable?: {
    isExpanded: (row: T) => boolean
    render: (row: T) => ReactNode
  }
  /** 桌面表格的附加类名 */
  className?: string
}) {
  const compact = useMediaQuery('(max-width: 600px)')
  const primary = columns.find((c) => c.mobile === 'primary') ?? columns[0]
  const inline = columns.filter((c) => c.mobile === 'inline')
  const block = columns.filter((c) => c.mobile === 'block')

  if (!compact) {
    return (
      <table className={className ?? 'table table--auto'}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.thClass}
                style={column.thWidth ? { width: column.thWidth } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={idKey(row)}>
            <tr
              {...(onOpen ? rowLink(() => onOpen(row), true, expandable ? 'button' : 'link') : {})}
              className={expandable?.isExpanded(row) ? 'is-expanded' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.thClass === 'num' ? 'num' : undefined}>
                  {column.render(row, { mobile: false })}
                </td>
              ))}
            </tr>
            {expandable?.isExpanded(row) ? (
              <tr className="is-expand-row">
                <td colSpan={columns.length}>{expandable.render(row)}</td>
              </tr>
            ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <ul className="record-cards">
      {rows.map((row) => (
        <li key={idKey(row)} className="record-card">
          <div
            className={`record-card__body${onOpen ? ' is-tappable' : ''}`}
            {...(onOpen
              ? {
                  role: 'button' as const,
                  tabIndex: 0,
                  onClick: (event: React.MouseEvent) => {
                    // 卡片里的按钮/链接自己处理点击，否则「删除」这类动作会连带跳页
                    if ((event.target as HTMLElement).closest('button, a')) return
                    onOpen(row)
                  },
                  onKeyDown: (event: React.KeyboardEvent) => {
                    // 只响应卡片本身的回车/空格，内部控件的不抢
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen(row)
                    }
                  },
                }
              : {})}
          >
            <div className="record-card__head">{primary.render(row, { mobile: true })}</div>
            {inline.length > 0 ? (
              <div className="record-card__meta">
                {inline.map((column) => (
                  <span key={column.key} className="record-card__meta-item">
                    {column.mobileLabel === null ? null : (
                      <span className="record-card__label">{column.mobileLabel ?? column.label}</span>
                    )}
                    {column.render(row, { mobile: true })}
                  </span>
                ))}
              </div>
            ) : null}
            {columns
              .filter((c) => c.mobile !== 'inline' && c.mobile !== 'primary' && c.mobile !== 'hidden' && c !== primary && !block.includes(c))
              .map((column) => (
                <div key={column.key} className="record-card__row">
                  {column.mobileLabel === null ? null : (
                    <span className="record-card__label">{column.mobileLabel ?? column.label}</span>
                  )}
                  <span className="record-card__value">{column.render(row, { mobile: true })}</span>
                </div>
              ))}
            {expandable?.isExpanded(row) ? <div className="record-card__expand">{expandable.render(row)}</div> : null}
            {block.map((column) => (
              <div
                key={column.key}
                className={`record-card__row record-card__row--block${column.mobileAlign === 'end' ? ' is-end' : ''}`}
              >
                {column.render(row, { mobile: true })}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
