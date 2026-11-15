import { useEffect, useState } from 'react'
import { CardHead } from '@/components/CardHead'
import { ConsentDialog } from '@/components/ConsentDialog'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useAccountMutations, useCapabilities, useSession } from '@/api/queries'

/**
 * 账号设置：笔名、两个显示开关、Telegram 绑定、权限与槽位、动态/固定密码入口。
 *
 * 笔名草稿、动态密码结果都只服务这张卡；页面只保留「打开重置密码弹窗」这个动作。
 */
export function AccountSettingsCard({ onResetPassword }: { onResetPassword: () => void }) {
  const session = useSession()
  const caps = useCapabilities()
  const actions = useAccountMutations()

  const user = session.data
  /** must_otp 决定动态/固定密码二选一 */
  const otpMode = Boolean(user?.must_otp)
  const [pseudonym, setPseudonym] = useState('')
  const [password, setPassword] = useState<{ password: number | null; second: number } | null>(null)
  const [consent, setConsent] = useState<'upload' | 'download' | null>(null)

  useEffect(() => {
    if (session.data) setPseudonym(session.data.pseudonym ?? '')
  }, [session.data?.pseudonym])

  if (!user) return null

  return (
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
                    checked={user.is_show_adult}
                    disabled={actions.toggleShowAdult.isPending}
                    onChange={() =>
                      actions.toggleShowAdult.mutate(undefined, {
                        onSuccess: (res) => toast(res.is_show_adult ? '已显示成人内容' : '已隐藏成人内容', 'success'),
                      })
                    }
                  />
                  显示成人内容
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
                    <button type="button" className="btn btn--ghost" onClick={() => setConsent('upload')}>
                      开通上传权限
                    </button>
                  ) : null}
                  {!caps.canDown ? (
                    <button type="button" className="btn btn--ghost" onClick={() => setConsent('download')}>
                      开通下载权限
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
                    <button type="button" className="btn btn--ghost" onClick={() => onResetPassword()}>
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
      {consent ? <ConsentDialog kind={consent} onClose={() => setConsent(null)} /> : null}
    </article>
  )
}
