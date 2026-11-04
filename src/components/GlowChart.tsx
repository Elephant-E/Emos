import { useMemo, useRef, useState } from 'react'
import type { SeriesPoint } from '@/api/types'

interface GlowChartProps {
  months: string[]
  series: SeriesPoint[]
  height?: number
}

const W = 1040
const H = 360
const LEFT = 66
const RIGHT = 1002
const TOP = 40
const BASE = 300

function toPath(points: Array<[number, number]>): string {
  if (points.length < 2) return ''
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export function GlowChart({ months, series, height = 420 }: GlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const { paths, ticks, xs } = useMemo(() => {
    const n = months.length
    const step = n > 1 ? (RIGHT - LEFT) / (n - 1) : 0
    const xsArr = months.map((_, i) => LEFT + i * step)
    const rawMax = Math.max(1, ...series.flatMap((s) => s.values))
    const maxVal = Math.ceil((rawMax * 1.25) / 10) * 10
    const y = (v: number) => BASE - (v / maxVal) * (BASE - TOP)
    const built = series.map((s) => ({
      ...s,
      d: toPath(s.values.map((v, i) => [xsArr[i], y(v)] as [number, number])),
      points: s.values.map((v, i) => [xsArr[i], y(v)] as [number, number]),
    }))
    return {
      paths: built,
      xs: xsArr,
      ticks: [0.25, 0.5, 0.75, 1].map((r) => ({ y: BASE - r * (BASE - TOP), label: Math.round(maxVal * r) })),
    }
  }, [months, series])

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || xs.length === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * W
    let nearest = 0
    xs.forEach((px, i) => {
      if (Math.abs(px - x) < Math.abs(xs[nearest] - x)) nearest = i
    })
    setHover(nearest)
  }

  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ height, width: '100%' }}
        role="img"
        aria-label={`近 ${months.length} 个月各分区片量`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <filter id="glow-far" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <filter id="glow-near" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id="fade-first" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color ?? '#ffc53d'} stopOpacity="0.16" />
            <stop offset="100%" stopColor={series[0]?.color ?? '#ffc53d'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <line key={t.label} x1={LEFT} y1={t.y} x2={RIGHT} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <line x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />

        {ticks.map((t) => (
          <text key={`lbl-${t.label}`} className="chart__axis" x={LEFT - 16} y={t.y + 4} textAnchor="end">
            {t.label}
          </text>
        ))}
        <text className="chart__axis" x={LEFT - 16} y={BASE + 4} textAnchor="end">
          0
        </text>

        {months.map((m, i) => (
          <text key={m} className="chart__axis chart__axis-month" x={xs[i]} y={BASE + 24} textAnchor="middle">
            {m}
          </text>
        ))}

        {paths[0] ? (
          <path
            d={`${paths[0].d} L ${RIGHT} ${BASE} L ${LEFT} ${BASE} Z`}
            fill="url(#fade-first)"
            stroke="none"
          />
        ) : null}

        {paths.map((s) => (
          <g key={s.key}>
            <path d={s.d} fill="none" stroke={s.color} strokeWidth="7" opacity="0.3" filter="url(#glow-far)" strokeLinecap="round" />
            <path d={s.d} fill="none" stroke={s.color} strokeWidth="3.2" opacity="0.5" filter="url(#glow-near)" strokeLinecap="round" />
            <path d={s.d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {hover !== null ? (
          <g pointerEvents="none">
            <line x1={xs[hover]} y1={TOP} x2={xs[hover]} y2={BASE} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            {paths.map((s) => (
              <circle key={s.key} cx={s.points[hover][0]} cy={s.points[hover][1]} r="3.4" fill={s.color} stroke="#0a0908" strokeWidth="1.5" />
            ))}
          </g>
        ) : null}

      </svg>

      {hover !== null ? (
        <div
          style={{
            position: 'absolute',
            left: `${(xs[hover] / W) * 100}%`,
            top: 8,
            transform: 'translateX(-50%)',
            minWidth: 132,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'rgba(20,19,17,0.96)',
            boxShadow: 'var(--shadow-pop)',
            pointerEvents: 'none',
          }}
        >
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--fg-3)' }}>{months[hover]}</p>
          {paths.map((s) => (
            <p key={s.key} style={{ margin: '2px 0', display: 'flex', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: s.color, marginTop: 6 }} />
              <span style={{ color: 'var(--fg-3)' }}>{s.label}</span>
              <span className="tnum" style={{ marginLeft: 'auto', color: 'var(--fg)' }}>
                {s.values[hover]}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
