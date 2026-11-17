import { parse } from 'parse-torrent-title'

interface ParsedFilename {
  /** 解析出的片名；没有可用标题时为 null */
  title: string | null
  season: number | null
  episode: number | null
  year: number | null
}

/**
 * 从文件名解析片名与季集（用 `parse-torrent-title` 在浏览器里跑）。
 * 上游 `POST /api/upload/video/recognize` 会把 `剧名.S02.mkv` 判成 S00E02，
 * 所以上传流程优先用这里的解析结果；中文「第10集」解不出，属已知边界。
 */
export function parseFilename(name: string): ParsedFilename {
  const cleaned = name.replace(/\.[^.]+$/, '')
  const info = parse(cleaned) as { title?: string; season?: number; episode?: number; year?: number }
  const title = info.title?.trim()
  return {
    // 解析器偶尔会把整串方括号内容当标题，这种情况宁可不给标题
    title: title && !/^[[(]/.test(title) ? title : null,
    season: typeof info.season === 'number' ? info.season : null,
    episode: typeof info.episode === 'number' ? info.episode : null,
    year: typeof info.year === 'number' ? info.year : null,
  }
}
