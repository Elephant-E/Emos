import api, { buildQuery } from './index.js';

export const videoApi = {
  list(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/list?${qs}`, config);
  },
  
  detail(id) {
    return api.get(`/api/video/${id}`);
  },
  
  getEpisodes(videoId, params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/${videoId}/episode?${qs}`);
  },
  
  getMediaList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/media/list?${qs}`);
  },
  
  renameMedia(data) {
    return api.put('/api/video/media/rename', null, {
      params: {
        media_id: data.media_id,
        name: data.name
      }
    });
  },
  
  moveMedia(data) {
    return api.put('/api/video/media/move', null, {
      params: {
        media_id: data.media_id,
        item_type: data.item_type,
        item_id: data.item_id
      }
    });
  },
  
  deleteMedia(data) {
    const body = { media_id: data.media_id };
    if (data.reason) body.reason = data.reason;
    return api.delete('/api/video/media/delete', { data: body });
  },
  
  getSubtitleList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/subtitle/list?${qs}`);
  },
  
  renameSubtitle(data) {
    return api.put('/api/video/subtitle/rename', null, {
      params: {
        subtitle_id: data.subtitle_id,
        title: data.title
      }
    });
  },
  
  deleteSubtitle(data) {
    const body = { subtitle_id: data.subtitle_id };
    if (data.reason) body.reason = data.reason;
    return api.delete('/api/video/subtitle/delete', { data: body });
  },

  sync(params) {
    const qs = buildQuery(params);
    return api.patch(`/api/video/sync?${qs}`);
  },

  search(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/search?${qs}`, config);
  },

  tree(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/tree?${qs}`, config);
  }
};

export default videoApi;
