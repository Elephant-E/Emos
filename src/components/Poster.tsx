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
 */
export function Poster({
  src,
  shape = 'poster',
  className,
  style,
}: {
  src?: string | null
  /** 保留字段：调用方仍在传（原先用于首字兜底），现在不再渲染文字 */
  name?: string
  shape?: 'poster' | 'wide' | 'square'
  className?: string
  style?: CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  const url = src?.trim()
  // 同一个位置换了图片（切店铺、切分类、列表复用 DOM）要重新尝试加载
  useEffect(() => setFailed(false), [url])

  const shapeClass = shape === 'poster' ? '' : ` poster-img--${shape}`
  const fallbackClass = shape === 'poster' ? 'thumb' : `thumb thumb--${shape}`

  if (!url || failed) {
    return <span className={[fallbackClass, className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />
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
