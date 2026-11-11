import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Tabs } from '@/components/Tabs'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import {
  useAccountMutations,
  useCapabilities,
  useCarrot,
  useInviteHistory,
  useInviteInfo,
  useInviteTree,
  useVideoDevices,
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
  const devices = useVideoDevices()
  const carrot = useCarrot()
  const info = useInviteInfo()
  const actions = useAccountMutations()
  const caps = useCapabilities()

  const [showPassword, setShowPassword] = useState(false)
  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number | null; second: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteRemark, setInviteRemark] = useState('')
  const [remarkFor, setRemarkFor] = useState<{ userId: string; username: string; remark: string } | null>(null)

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
    const remarkById = new Map<string, string>()
    for (const row of inviteHistory.data?.items ?? []) {
      playedById.set(String(row.user_id), (row.last_video_player as string) ?? null)
      const remark = String(row.invite_remark ?? '').trim()
      if (remark) remarkById.set(String(row.user_id), remark)
    }
    return myTree.map((node) => ({
      userId: node.user_id,
      username: node.username,
      depth: node.depth,
      joinAt: node.join_at,
      isDisabled: Boolean(node.is_disabled),
      invitedBy: node.depth > 1 ? (nameById.get(node.invite_user_id ?? '') ?? null) : null,
      lastPlayed: playedById.get(node.user_id) ?? null,
      remark: remarkById.get(node.user_id) ?? '',
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
              disabled={caps.signedToday || actions.sign.isPending}
              onClick={() =>
                actions.sign.mutate(undefined, {
                  onSuccess: (res) => toast(`签到成功，+${res.earn_point} 胡萝卜`, 'success'),
                })
              }
            >
              {caps.signedToday ? '今天已签' : '签到'}
            </button>
          </>
        }
      />

      <div className="toolbar">
        <Tabs items={TABS} value={tab} onChange={onTab} label="账号分区" />
      </div>

      {session.error ? <ErrorBlock error={session.error} onRetry={() => session.refetch()} /> : null}

      {tab === 'profile' && user ? (
        <>
          <section className="cards">
            <StatCard
              label="胡萝卜"
              value={formatThousand(carrot.data?.carrot ?? user.carrot)}
              unit="个"
              loud
              note={
                <>
                  片单槽位 {user.slot_remaining}
                  <span> · 邀请名额 {user.invite_remaining}</span>
                </>
              }
            />
            <StatCard
              label="累计上传"
              value={formatSize(user.size_upload)}
              note={user.is_can_upload ? '上传权限已开通' : '上传权限未开通'}
            />
            <StatCard label="片单槽位" value={user.slot_remaining} unit="个可用" note="可用胡萝卜兑换" />
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <CardHead title="客户端登录">
                <span className="muted tnum-sm">在播放器里填这些地址</span>
              </CardHead>
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
                    {!user.password ? (
                      <span className="muted">未设置密码</span>
                    ) : showPassword ? (
                      <button
                        className="btn btn--quiet tnum"
                        onClick={() => {
                          void navigator.clipboard.writeText(user.password ?? '')
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
              <CardHead title="已登录设备">
                {devices.data && devices.data.length > 0 ? (
                  <button
                    className="btn btn--quiet"
                    disabled={actions.logoutDevice.isPending}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: '让所有设备下线？',
                        message: '包括你正在用的这一台，之后需要在播放器里重新登录。',
                        confirmText: '全部下线',
                        danger: true,
                      })
                      if (!ok) return
                      actions.logoutDevice.mutate(null, { onSuccess: () => toast('已全部下线', 'success') })
                    }}
                  >
                    全部下线
                  </button>
                ) : null}
              </CardHead>
              {devices.isLoading ? <LoadingBlock bare rows={2} columns={3} /> : null}
              {devices.data && devices.data.length === 0 ? (
                <EmptyBlock bare title="没有登录中的设备" />
              ) : null}
              {devices.data && devices.data.length > 0 ? (
                <table className="table table--inset">
                  <thead>
                    <tr>
                      <th>设备</th>
                      <th style={{ width: 150 }}>最后使用</th>
                      <th style={{ width: 96 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.data.map((device) => (
                      <tr key={device.device_id}>
                        <td>
                          <span className="cell-title__name">{device.device_name || '未命名设备'}</span>
                          <span className="cell-title__code">
                            {device.device_client} {device.device_version}
                          </span>
                        </td>
                        <td className="muted">{device.last_used_at ? formatDateTime(device.last_used_at) : '—'}</td>
                        <td>
                          <button
                            className="btn btn--quiet"
                            disabled={actions.logoutDevice.isPending}
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: `让 ${device.device_name || '这台设备'} 下线？`,
                                message: '该设备需要重新登录才能继续播放。',
                                confirmText: '下线',
                                danger: true,
                              })
                              if (!ok) return
                              actions.logoutDevice.mutate(device.device_id, {
                                onSuccess: () => toast('已下线', 'success'),
                              })
                            }}
                          >
                            下线
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
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
                  {user.telegram_group_url ? (
                    <a className="btn btn--quiet" href={user.telegram_group_url} target="_blank" rel="noreferrer">
                      加入群组
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
            <StatCard
              label="邀请名额"
              value={info.isLoading ? '—' : caps.inviteRemaining}
              unit="个可用"
              note={
                info.data?.parent?.pseudonym
                  ? `邀请人 ${info.data.parent.pseudonym}`
                  : `加入于 ${formatDateTime(info.data?.invite_at)}`
              }
            />
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
                <CardHead title="我的邀请">
                  <span className="muted tnum-sm">
                    直接 {myTree.filter((n) => n.depth === 1).length} · 合计 {formatThousand(myTree.length)} 人
                  </span>
                </CardHead>
                <table className="table table--inset">
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th style={{ width: 130 }}>加入时间</th>
                      <th style={{ width: 130 }}>最近播放</th>
                      <th style={{ width: 160 }}>备注</th>
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
                        <td className="muted">
                          {row.depth === 1 ? (
                            <button
                              className="btn btn--quiet"
                              onClick={() => setRemarkFor({ userId: row.userId, username: row.username, remark: row.remark })}
                            >
                              {row.remark || '添加备注'}
                            </button>
                          ) : row.remark ? (
                            <span className="ellipsis" title={row.remark}>{row.remark}</span>
                          ) : (
                            '—'
                          )}
                        </td>
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

      {remarkFor ? (
        <Modal
          title={`邀请备注 · ${remarkFor.username}`}
          onClose={() => setRemarkFor(null)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setRemarkFor(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={actions.remarkInvite.isPending}
                onClick={() =>
                  actions.remarkInvite.mutate(
                    { userId: remarkFor.userId, remark: remarkFor.remark.trim() },
                    {
                      onSuccess: () => {
                        toast('已保存', 'success')
                        setRemarkFor(null)
                      },
                    },
                  )
                }
              >
                保存
              </button>
            </>
          }
        >
          <label className="field">
            <span>备注</span>
            <input
              className="input"
              value={remarkFor.remark}
              onChange={(e) => setRemarkFor({ ...remarkFor, remark: e.target.value })}
              placeholder="例如：来自某某群的谁"
              autoFocus
            />
          </label>
        </Modal>
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
