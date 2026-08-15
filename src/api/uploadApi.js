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
