import type { KeyboardEvent } from 'react'

/**
 * 让整行可点：鼠标点击与键盘 Enter / Space 都能触发，并带上 role、tabIndex。
 *
 * 光标样式由 CSS 的 `.table tbody tr[role='link']` 负责，不写内联样式。
 *
 * 用法：`<tr key={id} {...rowLink(() => open(id))}>`
 */
export function rowLink(onActivate: () => void, enabled = true, role: 'link' | 'button' = 'link') {
  if (!enabled) return {}
  return {
    tabIndex: 0,
    role,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onActivate()
    },
  }
}
