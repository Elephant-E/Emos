import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { UserCell } from '@/components/UserCell'
import { Pager } from '@/components/Pager'
import { CardHead } from '@/components/CardHead'
import { Tabs } from '@/components/Tabs'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { toast } from '@/ui/toast'
import { voteApi } from '@/api/endpoints'
import { formatDateTime, formatThousand } from '@/lib/format'
import { copyText } from '@/lib/clipboard'

const TABS = [
  { key: 'create' as const, label: '创建投票' },
  { key: 'result' as const, label: '查看结果' },
]

export type VoteTab = (typeof TABS)[number]['key']

export interface VoteSearch {
  tab: VoteTab
  id: string
}

const MAX_OPTIONS = 12

export function VoteView({ search, onSearch }: { search: VoteSearch; onSearch: (patch: Partial<VoteSearch>) => void }) {
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [seconds, setSeconds] = useState('3600')
  const [revoting, setRevoting] = useState(false)
  const [hideResults, setHideResults] = useState(false)
  const [sending, setSending] = useState(false)
  const [created, setCreated] = useState<{ id: number; timeEnd: string } | null>(null)
  const [idTerm, setIdTerm] = useState(search.id)
  // 结果接口一次返回全部投票人，几百条一屏铺不完，本页分页
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const result = useQuery({
    queryKey: ['vote', 'result', search.id] as const,
    queryFn: () => voteApi.result(search.id),
    enabled: Boolean(search.id),
    retry: false,
  })

  /** 每个选项各几票，以及按选项分组的投票人 */
  const tally = useMemo(() => {
    const counts = new Map<number, number>()
    for (const user of result.data?.users ?? []) {
      const index = Number(user.option_index)
      counts.set(index, (counts.get(index) ?? 0) + 1)
    }
    return counts
  }, [result.data])

  const submit = async () => {
    const filled = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim()) return toast('写个问题', 'error')
    if (filled.length < 2) return toast('至少两个选项', 'error')
    if (filled.length > MAX_OPTIONS) return toast(`最多 ${MAX_OPTIONS} 个选项`, 'error')
    setSending(true)
    try {
      const res = await voteApi.create({
        question: question.trim(),
        description: description.trim() || undefined,
        options: filled,
        seconds: Number(seconds) || 3600,
        allows_revoting: revoting,
        hide_results_until_closes: hideResults,
      })
      setCreated({ id: res.vote_id, timeEnd: res.time_end })
      toast('投票已创建', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSending(false)
    }
  }

  const totalVotes = result.data?.users.length ?? 0
  const voters = result.data?.users ?? []
  const pageVoters = voters.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <PageHeader crumb={['运营', '投票']} title="投票" hint="在 Telegram 群里发起投票，结束后看结果" />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab })} label="投票" />
      </div>

      {search.tab === 'create' ? (
        <>
          {created ? (
            <div className="table-card" style={{ marginBottom: 18 }}>
              <div className="card-body row" style={{ gap: 12 }}>
                <span>投票已创建</span>
                <b className="tnum">{created.id}</b>
                <span className="muted">{formatDateTime(created.timeEnd)} 结束</span>
                <button type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    void copyText(String(created.id), '投票 ID')
                    toast('已复制投票 ID', 'success')
                  }}
                >
                  复制 ID
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => setCreated(null)}>
                  再建一个
                </button>
              </div>
            </div>
          ) : null}

          <section className="cards cards--form">
            <article className="card">
              <CardHead title="投票" />
              <div className="card-body stack">
                <label className="field">
                  <span>问题</span>
                  <input className="input" maxLength={100} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="100 字内" />
                </label>
                <label className="field">
                  <span>简介</span>
                  <input className="input" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选，200 字内" />
                </label>
                <label className="field">
                  <span>持续时间</span>
                  <select className="input" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                    <option value="3600">1 小时</option>
                    <option value="21600">6 小时</option>
                    <option value="86400">24 小时</option>
                    <option value="172800">48 小时</option>
                  </select>
                </label>

                <CardHead title="选项">
                  <button type="button"
                    className="btn btn--quiet"
                    disabled={options.length >= MAX_OPTIONS}
                    onClick={() => setOptions((prev) => [...prev, ''])}
                  >
                    加一个
                  </button>
                </CardHead>
                <div style={{ display: 'grid', gap: 8 }}>
                  {options.map((option, index) => (
                    <div key={index} className="row" style={{ gap: 8 }}>
                      <span className="tnum muted" style={{ width: 18 }}>{index + 1}</span>
                      <input
                        className="input"
                        maxLength={50}
                        value={option}
                        onChange={(e) => setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))}
                        placeholder={`选项 ${index + 1}`}
                      />
                      {options.length > 2 ? (
                        <button type="button" className="btn btn--quiet" onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}>
                          删除
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>允许撤回改投</span>
                    <div className="seg" role="group" aria-label="允许撤回改投">
                      <button type="button" aria-pressed={!revoting} onClick={() => setRevoting(false)}>
                        不允许
                      </button>
                      <button type="button" aria-pressed={revoting} onClick={() => setRevoting(true)}>
                        允许
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    <span>结果公布</span>
                    <div className="seg" role="group" aria-label="结果公布">
                      <button type="button" aria-pressed={!hideResults} onClick={() => setHideResults(false)}>
                        随时可看
                      </button>
                      <button type="button" aria-pressed={hideResults} onClick={() => setHideResults(true)}>
                        结束后公布
                      </button>
                    </div>
                  </label>
                </div>

                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" className="btn btn--primary" disabled={sending} onClick={() => void submit()}>
                    {sending ? '创建中…' : '创建投票'}
                  </button>
                </div>
              </div>
            </article>

            <article className="card">
              <CardHead title="说明" />
              <div className="card-body">
                <p className="card-note">至少 2 个、最多 12 个选项。</p>
                <p className="card-note">「结束后公布」在投票进行中不显示票数。</p>
              </div>
            </article>
          </section>
        </>
      ) : (
        <>
          <div className="toolbar">
            <label className="toolbar-field">
              <span>投票 ID</span>
              <input className="input" value={idTerm} onChange={(e) => setIdTerm(e.target.value)} placeholder="例如 2" />
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
            <EmptyBlock title="输入投票 ID 查结果" />
          ) : result.error ? (
            <ErrorBlock error={result.error} onRetry={() => result.refetch()} />
          ) : result.isLoading ? (
            <LoadingBlock rows={6} columns={4} />
          ) : (
            <>
              <section className="cards cards--wide">
                <article className="card">
                  <CardHead title={result.data?.question ?? '投票'}>
                    <span className="muted tnum-sm">
                      {formatDateTime(result.data?.time_start)} → {formatDateTime(result.data?.time_end)}
                    </span>
                  </CardHead>
                  <div className="card-body stack">
                    {(result.data?.options ?? []).map((option, index) => {
                      const count = tally.get(index) ?? 0
                      const share = totalVotes > 0 ? count / totalVotes : 0
                      return (
                        <div key={index}>
                          <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--fg-2)' }}>{option}</span>
                            <span className="muted tnum-sm">
                              {formatThousand(count)} 票 · {Math.round(share * 100)}%
                            </span>
                          </div>
                          <div className="progress-line" style={{ marginTop: 8 }}>
                            <i style={{ transform: `scaleX(${share.toFixed(3)})` }} />
                          </div>
                        </div>
                      )
                    })}
                    <p className="card-note">共 {formatThousand(totalVotes)} 人参与</p>
                  </div>
                </article>
              </section>

              {totalVotes === 0 ? (
                <EmptyBlock title="还没有人投票" />
              ) : (
                <div className="table-card" style={{ marginTop: 18 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 64 }} className="num">#</th>
                        <th className="th-thumb" style={{ width: '32%' }}>用户</th>
                        <th>选了</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageVoters.map((row) => (
                        <tr key={`${row.user_id}-${row.index}`}>
                          <td className="num muted tnum">{row.index}</td>
                          <td>
                            <UserCell name={row.username} avatar={row.avatar} />
                          </td>
                          <td className="muted">{result.data?.options[Number(row.option_index)] ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pager total={totalVotes} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
