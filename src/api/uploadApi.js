import api, { buildQuery } from './index.js'

const uploadApi = {
  rank() {
    return api.get('/api/rank/upload')
  },

  getUploadToken(data) {
    return api.post('/api/upload/getUploadToken', data)
  },

  getVideoBase(itemType, itemId) {
    const qs = buildQuery({ item_type: itemType, item_id: itemId })
    return api.get(`/api/upload/video/base?${qs}`)
  },

  videoSave(data) {
    return api.post('/api/upload/video/save', data)
  },

  subtitleSave(data) {
    return api.post('/api/upload/subtitle/save', data)
  },

  musicSave(data) {
    return api.post('/api/upload/music/save', data)
  }
}

export default uploadApi
