import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Tabs } from '@/components/Tabs'
import { ModalFooter } from '@/components/ModalFooter'
import { qk } from '@/api/queries'
import { PageHeader } from '@/components/PageHeader'
import { RecordRow } from '@/components/RecordRow'
import { ListSection } from '@/components/ListSection'
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
        <ListSection
          isLoading={list.isLoading}
          error={list.error}
          onRetry={() => list.refetch()}
          items={rows}
          bare
          loadingKind="rows"
        loadingPoster="none"
        loadingLines={3}
        loadingActions={1}
          loadingRows={5}
          emptyTitle={tab === 'receiver' ? '还没有收到悄悄话' : '还没有发出过悄悄话'}
        >
          <RecordRow
            rows={rows}
            idKey={(row) => String(row.whisper_id ?? '')}
            wrapTitle
            title={(row) => String(row.sender_content ?? '—')}
            meta={(row) => {
              const peerUser = (tab === 'receiver' ? row.sender_user : row.receiver_user) as
                | { username?: string; id?: string }
                | undefined
              // 收件箱判匿名看 sender_user 是否为空（该端点没有 sender_is_anonymous）
              const peer = tab === 'receiver' && !row.sender_user ? '匿名' : String(peerUser?.username ?? '—')
              return (
                <>
                  <span>{tab === 'receiver' ? `来自 ${peer}` : `发给 ${peer}`}</span>
                  <span>{formatDateTime(String(row.sender_at ?? row.created_at ?? ''))}</span>
                </>
              )
            }}
            facts={(row) =>
              row.receiver_content && row.receiver_content !== row.sender_content ? (
                <span className="ellipsis">回复：{String(row.receiver_content)}</span>
              ) : null
            }
            actions={
              tab === 'receiver'
                ? (row) => (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => {
                        setReplyTarget(row)
                        setContent('')
                      }}
                    >
                      回复
                    </button>
                  )
                : undefined
            }
          />
        </ListSection>
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
