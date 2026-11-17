/** 站外链接集中一处，避免同一地址两处写不一样；群聊地址可用 `VITE_GROUP_URL` 覆盖 */
export const LINKS = {
  docs: 'https://wiki.emos.best',
  status: 'https://status.emos.best',
  group: (import.meta.env.VITE_GROUP_URL as string | undefined) || 'https://t.me/emospg',
} as const
