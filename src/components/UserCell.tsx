import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * 用户行的统一写法：圆形头像 + 名字（可带一行副信息）。
 *
 * 各列表接口都会返回 `avatar`（榜单 16/30、投票 58/228 有值），
 * 没有时退化为首字，不用长方形海报框去套头像。
 */
export function UserCell({
  name,
  avatar,
  sub,
  nameNode,
}: {
  name: string
  avatar?: string | null
  sub?: ReactNode
  /** 需要跳转时由调用方传一个 Link 进来，头像与排版仍由这里统一 */
  nameNode?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const url = avatar?.trim()
  useEffect(() => setFailed(false), [url])

  return (
    <div className="cell-title">
      <span className="avatar">{url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : (name || '?').slice(0, 1)}</span>
      <span>
        <span className="cell-title__name">{nameNode ?? (name || '—')}</span>
        {sub ? <span className="cell-title__code">{sub}</span> : null}
      </span>
    </div>
  )
}
