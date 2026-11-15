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
  return (
    <article className="card" style={{ marginTop: 18 }}>
      <CardHead title="演职员" />
      <div className="person-grid">
        {persons.slice(0, limit).map((person) => (
          <div key={person.person_id_tmdb ?? person.name} className="person-card">
            <span className={`person-card__photo${person.image_profile ? '' : ' is-empty'}`}>
              {person.image_profile ? (
                <img
                  src={`https://image.theotherdb.org/original/${person.image_profile}`}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    // 地址是拼出来的，缺图时把槽切到「首字」状态，而不是隐藏 img 后留个洞
                    e.currentTarget.parentElement?.classList.add('is-empty')
                  }}
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
        ))}
      </div>
    </article>
  )
}
