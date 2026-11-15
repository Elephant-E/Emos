/**
 * 图片地址的清晰度处理。
 *
 * 上游返回的封面/海报是固定宽度的缩略图（TMDB 常见 w185 = 185×278）。
 * 表格里 44×25、72×108 用 w185 刚好；但网格卡片上一张图要占 170–210 CSS px，
 * 在 2x 屏上就是 340–420 设备像素，用 w185 会明显糊。
 *
 * 这里只做一件事：把 TMDB 图床的尺寸段换掉，其它图床原样返回。
 * 不改上游数据、不改接口，调用处按用途声明需要多大。
 */
export type ImageSize = 'thumb' | 'card'

const TMDB_SIZE: Record<ImageSize, string> = {
  // 表格缩略图、详情页头海报：显示尺寸只有 44×25 / 72×108，w185 已经够
  thumb: 'w185',
  // 网格卡片：一张要占 170–210 CSS px，2x 屏就是 340–420 设备像素，必须给原图
  card: 'original',
}

/**
 * 按用途改写图片地址。只处理 image.tmdb.org/t/p/<size>/... 这种形式，
 * 其它地址（自制图床、picsum、theotherdb）原样返回，避免误伤。
 */
export function sizedImage(url: string | null | undefined, size: ImageSize): string | null | undefined {
  if (!url) return url
  if (!/^https?:\/\/image\.tmdb\.org\/t\/p\//.test(url)) return url
  return url.replace(/\/t\/p\/(?:w\d+|original)\//, `/t/p/${TMDB_SIZE[size]}/`)
}
