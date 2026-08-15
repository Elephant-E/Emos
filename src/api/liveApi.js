import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const liveApi = createApi({
  getLibrary: { method: 'get', url: '/api/live/library' },
  getChannelList: {
    method: 'get',
    url: (params = {}) => {
      const qs = buildQuery(params)
      return qs ? `/api/live/list?${qs}` : '/api/live/list'
    },
    passConfig: true,
  },
  createOrUpdateChannel: {
    method: 'post',
    url: '/api/live/list',
    body: (data) => data,
  },
  getMediaList: {
    method: 'get',
    url: (params = {}) => `/api/live/media?${buildQuery(params)}`,
  },
  updateMediaBatch: {
    method: 'post',
    url: '/api/live/media/update',
    body: (data) => data,
  },
  deleteMedia: {
    method: 'delete',
    url: (mediaId) => `/api/live/media/${mediaId}`,
  },
  deleteChannel: {
    method: 'delete',
    url: (channelId) => `/api/live/list/${channelId}`,
  },
})

export default liveApi
