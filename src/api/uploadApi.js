import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const uploadApi = createApi({
  rank: { method: 'get', url: '/api/rank/upload' },
  getUploadToken: {
    method: 'post',
    url: '/api/upload/getUploadToken',
    body: (data) => data,
  },
  getVideoBase: {
    method: 'get',
    url: (itemType, itemId) =>
      `/api/upload/video/base?${buildQuery({ item_type: itemType, item_id: itemId })}`,
  },
  // multipart 分片上传（token 返回 type=multipart 时使用）：
  // presign -> 逐片 PUT（拿 ETag）-> complete；失败 abort
  multipartPresign: {
    method: 'post',
    url: (fileId) => `/api/upload/multipart/${fileId}/presign`,
    body: (fileId, data) => data,
  },
  multipartComplete: {
    method: 'post',
    url: (fileId) => `/api/upload/multipart/${fileId}/complete`,
    body: (fileId, data) => data,
  },
  multipartAbort: {
    method: 'delete',
    url: (fileId) => `/api/upload/multipart/${fileId}/abort`,
  },
  videoSave: {
    method: 'post',
    url: '/api/upload/video/save',
    body: (data) => data,
  },
  subtitleSave: {
    method: 'post',
    url: '/api/upload/subtitle/save',
    body: (data) => data,
  },
  musicSave: {
    method: 'post',
    url: '/api/upload/music/save',
    body: (data) => data,
  },
})

export default uploadApi
