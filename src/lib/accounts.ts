import { TOKEN_KEY, getToken, setToken } from '@/api/client'

export interface Account {
  user_id: string
  username: string
  avatar?: string | null
  token: string
}

const KEY = 'emos_accounts'

export function listAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Account[]) : []
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

export function rememberAccount(account: Omit<Account, 'token'>): Account[] {
  const token = getToken()
  if (!token) return listAccounts()
  const next = listAccounts().filter((item) => item.user_id !== account.user_id)
  next.unshift({ ...account, token })
  write(next)
  return next
}

export function switchAccount(userId: string): boolean {
  const target = listAccounts().find((item) => item.user_id === userId)
  if (!target) return false
  setToken(target.token)
  return true
}

export function forgetAccount(userId: string): Account[] {
  const next = listAccounts().filter((item) => item.user_id !== userId)
  write(next)
  if (!next.some((item) => item.token === localStorage.getItem(TOKEN_KEY))) {
    localStorage.removeItem(TOKEN_KEY)
  }
  return next
}
