/**
 * 全局 MutationCache.onError 会为每个失败的 mutation 弹提示；视图要自己处理时
 * （签到 429 = 今天已经签过了）写 `meta: { skipErrorToast: true }`，避免弹两条。
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
