import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { sessionApi } from '@/api/endpoints'
import { setToken as persistToken } from '@/api/client'

/**
 * 添加账号：在后台里直接粘令牌换账号，不用跳登录页。
 *
 * 校验通过后把令牌落到 localStorage 并整页重载——会话、账号列表、权限都按新账号重建，
 * 和「登录页登录」走的是同一条路（Sidebar 挂载时会把当前账号记进账号列表）。
 */
export function AddAccountModal({
  onClose,
  target,
}: {
  onClose: () => void
  /** 要切换到的账号（来自本地账号列表）；不传就是新增一个账号 */
  target?: { pseudonym?: string | null; username: string }
}) {
  const label = target ? target.pseudonym || target.username : ''
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const trimmed = token.trim()
    if (!trimmed || pending) return
    setPending(true)
    setError('')
    try {
      await sessionApi.check(trimmed)
      persistToken(trimmed)
      location.reload()
    } catch (cause) {
      const status = (cause as { status?: number }).status
      const aborted = (cause as Error).name === 'TimeoutError' || (cause as Error).name === 'AbortError'
      setPending(false)
      setError(
        aborted
          ? '验证超时，服务器没有及时响应。'
          : status === 401
            ? '令牌无效或已失效，请重新获取。'
            : status === 403
              ? '这个令牌没有后台权限。'
              : status === 0
                ? '连不上服务器，检查网络后重试。'
                : (cause as Error).message || '验证失败，稍后再试。',
      )
    }
  }

  return (
    <Modal
      title={target ? `切换到 ${label}` : '添加账号'}
      hint={
        target
          ? '本地不再保存令牌：粘贴该账号的访问令牌即可切换。'
          : '粘贴访问令牌即可在当前页面切换，不需要退出登录。'
      }
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmText={target ? '切换' : '添加'}
          pending={pending}
          disabled={!token.trim()}
        />
      }
    >
      <label className="field">
        <span>访问令牌</span>
        <input
          className="input"
          autoFocus
          value={token}
          placeholder="粘贴访问令牌"
          onChange={(event) => {
            setToken(event.target.value)
            setError('')
          }}
        />
      </label>
      {error ? (
        <p className="login__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
