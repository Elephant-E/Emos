/**
 * 站外链接集中一处，避免同一个地址在两处写不一样。
 *
 * 群聊用 `VITE_GROUP_URL` 覆盖；没配时退回 `https://t.me/emospg`（与账号里的群组链接一致）。
 */
export const LINKS = {
  docs: 'https://wiki.emos.best',
  status: 'https://status.emos.best',
  group: (import.meta.env.VITE_GROUP_URL as string | undefined) || 'https://t.me/emospg',
} as const
