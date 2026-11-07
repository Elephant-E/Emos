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

  const rows = (list.data ?? []) as Row[]

  return (
    <>
      <PageHeader crumb={['悄悄话', tab === 'receiver' ? '收到的' : '发出的']} title="悄悄话" hint={list.data ? `${rows.length} 条` : undefined} />

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
        <EmptyBlock title={tab === 'receiver' ? '还没有收到悄悄话' : '还没有发出过悄悄话'} hint="悄悄话在客户端或机器人里发起。" />
      ) : null}

      {rows.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>内容</th>
                <th style={{ width: '18%' }}>{tab === 'receiver' ? '来自' : '发给'}</th>
                <th style={{ width: '18%' }}>时间</th>
                <th className="cell-right" style={{ width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = Number(row.whisper_id ?? index)
                const peerUser = (row.sender_user ?? row.receiver_user) as { username?: string; id?: string } | undefined
                const peer = peerUser?.username ?? '—'
                const body = tab === 'receiver' ? row.sender_content : row.receiver_content
                const reply = tab === 'receiver' ? row.receiver_content : row.sender_content
                return (
                  <tr key={id}>
                    <td>
                      <span className="cell-title__name">{String(body ?? '—')}</span>
                      {reply && reply !== body ? <span className="cell-title__code">回复：{String(reply)}</span> : null}
                    </td>
                    <td className="muted">{String(peer)}</td>
                    <td className="muted tnum">{formatDateTime(String(row.sender_at ?? row.created_at ?? ''))}</td>
                    <td className="cell-right">
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
        <Modal title="回复悄悄话" width={460} onClose={() => setReplyTarget(null)}>
          <div className="stack">
            <p className="card-note">{String(replyTarget.sender_content ?? '')}</p>
            <textarea
              className="input"
              rows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写点什么"
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setReplyTarget(null)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!content.trim() || reply.isPending}
                onClick={() => reply.mutate({ id: Number(replyTarget.whisper_id), content: content.trim() })}
              >
                {reply.isPending ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
