import { uploadApi } from '@/api/endpoints'
import { USE_MOCK } from '@/api/client'

const CHUNK = 8 * 1024 * 1024

function pickId(payload: Record<string, unknown>): string {
  const keys = ['file_id', 'fileId', 'id', 'file_key', 'key', 'upload_id']
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value) return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

export interface UploadTarget {
  item_type: string
  item_id: number
  title: string
}

export interface UploadResult {
  media_id: string
  carrot: number
}

async function uploadObject(file: File, kind: string, onProgress: (ratio: number) => void): Promise<string> {
  const token = (await uploadApi.uploadToken(kind, file.type || 'application/octet-stream', file.name)) as Record<string, unknown>
  const fileId = pickId(token)
  if (!fileId) throw new Error('服务端没有返回 file_id')

  const partCount = Math.max(1, Math.min(1000, Math.ceil(file.size / CHUNK)))
  const parts = await uploadApi.presign(fileId, partCount)
  const etags: Array<[number, string]> = []
  let uploaded = 0

  for (const part of parts) {
    const start = (part.number - 1) * CHUNK
    const blob = file.slice(start, Math.min(start + CHUNK, file.size))
    const res = await fetch(part.upload_url, {
      method: 'PUT',
      body: blob,
      headers: part.upload_data as Record<string, string>,
    })
    if (!res.ok) throw new Error(`分片 ${part.number} 上传失败（${res.status}）`)
    etags.push([part.number, res.headers.get('ETag') ?? ''])
    uploaded += blob.size
    onProgress(uploaded / file.size)
  }

  const merged = await uploadApi.complete(fileId, etags)
  return merged.file_id
}

export async function uploadSubtitle(
  file: File,
  target: { item_type: string; item_id: number },
  onProgress: (ratio: number) => void,
): Promise<void> {
  const fileId = await uploadObject(file, 'subtitle', onProgress)
  await uploadApi.saveSubtitle(target.item_type, target.item_id, fileId)
}

export async function uploadAndSave(
  file: File,
  target: UploadTarget,
  onProgress: (ratio: number) => void,
): Promise<UploadResult> {
  const token = (await uploadApi.uploadToken('video', file.type || 'video/mp4', file.name)) as Record<string, unknown>
  const fileId = pickId(token)
  if (!fileId && !USE_MOCK) throw new Error('服务端没有返回 file_id，检查 /api/upload/getUploadToken 的响应')

  if (USE_MOCK) {
    for (let i = 1; i <= 10; i += 1) {
      await new Promise((r) => setTimeout(r, 90))
      onProgress(i / 10)
    }
    const saved = await uploadApi.saveVideo(target.item_type, target.item_id, fileId || 'mock-file')
    return { media_id: saved.media_id, carrot: saved.carrot }
  }

  const partCount = Math.max(1, Math.min(1000, Math.ceil(file.size / CHUNK)))
  const parts = await uploadApi.presign(fileId, partCount)
  const etags: Array<[number, string]> = []
  let uploaded = 0

  for (const part of parts) {
    const start = (part.number - 1) * CHUNK
    const blob = file.slice(start, Math.min(start + CHUNK, file.size))
    const res = await fetch(part.upload_url, {
      method: 'PUT',
      body: blob,
      headers: part.upload_data as Record<string, string>,
    })
    if (!res.ok) throw new Error(`分片 ${part.number} 上传失败（${res.status}）`)
    etags.push([part.number, res.headers.get('ETag') ?? ''])
    uploaded += blob.size
    onProgress(uploaded / file.size)
  }

  const merged = await uploadApi.complete(fileId, etags)
  const saved = await uploadApi.saveVideo(target.item_type, target.item_id, merged.file_id)
  return { media_id: saved.media_id, carrot: saved.carrot }
}
