/**
 * mutation 的 meta 约定。
 *
 * 全局的 MutationCache.onError（main.tsx）会给每个失败的 mutation 弹一条错误提示，
 * 这样没人会忘记报错。少数场景视图自己要处理错误（例如签到遇到 429 属于
 * 「今天已经签过了」，不是故障），就在 mutation 上写 `meta: { skipErrorToast: true }`，
 * 由视图自己负责把这一个错误说清楚，避免同一件事弹两条。
 */
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** 视图自己处理错误提示，全局不再弹 */
      skipErrorToast?: boolean
    }
  }
}

export {}
