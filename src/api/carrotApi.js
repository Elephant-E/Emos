import api, { buildQuery } from './index.js';

const carrotApi = {
  history(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/carrot/history?${qs}`);
  },
  
  rank() {
    return api.get('/api/rank/carrot');
  },
  
  transfer(userId, amount) {
    return api.put('/api/carrot/transfer', { user_id: userId, carrot: amount });
  }
};

export default carrotApi;
