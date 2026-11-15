import { useEffect, useState } from 'react'
import { seekApi } from '@/api/endpoints'
import { formatDateTime } from '@/lib/format'

/**
 * 求片记录：谁在求这一集。
 *
 * 列表接口只给「N 人求」的计数，具体记录要按 seek_id 单独查（/api/seek/history）。
 * 所以这里按行懒加载，并用模块级缓存避免同一集重复请求——
 * 分页每页 20 条，最多 20 个并发的小请求，比打开详情才能看到记录更直接。
 */
const cache = new Map<number, Array<{ username: string; carrot: number; created_at: string }>>()
const inflight = new Map<number, Promise<void>>()

export function SeekRecords({ seekId, count }: { seekId: number; count: number }) {
  const [rows, setRows] = useState(cache.get(seekId) ?? null)

  useEffect(() => {
    if (rows || count === 0) return
    let alive = true
    const run = inflight.get(seekId) ?? seekApi.history(seekId).then((res) => {
      cache.set(seekId, res ?? [])
      inflight.delete(seekId)
    })
    inflight.set(seekId, run as Promise<void>)
    void run
      .then(() => {
        if (alive) setRows(cache.get(seekId) ?? [])
      })
      .catch(() => {
        inflight.delete(seekId)
      })
    return () => {
      alive = false
    }
  }, [count, rows, seekId])

  if (count === 0) return null
  if (!rows) return <p className="seek-records__head">求片记录</p>

  return (
    <div className="seek-records">
      <p className="seek-records__head">求片记录</p>
      <ul className="seek-records__list">
        {rows.slice(0, 3).map((row, index) => (
          <li key={`${row.username}-${index}`}>
            <span className="seek-records__user">{row.username}</span>
            {row.carrot ? <span className="seek-records__carrot">{row.carrot} 胡萝卜</span> : null}
            <span className="seek-records__time">{formatDateTime(row.created_at)}</span>
          </li>
        ))}
        {rows.length > 3 ? <li className="seek-records__more">等 {rows.length} 人</li> : null}
      </ul>
    </div>
  )
}
