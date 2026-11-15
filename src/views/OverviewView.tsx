import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { ErrorBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { qk, useCapabilities, useCarrot, useCarrotHistory, useContinueWatching, useSession, useTodos, useWatchPage, useWatchStats } from '@/api/queries'
import { userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatSize, formatThousand, realmOf } from '@/lib/format'

const GREETINGS = ['早上好', '中午好', '下午好', '晚上好', '夜深了']

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
  // 柱图与下面那句文案必须同源：都只看本周这 7 天（stats.activeDays 统计的是整段区间）
  const week = stats.data?.weeks[0] ?? []
  const weekDays = week.filter((d) => d.seconds > 0).length
  const weekSeconds = week.reduce((sum, d) => sum + d.seconds, 0)
  const carrotHistory = useCarrotHistory(1, 3)
  const todos = useTodos()
  const todoAll = [
    { label: '待处理求片', value: todos.data?.seeks, unit: '条', to: '/seek' as const, search: { page: 1, page_size: 20, tab: 'default' as const } },
    { label: '待发货订单', value: todos.data?.orders, unit: '单', to: '/orders' as const, search: { page: 1, pay: 'paid' as const, delivery: 'pending' as const } },
    { label: '封禁中用户', value: todos.data?.bans, unit: '人', to: '/users' as const, search: {} },
  ]
  // 加载中也占位：空态要区分「还没有数据」与「取不到」
  const todoItems = todos.isLoading ? todoAll : todoAll.filter((item) => (item.value ?? 0) > 0)
  // useTodos 把每个接口的失败吞成 null：管理员三个都是 null 说明全没读出来，要给错误态；
  // 失败与 0 是两回事。非管理员本就没有这三个权限（403 → null），不算故障
  const todosFailed =
    Boolean(todos.error) ||
    Boolean(caps.isAdmin && todos.data && [todos.data.seeks, todos.data.orders, todos.data.bans].every((value) => value == null))
  // 没有待办时（非管理员或已清空）用「我的片单」补位；取不到时不换，失败与空态分开
  const showWatchlists = !todos.isLoading && !todosFailed && todoItems.length === 0
  const myWatchlists = useWatchPage({ page: 1, page_size: 4, is_self: true, type: 'video' }, showWatchlists)
  const ready = session.isFetched && Boolean(session.data)
  const qc = useQueryClient()

  const [signing, setSigning] = useState(false)
  const [signNote, setSignNote] = useState('')

  const refreshCarrot = () => {
    void qc.invalidateQueries({ queryKey: qk.session })
    void qc.invalidateQueries({ queryKey: qk.carrot })
    void qc.invalidateQueries({ queryKey: qk.todos })
  }

  const sign = useMutation({
    // content 可选：带上「说点什么」会额外获得随机胡萝卜
    mutationFn: (content?: string) => userApi.sign(content),
    onSuccess: (res) => {
      toast(`第 ${res.sign_index} 位签到 · 连续 ${res.continuous_days} 天 · +${res.earn_point} 胡萝卜`, 'success')
      setSigning(false)
      setSignNote('')
      refreshCarrot()
    },
    // 自己处理提示（下面的 skipErrorToast），否则 429 会同时弹「已经签过了」和一条错误
    meta: { skipErrorToast: true },
    onError: (error) => {
      const status = (error as { status?: number }).status
      const message = (error as Error).message ?? ''
      setSigning(false)
      if (status === 429 || message.includes('重复')) {
        // 重复签到不是故障，是今天已经签过了
        toast('今天已经签过了', 'info')
        setSignNote('')
        refreshCarrot()
        return
      }
      const text = message || '签到失败'
      toast(status && !text.includes(`（${status}）`) ? `${text}（${status}）` : text, 'error')
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
  // stats/video/history 的日期区间不含今天，因此按未看完条数判断而不是今天的观看秒数
  const unfinished = watching.data?.length ?? 0
  const todayText =
    unfinished > 0
      ? `还有 ${unfinished} 部没看完${pickByDay(['～', '，接着看吧～', '，从上次停下的地方继续～'], now)}`
      : pickByDay(LINES_IDLE, now)

  return (
    <>
      <PageHeader
        inlineTools
        crumb={['概览', `${year} 年`]}
        title={monthName}
        hint={year}
        tools={
          <>
            <Link className="btn btn--ghost" to="/upload">
              上传
            </Link>
            <Link className="btn btn--ghost" to="/recycle" search={{ tab: 'media', page: 1, page_size: 20, q: '', by: 'media_id' }}>
              回收站
            </Link>
          </>
        }
      />

      <p className="greeting">
        {greeting}
        {displayName ? `，${displayName}` : ''}
        <span>{todayText}</span>
      </p>

      {todoItems.length > 0 ? (
        <section className="cards cards--todos">
          {todoItems.map((item) => (
            <Link key={item.label} className="card card--stat todo" to={item.to} search={item.search}>
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

      {/* 待办取不到时走错误态，不进空态 */}
      {todosFailed ? (
        <ErrorBlock bare error={todos.error ?? new Error('待办没取到')} onRetry={() => todos.refetch()} />
      ) : null}

      {session.error ? (
        <ErrorBlock error={session.error} onRetry={() => session.refetch()} />
      ) : null}

      <section className="cards cards--4">
        <article className="card card--stat card--secondary">
          <CardHead title="签到">
            {signedToday ? (
              <span className="card-note">今天已签</span>
            ) : (
              <button type="button" className="btn btn--quiet" disabled={sign.isPending} onClick={() => setSigning(true)}>
                立即签到
              </button>
            )}
          </CardHead>
          <p className="stat__value">
            {!ready ? '—' : signedToday ? (
              <>
                {signInfo?.continuous_days ?? 0}
                <small>天连续</small>
              </>
            ) : (
              // 未签到是有数据的状态，与表示「没取到」的破折号区分
              <span className="stat__word">今天未签</span>
            )}
          </p>
          <p className="stat__delta stat__delta--quiet">
            {signedToday ? `今天 +${signInfo?.earn_point ?? 0} 胡萝卜` : '签到可得胡萝卜'}
          </p>
        </article>

        <StatCard
          label="我的胡萝卜"
          value={(() => {
            const balance = carrot.data?.carrot ?? session.data?.carrot
            return balance == null ? '—' : formatThousand(balance)
          })()}
          unit="个"
          note={(() => {
            const value = carrot.data?.carrot ?? session.data?.carrot
            if (value == null) return '签到、上传都会获得'
            const realm = realmOf(value)
            return realm.next ? `${realm.name} · 距下一境 ${formatThousand(realm.next - value)}` : realm.name
          })()}
        />

        <Link className="card card--stat card--secondary todo" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self',  q: '' }}>
          <p className="stat__label">片单槽位</p>
          <p className="stat__value">
            {ready ? caps.slotRemaining : '—'}
            <small>个可用</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            可用胡萝卜兑换
          </p>
        </Link>

        <Link className="card card--stat card--secondary todo" to="/upload">
          <p className="stat__label">我的上传</p>
          <p className="stat__value">
            {!ready ? '—' : formatSize(caps.sizeUpload)}
            <small>累计</small>
          </p>
          <p className="stat__delta stat__delta--quiet">
            {!ready ? '读取中' : caps.canUpload ? '进入上传' : '上传权限未开通'}
          </p>
        </Link>
      </section>

      <section className="cards cards--2">
        <article className="card">
          <CardHead title="继续观看">
            <Link className="btn btn--quiet" to="/library" search={{ page: 1, page_size: 20, q: '', type: '' }}>
              去媒体库
            </Link>
          </CardHead>

          <div className="card-body">
          {watching.isLoading ? <div className="skeleton" style={{ height: 96 }} /> : null}

          {watching.error ? (
            <ErrorBlock bare error={watching.error} onRetry={() => watching.refetch()} />
          ) : null}

          {!watching.error && watching.data && watching.data.length === 0 ? (
            <p className="card-note">还没有未看完的内容</p>
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
                    <Poster src={String(row.video_image_poster)} name={String(row.video_title ?? "?")} />
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
                      {total > 0 ? <i style={{ transform: `scaleX(${ratio.toFixed(3)})` }} /> : null}
                    </span>
                  </span>
                  <span className="muted tnum text-xs">
                    {total > 0 ? `${Math.round(ratio * 100)}%` : '时长未知'}
                  </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          </div>
        </article>

        <article className="card">
          <CardHead title="我的近况">
          </CardHead>

          <div className="card-body">

          {stats.error ? (
            <ErrorBlock bare error={stats.error} onRetry={() => stats.refetch()} />
          ) : null}

          {!stats.data && !stats.error ? (
            <div className="stack">
              <div className="skeleton" style={{ height: 40 }} />
              <div className="skeleton" style={{ height: 12, width: '60%' }} />
            </div>
          ) : null}

          {stats.data && weekDays === 0 ? (
            <p className="card-note">
              {(watching.data?.length ?? 0) > 0
                ? '统计只覆盖到昨天，今天的观看还没计入。'
                : '本周还没有观看记录'}
            </p>
          ) : null}

          <div style={{ display: !stats.data || weekDays === 0 ? 'none' : 'flex', alignItems: 'flex-end', gap: 'var(--sp-2)', height: 60 }}>
            {(stats.data?.weeks[0] ?? []).map((day, _i, arr) => {
              const minutes = Math.round(day.seconds / 60)
              const peak = Math.max(...arr.map((d) => d.seconds), 1)
              const h = minutes <= 0 ? 8 : Math.max(8, Math.round((day.seconds / peak) * 44))
              return (
                <span key={day.date} title={`${day.date} · ${minutes > 0 ? `${minutes} 分钟` : '没看'}`} style={{ display: 'grid', gap: 'var(--sp-2)', justifyItems: 'center' }}>
                  <span
                    style={{
                      width: 18,
                      height: h,
                      borderRadius: 3,
                      background: minutes > 0 ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.06)',
                    }}
                  />
                  <span className="muted text-2xs">
                    {new Date(`${day.date}T00:00:00`).getDate()}
                  </span>
                </span>
              )
            })}
          </div>

          {stats.data && weekDays > 0 ? (
            <p className="card-note stack--top">
              本周 {weekDays} 天有观看，共 {Math.round(weekSeconds / 60)} 分钟
            </p>
          ) : null}

          {carrotHistory.data && carrotHistory.data.items.length > 0 ? (
            <ul style={{ display: 'grid', gap: 'var(--sp-2)', marginTop: 'var(--stack)', paddingTop: 'var(--stack)', borderTop: '1px solid var(--line-soft)' }}>
              {carrotHistory.data.items.slice(0, 3).map((row, index) => (
                <li key={index} className="row--baseline" style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--fg-3)' }}>{row.trigger_type_string || row.trigger_type}</span>
                  <span className="muted meta-end">
                    {String(row.created_at).slice(5, 10)}
                  </span>
                  <span className="tnum" style={{ color: (row.type === 'cost' ? -Number(row.point) : Number(row.point)) >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {(row.type === 'cost' ? -Number(row.point) : Number(row.point)) > 0 ? '+' : ''}
                    {row.type === 'cost' ? -Number(row.point) : Number(row.point)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          </div>
        </article>
      </section>

      {showWatchlists ? (
        <section className="cards cards--wide">
          <article className="card">
            <CardHead title="我的片单">
              <Link className="btn btn--quiet" to="/watchlists" search={{ page: 1, page_size: 20, scope: 'self',  q: '' }}>
                全部
              </Link>
            </CardHead>

            {myWatchlists.isLoading ? <div className="skeleton" style={{ height: 64, marginTop: 'var(--stack)' }} /> : null}
            {!myWatchlists.isLoading && (myWatchlists.data?.items.length ?? 0) === 0 ? (
              <p className="card-note" style={{ marginTop: 'var(--stack)' }}>
                还没有自己的片单
              </p>
            ) : null}

            <ul className="stack stack--top">
              {(myWatchlists.data?.items ?? []).map((w) => (
                <li key={w.id}>
                  <Link
                    to="/watchlists/$watchId"
                    params={{ watchId: String(w.id) }}
                    search={{ page: 1, page_size: 20, q: '' }}
                    className="row text-sm"
                  >
                    <span className="text-body ellipsis" style={{ flex: 1 }}>{w.name}</span>
                    <span className="muted tnum-sm">{w.video_count} 部</span>
                    <span className="muted tnum-sm" style={{ width: 62, textAlign: 'right' }}>
                      {w.updated_at ? w.updated_at.slice(5, 10) : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {signing ? (
        <Modal
          title="今日签到"
          width={400}
          onClose={() => setSigning(false)}
          onSubmit={() => {
            if (!sign.isPending) sign.mutate(signNote.trim() || undefined)
          }}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setSigning(false)}>
                取消
              </button>
              <button className="btn btn--primary" type="submit" disabled={sign.isPending}>
                {sign.isPending ? '签到中…' : '签到'}
              </button>
            </>
          }
        >
          <div className="stack">
            <input
              className="input"
              value={signNote}
              maxLength={10}
              autoFocus
              placeholder="对自己说点什么…（最多 10 字）"
              onChange={(event) => setSignNote(event.target.value)}
            />
          </div>
        </Modal>
      ) : null}
    </>
  )
}
