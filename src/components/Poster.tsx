import { useEffect, useState, type CSSProperties } from 'react'

/**
 * 图片位。三种比例按数据本身的形状来，不强行统一成长方形：
 *
 * - `poster` 2:3 竖版：影片、求片（TMDB/todb 的 w185 海报就是 185×278）
 * - `wide` 16:9 横版：片单封面（实测 600×495 / 1280×720 / 1920×1080）
 * - `square` 1:1：直播频道 logo、商品封面
 *
 * 取不到图时退化为同尺寸的首字块，避免行高跳动。
 */
export function Poster({
  src,
  name,
  shape = 'poster',
  className,
  style,
}: {
  src?: string | null
  name: string
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
    return (
      <span className={[fallbackClass, className].filter(Boolean).join(' ')} style={style}>
        {(name || '?').slice(0, 1)}
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
