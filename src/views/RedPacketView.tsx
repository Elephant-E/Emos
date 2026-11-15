import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { UserCell } from '@/components/UserCell'
import { CardHead } from '@/components/CardHead'
import { Tabs } from '@/components/Tabs'
import { Pager } from '@/components/Pager'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { toast } from '@/ui/toast'
import { redPacketApi } from '@/api/endpoints'
import { useSession } from '@/api/queries'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime, formatThousand } from '@/lib/format'
import { uploadTemporary } from '@/lib/uploader'
import type { RedPacketCreateBody } from '@/api/types'

const TABS = [
  { key: 'send' as const, label: '发红包' },
  { key: 'records' as const, label: '领取记录' },
]

export type RedPacketTab = 'send' | 'records'

export interface RedPacketSearch {
  tab: RedPacketTab
  id: string
  page: number
  page_size: number
}

const MAX_COVER = 80 * 1024 * 1024

export function RedPacketView({ search, onSearch }: { search: RedPacketSearch; onSearch: (patch: Partial<RedPacketSearch>) => void }) {
  const qc = useQueryClient()
  const session = useSession()
  const balance = session.data?.carrot ?? 0
  const [type, setType] = useState<'default' | 'password'>('default')
  const [receive, setReceive] = useState<'average' | 'random'>('average')
  const [carrot, setCarrot] = useState('')
  const [number, setNumber] = useState('')
  const [blessing, setBlessing] = useState('')
  const [text, setText] = useState('')
  const [seconds, setSeconds] = useState('86400')
  const [exclusive, setExclusive] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverKind, setCoverKind] = useState<'image' | 'audio' | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [idTerm, setIdTerm] = useState(search.id)

  const records = useQuery({
    queryKey: ['redpacket', 'receive', search.id, search.page, search.page_size] as const,
    queryFn: () => redPacketApi.receive({ red_packet_id: search.id, page: search.page, page_size: search.page_size }),
    enabled: Boolean(search.id),
  })

  const uploadCover = async (file: File) => {
    if (file.size > MAX_COVER) {
      toast('封面不能超过 80MB', 'error')
      return
    }
    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    if (!isImage && !isAudio) {
      toast('封面只支持图片或音频', 'error')
      return
    }
    setCoverBusy(true)
    try {
      // 红包封面走临时上传（temporary.emos.best），不进图库
      const res = await uploadTemporary(file)
      setCoverUrl(res.url)
      setCoverKind(isImage ? 'image' : 'audio')
    } catch (error) {
      toast(error instanceof Error ? error.message : '封面上传失败', 'error')
    } finally {
      setCoverBusy(false)
    }
  }

  const submit = async () => {
    const amount = Number(carrot)
    const count = Number(number)
    if (!Number.isFinite(amount) || amount < 1 || amount > 60000) {
      toast('总金额需在 1 - 60000 胡萝卜之间', 'error')
      return
    }
    if (!Number.isFinite(count) || count < 1 || count > 10000) {
      toast('红包个数需在 1 - 10000 之间', 'error')
      return
    }
    if (count > amount) {
      toast('个数不能多于总金额，否则有人领不到胡萝卜', 'error')
      return
    }
    if (!blessing.trim()) {
      toast('写一句祝福语', 'error')
      return
    }
    if (type === 'password' && !text.trim()) {
      toast('口令红包要填口令', 'error')
      return
    }
    const body: RedPacketCreateBody = {
      type,
      receive,
      carrot: amount,
      number: count,
      blessing: blessing.trim(),
      seconds: Number(seconds) || 86400,
    }
    if (type === 'password') body.text = text.trim()
    if (coverUrl.trim()) {
      body.file_url = coverUrl.trim()
      body.file_type = coverKind ?? (/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(coverUrl) ? 'audio' : 'image')
      if (exclusive) body.is_exclusive = true
    }
    const ok = await confirmDialog({
      title: '确认发红包？',
      message: `从你的余额里划走 ${amount} 胡萝卜，${count} 个人来分。`,
      hint: `当前余额 ${formatThousand(balance)}，发出后剩 ${formatThousand(balance - amount)}。`,
      confirmText: '发出去',
    })
    if (!ok) return
    setSending(true)
    try {
      const res = await redPacketApi.create(body)
      setCreated(res.red_packet_id)
      toast('红包已发出', 'success')
      setCarrot('')
      setNumber('')
      setBlessing('')
      setText('')
      setCoverUrl('')
      setCoverKind(null)
      setExclusive(false)
      void qc.invalidateQueries({ queryKey: ['session'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '发送失败', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader crumb={['运营', '红包']} title="红包" hint="发胡萝卜红包给站内用户" />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab })} label="红包" />
      </div>

      {search.tab === 'send' ? (
        <>
          {created ? (
            <div className="table-card" style={{ marginBottom: 18 }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>红包已发出</span>
                <b className="tnum">{created}</b>
                <button type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    void navigator.clipboard?.writeText(created)
                    toast('已复制红包 ID', 'success')
                  }}
                >
                  复制 ID
                </button>
                <button type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    onSearch({ tab: 'records', id: created, page: 1 })
                    setIdTerm(created)
                  }}
                >
                  看领取记录
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => setCreated(null)}>
                  再发一个
                </button>
              </div>
            </div>
          ) : null}

          <section className="cards cards--form">
            <article className="card">
              <CardHead title="红包" />
              <div className="card-body stack">
                <div className="field-row">
                  <label className="field">
                    <span>类型</span>
                    <div className="seg" role="group" aria-label="红包类型">
                      <button type="button" aria-pressed={type === 'default'} onClick={() => setType('default')}>
                        普通
                      </button>
                      <button type="button" aria-pressed={type === 'password'} onClick={() => setType('password')}>
                        口令
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    <span>领取方式</span>
                    <div className="seg" role="group" aria-label="领取方式">
                      <button type="button" aria-pressed={receive === 'average'} onClick={() => setReceive('average')}>
                        均分
                      </button>
                      <button type="button" aria-pressed={receive === 'random'} onClick={() => setReceive('random')}>
                        随机
                      </button>
                    </div>
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>总金额（胡萝卜，现有 {formatThousand(balance)}）</span>
                    <input className="input" type="number" min={1} max={60000} value={carrot} onChange={(e) => setCarrot(e.target.value)} placeholder="1 - 60000" />
                  </label>
                  <label className="field">
                    <span>个数</span>
                    <input className="input" type="number" min={1} max={10000} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1 - 10000" />
                  </label>
                </div>

                <label className="field">
                  <span>祝福语</span>
                  <input className="input" maxLength={50} value={blessing} onChange={(e) => setBlessing(e.target.value)} placeholder="50 字内" />
                </label>

                {type === 'password' ? (
                  <label className="field">
                    <span>口令</span>
                    <input className="input" maxLength={50} value={text} onChange={(e) => setText(e.target.value)} placeholder="1 - 50 字符，区分大小写" />
                  </label>
                ) : null}

                <label className="field">
                  <span>有效期</span>
                  <select className="input" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                    <option value="3600">1 小时</option>
                    <option value="21600">6 小时</option>
                    <option value="86400">24 小时</option>
                    <option value="172800">48 小时</option>
                  </select>
                </label>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  {Number(carrot) > balance ? (
                    <span className="muted text-xs">余额不够，最多 {formatThousand(balance)}</span>
                  ) : null}
                  <button type="button"
                    className="btn btn--primary"
                    disabled={sending || (Number(carrot) > 0 && Number(carrot) > balance)}
                    onClick={() => void submit()}
                  >
                    {sending ? '发送中…' : '发红包'}
                  </button>
                </div>
              </div>
            </article>

            <article className="card">
              <CardHead title="封面">
                {coverUrl ? (
                  <button type="button"
                    className="btn btn--quiet"
                    onClick={() => {
                      setCoverUrl('')
                      setCoverKind(null)
                      setExclusive(false)
                    }}
                  >
                    移除
                  </button>
                ) : null}
              </CardHead>
              <div className="card-body" style={{ display: 'grid', gap: 12 }}>
                <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <label className="btn btn--ghost" style={{ cursor: 'pointer' }}>
                    {coverBusy ? '上传中…' : coverUrl ? '换一张' : '上传图片 / 音频'}
                    <input
                      type="file"
                      accept="image/*,audio/*"
                      hidden
                      disabled={coverBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) void uploadCover(file)
                      }}
                    />
                  </label>
                  <input
                    className="input"
                    value={coverUrl}
                    onChange={(e) => {
                      setCoverUrl(e.target.value)
                      setCoverKind(/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(e.target.value) ? 'audio' : 'image')
                    }}
                    placeholder="或直接填一个图片 / 音频的外链"
                    style={{ flex: '1 1 260px' }}
                  />
                </div>
                {coverUrl ? (
                  <label className="field">
                    <span>独占模式</span>
                    <div className="seg" role="group" aria-label="独占模式">
                      <button type="button" aria-pressed={!exclusive} onClick={() => setExclusive(false)}>
                        寄语 + 封面
                      </button>
                      <button type="button" aria-pressed={exclusive} onClick={() => setExclusive(true)}>
                        只显示封面
                      </button>
                    </div>
                  </label>
                ) : null}
              </div>
            </article>
          </section>
        </>
      ) : (
        <>
          <div className="toolbar">
            <label className="toolbar-field">
              <span>红包 ID</span>
              <input className="input" value={idTerm} onChange={(e) => setIdTerm(e.target.value)} placeholder="例如 BLJg3EDpYAno" />
            </label>
            <button type="button" className="btn btn--ghost" onClick={() => onSearch({ id: idTerm.trim(), page: 1 })}>
              查询
            </button>
          </div>

          {!search.id ? (
            <EmptyBlock title="输入红包 ID 查领取记录" />
          ) : records.error ? (
            <ErrorBlock error={records.error} onRetry={() => records.refetch()} />
          ) : records.isLoading ? (
            <LoadingBlock rows={6} columns={4} />
          ) : (records.data?.items.length ?? 0) === 0 ? (
            <EmptyBlock title="还没有人领" />
          ) : (
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th-thumb" style={{ width: '46%' }}>用户</th>
                    <th>用户 ID</th>
                    <th className="num" style={{ width: '14%' }}>胡萝卜</th>
                    <th style={{ width: '20%' }}>领取时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(records.data?.items ?? []).map((row) => (
                    <tr key={`${row.user_id}-${row.receive_at}`}>
                      <td>
                        <UserCell name={row.username ?? row.user_id} avatar={row.avatar} />
                      </td>
                      <td className="muted">{row.user_id}</td>
                      <td className="num">+{formatThousand(row.carrot)}</td>
                      <td className="muted">{formatDateTime(row.receive_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 服务端把每页条数固定成 15（契约示例），总页数要用响应里的 page_size 算 */}
              <Pager
                total={records.data?.total ?? 0}
                page={search.page}
                pageSize={records.data?.page_size ?? search.page_size}
                onPage={(page) => onSearch({ page })}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}
