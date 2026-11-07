import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { useBanList } from '@/api/queries'
import { formatRelative } from '@/lib/format'

export function UserSearchView() {
  const navigate = useNavigate()
  const bans = useBanList()
  const [value, setValue] = useState('')

  const submit = () => {
    const id = value.trim()
    if (!id) return
    navigate({ to: '/users/$userId', params: { userId: id } })
  }

  return (
    <>
      <PageHeader
        crumb={['用户', '查询']}
        title="查用户"
        tools={
          <Link className="btn btn--ghost" to="/users">
            封禁列表
          </Link>
        }
      />

      <section className="cards" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <article className="card">
          <div className="card-head">
            <p className="stat__label" style={{ margin: 0 }}>用户 ID</p>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                value={value}
                placeholder="例如 eK98L0NEMs"
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                }}
              />
              <button className="btn btn--primary" disabled={!value.trim()} onClick={submit}>
                查询
              </button>
            </div>
            <p className="card-note" style={{ marginTop: 'var(--stack)' }}>
              用户 ID 会出现在邀请记录、封禁列表和订单里。服务商权限下的余额、观影、注册时间需要额外授权。
            </p>
          </div>
        </article>
      </section>

      <section className="cards" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <article className="card">
          <div className="card-head">
            <p className="stat__label" style={{ margin: 0 }}>最近封禁</p>
            <Link className="btn btn--quiet" to="/users">
              全部
            </Link>
          </div>
          <div className="card-body">
            {bans.isLoading ? <p className="card-note">读取中…</p> : null}
            {bans.error ? <p className="card-note">取不到封禁列表，稍后再试～</p> : null}
            {bans.data && bans.data.length === 0 ? <p className="card-note">目前没有封禁中的用户。</p> : null}
            <ul style={{ display: 'grid', gap: 10 }}>
              {(bans.data ?? []).slice(0, 5).map((row) => (
                <li key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <Link
                    to="/users/$userId"
                    params={{ userId: row.user_id }}
                    style={{ color: 'var(--fg-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {row.username ?? row.user_id}
                  </Link>
                  <span className="muted" style={{ fontSize: 11.5 }}>{formatRelative(row.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </>
  )
}
