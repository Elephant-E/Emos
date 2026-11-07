import { useState, type CSSProperties } from 'react'

/**
 * 海报/封面图。图片取不到时退化为首字方块，
 * 而不是把浏览器的裂图图标画在列表里（后端图片域可能整段不可达）。
 */
export function Poster({
  src,
  name,
  className = 'poster-img',
  style,
}: {
  src?: string | null
  name: string
  className?: string
  style?: CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  const url = src?.trim()
  if (!url || failed) return <span className="thumb" style={style}>{(name || '?').slice(0, 1)}</span>
  return <img className={className} src={url} alt="" loading="lazy" style={style} onError={() => setFailed(true)} />
}
