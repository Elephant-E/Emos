import { useEffect, useState } from 'react'
import { request } from '@/api/client'

const TOKEN_KEY = 'emos_admin_token'
const BACKDROP = 'https://files.emos.best/files/base/logo/logo_1.jpg'

type Phase = 'idle' | 'checking' | 'error'

function readPrefill(): string {
  const search = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, '').replace(/^sign\??/, ''))
  return search.get('token') ?? hashParams.get('token') ?? ''
}

function authUrl(): string {
  const url = `${location.origin}/login`
  const params = new URLSearchParams({ uuid: 'emos-admin', name: 'EMOS 管理台', url })
  return `https://emos.best/link?${params.toString()}`
}

export function LoginView({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState(readPrefill)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [reveal, setReveal] = useState(false)
  const [manual, setManual] = useState(Boolean(readPrefill()))

  useEffect(() => {
    if (token) void submit(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setPhase('checking')
    setMessage('')
    try {
      await request('/api/user', { token: trimmed, silent401: true, signal: AbortSignal.timeout(12_000) })
      localStorage.setItem(TOKEN_KEY, trimmed)
      onDone()
    } catch (error) {
      const status = (error as { status?: number }).status
      const aborted = (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError'
      setPhase('error')
      setMessage(
        aborted
          ? '验证超时，服务器没有及时响应。检查网络后重试。'
          : status === 401
            ? '令牌无效或已失效，请重新获取。'
            : status === 403
              ? '这个令牌没有后台权限。'
              : status === 0
                ? '连不上服务器，检查网络后重试。'
                : (error as Error).message || '验证失败，稍后再试。',
      )
    }
  }

  return (
    <main className="login">
      <img className="login__backdrop" src={BACKDROP} alt="" aria-hidden="true" />
      <div className="login__veil" aria-hidden="true" />

      <section className="login__aside">
        <p className="login__mark">
          <span>EMOS</span>
          <em>管理台</em>
        </p>
        <h1 className="login__claim">
          把片库、求片与上传
          <br />
          收在一个地方。
        </h1>
        <p className="login__line">
          echo <i>+</i> media <i>+</i> oasis <i>=</i> emos
        </p>
        <div className="login__strip" aria-hidden="true">
          <div className="login__strip-track">
            {Array.from({ length: 18 }).map((_, index) => (
              <i key={index} className={index % 9 === 4 ? 'is-lit' : undefined} />
            ))}
          </div>
        </div>

        <ul className="login__facts">
          <li>永久公益</li>
          <li>自研架构</li>
          <li>网页端管理</li>
        </ul>
      </section>

      <section className="login__panel">
        <div className="login__card">
          <h2 className="login__title">登录</h2>

          <a className="btn btn--primary login__cta" href={authUrl()}>
            使用 EMOS 账号登录
          </a>

          <button className="login__toggle" type="button" onClick={() => setManual((value) => !value)} aria-expanded={manual}>
            {manual ? '收起' : '使用访问令牌'}
          </button>

          {manual ? (
            <form
              className="login__manual"
              onSubmit={(event) => {
                event.preventDefault()
                void submit(token)
              }}
            >
              <label className="login__label" htmlFor="token">
                访问令牌
              </label>
              <div className="login__input">
                <input
                  id="token"
                  className="input"
                  type={reveal ? 'text' : 'password'}
                  value={token}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="1090_xxxxxxxxxxxx"
                  aria-invalid={phase === 'error'}
                  aria-describedby={message ? 'token-error' : undefined}
                  onChange={(event) => {
                    setToken(event.target.value)
                    if (phase === 'error') {
                      setPhase('idle')
                      setMessage('')
                    }
                  }}
                />
                <button
                  type="button"
                  className="login__reveal"
                  aria-label={reveal ? '隐藏令牌' : '显示令牌'}
                  onClick={() => setReveal((value) => !value)}
                >
                  {reveal ? '隐藏' : '显示'}
                </button>
              </div>
              {message ? (
                <p className="login__error" id="token-error" role="alert">
                  {message}
                </p>
              ) : null}
              <button className="btn btn--ghost login__submit" disabled={!token.trim() || phase === 'checking'}>
                {phase === 'checking' ? '正在验证…' : '用令牌进入'}
              </button>
            </form>
          ) : null}

          {!manual && message ? (
            <p className="login__error" role="alert">
              {message}
            </p>
          ) : null}
        </div>

        <p className="login__foot">
          <a href="https://wiki.emos.best" target="_blank" rel="noreferrer">
            文档
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://status.emos.best" target="_blank" rel="noreferrer">
            服务状态
          </a>
        </p>
      </section>
    </main>
  )
}
