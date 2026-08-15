import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const videoApi = createApi({
  list: {
    method: 'get',
    url: (params = {}) => `/api/video/list?${buildQuery(params)}`,
    passConfig: true,
  },
  detail: {
    method: 'get',
    url: (id) => `/api/video/${id}`,
  },
  getEpisodes: {
    method: 'get',
    url: (videoId, params = {}) => `/api/video/${videoId}/episode?${buildQuery(params)}`,
  },
  getMediaList: {
    method: 'get',
    url: (params = {}) => `/api/video/media/list?${buildQuery(params)}`,
  },
  renameMedia: {
    method: 'put',
    url: '/api/video/media/rename',
    body: false,
    params: (data) => ({ media_id: data.media_id, name: data.name }),
  },
  moveMedia: {
    method: 'put',
    url: '/api/video/media/move',
    body: false,
    params: (data) => ({ media_id: data.media_id, item_type: data.item_type, item_id: data.item_id }),
  },
  deleteMedia: {
    method: 'delete',
    url: '/api/video/media/delete',
    body: (data) => data,
  },
  getSubtitleList: {
    method: 'get',
    url: (params = {}) => `/api/video/subtitle/list?${buildQuery(params)}`,
  },
  renameSubtitle: {
    method: 'put',
    url: '/api/video/subtitle/rename',
    body: false,
    params: (data) => ({ subtitle_id: data.subtitle_id, title: data.title }),
  },
  deleteSubtitle: {
    method: 'delete',
    url: '/api/video/subtitle/delete',
    body: (data) => data,
  },
  sync: {
    method: 'patch',
    url: (params = {}) => `/api/video/sync?${buildQuery(params)}`,
  },
  search: {
    method: 'get',
    url: (params = {}) => `/api/video/search?${buildQuery(params)}`,
    passConfig: true,
  },
  tree: {
    method: 'get',
    url: (params = {}) => `/api/video/tree?${buildQuery(params)}`,
    passConfig: true,
  },
})

export default videoApi
