import { useEffect, useState, type CSSProperties } from 'react'

/**
 * 图片位。三种比例按数据本身的形状来，不强行统一成长方形：
 *
 * - `poster` 2:3 竖版：影片、求片（TMDB/todb 的 w185 海报就是 185×278）
 * - `wide` 16:9 横版：片单封面（实测 600×495 / 1280×720 / 1920×1080）
 * - `square` 1:1：直播频道 logo、商品封面
 *
 * 没有图（或加载失败）时只留同尺寸的空白块：SPEC §2.6 明确不做首字方块假图，
 * 但表格行仍需要一个固定宽度的位置，否则标题起点会跳。
 *
 * 注意：**不要**做「加载完成前先隐藏」的处理——图片的尺寸已经由外层容器
 * （.record-tile__media / .record-row__media 的 aspect-ratio）占住，
 * 隐藏只会让懒加载没触发的图永远看不见。
 */
export function Poster({
  src,
  name,
  shape = 'poster',
  className,
  style,
  collapseOnEmpty = false,
  fallback = 'media',
}: {
  src?: string | null
  /** 首字占位用的名字（人/频道这类没有图时显示首字） */
  name?: string
  shape?: 'poster' | 'wide' | 'square'
  className?: string
  style?: CSSProperties
  /** 卡片等自由布局：没有图就完全不占位（表格里必须占位，否则标题会跳） */
  collapseOnEmpty?: boolean
  /** 没有图时显示什么：媒体用默认占位图，用户头像用首字 */
  fallback?: 'media' | 'initial'
}) {
  const [failed, setFailed] = useState(false)
  const url = src?.trim()
  // 同一个位置换了图片（切店铺、切分类、列表复用 DOM）要重新尝试加载
  useEffect(() => setFailed(false), [url])

  const shapeClass = shape === 'poster' ? '' : ` poster-img--${shape}`

  if (!url || failed) {
    if (collapseOnEmpty) return null
    // 没有图也要有个东西：媒体位显示默认占位，人显示首字
    // 没有名字时不要显示一个「?」，退回媒体占位（一条淡横杠）
    const initial = (name ?? '').trim().slice(0, 1)
    const kind = fallback === 'initial' && initial ? 'initial' : 'media'
    return (
      <span
        className={[className, 'poster-fallback', `poster-fallback--${kind}`].filter(Boolean).join(' ')}
        style={style}
        aria-hidden="true"
      >
        {kind === 'initial' ? initial : null}
      </span>
    )
  }
  return (
    <img
      className={['poster-img', shapeClass, className].filter(Boolean).join(' ')}
      src={url}
      alt=""
      loading="lazy"
      style={style}
      onError={() => setFailed(true)}
    />
  )
}
