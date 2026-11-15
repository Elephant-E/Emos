import { Poster } from '@/components/Poster'
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
    <section className="detail-head">
      <div className="detail-head__row">
        <Poster
          src={item.image_poster_url}
          name={String(item.name ?? '?')}
          shape="wide"
          className="detail-head__poster"
        />
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${item.is_public ? 'badge--ok' : 'badge--off'}`}>
              <i />
              {item.is_public ? '公开' : '私密'}
            </span>
            {(item.tags ?? []).map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
            {item.carrot > 0 ? <span className="chip">订阅需 {item.carrot} 胡萝卜</span> : null}
          </div>
          {item.description ? <p className="detail-desc">{item.description}</p> : null}
          <div className="detail-stats">
            <div className="detail-stat">
              <b>{formatThousand(count)}</b>
              <span>{countLabel}</span>
            </div>
            <div className="detail-stat">
              {onSubscribers ? (
                <button type="button" className="detail-stat__link tnum" onClick={onSubscribers} title="看订阅用户">
                  {formatThousand(item.subscribe_count)}
                </button>
              ) : (
                <b>{formatThousand(item.subscribe_count)}</b>
              )}
              <span>订阅</span>
            </div>
            <div className="detail-stat">
              <b>{formatRelative(item.updated_at)}</b>
              <span>更新</span>
            </div>
            <div className="detail-stat">
              <b>{item.author?.username || '—'}</b>
              <span>作者</span>
            </div>
            {item.maintainers?.length ? (
              <div className="detail-stat">
                <b>{item.maintainers.map((m) => m.username).filter(Boolean).join('/')}</b>
                <span>维护者</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
