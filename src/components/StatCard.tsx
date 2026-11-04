import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  delta?: string
  deltaSuffix?: string
  tone?: 'up' | 'amber' | 'quiet'
  art?: ReactNode
}

export function StatCard({ label, value, unit, delta, deltaSuffix, tone = 'up', art }: StatCardProps) {
  const toneClass = tone === 'up' ? '' : tone === 'amber' ? ' stat__delta--amber' : ' stat__delta--quiet'
  return (
    <article className="card">
      <p className="stat__label">{label}</p>
      <p className="stat__value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </p>
      {delta ? (
        <p className={`stat__delta${toneClass}`}>
          {delta}
          {deltaSuffix ? <span>{deltaSuffix}</span> : null}
        </p>
      ) : null}
      {art}
    </article>
  )
}

export function PosterArt() {
  return (
    <div className="posters" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  )
}
