import { useEffect, useState } from 'react'
import { sessionApi } from '@/api/endpoints'
import { LOGIN_POSTERS } from '@/views/login-posters'

const TOKEN_KEY = 'emos_admin_token'

type Phase = 'idle' | 'checking' | 'error'

function readPrefill(): string {
  const search = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, '').replace(/^sign\??/, ''))
  return search.get('token') ?? hashParams.get('token') ?? ''
}

// 应用标识，必须是合法 UUID（接口会校验格式），固定值保证每次授权认作同一个应用
const APP_UUID = '7c1e5b90-4f2a-4c8e-9d31-6b8a2e704f15'

function authUrl(): string {
  const params = new URLSearchParams({
    uuid: APP_UUID,
    name: 'EMOS Club',
    url: `${location.origin}/login`,
  })
  return `https://emos.best/link?${params.toString()}`
}

export function LoginView({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState(readPrefill)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [reveal, setReveal] = useState(false)

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
      await sessionApi.check(trimmed)
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
      <div className="login__wall" aria-hidden="true">
        <div className="login__wall-track">
          {[...LOGIN_POSTERS, ...LOGIN_POSTERS].map((src, index) => (
            <img key={`${src}-${index}`} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ))}
        </div>
      </div>
      <div className="login__veil" aria-hidden="true" />

      <section className="login__aside">
        <p className="login__mark">
          <span>EMOS</span>
          <em>Club</em>
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
      </section>

      <section className="login__panel">
        <div className="login__card">
          <p className="login__kicker">登录</p>
          <a className="btn login__cta" href={authUrl()}>
            账号登录
          </a>

          <p className="login__or"><span>或使用访问令牌</span></p>

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
              <button type="button" className="btn btn--primary login__submit" disabled={!token.trim() || phase === 'checking'}>
                {phase === 'checking' ? '正在验证…' : '用令牌进入'}
              </button>
          </form>
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
