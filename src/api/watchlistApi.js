import { createApi } from './factory.js'

const watchlistApi = createApi({
  getList: {
    method: 'get',
    url: '/api/watch',
    params: (params = {}) => params,
  },
  create: {
    method: 'post',
    url: '/api/watch',
    body: (data) => data,
  },
  delete: {
    method: 'delete',
    url: (watchId) => `/api/watch/${watchId}`,
  },
  getVideos: {
    method: 'get',
    url: (watchId, params = {}) => `/api/watch/${watchId}/video`,
    params: (watchId, params = {}) => params,
  },
  searchVideos: {
    method: 'get',
    url: (watchId, params = {}) => `/api/watch/${watchId}/video/search`,
    params: (watchId, params = {}) => params,
  },
  addVideo: {
    method: 'post',
    url: (watchId, videoId) => `/api/watch/${watchId}/video/${videoId}`,
    body: (watchId, videoId, data = {}) => data,
  },
  deleteVideo: {
    method: 'delete',
    url: (watchId, videoId) => `/api/watch/${watchId}/video/${videoId}`,
  },
  emptyVideos: {
    method: 'delete',
    url: (watchId) => `/api/watch/${watchId}/video/empty`,
  },
  updateMaintainer: {
    method: 'put',
    url: (watchId) => `/api/watch/${watchId}/maintainer`,
    body: (watchId, maintainers) => ({ maintainers }),
  },
  updateSort: {
    method: 'put',
    url: (watchId) => `/api/watch/${watchId}/sort`,
    body: false,
    params: (watchId, sort) => ({ sort }),
  },
  updateDynamic: {
    method: 'put',
    url: (watchId) => `/api/watch/${watchId}/dynamic`,
    body: (watchId, url) => ({ url: url || null }),
  },
  toggleShow: {
    method: 'put',
    url: (watchId) => `/api/watch/${watchId}/show`,
  },
  toggleSubscribe: {
    method: 'put',
    url: (watchId) => `/api/watch/${watchId}/subscribe`,
  },
  exchangeSlot: { method: 'post', url: '/api/watch/slot' },
})

export default watchlistApi
