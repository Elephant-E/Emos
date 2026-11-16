import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { PageHeader } from '@/components/PageHeader'
import { useAccountMutations, useBanList } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDate } from '@/lib/format'

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
        <span className="spacer" />
        <span className="head-note">仅列出正在封禁中的账号</span>
        <button type="button" className="btn btn--primary" disabled={!value.trim()} onClick={submit}>
          查详情
        </button>
      </div>

      <ListSection
        isLoading={bans.isLoading}
        error={bans.error}
        onRetry={() => bans.refetch()}
        items={rows}
        loadingRows={5}
        loadingKind="rows"
        loadingPoster="square"
        loadingLines={2}
        loadingActions={1}
        emptyTitle="没有封禁中的用户"
      >
          <RecordRow
            rows={rows}
            idKey={(row) => row.user_id}
            posterShape="square"
            posterFallback="initial"
            posterName={(row) => row.username ?? row.user_id}
            poster={(row) => row.avatar}
            title={(row) => (
              <Link to="/users/$userId" params={{ userId: row.user_id }}>
                {row.username ?? row.user_id}
              </Link>
            )}
            facts={(row) => (
              <>
                <span>{row.disable_reason ?? '无原因'}</span>
                <span>{formatDate(row.created_at)} 封禁</span>
              </>
            )}
            actions={(row) => (
              <button
                type="button"
                className="btn btn--quiet"
                disabled={actions.banChange.isPending}
                onClick={() => unban(row.user_id, row.username ?? row.user_id)}
              >
                解除
              </button>
            )}
          />
      </ListSection>
    </>
  )
}
