import { useEffect, useState } from 'react'
import { request } from '@/api/client'
import { IconLogo } from '@/components/icons'

const TOKEN_KEY = 'emos_admin_token'

type Phase = 'idle' | 'checking' | 'error'

function readPrefill(): string {
  const search = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, '').replace(/^sign\??/, ''))
  return search.get('token') ?? hashParams.get('token') ?? ''
}

export function LoginView({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState(readPrefill)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [reveal, setReveal] = useState(false)

  // 带 token 进来（主站快捷登录）时自动校验一次
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
      // 用这份令牌直接验一次，验过才写进本地，避免带着坏令牌进入后台
      await request('/api/user', {
        token: trimmed,
        silent401: true,
        signal: AbortSignal.timeout(12_000),
      })
      localStorage.setItem(TOKEN_KEY, trimmed)
      onDone()
    } catch (error) {
      const status = (error as { status?: number }).status
      setPhase('error')
      setMessage(
        (error as Error).name === 'TimeoutError' || status === undefined && /abort/i.test((error as Error).message)
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
      <div className="login__glow" aria-hidden="true" />

      <form
        className="login__card"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(token)
        }}
      >
        <div className="login__brand">
          <IconLogo size={18} />
          <span>EMOS</span>
          <em>管理台</em>
        </div>

        <h1 className="login__title">用访问令牌进入</h1>
        <p className="login__sub">令牌只保存在这台设备的浏览器里，不会上传到任何第三方。</p>

        <div className="login__field">
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
              placeholder="例如 1090_xxxxxxxxxxxx"
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
        </div>

        <button className="btn btn--primary login__submit" disabled={!token.trim() || phase === 'checking'}>
          {phase === 'checking' ? '正在验证…' : '进入'}
        </button>

        <details className="login__help">
          <summary>令牌从哪里来</summary>
          <p>
            在 emos.best 登录后，于账号页复制访问令牌；或在主站用 <code>#/sign?token=</code> 快捷链接直接带回这里。
          </p>
        </details>
      </form>

      <footer className="login__foot">
        <span>令牌仅存于 localStorage</span>
        <span aria-hidden="true">·</span>
        <a href="https://wiki.emos.best" target="_blank" rel="noreferrer">
          文档
        </a>
        <span aria-hidden="true">·</span>
        <a href="https://status.emos.best" target="_blank" rel="noreferrer">
          服务状态
        </a>
      </footer>
    </main>
  )
}
