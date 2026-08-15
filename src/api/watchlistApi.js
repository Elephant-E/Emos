import api from './index.js';

const watchlistApi = {
  getList(params = {}) {
    return api.get('/api/watch', { params });
  },

  create(data) {
    return api.post('/api/watch', data);
  },

  delete(watchId) {
    return api.delete(`/api/watch/${watchId}`);
  },

  getVideos(watchId, params = {}) {
    return api.get(`/api/watch/${watchId}/video`, params);
  },

  searchVideos(watchId, params = {}) {
    return api.get(`/api/watch/${watchId}/video/search`, params);
  },

  addVideo(watchId, videoId, data = {}) {
    return api.post(`/api/watch/${watchId}/video/${videoId}`, data);
  },

  deleteVideo(watchId, videoId) {
    return api.delete(`/api/watch/${watchId}/video/${videoId}`);
  },

  emptyVideos(watchId) {
    return api.delete(`/api/watch/${watchId}/video/empty`);
  },

  updateMaintainer(watchId, maintainers) {
    return api.put(`/api/watch/${watchId}/maintainer`, { maintainers });
  },

  updateSort(watchId, sort) {
    return api.put(`/api/watch/${watchId}/sort`, null, {
      params: { sort }
    });
  },

  updateDynamic(watchId, url) {
    return api.put(`/api/watch/${watchId}/dynamic`, {
      url: url || null
    });
  },

  toggleShow(watchId) {
    return api.put(`/api/watch/${watchId}/show`);
  },

  toggleSubscribe(watchId) {
    return api.put(`/api/watch/${watchId}/subscribe`);
  },

  exchangeSlot() {
    return api.post('/api/watch/slot');
  }
};

export default watchlistApi;
