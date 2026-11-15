import { useState } from 'react'

/** 头像：加载失败或没有地址时退回首字，不显示破图 */
export function Avatar({ url, name, size }: { url?: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(url) && !failed
  return (
    <span className="avatar" style={size ? { width: size, height: size, fontSize: size * 0.46 } : undefined}>
      {showImage ? <img src={url ?? ''} alt="" onError={() => setFailed(true)} /> : (name || '?').slice(0, 1)}
    </span>
  )
}
