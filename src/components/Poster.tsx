import { useEffect, useState, type CSSProperties } from 'react'

/**
 * 海报/封面图。取不到时退化为首字方块：后端图片域可能整段不可达。
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
  // 同一个位置换了图片（切店铺、切分类、列表复用 DOM）要重新尝试加载
  useEffect(() => setFailed(false), [url])
  if (!url || failed) return <span className="thumb" style={style}>{(name || '?').slice(0, 1)}</span>
  return <img className={className} src={url} alt="" loading="lazy" style={style} onError={() => setFailed(true)} />
}
