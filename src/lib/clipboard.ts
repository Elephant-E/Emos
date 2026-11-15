import { toast } from '@/ui/toast'

/**
 * 复制到剪贴板。
 *
 * 站内原先 8 处各写一遍 `navigator.clipboard?.writeText(...)`，写法有两套
 * （有的带 `?.` 有的不带），失败时也没有任何反馈——非安全上下文（http）
 * 下 clipboard 是 undefined，点了完全没反应。
 */
export async function copyText(text: string, label = '内容'): Promise<boolean> {
  if (!text) {
    toast(`没有可复制的${label}`, 'error')
    return false
  }
  try {
    if (!navigator.clipboard) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(text)
    toast(`已复制${label}`, 'success')
    return true
  } catch {
    toast(`复制失败，请手动选中${label}`, 'error')
    return false
  }
}
