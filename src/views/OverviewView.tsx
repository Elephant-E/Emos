import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { useCapabilities, useCarrot, useCarrotHistory, useContinueWatching, useSession, useWatchStats } from '@/api/queries'
import { userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { IconClock } from '@/components/icons'
import { formatSize, formatThousand } from '@/lib/format'

export function OverviewView() {
  const caps = useCapabilities()
  const session = useSession()
  const carrot = useCarrot()
  const watching = useContinueWatching()
  const stats = useWatchStats(1)
  const carrotHistory = useCarrotHistory(1, 3)
  const ready = Boolean(session.data)
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
      ? `今天已经看了 ${Math.round(todaySeconds / 60)} 分钟`
      : hour >= 18
        ? '今天还没看片，要不要挑一部'
        : hour < 11
          ? '新的一天，来看点什么'
          : '还没有开始看，随时都行'

  return (
    <>
      <PageHeader crumb={['概览', `${year} 年`]} title={monthName} hint={year} />

      <p className="greeting">
        {greeting}
        {displayName ? `，${displayName}` : ''}～
        <span>{todayText}</span>
      </p>

      <section className="cards" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 16 }}>
        <article className="card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <p className="stat__label" style={{ margin: 0 }}>签到</p>
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
            {!ready ? '—' : signedToday ? (signInfo?.continuous_days ?? 0) : '—'}
            <small>{!ready ? '读取中' : signedToday ? '天连续' : '还没签到'}</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {signedToday ? `今天 +${signInfo?.earn_point ?? 0} 胡萝卜` : '签到可得胡萝卜'}
          </p>
        </article>

        <article className="card">
          <p className="stat__label">我的胡萝卜</p>
          <p className="stat__value">
            {formatThousand(carrot.data?.carrot ?? session.data?.carrot ?? 0)}
            <small>个</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            签到、上传都会获得
          </p>
        </article>

        <Link className="card todo" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self', type: 'video' }}>
          <p className="stat__label">片单槽位</p>
          <p className="stat__value">
            {ready ? caps.slotRemaining : '—'}
            <small>个可用</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            可用胡萝卜兑换
          </p>
        </Link>

        <Link className="card todo" to="/upload">
          <p className="stat__label">我的上传</p>
          <p className="stat__value">
            {!ready ? '—' : caps.sizeUpload > 0 ? formatSize(caps.sizeUpload) : '0 B'}
            <small>累计</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {!ready ? '读取中' : caps.canUpload ? '进入上传' : '上传权限未开通'}
          </p>
        </Link>
      </section>

      <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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

        <article className="card">
          <p className="stat__label">我的近况</p>

          {stats.data && stats.data.activeDays === 0 ? (
            <p className="state__hint" style={{ textAlign: 'left', padding: '14px 0 0' }}>
              本周还没有观看记录，去媒体库挑一部吧～
            </p>
          ) : null}

          <div style={{ display: stats.data?.activeDays === 0 ? 'none' : 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14, height: 44 }}>
            {(stats.data?.weeks[0] ?? []).map((day) => {
              const minutes = Math.round(day.seconds / 60)
              const h = minutes <= 0 ? 10 : Math.min(40, 12 + Math.round(minutes / 3))
              return (
                <span key={day.date} title={`${day.date} · ${minutes > 0 ? `${minutes} 分钟` : '没看'}`} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                  <span
                    style={{
                      width: 18,
                      height: h,
                      borderRadius: 3,
                      background: minutes > 0 ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.06)',
                    }}
                  />
                  <span className="muted" style={{ fontSize: 10 }}>
                    {new Date(`${day.date}T00:00:00`).getDate()}
                  </span>
                </span>
              )
            })}
            {!stats.data ? <span className="muted" style={{ fontSize: 12 }}>取数中…</span> : null}
          </div>

          <p className="state__hint" style={{ textAlign: 'left', marginTop: 12 }}>
            {stats.data && stats.data.activeDays > 0
              ? `本周 ${stats.data.activeDays} 天有观看，共 ${Math.round(stats.data.totalSeconds / 60)} 分钟`
              : stats.data
                ? '本周还没有观看记录'
                : '正在读取本周记录'}
          </p>

          {carrotHistory.data && carrotHistory.data.items.length > 0 ? (
            <ul style={{ display: 'grid', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
              {carrotHistory.data.items.slice(0, 3).map((row, index) => (
                <li key={index} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--fg-3)' }}>{row.trigger_type_string || row.trigger_type}</span>
                  <span className="muted" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
                    {String(row.created_at).slice(5, 10)}
                  </span>
                  <span className="tnum" style={{ color: row.point >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {row.point > 0 ? '+' : ''}{row.point}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </>
  )
}
