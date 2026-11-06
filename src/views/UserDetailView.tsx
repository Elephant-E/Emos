import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/StateBlock'
import { useAccountMutations, useBanList, useUserInvite, useUserPayInfo } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatRelative, formatSize } from '@/lib/format'

export function UserDetailView({ userId }: { userId: string }) {
  const pay = useUserPayInfo(userId)
  const invite = useUserInvite(userId)
  const bans = useBanList()
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
            <Link className="btn btn--ghost" to="/account" search={{ tab: 'ban' }}>
              封禁列表
            </Link>
            {banned ? (
              <button
                className="btn btn--ghost"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: `解除 ${name || userId} 的封禁？`,
                    message: banned.disable_reason ? `原因：${banned.disable_reason}` : undefined,
                    hint: '解除后对方可以立即恢复访问。',
                    confirmText: '解除',
                  })
                  if (!ok) return
                  actions.banChange.mutate({ type: 'enable', userId }, { onSuccess: () => toast('已解除封禁', 'success') })
                }}
              >
                解除封禁
              </button>
            ) : (
              <button
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

      {pay.error ? <ErrorBlock error={pay.error as Error & { status?: number }} onRetry={() => pay.refetch()} /> : null}

      {limited ? (
        <p className="card-note" style={{ marginTop: 4 }}>
          当前账号没有服务商权限，看不到余额、观影权限与注册时间。<Link to="/pay" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>申请成为服务商</Link>后可看全。
        </p>
      ) : null}

      {(
        <>
          <section className="cards" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <article className="card card--stat">
              <p className="stat__label">账号状态</p>
              <p className="stat__value" style={{ color: banned ? 'var(--c-red)' : undefined }}>
                {banned ? '已封禁' : '正常'}
              </p>
              <p className="stat__delta stat__delta--quiet">
                {banned ? `于 ${formatRelative(banned.created_at)} 封禁` : bans.isLoading ? '检查中…' : '不在封禁名单里'}
              </p>
            </article>

            <article className="card card--stat">
              <p className="stat__label">胡萝卜</p>
              <p className="stat__value">
                —
                <small>个</small>
              </p>
              <p className="stat__delta stat__delta--quiet">需要服务商权限</p>
            </article>

            <article className="card card--stat">
              <p className="stat__label">上传量</p>
              <p className="stat__value">{info ? formatSize(info.size_upload).replace(/\s/g, '') : '—'}</p>
              <p className="stat__delta stat__delta--quiet">累计入库体积</p>
            </article>

            <article className="card card--stat">
              <p className="stat__label">邀请关系</p>
              <p className="stat__value">{invited ? '由我邀请' : '—'}</p>
              <p className="stat__delta stat__delta--quiet">
                {invited ? `加入于 ${formatDateTime(String(invited.join_at))}` : '没有邀请记录'}
              </p>
            </article>
          </section>

          <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="card">
              <div className="card-head">
                <p className="stat__label" style={{ margin: 0 }}>资料</p>
              </div>
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
                    <dd>{info?.invite_user_id ?? banned?.invite_pseudonym ?? '—'}</dd>
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
              <div className="card-head">
                <p className="stat__label" style={{ margin: 0 }}>最近活跃</p>
                <Link className="btn btn--quiet" to="/account" search={{ tab: 'invite' }}>
                  邀请记录
                </Link>
              </div>
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
        </>
      )}
    </>
  )
}
