/** 限并发的批量执行：固定开 limit 个 worker 各自抢任务，直到队列取完 */
export async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return
  let cursor = 0
  const take = async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, take))
}
