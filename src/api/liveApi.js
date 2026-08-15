import api, { buildQuery } from './index.js';

const liveApi = {
  getLibrary() {
    return api.get('/api/live/library');
  },
  
  getChannelList(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(qs ? `/api/live/list?${qs}` : '/api/live/list', config);
  },
  
  createOrUpdateChannel(data) {
    return api.post('/api/live/list', data);
  },
  
  getMediaList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/live/media?${qs}`);
  },
  
  updateMediaBatch(data) {
    return api.post('/api/live/media/update', data);
  },
  
  deleteMedia(mediaId) {
    return api.delete(`/api/live/media/${mediaId}`);
  },
  
  deleteChannel(channelId) {
    return api.delete(`/api/live/list/${channelId}`);
  }
};

export default liveApi;
