import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/StateBlock'
import { useCapabilities, useCarrot, useCarrotHistory, useContinueWatching, useMyWatchlistRecent, useSession, useTodos, useWatchStats } from '@/api/queries'
import { userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatSize, formatThousand, realmOf } from '@/lib/format'

const GREETINGS = ['早上好', '中午好', '下午好', '晚上好', '夜深了']

const LINES_WATCHED = [
  '今天已经看了 {m} 分钟～',
  '今天看了 {m} 分钟，正合适～',
  '{m} 分钟到手，明天见～',
  '今天看了 {m} 分钟，好兴致～',
]

const LINES_IDLE = [
  '今天还没看片，要不要挑一部～',
  '今天还没动，片单里有一部等你～',
  '还没开演，挑一部慢慢看～',
  '今天还没看片，来点轻松的还是烧脑的～',
  '屏幕还黑着，随手挑一部吧～',
  '不如现在开一部，正好赶上～',
  '今天还没看片，先把想看的那部补上～',
  '还没开始看，随便点一部都是新的～',
]

function pickByDay<T>(pool: readonly T[], date: Date, salt = 0): T {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + salt
  return pool[key % pool.length]
}

export function OverviewView() {
  const caps = useCapabilities()
  const session = useSession()
  const carrot = useCarrot()
  const watching = useContinueWatching()
  const stats = useWatchStats(1)
  const carrotHistory = useCarrotHistory(1, 3)
  const myWatches = useMyWatchlistRecent(3)
  const todos = useTodos()
  const todoItems = [
    { label: '待处理求片', value: todos.data?.seeks, unit: '条', to: '/seek' as const, search: { page: 1, page_size: 20, tab: 'default' as const } },
    { label: '待发货订单', value: todos.data?.orders, unit: '单', to: '/orders' as const, search: { page: 1, pay: 'paid' as const, delivery: 'pending' as const } },
    { label: '封禁中用户', value: todos.data?.bans, unit: '人', to: '/account' as const, search: { tab: 'ban' as const } },
  ].filter((item) => (item.value ?? 0) > 0)
  const ready = session.isFetched && Boolean(session.data)
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
  const greeting =
    hour < 6 ? GREETINGS[4] : hour < 11 ? GREETINGS[0] : hour < 14 ? GREETINGS[1] : hour < 18 ? GREETINGS[2] : GREETINGS[3]
  const displayName = session.data?.pseudonym || session.data?.username || ''
  const todayKey = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todaySeconds = stats.data?.byDate[todayKey] ?? 0
  const todayText =
    todaySeconds > 0
      ? pickByDay(LINES_WATCHED, now).replace('{m}', String(Math.round(todaySeconds / 60)))
      : pickByDay(LINES_IDLE, now)

  return (
    <>
      <PageHeader crumb={['概览', `${year} 年`]} title={monthName} hint={year} />

      <p className="greeting">
        {greeting}
        {displayName ? `，${displayName}` : ''}
        <span>{todayText}</span>
      </p>

      {todoItems.length > 0 ? (
        <section className="cards cards--4 cards--todos" style={{ marginTop: 16 }}>
          {todoItems.map((item) => (
            <Link key={item.label} className="card todo" to={item.to} search={item.search}>
              <p className="stat__label">{item.label}</p>
              <p className="stat__value">
                {item.value === null ? '—' : formatThousand(item.value ?? 0)}
                <small>{item.unit}</small>
              </p>
              <p className="stat__delta stat__delta--quiet">去处理</p>
            </Link>
          ))}
        </section>
      ) : null}

      {session.error ? (
        <ErrorBlock error={session.error as Error & { status?: number }} onRetry={() => session.refetch()} />
      ) : null}

      <section className="cards cards--4" style={{ marginTop: 16 }}>
        <article className="card card--stat">
          <p className="stat__label">
            签到
            <button
              className="btn btn--quiet"
              disabled={signedToday || sign.isPending}
              onClick={() => sign.mutate()}
            >
              {signedToday ? '今天已签' : sign.isPending ? '签到中…' : '立即签到'}
            </button>
          </p>
          <p className="stat__value">
            {!ready ? '—' : signedToday ? (signInfo?.continuous_days ?? 0) : '—'}
            <small>{!ready ? '读取中' : signedToday ? '天连续' : '还没签到'}</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            {signedToday ? `今天 +${signInfo?.earn_point ?? 0} 胡萝卜` : '签到可得胡萝卜'}
          </p>
        </article>

        <article className="card card--stat">
          <p className="stat__label">我的胡萝卜</p>
          <p className="stat__value">
            {(() => {
              const balance = carrot.data?.carrot ?? session.data?.carrot
              return balance == null ? '—' : formatThousand(balance)
            })()}
            <small>个</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            {(() => {
              const value = carrot.data?.carrot ?? session.data?.carrot
              if (value == null) return '签到、上传都会获得'
              const realm = realmOf(value)
              return realm.next ? `${realm.name} · 距下一境 ${formatThousand(realm.next - value)}` : realm.name
            })()}
          </p>
        </article>

        <Link className="card card--stat todo" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self', type: 'video' }}>
          <p className="stat__label">片单槽位</p>
          <p className="stat__value">
            {ready ? caps.slotRemaining : '—'}
            <small>个可用</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            可用胡萝卜兑换
          </p>
        </Link>

        <Link className="card card--stat todo" to="/upload">
          <p className="stat__label">我的上传</p>
          <p className="stat__value">
            {!ready ? '—' : caps.sizeUpload > 0 ? formatSize(caps.sizeUpload) : '0 B'}
            <small>累计</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            {!ready ? '读取中' : caps.canUpload ? '进入上传' : '上传权限未开通'}
          </p>
        </Link>
      </section>

      <section className="cards cards--2">
        <article className="card">
          <div className="card-head">
            <p className="stat__label">继续观看</p>
            <Link className="btn btn--quiet" to="/library" search={{ page: 1, page_size: 20, q: '', type: '' }}>
              去媒体库
            </Link>
          </div>

          <div className="card-body">
          {watching.isLoading ? <div className="skeleton" style={{ height: 96 }} /> : null}

          {watching.error ? <p className="card-note">暂时取不到观看记录，稍后刷新～</p> : null}

          {!watching.error && watching.data && watching.data.length === 0 ? (
            <p className="card-note">还没有未看完的内容，去媒体库挑一部吧～</p>
          ) : null}

          <ul className="stack">
            {(watching.data ?? []).map((row, index) => {
              const played = Number(row.play_seconds ?? 0)
              const total = Number(row.media_seconds ?? 0)
              const ratio = total > 0 ? Math.min(1, played / total) : 0
              return (
                <li key={index}>
                  <Link
                    to="/media/$videoId"
                    params={{ videoId: String(row.video_id ?? 0) }}
                    search={{ season: Number(row.season_number ?? 1), episode: Number(row.episode_number ?? 1) }}
                    className="row"
                  >
                  {row.video_image_poster ? (
                    <img className="poster-img" src={String(row.video_image_poster)} alt="" loading="lazy" />
                  ) : (
                    <span className="thumb">{String(row.video_title ?? '?').slice(0, 1)}</span>
                  )}
                  <span className="row__main">
                    <span className="text-body ellipsis">
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
                  </Link>
                </li>
              )
            })}
          </ul>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <p className="stat__label">我的近况</p>
          </div>

          <div className="card-body">

          {stats.error ? <p className="card-note">本周记录取不到，稍后再看～</p> : null}

          {!stats.data && !stats.error ? (
            <div className="stack--loose">
              <div className="skeleton" style={{ height: 40 }} />
              <div className="skeleton" style={{ height: 12, width: '60%' }} />
            </div>
          ) : null}

          {stats.data && stats.data.activeDays === 0 ? (
            <p className="card-note">本周还没有观看记录，去媒体库挑一部吧～</p>
          ) : null}

          <div style={{ display: !stats.data || stats.data.activeDays === 0 ? 'none' : 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
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
          </div>

          {stats.data && stats.data.activeDays > 0 ? (
            <p className="card-note" style={{ marginTop: 'var(--stack)' }}>
              本周 {stats.data.activeDays} 天有观看，共 {Math.round(stats.data.totalSeconds / 60)} 分钟
            </p>
          ) : null}

          {carrotHistory.data && carrotHistory.data.items.length > 0 ? (
            <ul style={{ display: 'grid', gap: 8, marginTop: 'var(--stack)', paddingTop: 'var(--stack)', borderTop: '1px solid var(--line-soft)' }}>
              {carrotHistory.data.items.slice(0, 3).map((row, index) => (
                <li key={index} className="row--baseline" style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--fg-3)' }}>{row.trigger_type_string || row.trigger_type}</span>
                  <span className="muted meta-end">
                    {String(row.created_at).slice(5, 10)}
                  </span>
                  <span className="tnum" style={{ color: row.point >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {row.point > 0 ? '+' : ''}{row.point}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          </div>
        </article>
      </section>

      <section className="cards cards--2">
        <article className="card">
          <div className="card-head">
            <p className="stat__label">我的片单</p>
            <Link className="btn btn--quiet" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self', type: 'video' }}>
              全部
            </Link>
          </div>

          {myWatches.isLoading ? <div className="skeleton" style={{ height: 72, marginTop: 12 }} /> : null}
          {myWatches.error ? (
            <p className="state__hint note-block">
              片单暂时取不到，稍后再看～
            </p>
          ) : null}

          {myWatches.data && myWatches.data.length === 0 ? (
            <p className="state__hint note-block">
              还没有自己的片单，建一个把想看的攒起来～
            </p>
          ) : null}

          <ul className="stack--loose stack--top">
            {(myWatches.data ?? []).map((watch) => (
              <li key={watch.id}>
                <Link
                  to="/watchlists/$watchId"
                  params={{ watchId: String(watch.id) }}
                  search={{ page: 1, page_size: 20, q: '' }}
                  className="row text-sm"
                >
                  <span className="text-body ellipsis" style={{ flex: 1 }}>
                    {watch.name}
                  </span>
                  <span className="muted tnum" style={{ fontSize: 11.5 }}>{watch.video_count} 部</span>
                  <span className="muted" style={{ fontSize: 11.5, width: 62, textAlign: 'right' }}>
                    {watch.updated_at ? watch.updated_at.slice(5, 10) : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="card-head">
            <p className="stat__label">快捷入口</p>
          </div>
          <div className="card-body stack--loose" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {[
              { label: '上传影片', to: '/upload' as const, note: caps.canUpload ? '入库到媒体库' : '需先开通权限' },
              { label: '发起求片', to: '/seek' as const, note: '缺什么求什么' },
              { label: '兑换槽位', to: '/account' as const, note: `当前 ${caps.slotRemaining} 个` },
              { label: '账号设置', to: '/account' as const, note: '密码与邀请' },
            ].map((item) => (
              <Link key={item.label} className="quick" to={item.to}>
                <span className="text-sm" style={{ color: 'var(--fg)' }}>{item.label}</span>
                <span className="muted tnum-sm">{item.note}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </>
  )
}
