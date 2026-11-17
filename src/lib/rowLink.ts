import type { KeyboardEvent } from 'react'

/**
 * 让整行可点：鼠标点击与键盘 Enter / Space 都能触发，并带上 role、tabIndex。
 * 用法：`<tr key={id} {...rowLink(() => open(id))}>`
 */
export function rowLink(onActivate: () => void, enabled = true, role: 'link' | 'button' = 'link') {
  if (!enabled) return {}
  return {
    tabIndex: 0,
    role,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      // 行内还有按钮和链接：从它们冒上来的回车/空格属于那个控件，不能抢
      if (event.target !== event.currentTarget) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onActivate()
    },
  }
}
