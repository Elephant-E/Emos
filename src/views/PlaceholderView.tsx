import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock } from '@/components/StateBlock'

export function PlaceholderView({ title, note }: { title: string; note: string }) {
  return (
    <>
      <PageHeader crumb={[title]} title={title} />
      <EmptyBlock title="这个模块还没迁移" hint={note} />
    </>
  )
}

export function LoginView({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <form
        className="card"
        style={{ width: 380, padding: 28 }}
        onSubmit={(e) => {
          e.preventDefault()
          const value = new FormData(e.currentTarget).get('token')
          if (typeof value === 'string' && value.trim()) {
            localStorage.setItem('emos_admin_token', value.trim())
            onDone()
          }
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 550 }}>EMOS 管理台</p>
        <p style={{ margin: '0 0 20px', color: 'var(--fg-3)', fontSize: 13 }}>
          粘贴访问令牌后进入。令牌只存在本机 localStorage。
        </p>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>访问令牌</span>
          <input className="input" name="token" type="password" style={{ width: '100%' }} autoFocus />
        </label>
        <button className="btn btn--primary" style={{ width: '100%', marginTop: 18 }}>
          进入
        </button>
      </form>
    </div>
  )
}
