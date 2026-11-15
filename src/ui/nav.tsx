import { createContext, useContext } from 'react'

/** 手机端抽屉导航的开合；桌面端不需要按钮，拿到的就是 undefined */
export const NavContext = createContext<(() => void) | undefined>(undefined)

export function useOpenNav() {
  return useContext(NavContext)
}
