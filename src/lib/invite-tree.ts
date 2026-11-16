/**
 * 邀请关系：把 `/api/invite/tree` 的全站扁平树收成「我的下级」。
 *
 * 上游返回 3000+ 节点、不分组，页面上只要当前用户这一支，且要带层级用于缩进。
 * 这段计算原来以两个 IIFE 写在视图里，每次渲染重算、也没法单独验证。
 */

interface InviteNode {
  user_id: string
  username: string
  invite_user_id?: string | null
  join_at?: string | null
  is_disabled?: boolean | null
}

export interface InviteHistoryRow {
  user_id: string
  last_video_player?: string | null
  invite_remark?: string | null
}

interface InviteRow {
  userId: string
  username: string
  /** 1 = 我直接邀请，2 = 下级再邀请 */
  depth: number
  joinAt?: string | null
  isDisabled: boolean
  /** 二级以下才会显示「由谁邀请」 */
  invitedBy: string | null
  lastPlayed: string | null
  remark: string
}

/** 按 invite_user_id 从自己往下走，得到带层级的子树（深度优先、保持上游顺序） */
export function pickMySubtree(nodes: InviteNode[], myUserId: string | null | undefined): Array<InviteNode & { depth: number }> {
  if (!myUserId || nodes.length === 0) return []
  const byParent = new Map<string, InviteNode[]>()
  for (const node of nodes) {
    const parent = node.invite_user_id
    if (!parent) continue
    const list = byParent.get(parent)
    if (list) list.push(node)
    else byParent.set(parent, [node])
  }
  const out: Array<InviteNode & { depth: number }> = []
  const walk = (uid: string, depth: number) => {
    for (const child of byParent.get(uid) ?? []) {
      out.push({ ...child, depth })
      walk(child.user_id, depth + 1)
    }
  }
  walk(myUserId, 1)
  return out
}

/**
 * 合并「我邀请的」与「下级邀请的」：同一棵树用 depth 区分层级；
 * 最近播放与备注只有直接邀请的人才有（来自 invite/history）。
 */
export function buildInviteRows(
  subtree: Array<InviteNode & { depth: number }>,
  nodes: InviteNode[],
  history: InviteHistoryRow[],
): InviteRow[] {
  const nameById = new Map<string, string>()
  for (const node of nodes) nameById.set(node.user_id, node.username)

  const playedById = new Map<string, string | null>()
  const remarkById = new Map<string, string>()
  for (const row of history) {
    playedById.set(String(row.user_id), row.last_video_player ?? null)
    const remark = String(row.invite_remark ?? '').trim()
    if (remark) remarkById.set(String(row.user_id), remark)
  }

  return subtree.map((node) => ({
    userId: node.user_id,
    username: node.username,
    depth: node.depth,
    joinAt: node.join_at,
    isDisabled: Boolean(node.is_disabled),
    invitedBy: node.depth > 1 ? (nameById.get(node.invite_user_id ?? '') ?? null) : null,
    lastPlayed: playedById.get(node.user_id) ?? null,
    remark: remarkById.get(node.user_id) ?? '',
  }))
}
