import { useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { IconMenu } from './icons'
import { Avatar } from './Avatar'
import { AccountMenu } from './AccountMenu'
import { Modal } from './Modal'
import type { UserInfo } from '@/api/types'

/** 手机顶栏：左汉堡开导航抽屉，右头像开账号菜单；桌面端不渲染（`.topbar` 隐藏，≤600px 才显示）。 */
export function MobileTopbar({
  user,
}: {
  user?: UserInfo | undefined
}) {
  const [accountsOpen, setAccountsOpen] = useState(false)
  const name = user?.pseudonym || user?.username || '未登录'

  return (
    <>
      <header className="topbar">
        <Collapsible.Trigger asChild>
          <button type="button" className="topbar__btn" aria-label="导航">
            <IconMenu />
          </button>
        </Collapsible.Trigger>
        <span className="topbar__brand">
          EMOS<em>Club</em>
        </span>
        <button
          type="button"
          className="topbar__btn topbar__account"
          onClick={() => setAccountsOpen(true)}
          aria-label={`账号：${name}`}
        >
          <Avatar url={user?.avatar} name={name} size={26} />
        </button>
      </header>

      {accountsOpen ? (
        <Modal title="账号" width={420} onClose={() => setAccountsOpen(false)}>
          <AccountMenu currentUserId={user?.user_id} onDone={() => setAccountsOpen(false)} />
        </Modal>
      ) : null}
    </>
  )
}
