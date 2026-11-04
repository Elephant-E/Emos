import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { useCapabilities, useCarrot, useContinueWatching, useSession } from '@/api/queries'
import { userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatSize, formatThousand } from '@/lib/format'

export function OverviewView() {
  const caps = useCapabilities()
  const session = useSession()
  const carrot = useCarrot()
  const watching = useContinueWatching()
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

  return (
    <>
      <PageHeader crumb={['概览', `${year} 年`]} title={monthName} hint={year} />

      <section className="cards" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
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
            {signedToday ? (signInfo?.continuous_days ?? 0) : '—'}
            <small>{signedToday ? '天连续' : '还没签到'}</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {signedToday ? `今天 +${signInfo?.earn_point ?? 0} 胡萝卜` : '签到可得胡萝卜'}
          </p>
        </article>

        <article className="card">
          <p className="stat__label">我的胡萝卜</p>
          <p className="stat__value">
            {carrot.data ? formatThousand(carrot.data.carrot) : '—'}
            <small>个</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            {carrot.error ? '余额暂时取不到' : '签到、上传都会获得'}
          </p>
        </article>

        <Link className="card todo" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self', type: 'video' }}>
          <p className="stat__label">片单槽位</p>
          <p className="stat__value">
            {caps.slotRemaining}
            <small>个可用</small>
          </p>
          <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>
            可用胡萝卜兑换
          </p>
        </Link>

        <Link className="card todo" to="/upload">
          <p className="stat__label">我的上传</p>
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <p className="stat__label" style={{ margin: 0 }}>继续观看</p>
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
