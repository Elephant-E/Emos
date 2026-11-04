import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { GlowChart } from '@/components/GlowChart'
import { ErrorBlock } from '@/components/StateBlock'
import { useOverview } from '@/api/queries'
import { formatCount, formatRelative, formatThousand } from '@/lib/format'

const RANGE = [
  { key: '6m' as const, label: '近 6 个月' },
  { key: '12m' as const, label: '近 12 个月' },
]

export function OverviewView({ range, onRangeChange }: { range: '6m' | '12m'; onRangeChange: (r: '6m' | '12m') => void }) {
  const { data, isLoading, error, refetch } = useOverview(range)

  const now = new Date()
  const monthName = `${now.getMonth() + 1} 月`
  const year = String(now.getFullYear())
  const play = formatCount(data?.kpis.play_total)
  const media = formatThousand(data?.kpis.media_total)
  const newThisMonth = data?.series.reduce((sum, s) => sum + (s.values.at(-1) ?? 0), 0) ?? 0

  return (
    <>
      <PageHeader
        crumb={['概览', `${year} 年`]}
        title={monthName}
        hint={year}
        tools={
          <>
            {data ? (
              <span className="stamp">
                <i />
                数据更新于 {formatRelative(data.updated_at)}
              </span>
            ) : null}
            <div className="seg" role="group" aria-label="时间范围">
              {RANGE.map((r) => (
                <button key={r.key} aria-pressed={range === r.key} onClick={() => onRangeChange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
            <button className="btn btn--ghost">导出报表</button>
          </>
        }
      />

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}

      {!error ? (
        <>
          <section className="cards">
            <StatCard
              label="本期播放量"
              value={isLoading ? '—' : play.value}
              unit={isLoading ? undefined : `${play.unit}次`}
              delta={isLoading ? undefined : `${data!.kpis.play_delta > 0 ? '+' : ''}${data!.kpis.play_delta}%`}
              deltaSuffix="环比上期"
            />
            <StatCard
              label="片库总量"
              value={isLoading ? '—' : media}
              unit={isLoading ? undefined : '部'}
              delta={isLoading ? undefined : `+${data!.kpis.media_delta}%`}
              deltaSuffix="较上月"
            />
            <StatCard
              label="待处理求片"
              value={isLoading ? '—' : String(data!.kpis.seek_open)}
              unit={isLoading ? undefined : '条'}
              delta={isLoading ? undefined : `${data!.kpis.seek_delta}%`}
              deltaSuffix="较上周"
              tone={data && data.kpis.seek_delta > 0 ? 'amber' : 'up'}
            />
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <div className="chart-head">
                <div>
                  <p className="stat__label">各分区片量</p>
                  <p className="stat__value">
                    {isLoading ? '—' : newThisMonth}
                    <small>本月新增</small>
                  </p>
                  <p className="stat__delta">
                    {isLoading ? '—' : `+${data!.kpis.media_delta}%`}
                    <span>较上月</span>
                  </p>
                </div>
                <div className="legend">
                  {(data?.series ?? []).map((s) => (
                    <span key={s.key} style={{ color: s.color }}>
                      <i />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="skeleton" style={{ height: 300, marginTop: 18 }} />
              ) : data && data.series.length > 0 ? (
                <GlowChart months={data.months} series={data.series} />
              ) : (
                <p className="state__hint" style={{ padding: '48px 0', textAlign: 'center' }}>
                  后端未提供趋势数据（需要 /api/stats/overview）
                </p>
              )}
            </article>
          </section>
        </>
      ) : null}
    </>
  )
}
