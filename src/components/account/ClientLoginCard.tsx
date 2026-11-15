import { useState } from 'react'
import { CardHead } from '@/components/CardHead'
import { toast } from '@/ui/toast'
import { copyText } from '@/lib/clipboard'

/**
 * 客户端登录：访问令牌、三台服务器地址、登录密码。
 * 「显示」状态收在卡片内部——它只影响这一张卡的呈现，页面上没必要保管。
 */
export function ClientLoginCard({
  token,
  servers,
  password,
  passwordMode,
}: {
  token: string | null
  /** [标签, 地址] 三元组，地址为空的项不渲染 */
  servers: Array<[string, string | null | undefined]>
  password: string | null
  /** 动态密码模式：没有固定密码可设 */
  passwordMode: boolean
}) {
  const [showToken, setShowToken] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <article className="card">
      <CardHead title="客户端登录" />
      <dl className="kv stack--top">
        <div>
          <dt>访问令牌</dt>
          <dd>
            {!token ? (
              <span className="muted">未保存</span>
            ) : showToken ? (
              <button
                type="button"
                className="btn btn--quiet tnum"
                onClick={() => void copyText(token, '令牌')}
              >
                {token} · 复制
              </button>
            ) : (
              <span className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <span className="muted tnum">
                  {token.slice(0, 6)}…{token.slice(-4)}
                </span>
                <button type="button" className="btn btn--quiet" onClick={() => setShowToken(true)}>
                  显示
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => void copyText(token, '令牌')}>
                  复制
                </button>
              </span>
            )}
          </dd>
        </div>

        {servers.map(([label, url]) =>
          url ? (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={async () => {
                    if (await copyText(String(url), '服务器地址')) toast(`已复制${label}地址`, 'success')
                  }}
                >
                  {String(url).replace(/^https?:\/\//, '')} · 复制
                </button>
              </dd>
            </div>
          ) : null,
        )}

        <div>
          <dt>登录密码</dt>
          <dd>
            {passwordMode ? (
              <span className="muted">动态密码，每次登录前获取</span>
            ) : !password ? (
              <span className="muted">未设置</span>
            ) : showPassword ? (
              <button
                type="button"
                className="btn btn--quiet tnum"
                onClick={() => void copyText(password, '临时密码')}
              >
                {password} · 复制
              </button>
            ) : (
              <button type="button" className="btn btn--quiet" onClick={() => setShowPassword(true)}>
                显示
              </button>
            )}
          </dd>
        </div>
      </dl>
      {passwordMode ? (
        <p className="card-note stack--top">这个账号开的是动态密码登录，没有固定密码可设。</p>
      ) : null}
    </article>
  )
}
