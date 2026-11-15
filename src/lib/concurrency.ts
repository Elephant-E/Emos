/**
 * 限并发的批量执行。
 *
 * 上传队列原来手写了一个游标 + 三个 worker 的池子，逻辑对但和视图混在一起，
 * 既没法单独验证，也容易被别人复制到别处再改坏。抽成通用工具：
 * 固定开 `limit` 个 worker，各自抢下一个任务，直到队列取完。
 */
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
