import { useState } from 'react'
import type { WatchStats } from '@/api/queries'

const LEVELS = [
  'rgba(255,255,255,0.055)',
  'rgba(52,211,153,0.26)',
  'rgba(52,211,153,0.48)',
  'rgba(52,211,153,0.72)',
  'rgba(52,211,153,1)',
]

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function level(seconds: number): number {
  if (seconds <= 0) return 0
  const minutes = seconds / 60
  if (minutes < 20) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

function human(seconds: number): string {
  if (seconds <= 0) return '没看'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

function weekdayOf(iso: string): string {
  const day = new Date(`${iso}T00:00:00`).getDay()
  return WEEKDAYS[(day + 6) % 7]
}

export function WatchHeatmap({
  stats,
  loading,
  onExpand,
}: {
  stats?: WatchStats
  loading?: boolean
  onExpand?: () => void
}) {
  const [hover, setHover] = useState<{ date: string; seconds: number } | null>(null)
  const weeks = stats?.weeks ?? []
  const summary = stats ? `近 ${stats.days} 天 · ${stats.activeDays} 天有观看 · ${human(stats.totalSeconds)}` : loading ? '取数中…' : '—'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <p className="stat__label" style={{ margin: 0 }}>观影记录</p>
        <span className="muted" style={{ fontSize: 12 }}>{summary}</span>
      </div>

      {loading && !stats ? <div className="skeleton" style={{ height: 96, marginTop: 14 }} /> : null}

      {stats ? (
        <div style={{ marginTop: 14, display: 'grid', gap: 6, justifyItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 26px)', gap: 6 }}>
            {WEEKDAYS.map((day) => (
              <span key={day} className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
                {day}
              </span>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 26px)', gap: 6 }}>
              {week.map((day) => (
                <span
                  key={day.date}
                  onMouseEnter={() => setHover(day)}
                  onMouseLeave={() => setHover(null)}
                  title={`${day.date} ${weekdayOf(day.date)} · ${human(day.seconds)}`}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 4,
                    background: LEVELS[level(day.seconds)],
                    outline: hover?.date === day.date ? '1px solid rgba(255,255,255,0.4)' : 'none',
                    outlineOffset: 1,
                    transition: 'background 140ms var(--ease)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 11.5, minWidth: 160 }}>
          {hover ? `${hover.date} · ${human(hover.seconds)}` : '按天记录，悬停查看时长'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span className="muted" style={{ fontSize: 11 }}>少</span>
          {LEVELS.map((color) => (
            <span key={color} style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
          ))}
          <span className="muted" style={{ fontSize: 11 }}>多</span>
        </span>
        {onExpand && (stats?.days ?? 0) <= 7 ? (
          <button className="btn btn--quiet" style={{ height: 24, padding: '0 8px', fontSize: 12 }} onClick={onExpand}>
            看 4 周
          </button>
        ) : null}
      </div>
    </div>
  )
}
