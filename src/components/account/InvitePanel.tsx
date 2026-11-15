import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CardHead } from '@/components/CardHead'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand } from '@/lib/format'
import { buildInviteRows, pickMySubtree, type InviteHistoryRow } from '@/lib/invite-tree'
import {
  useAccountMutations,
  useCapabilities,
  useInviteHistory,
  useInviteInfo,
  useInviteTree,
  useSession,
} from '@/api/queries'

/**
 * 邀请面板：名额卡、邀请入口、我的邀请表，以及备注/邀请两个弹窗。
 *
 * 这一整块原来混在 AccountView 里和资料、账号设置挤在一起，状态有 5 个、弹窗 2 个、
 * 还带一次全站 3000+ 节点的树计算。拆出来后 AccountView 只按 tab 决定渲染哪块。
 */
export function InvitePanel() {
  const session = useSession()
  const caps = useCapabilities()
  const info = useInviteInfo()
  const tree = useInviteTree()
  const inviteHistory = useInviteHistory(1, 100)
  const actions = useAccountMutations()

  const [inviteId, setInviteId] = useState('')
  const [inviteRemark, setInviteRemark] = useState('')
  const [inviting, setInviting] = useState(false)
  const [remarkFor, setRemarkFor] = useState<{ userId: string; username: string; remark: string } | null>(null)

  const myTree = pickMySubtree(tree.data ?? [], session.data?.user_id)
  const inviteRows = buildInviteRows(
    myTree,
    tree.data ?? [],
    (inviteHistory.data?.items ?? []) as unknown as InviteHistoryRow[],
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
              <div className="row-input" style={{ marginTop: 'var(--stack)' }}>
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
              <div className="row" style={{ marginTop: 'var(--stack)', gap: 'var(--sp-3)' }}>
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
                        <td style={{ paddingLeft: 'var(--pad-card)' + (row.depth - 1) * 20 }}>
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
    </>
  )
}
