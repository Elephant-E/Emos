import { useState } from 'react'
import { CardHead } from '@/components/CardHead'
import type { VideoPerson } from '@/api/types'

/** 岗位英文 → 中文；没收录的原样显示 */
const JOB_LABEL: Record<string, string> = {
  Director: '导演',
  Actor: '演员',
  Actress: '演员',
  Writer: '编剧',
  Screenplay: '编剧',
  Producer: '制片',
  'Executive Producer': '出品人',
  Composer: '配乐',
  'Director of Photography': '摄影',
  Editor: '剪辑',
  Casting: '选角',
  'Production Design': '美术',
  Costume: '服装',
  Sound: '音效',
  'Visual Effects': '视效',
}

/** 演职员卡：只展示前 8 位，岗位翻成中文 */
export function VideoCasts({ persons, limit = 8 }: { persons: VideoPerson[]; limit?: number }) {
  // 头像地址是拼出来的，缺图时切「首字」：用 state 记录失败项
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const keyOf = (person: VideoPerson) => String(person.person_id_tmdb ?? person.name)
  return (
    <article className="card" style={{ marginTop: 'var(--gap-card)' }}>
      <CardHead title="演职员" />
      <div className="person-grid">
        {persons.slice(0, limit).map((person) => {
          const key = keyOf(person)
          const empty = !person.image_profile || broken.has(key)
          return (
          <div key={key} className="person-card">
            <span className={`person-card__photo${empty ? ' is-empty' : ''}`}>
              {!empty && person.image_profile ? (
                <img
                  src={`https://image.theotherdb.org/original/${person.image_profile}`}
                  alt=""
                  loading="lazy"
                  onError={() => setBroken((prev) => new Set(prev).add(key))}
                />
              ) : null}
              <span className="person-card__initial" aria-hidden>
                {person.name.slice(0, 1)}
              </span>
            </span>
            <span className="person-card__name">{person.name}</span>
            <span className="person-card__role">
              {JOB_LABEL[person.job ?? ''] ?? person.job ?? (person.title ? `饰 ${person.title}` : '')}
            </span>
          </div>
          )
        })}
      </div>
    </article>
  )
}
