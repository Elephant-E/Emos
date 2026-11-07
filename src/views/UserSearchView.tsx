import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { useAccountMutations, useBanList } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative } from '@/lib/format'

export function UserSearchView() {
  const navigate = useNavigate()
  const bans = useBanList()
  const actions = useAccountMutations()
  const [value, setValue] = useState('')

  const submit = () => {
    const id = value.trim()
    if (!id) return
    navigate({ to: '/users/$userId', params: { userId: id } })
  }

  const unban = async (userId: string, name: string) => {
    const ok = await confirmDialog({
      title: `解除「${name}」的封禁？`,
      message: '解除后该账号可以正常访问。',
      confirmText: '解除',
    })
    if (!ok) return
    actions.banChange.mutate({ type: 'unblock', userId }, { onSuccess: () => toast('已解除封禁', 'success') })
  }

  const rows = bans.data ?? []

  return (
    <>
      <PageHeader crumb={['用户']} title="用户" />

      <div className="toolbar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          value={value}
          placeholder="按用户 ID 查详情"
          aria-label="按用户 ID 查详情"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
        />
        <button className="btn btn--primary" disabled={!value.trim()} onClick={submit}>
          查详情
        </button>
        <span className="spacer" />
        <span className="head-note">封禁列表来自最近一周的记录</span>
      </div>

      {bans.error ? <ErrorBlock error={bans.error as Error & { status?: number }} onRetry={() => bans.refetch()} /> : null}
      {bans.isLoading ? <LoadingBlock rows={4} columns={3} /> : null}
      {!bans.isLoading && !bans.error && rows.length === 0 ? <EmptyBlock title="没有封禁中的用户" /> : null}

      {rows.length > 0 ? (
        <div className="table-card content-in" key={rows.length}>
          <table className="table table--fixed">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>用户</th>
                <th style={{ width: '30%' }}>原因</th>
                <th className="num" style={{ width: '18%' }}>封禁时间</th>
                <th style={{ width: '96px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <div className="cell-title">
                      <span className="thumb">{(row.username ?? row.user_id).slice(0, 1)}</span>
                      <span>
                        <Link to="/users/$userId" params={{ userId: row.user_id }} className="cell-title__name">
                          {row.username ?? row.user_id}
                        </Link>
                        <span className="cell-title__code">{row.user_id}</span>
                      </span>
                    </div>
                  </td>
                  <td className="muted ellipsis">{row.disable_reason ?? '—'}</td>
                  <td className="num muted">{formatRelative(row.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--quiet"
                      disabled={actions.banChange.isPending}
                      onClick={() => unban(row.user_id, row.username ?? row.user_id)}
                    >
                      解除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}
