import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { useCapabilities, useCarrot, useContinueWatching, useSession, useWatchStats } from '@/api/queries'
import { userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { WatchHeatmap } from '@/components/WatchHeatmap'
import { IconCalendar, IconCarrot, IconClock, IconLayers, IconUpload } from '@/components/icons'
import { formatSize, formatThousand } from '@/lib/format'

export function OverviewView() {
  const caps = useCapabilities()
  const session = useSession()
  const carrot = useCarrot()
  const watching = useContinueWatching()
  const [weeks, setWeeks] = useState(1)
  const stats = useWatchStats(weeks)
  const qc = useQueryClient()

  const sign = useMutation({
    mutationFn: () => userApi.sign(),
    onSuccess: (res) => {
      toast(`签到成功，+${res.earn_point} 胡萝卜`, 'success')
      void qc.invalidateQueries({ queryKey: ['session'] })
      void qc.invalidateQueries({ queryKey: ['carrot'] })
      void qc.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const now = new Date()
  const monthName = `${now.getMonth() + 1} 月`
  const year = String(now.getFullYear())
  const signedToday = caps.signedToday
  const signInfo = session.data?.sign
  const hour = now.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const displayName = session.data?.pseudonym || session.data?.username || ''
  const todayKey = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todaySeconds = stats.data?.byDate[todayKey] ?? 0
  const todayText =
    todaySeconds > 0
      ? `今天看了 ${Math.round(todaySeconds / 60)} 分钟`
      : hour >= 18
        ? '今天还没看片'
        : '今天还没有观看记录'

  return (
    <>
      <PageHeader crumb={['概览', `${year} 年`]} title={monthName} hint={year} />

      <p className="muted" style={{ margin: '2px 0 0', fontSize: 13.5 }}>
        {greeting}
        {displayName ? `，${displayName}` : ''} · {todayText}
      </p>

      <section className="cards" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 16 }}>
        <article className="card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <p className="stat__label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconCalendar size={14} />
              签到
            </p>
            <button
              className={signedToday ? 'btn btn--quiet' : 'btn btn--primary'}
              style={{ height: 28 }}
              disabled={signedToday || sign.isPending}
              onClick={() => sign.mutate()}
            >
              {signedToday ? '今天已签' : '立即签到'}
            </button>
          </div>
          <p className="stat__value" style={{ marginTop: 14 }}>
            {signedToday ? (signInfo?.continuous_days ?? 0) : '—'}
            <small>{signedToday ? '天连续' : '还没签到'}</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {signedToday ? `今天 +${signInfo?.earn_point ?? 0} 胡萝卜` : '签到可得胡萝卜'}
          </p>
        </article>

        <article className="card">
          <p className="stat__label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <IconCarrot size={14} />
            我的胡萝卜
          </p>
          <p className="stat__value">
            {carrot.data ? formatThousand(carrot.data.carrot) : '—'}
            <small>个</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {carrot.error ? '余额暂时取不到' : '签到、上传都会获得'}
          </p>
        </article>

        <Link className="card todo" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self', type: 'video' }}>
          <p className="stat__label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <IconLayers size={14} />
            片单槽位
          </p>
          <p className="stat__value">
            {caps.slotRemaining}
            <small>个可用</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            可用胡萝卜兑换
          </p>
        </Link>

        <Link className="card todo" to="/upload">
          <p className="stat__label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <IconUpload size={14} />
            我的上传
          </p>
          <p className="stat__value">
            {caps.sizeUpload > 0 ? formatSize(caps.sizeUpload) : '0 B'}
            <small>累计</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {caps.canUpload ? '进入上传' : '上传权限未开通'}
          </p>
        </Link>
      </section>

      <section className="cards cards--wide">
        <article className="card">
          <WatchHeatmap stats={stats.data} loading={stats.isLoading} onExpand={weeks === 1 ? () => setWeeks(4) : undefined} />
        </article>
      </section>

      <section className="cards cards--wide">
        <article className="card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <p className="stat__label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconClock size={14} />
              继续观看
            </p>
            <Link className="btn btn--quiet" to="/library" search={{ page: 1, page_size: 20, q: '', type: '' }}>
              去媒体库
            </Link>
          </div>

          {watching.isLoading ? <div className="skeleton" style={{ height: 96, marginTop: 12 }} /> : null}

          {watching.error ? (
            <p className="state__hint" style={{ textAlign: 'left', padding: '16px 0' }}>
              暂时取不到观看记录，稍后刷新。
            </p>
          ) : null}

          {!watching.error && watching.data && watching.data.length === 0 ? (
            <p className="state__hint" style={{ textAlign: 'left', padding: '16px 0' }}>
              还没有未看完的内容。去媒体库挑一部，或从自己的片单开始。
            </p>
          ) : null}

          <ul style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {(watching.data ?? []).map((row, index) => {
              const played = Number(row.play_seconds ?? 0)
              const total = Number(row.media_seconds ?? 0)
              const ratio = total > 0 ? Math.min(1, played / total) : 0
              return (
                <li key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {row.video_image_poster ? (
                    <img className="poster-img" src={String(row.video_image_poster)} alt="" loading="lazy" />
                  ) : (
                    <span className="thumb">{String(row.video_title ?? '?').slice(0, 1)}</span>
                  )}
                  <span style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--fg-2)', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(row.video_title ?? '—')}
                      {row.season_number ? ` S${row.season_number}` : ''}
                      {row.episode_number ? `E${row.episode_number}` : ''}
                    </span>
                    <span className="progress-line">
                      <i style={{ transform: `scaleX(${ratio.toFixed(3)})` }} />
                    </span>
                  </span>
                  <span className="muted tnum" style={{ fontSize: 12 }}>
                    {Math.round(ratio * 100)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </article>
      </section>
    </>
  )
}
