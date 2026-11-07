import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import {
  useAccountMutations,
  useCapabilities,
  useCarrot,
  useInviteHistory,
  useInviteInfo,
  useInviteTree,
  useSession,
} from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatSize, formatThousand } from '@/lib/format'

type Tab = 'profile' | 'invite'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: '资料' },
  { key: 'invite', label: '邀请' },
]

export function AccountView({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const session = useSession()
  const carrot = useCarrot()
  const info = useInviteInfo()
  const actions = useAccountMutations()
  const caps = useCapabilities()

  const [showPassword, setShowPassword] = useState(false)
  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number; second: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteRemark, setInviteRemark] = useState('')

  const inviteHistory = useInviteHistory(1)
  const tree = useInviteTree()

  useEffect(() => {
    if (session.data) setPseudonym(session.data.pseudonym ?? '')
  }, [session.data?.pseudonym])

  const user = session.data

  // /api/invite/tree 是全站扁平树（3000+ 节点），不是「我的邀请关系」；
  // 按 invite_user_id 从当前用户往下走，才是自己的下级
  const myTree = (() => {
    const all = tree.data ?? []
    const me = user?.user_id
    if (!me || all.length === 0) return []
    const byParent = new Map<string, typeof all>()
    for (const node of all) {
      const parent = node.invite_user_id
      if (!parent) continue
      const list = byParent.get(parent)
      if (list) list.push(node)
      else byParent.set(parent, [node])
    }
    const out: Array<(typeof all)[number] & { depth: number }> = []
    const walk = (uid: string, depth: number) => {
      for (const child of byParent.get(uid) ?? []) {
        out.push({ ...child, depth })
        walk(child.user_id, depth + 1)
      }
    }
    walk(me, 1)
    return out
  })()

  // 合并「我邀请的」与「下级邀请的」：同一个表里用缩进区分层级，
  // 最近播放来自 inviteHistory（只有直接邀请的人才有）
  const inviteRows = (() => {
    const nameById = new Map<string, string>()
    for (const node of tree.data ?? []) nameById.set(node.user_id, node.username)
    const playedById = new Map<string, string | null>()
    for (const row of inviteHistory.data?.items ?? []) playedById.set(String(row.user_id), (row.last_video_player as string) ?? null)
    return myTree.map((node) => ({
      userId: node.user_id,
      username: node.username,
      depth: node.depth,
      joinAt: node.join_at,
      isDisabled: Boolean(node.is_disabled),
      invitedBy: node.depth > 1 ? (nameById.get(node.invite_user_id ?? '') ?? null) : null,
      lastPlayed: playedById.get(node.user_id) ?? null,
    }))
  })()

  return (
    <>
      <PageHeader
        crumb={['账号', TABS.find((t) => t.key === tab)?.label ?? '资料']}
        title={user?.pseudonym || user?.username || '账号'}
        hint={user ? `#${user.user_id}` : undefined}
        tools={
          <>
            {user && !user.is_can_upload ? <span className="head-note">无上传权限</span> : null}
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
              <p className="stat__label">累计上传</p>
              <p className="stat__value">
                {formatSize(user.size_upload)}
              </p>
              <p className="stat__delta stat__delta--quiet">
                {user.is_can_upload ? '上传权限已开通' : '上传权限未开通'}
              </p>
            </article>
            <article className="card">
              <p className="stat__label">片单槽位</p>
              <p className="stat__value">
                {user.slot_remaining}
                <small>个可用</small>
              </p>
              <p className="stat__delta stat__delta--quiet">可用胡萝卜兑换</p>
            </article>
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <div className="card-head">
                <p className="stat__label" style={{ margin: 0 }}>客户端登录</p>
                <span className="muted tnum-sm">在播放器里填这些地址</span>
              </div>
              <dl className="kv" style={{ marginTop: 'var(--stack)' }}>
                {[
                  ['视频服', user.server_video],
                  ['直播服', user.server_live],
                  ['音乐服', user.server_music],
                ].map(([label, url]) =>
                  url ? (
                    <div key={String(label)}>
                      <dt>{label}</dt>
                      <dd>
                        <button
                          className="btn btn--quiet"
                          onClick={() => {
                            void navigator.clipboard.writeText(String(url))
                            toast(`已复制${label}地址`, 'success')
                          }}
                        >
                          {String(url).replace(/^https?:\/\//, '')} · 复制
                        </button>
                      </dd>
                    </div>
                  ) : null,
                )}
                <div>
                  <dt>登录密码</dt>
                  <dd>
                    {showPassword ? (
                      <button
                        className="btn btn--quiet tnum"
                        onClick={() => {
                          void navigator.clipboard.writeText(user.password)
                          toast('已复制密码', 'success')
                        }}
                      >
                        {user.password} · 复制
                      </button>
                    ) : (
                      <button className="btn btn--quiet" onClick={() => setShowPassword(true)}>
                        显示
                      </button>
                    )}
                  </dd>
                </div>
              </dl>
              {user.must_otp ? <p className="card-note" style={{ marginTop: 'var(--stack)' }}>该密码是一次性密码，登录后请改永久密码。</p> : null}
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

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={user.is_original_image}
                    disabled={actions.toggleOriginalImage.isPending}
                    onChange={() =>
                      actions.toggleOriginalImage.mutate(undefined, {
                        onSuccess: (res) => toast(res.is_original_image ? '已开启高清海报' : '已关闭高清海报', 'success'),
                      })
                    }
                  />
                  高清海报
                </label>

                <div className="row" style={{ gap: 12 }}>
                  <span className="muted text-sm">
                    Telegram {user.telegram_user_id ? `已绑定 ${user.telegram_user_id}` : '未绑定'}
                  </span>
                  {user.telegram_user_id ? (
                    <button
                      className="btn btn--danger-text"
                      disabled={actions.unbindTelegram.isPending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: '解绑 Telegram？',
                          message: '解绑后将收不到机器人通知。',
                          confirmText: '解绑',
                          danger: true,
                        })
                        if (!ok) return
                        actions.unbindTelegram.mutate(undefined, { onSuccess: () => toast('已解绑', 'success') })
                      }}
                    >
                      解绑
                    </button>
                  ) : user.telegram_bind_url ? (
                    <a className="btn btn--quiet" href={user.telegram_bind_url} target="_blank" rel="noreferrer">
                      去绑定
                    </a>
                  ) : null}
                </div>

                <div className="detail-stats" style={{ marginTop: 4 }}>
                  <div className="detail-stat">
                    <b>{caps.canView ? '已开通' : '未开通'}</b>
                    <span>观影权限</span>
                  </div>
                  <div className="detail-stat">
                    <b>{caps.canUpload ? '已开通' : '未开通'}</b>
                    <span>上传权限</span>
                  </div>
                  <div className="detail-stat">
                    <b>{caps.canDown ? '已开通' : '未开通'}</b>
                    <span>下载权限</span>
                  </div>
                  <div className="detail-stat">
                    <b>{caps.slotRemaining}</b>
                    <span>片单槽位</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!caps.canUpload ? (
                    <button
                      className="btn btn--ghost"
                      onClick={() =>
                        actions.agreeUpload.mutate(undefined, { onSuccess: () => toast('已开启上传权限', 'success') })
                      }
                    >
                      同意上传协议并开通
                    </button>
                  ) : null}
                  {!caps.canDown ? (
                    <button
                      className="btn btn--ghost"
                      onClick={() => actions.agreeDown.mutate(undefined, { onSuccess: () => toast('已开启下载权限', 'success') })}
                    >
                      同意下载协议并开通
                    </button>
                  ) : null}
                  <button
                    className="btn btn--ghost"
                    disabled={actions.exchangeSlot.isPending}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: '用胡萝卜兑换一个片单槽位？',
                        message: '兑换会扣除胡萝卜，并立刻增加 1 个可用槽位。',
                        hint: '余额不足时会失败，不会扣款。',
                        confirmText: '兑换',
                      })
                      if (!ok) return
                      actions.exchangeSlot.mutate(undefined, {
                        onSuccess: (res) => {
                          toast(`已兑换，剩余槽位 ${res.slot_remaining}`, 'success')
                          void session.refetch()
                        },
                      })
                    }}
                  >
                    {actions.exchangeSlot.isPending ? '兑换中…' : '用胡萝卜兑换片单槽位'}
                  </button>
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
                  <p className="state__hint note-left">
                    {password.password ? (
                      <>
                        临时密码 <b style={{ color: 'var(--fg)', letterSpacing: '0.14em' }}>{password.password}</b>，{password.second} 秒内有效。
                      </>
                    ) : (
                      <>未启用一次性密码，请用上面的登录密码。</>
                    )}
                  </p>
                ) : null}
              </div>
            </article>
          </section>
        </>
      ) : null}

      <div className="content-in" key={tab}>
      {tab === 'invite' ? (
        <>
          <section className="cards cards--2">
            <article className="card">
              <p className="stat__label">邀请名额</p>
              <p className="stat__value">
                {info.isLoading ? '—' : caps.inviteRemaining}
                <small>个可用</small>
              </p>
              <p className="stat__delta stat__delta--quiet">
                已邀请 {info.data?.invite_count ?? 0} 人
                {info.data?.parent?.pseudonym
                  ? ` · 邀请人 ${info.data.parent.pseudonym}`
                  : ` · 加入于 ${formatDateTime(info.data?.invite_at)}`}
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
            </article>
          </section>

          {myTree.length > 0 ? (
            <section className="cards cards--wide" style={{ marginTop: 18 }}>
              <article className="card">
                <div className="card-head">
                  <p className="stat__label" style={{ margin: 0 }}>我的邀请</p>
                  <span className="muted tnum-sm">
                    直接 {myTree.filter((n) => n.depth === 1).length} · 合计 {formatThousand(myTree.length)} 人
                  </span>
                </div>
                <table className="table table--inset">
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th style={{ width: 130 }}>加入时间</th>
                      <th style={{ width: 130 }}>最近播放</th>
                      <th style={{ width: 96 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteRows.slice(0, 50).map((row) => (
                      <tr key={row.userId}>
                        <td style={{ paddingLeft: 24 + (row.depth - 1) * 20 }}>
                          <Link
                            to="/users/$userId"
                            params={{ userId: row.userId }}
                            className="cell-title__name"
                            style={{ color: 'var(--fg)' }}
                          >
                            {row.username}
                          </Link>
                          <span className="cell-title__code">
                            {row.userId}
                            {row.invitedBy ? ` · 由 ${row.invitedBy} 邀请` : ''}
                            {row.isDisabled ? ' · 已禁用' : ''}
                          </span>
                        </td>
                        <td className="muted">{formatDateTime(row.joinAt)}</td>
                        <td className="muted">{row.lastPlayed ? formatDateTime(row.lastPlayed) : '—'}</td>
                        <td>
                          {row.depth === 1 ? (
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
                                actions.revoke.mutate(row.userId, { onSuccess: () => toast('已撤销', 'success') })
                              }}
                            >
                              撤销
                            </button>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inviteRows.length > 50 ? (
                  <p className="card-note" style={{ marginTop: 'var(--stack)' }}>
                    只列出前 50 位。
                  </p>
                ) : null}
              </article>
            </section>
          ) : null}
        </>
      ) : null}



      {resetting ? (
        <Modal
          title="重置永久密码"
          hint="重置后所有已登录设备需要重新登录。"
          onClose={() => setResetting(false)}
          onSubmit={() => { if (newPassword.trim() && !actions.resetPassword.isPending) actions.resetPassword.mutate(newPassword.trim()) }}
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
          onSubmit={() => { if (inviteId.trim() && !actions.invite.isPending) actions.invite.mutate({ id: inviteId.trim(), remark: inviteRemark.trim() }) }}
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

      </div>
    </>
  )
}
