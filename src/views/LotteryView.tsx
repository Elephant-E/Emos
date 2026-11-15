import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { UserCell } from '@/components/UserCell'
import { CardHead } from '@/components/CardHead'
import { Tabs } from '@/components/Tabs'
import { Pager } from '@/components/Pager'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { lotteryApi } from '@/api/endpoints'
import { formatDateTime, formatThousand } from '@/lib/format'
import { copyText } from '@/lib/clipboard'
import type { LotteryCreateBody, LotteryPrize } from '@/api/types'

const TABS = [
  { key: 'create' as const, label: '创建抽奖' },
  { key: 'winners' as const, label: '中奖名单' },
]

export type LotteryTab = (typeof TABS)[number]['key']

export interface LotterySearch {
  tab: LotteryTab
  id: string
}

/** datetime-local 给的是 2026-03-03T15:50，接口要 2026-03-03 15:50:00 */
function toApiTime(value: string): string {
  if (!value) return ''
  const [date, time = '00:00'] = value.split('T')
  return `${date} ${time.length === 5 ? `${time}:00` : time}`
}

const emptyPrize = (): LotteryPrize => ({ name: '', description: '', number: 1, bodys: [] })

export function LotteryView({ search, onSearch }: { search: LotterySearch; onSearch: (patch: Partial<LotterySearch>) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [amount, setAmount] = useState('1')
  const [number, setNumber] = useState('0')
  const [ruleCarrot, setRuleCarrot] = useState('0')
  const [ruleSign, setRuleSign] = useState('0')
  const [prizes, setPrizes] = useState<LotteryPrize[]>([emptyPrize()])
  const [sending, setSending] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [idTerm, setIdTerm] = useState(search.id)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const winners = useQuery({
    queryKey: ['lottery', 'win', search.id] as const,
    queryFn: () => lotteryApi.win(search.id),
    enabled: Boolean(search.id),
    retry: false,
  })

  const patchPrize = (index: number, changes: Partial<LotteryPrize>) =>
    setPrizes((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)))

  const submit = async () => {
    if (!name.trim()) return toast('抽奖要有个名字', 'error')
    if (!timeStart || !timeEnd) return toast('设置开始和结束时间', 'error')
    if (toApiTime(timeEnd) <= toApiTime(timeStart)) return toast('结束时间要晚于开始时间', 'error')
    if (prizes.some((p) => !p.name.trim())) return toast('每个奖品都要有名字', 'error')
    if (prizes.length > 20) return toast('奖品最多 20 个', 'error')
    if (prizes.some((p) => !Number(p.number) || Number(p.number) < 1 || Number(p.number) > 100)) {
      return toast('奖品数量要在 1 – 100 之间', 'error')
    }
    const cost = Number(amount)
    if (!Number.isFinite(cost) || cost < 1 || cost > 50_000) return toast('参与费用要在 1 – 50000 之间', 'error')
    const body: LotteryCreateBody = {
      name: name.trim(),
      description: description.trim() || undefined,
      time_start: toApiTime(timeStart),
      time_end: toApiTime(timeEnd),
      amount: cost,
      number: Number(number) || 0,
      rule_carrot: Number(ruleCarrot) || 0,
      rule_sign: Number(ruleSign) || 0,
      prizes: prizes.map((p) => {
        const bodys = (p.bodys ?? []).map((b) => b.trim()).filter(Boolean)
        return {
          name: p.name.trim(),
          description: p.description?.trim() || null,
          number: Number(p.number),
          // 契约：「存在时需和奖品数量对应」，空数组也算存在
          ...(bodys.length ? { bodys } : {}),
        }
      }),
    }
    const ok = await confirmDialog({
      title: '确认创建抽奖？',
      message: `${body.name}，${body.prizes.length} 个奖品，每人 ${cost} 胡萝卜参与。`,
      hint: body.number ? `满 ${body.number} 人开奖，或到结束时间开奖。` : '到结束时间开奖。',
      confirmText: '创建',
    })
    if (!ok) return
    setSending(true)
    try {
      const res = await lotteryApi.create(body)
      setCreated(res.lottery_id)
      toast('抽奖已创建', 'success')
      void qc.invalidateQueries({ queryKey: ['session'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSending(false)
    }
  }

  const act = async (kind: 'stop' | 'cancel') => {
    const ok = await confirmDialog({
      title: kind === 'stop' ? '现在开奖？' : '取消这次抽奖？',
      message: kind === 'stop' ? '会立刻在已参加的人里抽奖，不能重复开奖。' : '抽奖会被取消，参加费用按后端规则处理。',
      confirmText: kind === 'stop' ? '开奖' : '取消抽奖',
      danger: kind === 'cancel',
    })
    if (!ok) return
    try {
      if (kind === 'stop') await lotteryApi.stop(search.id)
      else await lotteryApi.cancel(search.id)
      toast(kind === 'stop' ? '已开奖' : '已取消', 'success')
      void winners.refetch()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <>
      <PageHeader crumb={['运营', '抽奖']} title="抽奖" hint="创建抽奖，开奖后看中奖名单" />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab })} label="抽奖" />
      </div>

      {search.tab === 'create' ? (
        <>
          {created ? (
            <div className="table-card" style={{ marginBottom: 18 }}>
              <div className="card-body row" style={{ gap: 12 }}>
                <span>抽奖已创建</span>
                <b className="tnum">{created}</b>
                <button type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    void copyText(created, '抽奖 ID')
                    toast('已复制抽奖 ID', 'success')
                  }}
                >
                  复制 ID
                </button>
                <button type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    setIdTerm(created)
                    onSearch({ tab: 'winners', id: created })
                  }}
                >
                  看中奖名单
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => setCreated(null)}>
                  再建一个
                </button>
              </div>
            </div>
          ) : null}

          <section className="cards cards--form">
            <article className="card">
              <CardHead title="抽奖" />
              <div className="card-body stack">
                <label className="field">
                  <span>名称</span>
                  <input className="input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="50 字内" />
                </label>
                <label className="field">
                  <span>简介</span>
                  <input className="input" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="200 字内" />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>开始时间</span>
                    <input className="input" type="datetime-local" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>结束时间</span>
                    <input className="input" type="datetime-local" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>参与费用（胡萝卜）</span>
                    <input className="input" type="number" min={1} max={50000} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>开奖人数（0 = 到点开奖）</span>
                    <input className="input" type="number" min={0} max={5000} value={number} onChange={(e) => setNumber(e.target.value)} />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>参与门槛 · 胡萝卜</span>
                    <input className="input" type="number" min={0} max={50000} value={ruleCarrot} onChange={(e) => setRuleCarrot(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>参与门槛 · 签到天数</span>
                    <input className="input" type="number" min={0} max={5000} value={ruleSign} onChange={(e) => setRuleSign(e.target.value)} />
                  </label>
                </div>

                <CardHead title="奖品">
                  <button
                    type="button"
                    className="btn btn--quiet"
                    disabled={prizes.length >= 20}
                    onClick={() => setPrizes((prev) => [...prev, emptyPrize()])}
                  >
                    加一个
                  </button>
                </CardHead>
                <div className="stack">
                  {prizes.map((prize, index) => (
                    <div key={index} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                      <label className="field" style={{ flex: '1 1 140px' }}>
                        <span>名称</span>
                        <input
                          className="input"
                          maxLength={50}
                          value={prize.name}
                          onChange={(e) => patchPrize(index, { name: e.target.value })}
                          placeholder="奖品名"
                        />
                      </label>
                      <label className="field" style={{ flex: '0 0 88px' }}>
                        <span>数量</span>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={100}
                          value={prize.number}
                          onChange={(e) => patchPrize(index, { number: Number(e.target.value) })}
                        />
                      </label>
                      <label className="field" style={{ flex: '2 1 180px' }}>
                        <span>说明</span>
                        <input
                          className="input"
                          maxLength={200}
                          value={prize.description ?? ''}
                          onChange={(e) => patchPrize(index, { description: e.target.value })}
                          placeholder="怎么兑奖"
                        />
                      </label>
                      {prizes.length > 1 ? (
                        <button type="button"
                          className="btn btn--danger-text"
                          style={{ marginTop: 24 }}
                          onClick={() => setPrizes((prev) => prev.filter((_, i) => i !== index))}
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" className="btn btn--primary" disabled={sending} onClick={() => void submit()}>
                    {sending ? '创建中…' : '创建抽奖'}
                  </button>
                </div>
              </div>
            </article>

            <article className="card">
              <CardHead title="说明" />
              <div className="card-body">
                <p className="card-note">开始与结束时间在一周内，到结束时间无论人数是否达标都会开奖。</p>
              </div>
            </article>
          </section>
        </>
      ) : (
        <>
          <div className="toolbar">
            <label className="toolbar-field">
              <span>抽奖 ID</span>
              <input className="input" value={idTerm} onChange={(e) => setIdTerm(e.target.value)} placeholder="例如 4zwLEpq8P2r1" />
            </label>
            <button type="button"
              className="btn btn--ghost"
              onClick={() => {
                setPage(1)
                onSearch({ id: idTerm.trim() })
              }}
            >
              查询
            </button>
          </div>

          {!search.id ? (
            <EmptyBlock title="输入抽奖 ID 查中奖名单" />
          ) : winners.error ? (
            <ErrorBlock error={winners.error} onRetry={() => winners.refetch()} />
          ) : winners.isLoading ? (
            <LoadingBlock rows={6} columns={4} />
          ) : (
            <>
              <section className="cards cards--wide">
                <article className="card">
                  <CardHead title={winners.data?.lottery_name ?? '抽奖'}>
                    <span className="row" style={{ gap: 8 }}>
                      <button type="button" className="btn btn--quiet" onClick={() => void act('stop')}>
                        手动开奖
                      </button>
                      <button type="button" className="btn btn--danger-text" onClick={() => void act('cancel')}>
                        取消抽奖
                      </button>
                    </span>
                  </CardHead>
                  <div className="card-body">
                    {winners.data?.lottery_description ? (
                      <p className="card-note">{winners.data.lottery_description}</p>
                    ) : null}
                    <dl className="kv stack--top">
                      <div>
                        <dt>时间</dt>
                        <dd className="muted">
                          {formatDateTime(winners.data?.time_start)} → {formatDateTime(winners.data?.time_end)}
                        </dd>
                      </div>
                      <div>
                        <dt>参与费用</dt>
                        <dd>{formatThousand(winners.data?.amount)} 胡萝卜</dd>
                      </div>
                      <div>
                        <dt>开奖人数</dt>
                        <dd className="muted">{winners.data?.number ? `${winners.data.number} 人` : '到点开奖'}</dd>
                      </div>
                      <div>
                        <dt>中奖人数</dt>
                        <dd>{formatThousand(winners.data?.users.length ?? 0)}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              </section>

              {(winners.data?.users.length ?? 0) === 0 ? (
                <EmptyBlock title="还没开奖或没人中奖" />
              ) : (
                <div className="table-card" style={{ marginTop: 18 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th-thumb" style={{ width: '28%' }}>用户</th>
                        <th style={{ width: '24%' }}>奖品</th>
                        <th>说明</th>
                        <th style={{ width: '18%' }}>参加时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(winners.data?.users ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => (
                        <tr key={`${row.user_id}-${row.prize_name}`}>
                          <td>
                            <UserCell name={String(row.user_username ?? '')} avatar={row.user_avatar} />
                          </td>
                          <td>{row.prize_name}</td>
                          <td className="muted">{row.prize_description ?? '—'}</td>
                          <td className="muted">{formatDateTime(row.join_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pager
                    total={winners.data?.users.length ?? 0}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
