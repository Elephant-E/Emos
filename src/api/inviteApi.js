import api, { buildQuery } from './index.js';

const inviteApi = {
  info() {
    return api.get('/api/invite/info');
  },
  
  history(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/invite/history?${qs}`);
  },
  
  send(userId) {
    return api.post('/api/invite', { invite_user_id: userId });
  },
  
  revoke(userId) {
    return api.post('/api/invite/revoke', { user_id: userId });
  },
  
  updateRemark(userId, remark) {
    return api.put('/api/invite/remark', { user_id: userId, remark: remark });
  }
};

export default inviteApi;
