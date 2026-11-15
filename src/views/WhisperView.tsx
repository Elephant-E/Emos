import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Tabs } from '@/components/Tabs'
import { ModalFooter } from '@/components/ModalFooter'
import { qk } from '@/api/queries'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { whisperApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { formatDateTime } from '@/lib/format'

type Row = Record<string, unknown>

/**
 * 正文最多两行：`.table tbody td` 是 nowrap，一条长悄悄话会把整行撑到几千 px 并出现横向滚动，
 * 因此用内联样式收住。
 */
const CLAMP_TWO_LINES: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
}

function useWhispers(tab: 'receiver' | 'sender') {
  return useQuery({
    queryKey: ['whisper', tab] as const,
    queryFn: () => (tab === 'receiver' ? whisperApi.receiver() : whisperApi.sender()),
    staleTime: 30_000,
  })
}

export interface WhisperSearch {
  tab: 'receiver' | 'sender'
}

const WHISPER_TABS = [
  { key: 'receiver', label: '收到的' },
  { key: 'sender', label: '发出的' },
] as const

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
      qc.invalidateQueries({ queryKey: qk.whisper })
      toast('已回复', 'success')
      setReplyTarget(null)
      setContent('')
    },
  })

  const create = useMutation({
    mutationFn: (payload: { receiver_user_id: string; content: string }) => whisperApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.whisper })
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
          <button type="button" className="btn btn--primary" onClick={() => setComposing(true)}>
            发起
          </button>
        }
      />

      <div className="toolbar">
        <Tabs items={WHISPER_TABS} value={tab} onChange={onTab} label="悄悄话方向" />
      </div>

      {list.error ? <ErrorBlock error={list.error} onRetry={() => list.refetch()} /> : null}
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
                {/* 整表不可操作（发出的页只能看）就连这一列一起不渲染 */}
                {tab === 'receiver' ? <th style={{ width: '120px' }}>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = Number(row.whisper_id ?? index)
                // 收到的看「谁发的」，发出的看「发给谁」
                const peerUser = (
                  tab === 'receiver' ? row.sender_user : row.receiver_user
                ) as { username?: string; id?: string } | undefined
                const peer = peerUser?.username ?? '—'
                // 字段按角色命名，不随视角变：sender_content 永远是发起方写的，
                // receiver_content 永远是接收方写的
                const body = row.sender_content
                const reply = row.receiver_content
                return (
                  <tr key={id}>
                    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      <span className="cell-title__name" style={CLAMP_TWO_LINES} title={String(body ?? '—')}>
                        {String(body ?? '—')}
                      </span>
                      {reply && reply !== body ? (
                        <span className="cell-title__code" style={CLAMP_TWO_LINES} title={String(reply)}>
                          回复：{String(reply)}
                        </span>
                      ) : null}
                    </td>
                    <td className="muted">
                      {/* 收件箱判匿名看 sender_user 是否为空（该端点没有 sender_is_anonymous）；
                          发件箱这一列是收件人，与匿名无关 */}
                      {tab === 'receiver' && !row.sender_user ? '匿名' : String(peer)}
                    </td>
                    <td className="muted tnum">{formatDateTime(String(row.sender_at ?? row.created_at ?? ''))}</td>
                    {tab === 'receiver' ? (
                      <td>
                        <button type="button"
                          className="btn btn--quiet"
                          onClick={() => {
                            setReplyTarget(row)
                            setContent('')
                          }}
                        >
                          回复
                        </button>
                      </td>
                    ) : null}
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
            <ModalFooter
              onCancel={() => setReplyTarget(null)}
              submit
              confirmText="发送"
              pending={reply.isPending}
              disabled={!content.trim()}
            />
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
            <ModalFooter
              onCancel={() => setComposing(false)}
              onConfirm={() => create.mutate({ receiver_user_id: composeTo.trim(), content: composeBody.trim() })}
              confirmText="发送"
              pending={create.isPending}
              disabled={!composeTo.trim() || !composeBody.trim()}
            />
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
