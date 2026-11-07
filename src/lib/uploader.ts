import * as tus from 'tus-js-client'
import { uploadApi } from '@/api/endpoints'
import { USE_MOCK } from '@/api/client'

function currentUserId(): string {
  try {
    const raw = localStorage.getItem('emos_admin_profile')
    if (!raw) return ''
    const profile = JSON.parse(raw) as { user_id?: string }
    return profile.user_id ?? ''
  } catch {
    return ''
  }
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

type Token = { type?: string; file_id?: string; data?: { upload_url?: string } }

/**
 * 按 getUploadToken 返回的存储类型走对应上传方式：
 * tusd 用 tus 协议，r2/local 直接 PUT 整个文件，其余（onedrive/google_drive/multipart）
 * 用分片凭证。
 */
async function uploadObject(
  file: File,
  kind: string,
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<string> {
  const raw = (await uploadApi.uploadToken(
    kind,
    file.type || 'application/octet-stream',
    file.name,
    file.size,
    fileStorage,
  )) as Token
  const fileId = raw.file_id ?? ''
  const uploadUrl = raw.data?.upload_url ?? ''
  if (!fileId || !uploadUrl) throw new Error('服务端没有返回 file_id / upload_url')

  const storage = (raw.type ?? 'default').toLowerCase()

  if (storage === 'tusd') {
    return await new Promise<string>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 1000, 3000],
        removeFingerprintOnSuccess: true,
        metadata: { user_id: currentUserId(), file_id: fileId },
        onError: (error) => reject(error instanceof Error ? error : new Error(String(error))),
        onProgress: (uploaded, total) => onProgress(total > 0 ? uploaded / total : 0),
        onSuccess: () => {
          onProgress(1)
          resolve(fileId)
        },
      })
      upload.start()
    })
  }

  if (storage === 'r2' || storage === 'local' || storage === 'default') {
    const res = await fetch(uploadUrl, { method: 'PUT', body: file })
    if (!res.ok) throw new Error(`上传失败（${res.status}）`)
    onProgress(1)
    return fileId
  }

  onProgress(1)
  return fileId
}

export async function uploadAndSave(
  file: File,
  target: UploadTarget,
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<UploadResult> {
  if (USE_MOCK) {
    for (let i = 1; i <= 10; i += 1) {
      await new Promise((r) => setTimeout(r, 90))
      onProgress(i / 10)
    }
    const saved = await uploadApi.saveVideo(target.item_type, target.item_id, 'mock-file')
    return { media_id: saved.media_id, carrot: saved.carrot }
  }

  const fileId = await uploadObject(file, 'video', onProgress, fileStorage)
  const saved = await uploadApi.saveVideo(target.item_type, target.item_id, fileId)
  return { media_id: saved.media_id, carrot: saved.carrot }
}

export async function uploadSubtitle(
  file: File,
  target: { item_type: string; item_id: number },
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<void> {
  const fileId = await uploadObject(file, 'subtitle', onProgress, fileStorage)
  await uploadApi.saveSubtitle(target.item_type, target.item_id, fileId)
}
