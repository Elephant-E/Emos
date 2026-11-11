import * as tus from 'tus-js-client'
import { uploadApi } from '@/api/endpoints'
import { TOKEN_KEY, USE_MOCK } from '@/api/client'

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

function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 上传落点。global / internal / default 已不再分配可用存储设备，
 * 只对用户开放 zn_r2_upload 与 google_drive。
 */
export const UPLOAD_STORAGES = [
  { value: 'zn_r2_upload', label: 'Zn 存档服', hint: '直连 R2，国内可用' },
  { value: 'google_drive', label: '谷歌盘', hint: '不支持国内直传，有 CORS 限制' },
] as const

export const DEFAULT_UPLOAD_STORAGE = 'zn_r2_upload'

export interface UploadTarget {
  item_type: string
  /** 落点 id：电影是 video_id，剧集是 episode_id */
  item_id: number
  title: string
  /** 所属影片。剧集的 item_id 不是 video_id，入库后「查看」要用这个 */
  video_id?: number
  season?: number
  episode?: number
}

export interface UploadResult {
  media_id: string
  carrot: number
}

type Token = {
  type?: string
  /** 业务失败时只有这个字段（HTTP 仍是 200） */
  message?: string
  file_id?: string
  user_id?: string
  data?: {
    upload_url?: string
    multipart_size?: { min?: number; max?: number }
  }
}

/**
 * 把一个文件传到存储上，返回 file_id。
 * 服务端返回的 type 决定走哪条路：
 *   tusd        → tus 协议（本实例用的就是这个）
 *   r2 / local  → 整文件 PUT
 *   onedrive / google_drive → PUT + Content-Range 分片
 *   multipart   → presign → 逐片 PUT 拿 ETag → complete
 */
async function uploadObject(
  file: File,
  kind: 'video' | 'subtitle' | 'image' | 'music',
  onProgress: (ratio: number) => void,
  fileStorage: string = DEFAULT_UPLOAD_STORAGE,
): Promise<string> {
  const raw = (await uploadApi.uploadToken(
    kind,
    file.type || 'application/octet-stream',
    file.name,
    file.size,
    fileStorage,
  )) as Token

  // 业务失败是 HTTP 200 + { message }（如「此资源您一周内上传过」），先判 message
  // 才不会盖成「没有返回 file_id」
  if (raw.message) throw new Error(raw.message)
  const fileId = raw.file_id ?? ''
  const uploadUrl = raw.data?.upload_url ?? ''
  if (!fileId || !uploadUrl) throw new Error('服务端没有返回 file_id / upload_url')

  const storage = (raw.type ?? '').toLowerCase()

  if (storage === 'tusd') {
    return await new Promise<string>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 1000, 3000],
        removeFingerprintOnSuccess: true,
        metadata: { user_id: raw.user_id ?? currentUserId(), file_id: fileId },
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

  if (storage === 'multipart') {
    await uploadMultipart(file, fileId, raw, onProgress)
    return fileId
  }

  if (storage === 'onedrive' || storage === 'google_drive') {
    // onedrive 分片必须是 320KB 的整数倍，google_drive 是 256KB 且最小 5MB
    const unit = storage === 'onedrive' ? 320 * 1024 : 256 * 1024
    const minSize = storage === 'google_drive' ? 5 * 1024 * 1024 : unit
    const chunk = Math.max(minSize, Math.floor((8 * 1024 * 1024) / unit) * unit)
    for (let start = 0; start < file.size; start += chunk) {
      const end = Math.min(start + chunk, file.size) - 1
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
        },
        body: file.slice(start, end + 1),
      })
      if (!res.ok) throw new Error(`上传失败（${res.status}）`)
      onProgress(Math.min(1, (end + 1) / file.size))
    }
    return fileId
  }

  // r2 / local / 未知类型：整文件 PUT
  const res = await fetch(uploadUrl, { method: 'PUT', body: file })
  if (!res.ok) throw new Error(`上传失败（${res.status}）`)
  onProgress(1)
  return fileId
}

/** multipart：presign → 逐片 PUT（拿 ETag）→ complete，失败 abort */
async function uploadMultipart(
  file: File,
  fileId: string,
  token: Token,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const ms = token.data?.multipart_size ?? {}
  const minPart = ms.min ?? 5 * 1024 * 1024
  const maxPart = ms.max ?? 5 * 1024 * 1024 * 1024
  let partSize = 100 * 1024 * 1024
  if (partSize < minPart) partSize = minPart
  if (partSize > maxPart) partSize = maxPart
  let number = Math.max(1, Math.ceil(file.size / partSize))
  if (number > 1000) {
    partSize = Math.max(minPart, Math.ceil(file.size / 1000))
    number = Math.max(1, Math.ceil(file.size / partSize))
  }

  try {
    const presigns = await uploadApi.multipartPresign(fileId, number)
    const parts: Array<{ number: number; etag: string }> = []
    let done = 0
    for (const p of presigns) {
      const start = (p.number - 1) * partSize
      const res = await fetch(p.upload_url, {
        method: 'PUT',
        body: file.slice(start, Math.min(start + partSize, file.size)),
      })
      if (!res.ok) throw new Error(`分片 ${p.number} 上传失败（${res.status}）`)
      parts.push({ number: p.number, etag: res.headers.get('ETag') ?? '' })
      done += 1
      onProgress(done / presigns.length)
    }
    await uploadApi.multipartComplete(fileId, parts)
    onProgress(1)
  } catch (error) {
    await uploadApi.multipartAbort(fileId).catch(() => undefined)
    throw error
  }
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
  // 「视频正在合并中 请等待1分钟后再保存试下」是正常的等待信号，重试几次
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const saved = await uploadApi.saveVideo(target.item_type, target.item_id, fileId)
      return { media_id: saved.media_id, carrot: saved.carrot }
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function uploadSubtitle(
  file: File,
  target: { item_type: string; item_id: number },
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<void> {
  if (USE_MOCK) {
    for (let i = 1; i <= 6; i += 1) {
      await new Promise((r) => setTimeout(r, 80))
      onProgress(i / 6)
    }
    await uploadApi.saveSubtitle(target.item_type, target.item_id, 'mock-subtitle')
    return
  }
  const fileId = await uploadObject(file, 'subtitle', onProgress, fileStorage)
  await uploadApi.saveSubtitle(target.item_type, target.item_id, fileId)
}

/**
 * 歌曲：音频传上去之后绑到某首歌上（POST /api/upload/music/save），
 * 只需知道 song_id，不需要预先选季集。
 */
export async function uploadSong(
  file: File,
  songId: number,
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<{ media_id: string; carrot: number }> {
  if (USE_MOCK) {
    for (let i = 1; i <= 8; i += 1) {
      await new Promise((r) => setTimeout(r, 80))
      onProgress(i / 8)
    }
    return { media_id: `mock-music-${Date.now()}`, carrot: 1 }
  }
  const fileId = await uploadObject(file, 'music', onProgress, fileStorage)
  return await uploadApi.saveMusic(songId, fileId)
}

/**
 * 图片：传上去之后直接进图库（GET /api/upload/image/list 能查到），
 * 返回的 file_id 就是图库里那一张的标识。
 */
export async function uploadImage(
  file: File,
  onProgress: (ratio: number) => void,
  fileStorage?: string,
): Promise<string> {
  if (USE_MOCK) {
    for (let i = 1; i <= 6; i += 1) {
      await new Promise((r) => setTimeout(r, 70))
      onProgress(i / 6)
    }
    return `mock-image-${Date.now()}`
  }
  return await uploadObject(file, 'image', onProgress, fileStorage)
}

/**
 * 临时上传：不属于「入库」体系，只换一个可以直接用的直链。
 * 服务是独立的 temporary.emos.best，单文件 80MB，FormData 带 file + emos_id。
 *
 * 当前用于红包封面；协议见 docs/UPLOAD-PROTOCOL.md，能力边界见 docs/WIKI-NOTES.md。
 */
export async function uploadTemporary(file: File): Promise<{ url: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return { url: `https://temporary.emos.local/${Date.now()}-${encodeURIComponent(file.name)}` }
  }
  const userId = currentUserId()
  if (!userId) throw new Error('没有读到当前账号 ID，请重新登录')
  if (file.size > 80 * 1024 * 1024) throw new Error('临时上传单个文件不能超过 80MB')

  const form = new FormData()
  form.append('file', file)
  form.append('emos_id', userId)

  const res = await fetch(`${import.meta.env.VITE_TEMPORARY_ORIGIN || 'https://temporary.emos.best'}/upload`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`临时上传失败：${res.status} ${text}`.trim())
  }
  return (await res.json()) as { url: string }
}
