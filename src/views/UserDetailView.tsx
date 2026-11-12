import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CardTable } from '@/components/CardTable'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/StateBlock'
import { useAccountMutations, useBanList, useUserCarrot, useUserInvite, useUserPayInfo, useUserRecords, useUserSign } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatRelative, formatSize, formatThousand } from '@/lib/format'

export function UserDetailView({ userId }: { userId: string }) {
  const pay = useUserPayInfo(userId)
  const carrot = useUserCarrot(userId)
  const sign = useUserSign(userId)
  const [notify, setNotify] = useState<{ subject: string; body: string } | null>(null)
  const invite = useUserInvite(userId)
  const bans = useBanList()
  const records = useUserRecords(userId)
  const actions = useAccountMutations()

  const info = pay.data ?? null
  const invited = invite.data ?? null
  const banned = (bans.data ?? []).find((row) => row.user_id === userId) ?? null
  const limited = pay.isSuccess && !info
  const name = info?.username ?? banned?.username ?? String(invited?.username ?? '') ?? ''

  return (
    <>
      <PageHeader
        crumb={['用户', userId]}
        title={name || '用户详情'}
        hint={`#${userId}`}
        tools={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setNotify({ subject: '', body: '' })}
            >
              发邮件通知
            </button>
            <Link className="btn btn--ghost" to="/users">
              封禁列表
            </Link>
            {banned ? (
              <button type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: `解除 ${name || userId} 的封禁？`,
                    message: banned.disable_reason ? `原因：${banned.disable_reason}` : undefined,
                    hint: '解除后对方可以立即恢复访问。',
                    confirmText: '解除',
                  })
                  if (!ok) return
                  actions.banChange.mutate({ type: 'unblock', userId }, { onSuccess: () => toast('已解除封禁', 'success') })
                }}
              >
                解除封禁
              </button>
            ) : (
              <button type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: `封禁 ${name || userId}？`,
                    message: '该用户将无法继续访问服务。',
                    hint: '可在封禁列表里随时解除。',
                    confirmText: '封禁',
                    danger: true,
                  })
                  if (!ok) return
                  actions.banChange.mutate(
                    { type: 'disable', userId, reason: '后台手动封禁' },
                    { onSuccess: () => toast('已封禁', 'success') },
                  )
                }}
              >
                封禁
              </button>
            )}
          </>
        }
      />

      {pay.error ? <ErrorBlock error={pay.error} onRetry={() => pay.refetch()} /> : null}

      {limited ? (
        <p className="card-note" style={{ marginTop: 4 }}>
          当前账号没有服务商权限，看不到余额、观影权限与注册时间。<Link to="/pay" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>申请成为服务商</Link>后可看全。
        </p>
      ) : null}

      {/* 无服务商权限时 pay 取不到，多数指标显示「—」；封禁状态、邀请关系来自其它接口，
          照常渲染，权限缺口只留在上面的提示里 */}
      <section className="cards cards--4">
        <StatCard
          label="账号状态"
          word
          tone={banned ? 'danger' : undefined}
          value={bans.isLoading ? '检查中' : bans.error ? '—' : banned ? '已封禁' : '未在封禁记录'}
          note={
            bans.error ? (
              <>
                封禁状态取不到
                <button type="button" className="btn btn--quiet" onClick={() => void bans.refetch()}>
                  重试
                </button>
              </>
            ) : banned ? (
              `该账号注册于 ${formatRelative(banned.created_at)}`
            ) : bans.isLoading ? (
              '正在核对封禁列表'
            ) : (
              '未出现在封禁列表中'
            )
          }
        />

        <StatCard
          label="签到"
          value={sign.data ? `${sign.data.continuous_days} 天` : '—'}
          note={
            sign.data
              ? `最近签到 ${formatRelative(sign.data.sign_at)} · 本次 +${sign.data.earn_point}`
              : sign.isLoading
                ? '读取中'
                : '需要服务商权限'
          }
          secondary
        />

        <StatCard
          label="胡萝卜"
          value={carrot.data == null ? '—' : formatThousand(Number(carrot.data))}
          unit="个"
          note={carrot.data == null ? '需要服务商权限' : '当前余额'}
        />

        <StatCard
          label="上传量"
          value={info ? formatSize(info.size_upload).replace(/\s/g, '') : '—'}
          note="累计入库体积"
          secondary
        />

        <StatCard
          label="邀请关系"
          word
          value={invited ? '由我邀请' : '—'}
          note={invited ? `加入于 ${formatDateTime(String(invited.join_at))}` : '没有邀请记录'}
        />
      </section>

      <section className="cards cards--2">
        <article className="card">
          <CardHead title="资料">
          </CardHead>
          <div className="card-body">
            <dl className="kv">
              <div>
                <dt>用户 ID</dt>
                <dd className="tnum">{userId}</dd>
              </div>
              <div>
                <dt>用户名</dt>
                <dd>{name || '—'}</dd>
              </div>
              <div>
                <dt>Telegram</dt>
                <dd>{info?.telegram_user_id ?? banned?.telegram_user_id ?? '—'}</dd>
              </div>
              <div>
                <dt>邀请人</dt>
                <dd>{banned?.invite_pseudonym ?? info?.invite_user_id ?? '—'}</dd>
              </div>
              <div>
                <dt>注册时间</dt>
                <dd>{info ? formatDateTime(info.created_at) : '—'}</dd>
              </div>
              {banned ? (
                <div>
                  <dt>封禁原因</dt>
                  <dd style={{ color: 'var(--c-red)' }}>{banned.disable_reason ?? '—'}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </article>

        <article className="card">
          <CardHead title="最近活跃">
            <Link className="btn btn--quiet" to="/account" search={{ tab: 'invite' }}>
              邀请记录
            </Link>
          </CardHead>
          <div className="card-body">
            <dl className="kv">
              <div>
                <dt>邀请时间</dt>
                <dd>{invited ? formatDateTime(String(invited.invite_at)) : invite.isLoading ? '读取中…' : '—'}</dd>
              </div>
              <div>
                <dt>最近播放</dt>
                <dd>{invited ? formatDateTime(invited.last_video_player as string) : '—'}</dd>
              </div>
              <div>
                <dt>最近签到</dt>
                <dd>{invited ? formatDateTime(invited.last_user_sign as string) : '—'}</dd>
              </div>
              <div>
                <dt>最近 Telegram</dt>
                <dd>{invited?.last_telegram_message ? formatDateTime(String(invited.last_telegram_message)) : '—'}</dd>
              </div>
            </dl>
          </div>
        </article>
      </section>

      <section className="cards cards--wide">
        <article className="card">
          {/* /api/video/record/request 对 admin 忽略 user_id（实测传不存在的 id 也回全站 62 条），
              所以这里展示的是全站最近播放，不能标成「该用户」 */}
          <CardHead title="最近播放">
            <span className="muted tnum-sm">近一周 · 全站</span>
          </CardHead>
          <CardTable
            loading={records.isLoading}
            error={records.error}
            onRetry={() => records.refetch()}
            empty="近一周没有播放记录"
            count={(records.data?.items ?? []).length}
            loadingRows={3}
            loadingCols={4}
          >
            <table className="table table--inset">
              <thead>
                <tr>
                  <th>影片</th>
                  <th style={{ width: 150 }}>时间</th>
                  <th style={{ width: 140 }}>来源 IP</th>
                  <th style={{ width: 180 }}>客户端</th>
                </tr>
              </thead>
              <tbody>
                {(records.data?.items ?? []).map((row, index) => (
                  <tr key={`${String(row.video_media_id)}-${index}`}>
                    <td>
                      <Link
                        to="/media/$videoId"
                        params={{ videoId: String(row.video_id) }}
                        search={{ season: 0, episode: 1 }}
                        className="cell-title__name"
                        style={{ color: 'var(--fg)' }}
                      >
                        {String(row.video_title ?? '—')}
                      </Link>
                      <span className="cell-title__code">{String(row.video_media_id ?? '')}</span>
                    </td>
                    <td className="muted">{formatDateTime(String(row.time ?? ''))}</td>
                    <td className="muted tnum">
                      {String(row.ip ?? '—')}
                      {row.is_proxy ? ' · 代理' : ''}
                    </td>
                    <td className="muted ellipsis">{String(row.ua ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardTable>
        </article>
      </section>
    
      {notify ? (
        <Modal
          title={`发邮件通知 · ${name || userId}`}
          width={520}
          onClose={() => setNotify(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setNotify(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!notify.subject.trim() || !notify.body.trim() || actions.notifyEmail.isPending}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: '发送这封通知？',
                    message: '会从余额里扣 10 胡萝卜。',
                    hint: '收件用户在账号页绑定了邮箱才会收到。',
                    confirmText: '发送',
                  })
                  if (!ok) return
                  actions.notifyEmail.mutate(
                    { user_id: userId, subject: notify.subject.trim(), body: notify.body.trim() },
                    {
                      onSuccess: () => {
                        toast('已发送', 'success')
                        setNotify(null)
                      },
                    },
                  )
                }}
              >
                {actions.notifyEmail.isPending ? '发送中…' : '发送'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>主题</span>
            <input
              className="input"
              maxLength={100}
              value={notify.subject}
              onChange={(e) => setNotify({ ...notify, subject: e.target.value })}
              autoFocus
            />
          </label>
          <label className="field">
            <span>正文</span>
            <textarea
              className="input"
              rows={6}
              value={notify.body}
              onChange={(e) => setNotify({ ...notify, body: e.target.value })}
            />
          </label>
        </Modal>
      ) : null}
</>
  )
}
