import { toast } from '@/ui/toast'

/** 复制到剪贴板：非安全上下文（http）下 navigator.clipboard 为 undefined，必须兜住 */
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
