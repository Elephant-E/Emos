import { DetailHead, DetailStats } from '@/components/DetailHead'
import { Badge } from '@/components/Badge'
import { formatRelative, formatThousand } from '@/lib/format'
import type { WatchItem } from '@/api/types'

/**
 * 片单详情头部：封面 + 可见性/标签/订阅价 + 四项统计 + 维护者。
 * 影视与音乐两种片单共用，只有计数单位不同。
 */
export function WatchlistHead({
  item,
  count,
  countLabel,
  onSubscribers,
}: {
  item: WatchItem
  count: number
  countLabel: string
  /** 片单主才能看订阅名单，传了才可点 */
  onSubscribers?: () => void
}) {
  return (
    <DetailHead
      chips={
        <>
          <Badge tone={item.is_public ? 'ok' : 'off'}>{item.is_public ? '公开' : '私密'}</Badge>
          {(item.tags ?? []).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          {item.carrot > 0 ? <span>订阅需 {item.carrot} 胡萝卜</span> : null}
        </>
      }
    >
      {item.description ? <p className="detail-desc">{item.description}</p> : null}
      <DetailStats
        items={[
          { value: <b>{formatThousand(count)}</b>, label: countLabel },
          {
            value: onSubscribers ? (
              <button type="button" className="detail-stat__link tnum" onClick={onSubscribers} title="看订阅用户">
                {formatThousand(item.subscribe_count)}
              </button>
            ) : (
              <b>{formatThousand(item.subscribe_count)}</b>
            ),
            label: '订阅',
          },
          { value: <b>{formatRelative(item.updated_at)}</b>, label: '更新' },
          { value: <b>{item.author?.username || '—'}</b>, label: '作者' },
          ...(item.maintainers?.length
            ? [
                {
                  value: <b>{item.maintainers.map((m) => m.username).filter(Boolean).join('/')}</b>,
                  label: '维护者',
                },
              ]
            : []),
        ]}
      />
    </DetailHead>
  )
}
