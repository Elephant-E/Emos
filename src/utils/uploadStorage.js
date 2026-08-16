/**
 * 上传存储位置选项
 *
 * file_storage 取值（getUploadToken 请求参数）：
 * - global        国际（已停用）
 * - internal      国内（已停用）
 * - default       默认（已停用，后端不再分配可用存储设备）
 * - zn_r2_upload  Zn存档服R2（可用）
 * - google_drive  谷歌盘（可用）
 *
 * 仅对用户暴露当前可用的存储位置。
 */
export const UPLOAD_STORAGES = [
  {
    value: 'zn_r2_upload',
    label: 'Zn 存档服 (R2)',
    hint: '直连 R2，稳定，国内可用',
  },
  {
    value: 'google_drive',
    label: '谷歌盘 (Google Drive)',
    hint: '不支持国内直传，存在 CORS 限制',
  },
]

export const DEFAULT_UPLOAD_STORAGE = 'zn_r2_upload'