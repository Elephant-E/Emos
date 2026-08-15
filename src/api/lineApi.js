import api, { buildQuery } from './index.js';

const lineApi = {
  list(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/proxy/line${qs ? '?' + qs : ''}`);
  },
  
  add(data) {
    return api.post('/api/proxy/line', data);
  },
  
  delete(id) {
    return api.delete(`/api/proxy/line?id=${encodeURIComponent(id)}`);
  }
};

export default lineApi;
