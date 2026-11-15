import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ClientLoginCard } from '@/components/account/ClientLoginCard'
import { DevicesCard } from '@/components/account/DevicesCard'
import { Tabs } from '@/components/Tabs'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
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
import { buildInviteRows, pickMySubtree, type InviteHistoryRow } from '@/lib/invite-tree'
import { getToken } from '@/api/client'

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

  // 网页之外的项目（播放器、脚本、第三方客户端）要直接用这个令牌，所以要在界面上能拿到
  const token = getToken() ?? ''
  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number | null; second: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteRemark, setInviteRemark] = useState('')
  const [remarkFor, setRemarkFor] = useState<{ userId: string; username: string; remark: string } | null>(null)

  // 备注与「最近活跃」都来自这张表，首页取满 100 条，避免第 11 个被邀请人之后全是「—」
  const inviteHistory = useInviteHistory(1, 100)
  const tree = useInviteTree()

  useEffect(() => {
    if (session.data) setPseudonym(session.data.pseudonym ?? '')
  }, [session.data?.pseudonym])

  const user = session.data
  /**
   * must_otp 决定动态/固定密码二选一：true 只能取动态密码（account.password 为 null），false 只能用 6 位固定密码。
   * /api/user/* 只有取动态密码与改固定密码两个接口，没有改 must_otp 的。
   */
  const otpMode = Boolean(user?.must_otp)

  // 全站扁平树（3000+ 节点）→ 我这一支（带层级）→ 合并备注与最近播放；计算见 lib/invite-tree.ts
  const myTree = useMemo(() => pickMySubtree(tree.data ?? [], user?.user_id), [tree.data, user?.user_id])
  const inviteRows = useMemo(
    () => buildInviteRows(myTree, tree.data ?? [], (inviteHistory.data?.items ?? []) as unknown as InviteHistoryRow[]),
    [myTree, tree.data, inviteHistory.data],
  )

  /** 邀请进 EMOS：会扣胡萝卜，先确认再发 */
  const inviteEmps = async () => {
    const ok = await confirmDialog({
      title: '邀请 TA 进入 EMOS？',
      message: `对象：${inviteId.trim()}`,
      hint: '会消耗你自己的胡萝卜，具体数额由后端结算。',
      confirmText: '邀请',
    })
    if (!ok) return
    actions.inviteEmps.mutate(inviteId.trim(), {
      onSuccess: (res) => {
        toast(`已邀请，花掉 ${Math.abs(res.carrot)} 胡萝卜`, 'success')
        void session.refetch()
      },
    })
  }

  /** 退出被邀请的关系，不可撤销 */
  const exitInvite = async () => {
    const ok = await confirmDialog({
      title: '退出邀请关系？',
      message: '退出后你不再挂在邀请人下面，需要重新找人邀请。',
      hint: '邀请名额与已有的记录不受影响。',
      confirmText: '退出',
      danger: true,
    })
    if (!ok) return
    actions.exitInvite.mutate(undefined, {
      onSuccess: () => {
        toast('已退出邀请关系', 'success')
        void session.refetch()
      },
    })
  }

  return (
    <>
      <PageHeader
        crumb={['账号', TABS.find((t) => t.key === tab)?.label ?? '资料']}
        title={user?.pseudonym || user?.username || '账号'}
        hint={user ? `#${user.user_id}` : undefined}
        tools={
          <>
            {user && !user.is_can_upload ? <span className="head-note">无上传权限</span> : null}
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
              secondary
            />
            <StatCard label="片单槽位" value={user.slot_remaining} unit="个可用" note="可用胡萝卜兑换" secondary />
          </section>

          <section className="cards cards--wide">
            <ClientLoginCard
              token={token}
              passwordMode={otpMode}
              password={user.password ?? null}
              servers={[
                ['视频服', user.server_video],
                ['直播服', user.server_live],
                ['音乐服', user.server_music],
              ]}
            />
          </section>

          <section className="cards cards--wide">
            <DevicesCard />
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <CardHead title="账号设置" />

              <div style={{ display: 'grid', gap: 16, marginTop: 12, maxWidth: 560 }}>
                <label className="field">
                  <span>笔名</span>
                  <div className="row-input">
                    <input className="input" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} placeholder="对外显示的名字" />
                    <button type="button"
                      className="btn btn--ghost"
                      // 空笔名会被 buildUrl 丢掉 name 参数，后端只回一个没信息的 422
                      disabled={
                        actions.setPseudonym.isPending ||
                        !pseudonym.trim() ||
                        pseudonym.trim() === (user.pseudonym ?? '')
                      }
                      title={pseudonym.trim() ? undefined : '笔名不能为空'}
                      onClick={() =>
                        actions.setPseudonym.mutate(pseudonym.trim(), {
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
                    <button type="button"
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
                    <button type="button"
                      className="btn btn--ghost"
                      onClick={() =>
                        actions.agreeUpload.mutate(undefined, { onSuccess: () => toast('已开启上传权限', 'success') })
                      }
                    >
                      同意上传协议并开通
                    </button>
                  ) : null}
                  {!caps.canDown ? (
                    <button type="button"
                      className="btn btn--ghost"
                      onClick={() => actions.agreeDown.mutate(undefined, { onSuccess: () => toast('已开启下载权限', 'success') })}
                    >
                      同意下载协议并开通
                    </button>
                  ) : null}
                  <button type="button"
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
                  {otpMode ? (
                    <button type="button"
                      className="btn btn--ghost"
                      disabled={actions.temporaryPassword.isPending}
                      onClick={() =>
                        actions.temporaryPassword.mutate(undefined, {
                          onSuccess: (res) => setPassword(res),
                        })
                      }
                    >
                      {actions.temporaryPassword.isPending ? '获取中…' : '获取动态密码'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn--ghost" onClick={() => setResetting(true)}>
                      重置登录密码
                    </button>
                  )}
                </div>

                {password ? (
                  <p className="state__hint note-left">
                    {password.password ? (
                      <>
                        动态密码 <b style={{ color: 'var(--fg)', letterSpacing: '0.14em' }}>{password.password}</b>，{password.second} 秒内有效。
                      </>
                    ) : (
                      <>这个账号用的是固定密码，不需要动态密码。</>
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
              <CardHead title="邀请用户" />
              <div className="row-input" style={{ marginTop: 12 }}>
                <input className="input" placeholder="用户 ID（e 开头 s 结尾）" value={inviteId} onChange={(e) => setInviteId(e.target.value)} />
                <button type="button" className="btn btn--primary" onClick={() => setInviting(true)} disabled={!inviteId.trim()}>
                  邀请
                </button>
                <button type="button"
                  className="btn btn--ghost"
                  disabled={!inviteId.trim() || actions.inviteEmps.isPending}
                  onClick={() => void inviteEmps()}
                >
                  {actions.inviteEmps.isPending ? '邀请中…' : '邀请进 EMOS'}
                </button>
              </div>
              <div className="row" style={{ marginTop: 12, gap: 12 }}>
                <button type="button" className="btn btn--danger-text" onClick={() => void exitInvite()}>
                  退出邀请关系
                </button>
                <span className="card-note">退出后要重新找人邀请</span>
              </div>
            </article>
          </section>

          {myTree.length > 0 ? (
            <section className="cards cards--wide">
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
                            <button type="button"
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
                            <button type="button"
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
                  <p className="card-note stack--top">
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
              <button type="button" className="btn btn--ghost" onClick={() => setRemarkFor(null)}>
                取消
              </button>
              <button type="button"
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
          title="重置登录密码"
          hint="6 位数字。重置后所有已登录设备需要重新登录。"
          onClose={() => setResetting(false)}
          onSubmit={() => {
            if (/^\d{6}$/.test(newPassword) && !actions.resetPassword.isPending) actions.resetPassword.mutate(newPassword)
          }}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setResetting(false)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={!/^\d{6}$/.test(newPassword) || actions.resetPassword.isPending}
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
                {actions.resetPassword.isPending ? '重置中…' : '重置'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>新密码</span>
            <input
              className="input tnum"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
              placeholder="6 位数字"
              autoFocus
            />
            <span className="card-note">{newPassword.length}/6</span>
          </label>
        </Modal>
      ) : null}

      {info.error || tree.error || inviteHistory.error ? (
        <p className="card-note">
          邀请数据没取全：
          {(info.error ?? tree.error ?? inviteHistory.error)?.message ?? '请稍后重试'}
          <button
            type="button"
            className="btn btn--quiet"
            style={{ marginLeft: 'var(--sp-2)' }}
            onClick={() => {
              void info.refetch()
              void tree.refetch()
              void inviteHistory.refetch()
            }}
          >
            重试
          </button>
        </p>
      ) : null}

      {inviting ? (
        <Modal
          title="邀请用户"
          hint="邀请名额有限，撤销邀请会返还名额。"
          onClose={() => setInviting(false)}
          onSubmit={() => { if (inviteId.trim() && !actions.invite.isPending) actions.invite.mutate({ id: inviteId.trim(), remark: inviteRemark.trim() }) }}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setInviting(false)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={!inviteId.trim() || actions.invite.isPending}
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
