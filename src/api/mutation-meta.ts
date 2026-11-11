/**
 * mutation 的 meta 约定。
 *
 * 全局的 MutationCache.onError（main.tsx）给每个失败的 mutation 弹一条错误提示；
 * 视图需要自己处理错误时（如签到遇到 429 属于「今天已经签过了」，不是故障），
 * 在 mutation 上写 `meta: { skipErrorToast: true }`，由视图负责这一条提示，避免弹两条。
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
