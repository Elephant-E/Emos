import { useRef, useState } from 'react'

/** 命令式弹窗的宿主状态：`let open` 单例 + 当前待处理项 + promise 结算。 */
export function useDialogHost<TOptions, TResult>() {
  type Pending = TOptions & { resolve: (value: TResult) => void }
  const [pending, setPending] = useState<Pending | null>(null)
  const current = useRef<Pending | null>(null)

  /** 交给调用方的开窗函数：返回一个 promise，等用户点按钮时结算 */
  const begin = (options: TOptions) =>
    new Promise<TResult>((resolve) => {
      const next = { ...options, resolve } as Pending
      current.current = next
      setPending(next)
    })

  const settle = (value: TResult) => {
    if (!current.current) return
    current.current.resolve(value)
    current.current = null
    setPending(null)
  }

  return { pending, begin, settle }
}
