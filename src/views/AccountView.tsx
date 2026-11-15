import { useState } from 'react'
import { ClientLoginCard } from '@/components/account/ClientLoginCard'
import { AccountSettingsCard } from '@/components/account/AccountSettingsCard'
import { InvitePanel } from '@/components/account/InvitePanel'
import { DevicesCard } from '@/components/account/DevicesCard'
import { Tabs } from '@/components/Tabs'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import {
  useAccountMutations,
  useCarrot,
  useSession,
} from '@/api/queries'
import { toast } from '@/ui/toast'
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

  // 网页之外的项目（播放器、脚本、第三方客户端）要直接用这个令牌，所以要在界面上能拿到
  const token = getToken() ?? ''
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')


  const user = session.data

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
              passwordMode={Boolean(user.must_otp)}
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
            <AccountSettingsCard onResetPassword={() => setResetting(true)} />
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
