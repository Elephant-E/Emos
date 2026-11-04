import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconChevron, IconLeft, IconRight } from '@/components/icons'
import {
  useAccountMutations,
  useBanList,
  useCarrot,
  useCarrotHistory,
  useInviteHistory,
  useInviteInfo,
  useInviteTree,
  useSession,
} from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatRelative, formatThousand } from '@/lib/format'

type Tab = 'profile' | 'invite' | 'carrot' | 'ban'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: '资料' },
  { key: 'invite', label: '邀请' },
  { key: 'carrot', label: '胡萝卜' },
  { key: 'ban', label: '封禁' },
]

export function AccountView({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const session = useSession()
  const carrot = useCarrot()
  const info = useInviteInfo()
  const bans = useBanList()
  const actions = useAccountMutations()

  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number; second: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteRemark, setInviteRemark] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState(10)

  const inviteHistory = useInviteHistory(1)
  const tree = useInviteTree()
  const [carrotPage, setCarrotPage] = useState(1)
  const carrotHistory = useCarrotHistory(carrotPage)

  useEffect(() => {
    if (session.data) setPseudonym(session.data.pseudonym ?? '')
  }, [session.data?.pseudonym])

  const user = session.data

  return (
    <>
      <PageHeader
        crumb={['账号', TABS.find((t) => t.key === tab)?.label ?? '资料']}
        title={user?.pseudonym || user?.username || '账号'}
        hint={user ? `#${user.user_id}` : undefined}
        tools={
          <>
            <span className="stamp">
              <i />
              {user?.is_can_upload ? '可上传' : '无上传权限'}
            </span>
            <button
              className="btn btn--ghost"
              onClick={() =>
                actions.sign.mutate(undefined, {
                  onSuccess: (res) => toast(`签到成功，+${res.earn_point} 胡萝卜`, 'success'),
                })
              }
            >
              签到
            </button>
          </>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="账号分区">
          {TABS.map((item) => (
            <button key={item.key} className="tab" role="tab" aria-selected={tab === item.key} onClick={() => onTab(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {session.error ? <ErrorBlock error={session.error as Error & { status?: number }} onRetry={() => session.refetch()} /> : null}

      {tab === 'profile' && user ? (
        <>
          <section className="cards">
            <article className="card">
              <p className="stat__label">胡萝卜</p>
              <p className="stat__value">
                {formatThousand(carrot.data?.carrot ?? user.carrot)}
                <small>个</small>
              </p>
              <p className="stat__delta">
                片单槽位 {user.slot_remaining}
                <span> · 邀请名额 {user.invite_remaining}</span>
              </p>
            </article>
            <article className="card">
              <p className="stat__label">上传</p>
              <p className="stat__value">
                {user.is_can_upload ? '已开通' : '未开通'}
                <small>上传权限</small>
              </p>
              <p className="stat__delta stat__delta--quiet">
                已占用 {formatThousand(Math.round(user.size_upload / 1024 / 1024))} MB
              </p>
            </article>
            <article className="card">
              <p className="stat__label">安全</p>
              <p className="stat__value">
                {user.must_otp ? '需 OTP' : '常规'}
                <small>登录策略</small>
              </p>
              <p className="stat__delta stat__delta--quiet">
                {user.telegram_user_id ? '已绑定 Telegram' : '未绑定 Telegram'}
              </p>
            </article>
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <p className="stat__label">账号设置</p>

              <div style={{ display: 'grid', gap: 16, marginTop: 12, maxWidth: 560 }}>
                <label className="field">
                  <span>笔名</span>
                  <div className="row-input">
                    <input className="input" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} placeholder="对外显示的名字" />
                    <button
                      className="btn btn--ghost"
                      disabled={actions.setPseudonym.isPending || pseudonym === (user.pseudonym ?? '')}
                      onClick={() =>
                        actions.setPseudonym.mutate(pseudonym, {
                          onSuccess: () => toast('笔名已更新', 'success'),
                        })
                      }
                    >
                      保存
                    </button>
                  </div>
                </label>

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={user.is_show_empty}
                    onChange={(e) =>
                      actions.setShowEmpty.mutate(e.target.checked, { onSuccess: () => toast('已更新显示设置', 'success') })
                    }
                  />
                  显示空媒体库
                </label>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn--ghost"
                    onClick={() =>
                      actions.temporaryPassword.mutate(undefined, {
                        onSuccess: (res) => setPassword(res),
                      })
                    }
                  >
                    获取临时登录密码
                  </button>
                  <button className="btn btn--ghost" onClick={() => setResetting(true)}>
                    重置永久密码
                  </button>
                </div>

                {password ? (
                  <p className="state__hint" style={{ textAlign: 'left' }}>
                    临时密码 <b style={{ color: 'var(--fg)', letterSpacing: '0.14em' }}>{password.password}</b>，{password.second} 秒内有效。
                  </p>
                ) : null}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {tab === 'invite' ? (
        <>
          <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="card">
              <p className="stat__label">邀请名额</p>
              <p className="stat__value">
                {info.isLoading ? '—' : info.data?.invite_remaining}
                <small>个可用</small>
              </p>
              <p className="stat__delta stat__delta--quiet">
                已邀请 {info.data?.invite_count ?? 0} 人 · 加入于 {formatDateTime(info.data?.invite_at)}
              </p>
            </article>
            <article className="card">
              <p className="stat__label">邀请用户</p>
              <div className="row-input" style={{ marginTop: 10 }}>
                <input className="input" placeholder="用户 ID（e 开头 s 结尾）" value={inviteId} onChange={(e) => setInviteId(e.target.value)} />
                <button className="btn btn--primary" onClick={() => setInviting(true)} disabled={!inviteId.trim()}>
                  邀请
                </button>
              </div>
              <p className="state__hint" style={{ textAlign: 'left', marginTop: 10 }}>
                对方的 ID 可以在他自己的账号页看到。
              </p>
            </article>
          </section>

          <section className="cards cards--wide" style={{ marginTop: 18 }}>
            <article className="card">
              <p className="stat__label">邀请记录</p>
              {inviteHistory.isLoading ? <LoadingBlock bare rows={5} columns={4} /> : null}
              {inviteHistory.data && inviteHistory.data.items.length === 0 ? <EmptyBlock bare title="还没有邀请过别人" /> : null}
              {inviteHistory.data && inviteHistory.data.items.length > 0 ? (
                <>
                  <table className="table" style={{ marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th>用户</th>
                        <th style={{ width: 130 }}>邀请时间</th>
                        <th style={{ width: 130 }}>最近播放</th>
                        <th style={{ width: 96, textAlign: 'right' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inviteHistory.data.items.map((row) => (
                        <tr key={String(row.user_id)}>
                          <td>
                            <span className="cell-title__name">{String(row.username ?? '—')}</span>
                            <span className="cell-title__code">{String(row.user_id)}</span>
                          </td>
                          <td className="muted">{formatDateTime(String(row.invite_at))}</td>
                          <td className="muted">{formatDateTime(String(row.last_video_player))}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn--quiet"
                              onClick={async () => {
                                const ok = await confirmDialog({
                                  title: '撤销这个邀请？',
                                  message: `撤销后 ${row.username} 的加入关系会被解除。`,
                                  hint: '会返还 1 个邀请名额。',
                                  confirmText: '撤销',
                                  danger: true,
                                })
                                if (!ok) return
                                actions.revoke.mutate(String(row.user_id), { onSuccess: () => toast('已撤销', 'success') })
                              }}
                            >
                              撤销
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="table-foot">
                    <span>共 {inviteHistory.data.total} 人</span>
                  </div>
                </>
              ) : null}
            </article>
          </section>

          {tree.data && tree.data.length > 0 ? (
            <section className="cards cards--wide" style={{ marginTop: 18 }}>
              <article className="card">
                <p className="stat__label">邀请关系</p>
                <ul style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  {tree.data.map((node, index) => (
                    <li key={String(node.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      {index > 0 ? <IconChevron size={12} style={{ color: 'var(--fg-5)' }} /> : null}
                      <span style={{ color: 'var(--fg-2)' }}>{String(node.username)}</span>
                      <span className="muted" style={{ fontSize: 11.5 }}>
                        {String(node.user_id)} · 加入 {formatDateTime(String(node.join_at))}
                      </span>
                      {node.is_disabled ? <span className="badge badge--warn"><i />已禁用</span> : null}
                    </li>
                  ))}
                </ul>
              </article>
            </section>
          ) : null}
        </>
      ) : null}

      {tab === 'carrot' ? (
        <>
          <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="card">
              <p className="stat__label">当前余额</p>
              <p className="stat__value">
                {formatThousand(carrot.data?.carrot ?? user?.carrot)}
                <small>个</small>
              </p>
            </article>
            <article className="card">
              <p className="stat__label">转赠</p>
              <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => setTransferring(true)}>
                转给别人
              </button>
              <p className="state__hint" style={{ textAlign: 'left', marginTop: 10 }}>
                单次 2 – 6000 个，双方都会收到通知。
              </p>
            </article>
          </section>

          <section className="cards cards--wide" style={{ marginTop: 18 }}>
            <article className="card">
              <p className="stat__label">变化记录</p>
              {carrotHistory.isLoading ? <LoadingBlock bare rows={5} columns={3} /> : null}
              {carrotHistory.data && carrotHistory.data.items.length === 0 ? <EmptyBlock bare title="还没有记录" /> : null}
              {carrotHistory.data && carrotHistory.data.items.length > 0 ? (
                <>
                  <table className="table" style={{ marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th>来源</th>
                        <th style={{ width: 120 }}>时间</th>
                        <th className="num" style={{ width: 100 }}>变动</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrotHistory.data.items.map((row, i) => (
                        <tr key={`${row.created_at}-${i}`}>
                          <td style={{ color: 'var(--fg-2)' }}>{String(row.trigger_type_string || row.trigger_type)}</td>
                          <td className="muted">{formatDateTime(String(row.created_at))}</td>
                          <td className="num" style={{ color: row.point >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                            {row.point > 0 ? '+' : ''}
                            {row.point}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="table-foot">
                    <span>共 {carrotHistory.data.total} 条</span>
                    <div className="pager">
                      <button disabled={carrotPage <= 1} onClick={() => setCarrotPage((p) => p - 1)} aria-label="上一页">
                        <IconLeft />
                      </button>
                      <button aria-current="page">{carrotPage}</button>
                      <button onClick={() => setCarrotPage((p) => p + 1)} aria-label="下一页">
                        <IconRight />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </article>
          </section>
        </>
      ) : null}

      {tab === 'ban' ? (
        <section className="cards cards--wide">
          <article className="card">
            <p className="stat__label">封禁列表</p>
            {bans.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {bans.data && bans.data.length === 0 ? <EmptyBlock bare title="没有被封禁的用户" /> : null}
            {bans.data && bans.data.length > 0 ? (
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>用户</th>
                    <th style={{ width: 200 }}>原因</th>
                    <th style={{ width: 140 }}>封禁时间</th>
                    <th style={{ width: 96, textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bans.data.map((row) => (
                    <tr key={row.user_id}>
                      <td>
                        <span className="cell-title__name">{row.username}</span>
                        <span className="cell-title__code">
                          {row.user_id}
                          {row.invite_pseudonym ? ` · 邀请人 ${row.invite_pseudonym}` : ''}
                        </span>
                      </td>
                      <td className="muted">{row.disable_reason ?? '—'}</td>
                      <td className="muted">{formatRelative(row.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--quiet"
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: `解除 ${row.username} 的封禁？`,
                              hint: '解除后对方可以立即恢复访问。',
                              confirmText: '解除',
                            })
                            if (!ok) return
                            actions.banChange.mutate(
                              { type: 'enable', userId: row.user_id },
                              { onSuccess: () => toast('已解除封禁', 'success') },
                            )
                          }}
                        >
                          解除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </article>
        </section>
      ) : null}

      {resetting ? (
        <Modal
          title="重置永久密码"
          hint="重置后所有已登录设备需要重新登录。"
          onClose={() => setResetting(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setResetting(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!newPassword.trim()}
                onClick={() =>
                  actions.resetPassword.mutate(newPassword, {
                    onSuccess: () => {
                      toast('密码已重置', 'success')
                      setResetting(false)
                      setNewPassword('')
                    },
                  })
                }
              >
                重置
              </button>
            </>
          }
        >
          <label className="field">
            <span>新密码</span>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
          </label>
        </Modal>
      ) : null}

      {inviting ? (
        <Modal
          title="邀请用户"
          hint="邀请名额有限，撤销邀请会返还名额。"
          onClose={() => setInviting(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setInviting(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() =>
                  actions.invite.mutate(
                    { id: inviteId.trim(), remark: inviteRemark },
                    {
                      onSuccess: () => {
                        toast('邀请已发出', 'success')
                        setInviting(false)
                        setInviteId('')
                        setInviteRemark('')
                      },
                    },
                  )
                }
              >
                发出邀请
              </button>
            </>
          }
        >
          <label className="field">
            <span>用户 ID</span>
            <input className="input" value={inviteId} onChange={(e) => setInviteId(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>备注（仅自己可见）</span>
            <input className="input" value={inviteRemark} onChange={(e) => setInviteRemark(e.target.value)} />
          </label>
        </Modal>
      ) : null}

      {transferring ? (
        <Modal
          title="转赠胡萝卜"
          hint="单次 2 – 6000 个，转账后不可撤回。"
          onClose={() => setTransferring(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setTransferring(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!transferTo.trim() || transferAmount < 2 || actions.transfer.isPending}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: `转赠 ${transferAmount} 个胡萝卜？`,
                    message: `转给 ${transferTo.trim()}，转出后不可撤回。`,
                    hint: '如果填错用户 ID，胡萝卜无法追回。',
                    confirmText: '转赠',
                  })
                  if (!ok) return
                  actions.transfer.mutate(
                    { userId: transferTo.trim(), carrot: transferAmount },
                    {
                      onSuccess: (res) => {
                        toast(`已转赠，余额 ${res.carrot}`, 'success')
                        setTransferring(false)
                      },
                    },
                  )
                }}
              >
                转赠
              </button>
            </>
          }
        >
          <label className="field">
            <span>对方用户 ID</span>
            <input className="input" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>数量</span>
            <input className="input" type="number" min={2} max={6000} value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
