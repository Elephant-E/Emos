import { SESSION_CACHE_KEY, getToken, setToken } from '@/api/client'

/** 本地记住的账号列表：只存展示信息、不存令牌（否则一次 XSS 就能拿走全部令牌），切号要重新贴令牌 */
export interface Account {
  user_id: string
  username: string
  /** 笔名，优先于 username 显示 */
  pseudonym?: string | null
  avatar?: string | null
}

const KEY = 'emos_accounts'

export function listAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Account & { token?: string }>
    if (!Array.isArray(parsed)) return []
    // 旧版本存过 token：读到即清掉
    const cleaned = parsed.map(({ token: _token, ...rest }) => rest)
    if (parsed.some((item) => 'token' in item)) write(cleaned)
    return cleaned
  } catch {
    return []
  }
}

function write(accounts: Account[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(accounts.slice(0, 8)))
  } catch {
    /* 忽略写入失败 */
  }
}

export function rememberAccount(account: Account): Account[] {
  if (!getToken()) return listAccounts()
  const next = listAccounts().filter((item) => item.user_id !== account.user_id)
  next.unshift(account)
  write(next)
  return next
}

export function forgetAccount(userId: string): Account[] {
  const next = listAccounts().filter((item) => item.user_id !== userId)
  write(next)
  return next
}

/** 清掉当前令牌与账号快照（退出登录用） */
export function clearSession() {
  setToken(null)
  try {
    localStorage.removeItem(SESSION_CACHE_KEY)
  } catch {
    /* 隐私模式下不可写，忽略 */
  }
}
