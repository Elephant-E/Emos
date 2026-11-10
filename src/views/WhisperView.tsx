import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { whisperApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatDateTime } from '@/lib/format'

type Row = Record<string, unknown>

function useWhispers(tab: 'receiver' | 'sender') {
  return useQuery({
    queryKey: ['whisper', tab] as const,
    queryFn: () => (tab === 'receiver' ? whisperApi.receiver() : whisperApi.sender()),
    staleTime: 30_000,
  })
}

export function WhisperView({ tab, onTab }: { tab: 'receiver' | 'sender'; onTab: (tab: 'receiver' | 'sender') => void }) {
  const qc = useQueryClient()
  const list = useWhispers(tab)
  const [replyTarget, setReplyTarget] = useState<Row | null>(null)
  const [composing, setComposing] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [content, setContent] = useState('')

  const reply = useMutation({
    mutationFn: (payload: { id: number; content: string }) => whisperApi.reply(payload.id, payload.content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whisper'] })
      toast('已回复', 'success')
      setReplyTarget(null)
      setContent('')
    },
  })

  const create = useMutation({
    mutationFn: (payload: { receiver_user_id: string; content: string }) => whisperApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whisper'] })
      toast('已发起', 'success')
      setComposing(false)
      setComposeTo('')
      setComposeBody('')
    },
  })

  const rows = (list.data ?? []) as Row[]

  return (
    <>
      <PageHeader
        crumb={['悄悄话', tab === 'receiver' ? '收到的' : '发出的']}
        title="悄悄话"
        hint={list.data ? `${rows.length} 条` : undefined}
        tools={
          <button className="btn btn--primary" onClick={() => setComposing(true)}>
            发起
          </button>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" aria-selected={tab === 'receiver'} onClick={() => onTab('receiver')}>
            收到的
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'sender'} onClick={() => onTab('sender')}>
            发出的
          </button>
        </div>
      </div>

      {list.error ? <ErrorBlock error={list.error as Error & { status?: number }} onRetry={() => list.refetch()} /> : null}
      {list.isLoading ? <LoadingBlock rows={6} columns={3} /> : null}

      {!list.isLoading && !list.error && rows.length === 0 ? (
        <EmptyBlock title={tab === 'receiver' ? '还没有收到悄悄话' : '还没有发出过悄悄话'} />
      ) : null}

      {rows.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>内容</th>
                <th style={{ width: '18%' }}>{tab === 'receiver' ? '来自' : '发给'}</th>
                <th style={{ width: '18%' }}>时间</th>
                <th style={{ width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = Number(row.whisper_id ?? index)
                // 收到的看「谁发的」，发出的看「发给谁」——原来无条件先取 sender_user，
                // 于是发件箱里每个人都是自己
                const peerUser = (
                  tab === 'receiver' ? row.sender_user : row.receiver_user
                ) as { username?: string; id?: string } | undefined
                const peer = peerUser?.username ?? '—'
                // 字段按角色命名，不随视角变：sender_content 永远是发起方写的，
                // receiver_content 永远是接收方写的。sender tab 之前取反了，
                // 结果「发出的」页把对方的回复当正文、把自己的话标成「回复：」。
                const body = row.sender_content
                const reply = row.receiver_content
                return (
                  <tr key={id}>
                    <td>
                      <span className="cell-title__name">{String(body ?? '—')}</span>
                      {reply && reply !== body ? <span className="cell-title__code">回复：{String(reply)}</span> : null}
                    </td>
                    <td className="muted">
                      {row.sender_is_anonymous ? '匿名' : String(peer)}
                    </td>
                    <td className="muted tnum">{formatDateTime(String(row.sender_at ?? row.created_at ?? ''))}</td>
                    <td>
                      {tab === 'receiver' ? (
                        <button
                          className="btn btn--quiet"
                          onClick={() => {
                            setReplyTarget(row)
                            setContent('')
                          }}
                        >
                          回复
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {replyTarget ? (
        <Modal
          title="回复悄悄话"
          width={460}
          onClose={() => setReplyTarget(null)}
          onSubmit={() => {
            if (content.trim() && !reply.isPending) reply.mutate({ id: Number(replyTarget.whisper_id), content: content.trim() })
          }}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setReplyTarget(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                type="submit"
                disabled={!content.trim() || reply.isPending}
              >
                {reply.isPending ? '发送中…' : '发送'}
              </button>
            </>
          }
        >
          <div className="stack">
            <p className="card-note">{String(replyTarget.sender_content ?? '')}</p>
            <textarea
              className="input"
              rows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写点什么"
            />
          </div>
        </Modal>
      ) : null}

      {composing ? (
        <Modal
          title="发起悄悄话"
          onClose={() => setComposing(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setComposing(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!composeTo.trim() || !composeBody.trim() || create.isPending}
                onClick={() => create.mutate({ receiver_user_id: composeTo.trim(), content: composeBody.trim() })}
              >
                发送
              </button>
            </>
          }
        >
          <label className="field">
            <span>接收者用户 ID</span>
            <input className="input" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="e1000Xs" autoFocus />
          </label>
          <label className="field">
            <span>内容</span>
            <textarea
              className="input"
              style={{ minHeight: 100 }}
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
            />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
