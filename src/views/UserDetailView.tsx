import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { CardHead } from '@/components/CardHead'
import { StatCard } from '@/components/StatCard'
import { Modal } from '@/components/Modal'
import { DetailHead } from '@/components/DetailHead'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock, EmptyBlock } from '@/components/StateBlock'
import { useAccountMutations, useSession, useBanList, useUserCarrot, useUserInvite, useUserPayInfo, useUserRecords, useUserSign } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { promptDialog } from '@/ui/prompt'
import { formatDate, formatDateTime, formatRelative, formatSize, formatThousand } from '@/lib/format'

export function UserDetailView({ userId }: { userId: string }) {
  const pay = useUserPayInfo(userId)
  const session = useSession()
  const carrot = useUserCarrot(userId)
  const sign = useUserSign(userId)
  const [notify, setNotify] = useState<{ subject: string; body: string } | null>(null)
  const invite = useUserInvite(userId)
  const bans = useBanList()
  const records = useUserRecords(userId)
  const actions = useAccountMutations()

  const rawInfo = pay.data ?? null
  // 上游对不存在的 user_id 会静默返回「某个人」的资料（实测传 zzzzzzzz 回来的是别人），
  // 这里必须比对返回对象的 user_id，否则会在错误对象上执行封禁这类管理动作
  const mismatch = Boolean(rawInfo?.user_id && rawInfo.user_id !== userId)
  const info = mismatch ? null : rawInfo
  const invited = invite.data ?? null
  const banned = (bans.data ?? []).find((row) => row.user_id === userId) ?? null
  // 只有「上游返回的 user_id 与请求不一致」才算这个 id 不存在。
  // invite/history 是「我邀请过的人」，查不到不代表用户不存在，不能拿它做判据。
  const notFound = mismatch
  const limited = pay.isSuccess && !info && !mismatch
  // 只信「属于这个 id」的数据：info 有 user_id 校验，banned 按 id 过滤，invited 由 hook 精确匹配
  const self = session.data?.user_id === userId
  const name =
    info?.username ??
    (banned?.user_id === userId ? banned.username : undefined) ??
    (invited?.username as string | undefined) ??
    (self ? session.data?.username : undefined) ??
    ''
  // 拿不到任何属于这个 id 的资料（非服务商时 pay 一律 403）→ 不给管理动作
  const known = Boolean(name) && !mismatch

  return (
    <>
      <PageHeader
        crumb={['用户', userId]}
        title={name || '用户详情'}
        hint={`#${userId}`}
        tools={
          notFound || !known ? null : (
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
                disabled={actions.banChange.isPending}
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
                disabled={actions.banChange.isPending}
                onClick={async () => {
                  const reason = await promptDialog({
                    title: `封禁 ${name || userId}`,
                    label: '封禁原因（会显示在封禁列表里）',
                    message: '该用户将无法继续访问服务。',
                    placeholder: '例如：多次上传违规内容',
                    confirmText: '封禁',
                  })
                  if (reason === null) return
                  actions.banChange.mutate(
                    { type: 'disable', userId, reason: reason.trim() || '后台手动封禁' },
                    { onSuccess: () => toast('已封禁', 'success') },
                  )
                }}
              >
                封禁
              </button>
            )}
          </>
          )
        }
      />

      {pay.error ? <ErrorBlock error={pay.error} onRetry={() => pay.refetch()} /> : null}

      {notFound ? (
        <EmptyBlock
          title="没有这个用户"
          hint={`上游对不存在的 ID（#${userId}）会返回别人的资料，所以这里不做任何展示与操作。`}
          action={
            <Link className="btn btn--ghost" to="/users">
              回用户列表
            </Link>
          }
        />
      ) : null}

      {limited ? (
        <p className="card-note" style={{ marginTop: 'var(--sp-1)' }}>
          当前账号没有服务商权限，看不到余额、观影权限与注册时间。<Link to="/pay" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>申请成为服务商</Link>后可看全。
        </p>
      ) : null}

      {/* 详情页头统一形态：左侧头像（图片）、右侧文本与状态 */}
      {known ? (
        <DetailHead
          chips={
            <>
              <span className={`badge ${banned ? 'badge--warn' : 'badge--ok'}`}>
                <i />
                {banned ? '已封禁' : '正常'}
              </span>
              {self ? <span>我自己</span> : null}
              {info?.is_viewing ? <span>在线</span> : null}
            </>
          }
        >
          <p className="detail-head__name">{name}</p>
          <p className="detail-head__meta">
            #{userId}
            {info?.created_at ? ` · ${formatDate(info.created_at)} 注册` : ''}
          </p>
        </DetailHead>
      ) : null}

      {/* 无服务商权限时 pay 取不到，多数指标显示「—」；封禁状态、邀请关系来自其他接口，
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
          secondary
          label="签到"
          value={sign.data ? `${sign.data.continuous_days} 天` : '—'}
          note={
            sign.data
              ? `最近签到 ${formatRelative(sign.data.sign_at)} · 本次 +${sign.data.earn_point}`
              : sign.isLoading
                ? '读取中'
                : '需要服务商权限'
          }
        />

        <StatCard
          label="胡萝卜"
          value={carrot.data == null ? '—' : formatThousand(Number(carrot.data))}
          unit="个"
          note={carrot.data == null ? '需要服务商权限' : '当前余额'}
        />

        <StatCard
          secondary
          label="上传量"
          value={info ? formatSize(info.size_upload).replace(/\s/g, '') : '—'}
          note="累计入库体积"
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
          <ListSection
            isLoading={records.isLoading}
            error={records.error}
            onRetry={() => records.refetch()}
            items={records.data?.items ?? []}
            emptyTitle="近一周没有播放记录"
            loadingKind="rows"
            loadingPoster="none"
            loadingLines={3}
            loadingActions={0}
          >
            <RecordRow
              rows={records.data?.items ?? []}
              idKey={(row) => `${String(row.video_media_id)}-${String(row.time ?? '')}`}
              title={(row) => (
                <Link
                  to="/media/$videoId"
                  params={{ videoId: String(row.video_id) }}
                  search={{ season: 0, episode: 1 }}
                >
                  {String(row.video_title ?? '—')}
                </Link>
              )}
              meta={(row) => <span>{String(row.video_media_id ?? '')}</span>}
              facts={(row) => (
                <>
                  <span>{formatDateTime(String(row.time ?? ''))}</span>
                  <span className="tnum">
                    {String(row.ip ?? '—')}
                    {row.is_proxy ? ' · 代理' : ''}
                  </span>
                  <span className="ellipsis">{String(row.ua ?? '—')}</span>
                </>
              )}
            />
          </ListSection>
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
