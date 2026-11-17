/** 登录 / 切号的接口错误翻成人话：登录页与添加账号弹窗共用同一套阶梯 */
export function describeAuthError(error: unknown): string {
  const status = (error as { status?: number }).status
  const name = (error as Error).name
  if (name === 'TimeoutError' || name === 'AbortError') return '验证超时，服务器没有及时响应。检查网络后重试。'
  if (status === 401) return '令牌无效或已失效，请重新获取。'
  if (status === 403) return '这个令牌没有后台权限。'
  if (status === 0) return '连不上服务器，检查网络后重试。'
  return (error as Error).message || '验证失败，稍后再试。'
}
