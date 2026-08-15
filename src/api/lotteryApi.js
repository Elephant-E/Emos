import api, { buildQuery } from './index.js';

const lotteryApi = {
  create(data) {
    return api.post('/api/lottery/create', data);
  },
  
  list(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/lottery/list?${qs}`);
  },
  
  detail(lotteryId) {
    return api.get(`/api/lottery/${lotteryId}`);
  },
  
  cancel(lotteryId) {
    return api.delete(`/api/lottery/${lotteryId}`);
  },
  
  winners(lotteryId, params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/lottery/${lotteryId}/winners?${qs}`);
  }
};

export default lotteryApi;
