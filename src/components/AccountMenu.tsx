import { useState } from 'react'
import { forgetAccount, listAccounts, switchAccount } from '@/lib/accounts'
import { setToken } from '@/api/client'
import { Avatar } from '@/components/Avatar'

/**
 * 账号菜单：当前账号、其它已登录账号（可切换 / 移除）、添加账号、退出登录。
 * 桌面侧栏与手机顶栏头像共用这份内容——两边展示位置不同，行为必须一致。
 */
export function AccountMenu({ currentUserId, onDone }: { currentUserId?: string; onDone?: () => void }) {
  const [accounts, setAccounts] = useState(() => listAccounts())

  return (
    <>
            {accounts.map((account) => {
              const current = account.user_id === currentUserId
              return (
                <div key={account.user_id} className="rail__menu-row">
                  <button type="button"
                    role="menuitem"
                    className="rail__menu-item"
                    onClick={() => {
                      if (current) return
                      if (switchAccount(account.user_id)) location.reload()
                    }}
                  >
                    <Avatar url={account.avatar} name={account.pseudonym || account.username} size={22} />
                    <span>{account.pseudonym || account.username}</span>
                    {current ? <span className="rail__menu-flag">当前</span> : null}
                  </button>
                  {!current ? (
                    <button type="button"
                      className="rail__menu-remove"
                      aria-label={`移除 ${account.pseudonym || account.username}`}
                      onClick={() => setAccounts(forgetAccount(account.user_id))}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              )
            })}
            <button type="button" className="rail__menu-add" role="menuitem" onClick={() => {
                  onDone?.()
                  location.href = '/login'
                }}>
              添加账号
            </button>
            <button
              type="button"
              className="rail__menu-add"
              role="menuitem"
              onClick={() => {
                // 共享设备上要能主动结束会话：清令牌与本地头像缓存，回登录页
                onDone?.()
                setToken(null)
                try {
                  localStorage.removeItem('emos_admin_profile')
                } catch {
                  /* 隐私模式下不可写，忽略 */
                }
                location.href = '/login'
              }}
            >
              退出登录
            </button>
    </>
  )
}
