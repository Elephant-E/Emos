/**
 * 登录 / 切号时把接口错误翻成人话。
 *
 * 两个入口（登录页、添加账号弹窗）原本各写一份逐字相同的阶梯，
 * 后来文案还分叉了（「验证超时，服务器没有及时响应。」 vs 「…检查网络后重试。」）。
 * 统一在这里，改文案只需要改一个地方。
 */
export function describeAuthError(error: unknown): string {
  const status = (error as { status?: number }).status
  const name = (error as Error).name
  if (name === 'TimeoutError' || name === 'AbortError') return '验证超时，服务器没有及时响应。检查网络后重试。'
  if (status === 401) return '令牌无效或已失效，请重新获取。'
  if (status === 403) return '这个令牌没有后台权限。'
  if (status === 0) return '连不上服务器，检查网络后重试。'
  return (error as Error).message || '验证失败，稍后再试。'
}
