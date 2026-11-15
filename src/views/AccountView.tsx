import { useEffect, useState } from 'react'
import { ClientLoginCard } from '@/components/account/ClientLoginCard'
import { InvitePanel } from '@/components/account/InvitePanel'
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
  useSession,
} from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatSize, formatThousand } from '@/lib/format'
import { getToken } from '@/api/client'

type Tab = 'profile' | 'invite'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: '资料' },
  { key: 'invite', label: '邀请' },
]

export function AccountView({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const session = useSession()
  const carrot = useCarrot()
  const actions = useAccountMutations()
  const caps = useCapabilities()

  // 网页之外的项目（播放器、脚本、第三方客户端）要直接用这个令牌，所以要在界面上能拿到
  const token = getToken() ?? ''
  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number | null; second: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')


  useEffect(() => {
    if (session.data) setPseudonym(session.data.pseudonym ?? '')
  }, [session.data?.pseudonym])

  const user = session.data
  /**
   * must_otp 决定动态/固定密码二选一：true 只能取动态密码（account.password 为 null），false 只能用 6 位固定密码。
   * /api/user/* 只有取动态密码与改固定密码两个接口，没有改 must_otp 的。
   */
  const otpMode = Boolean(user?.must_otp)

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
      {tab === 'invite' ? <InvitePanel /> : null}

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

      </div>
    </>
  )
}
