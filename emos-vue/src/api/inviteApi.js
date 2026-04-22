import api from './index.js';

const inviteApi = {
  // 获取我的邀请信息
  info() {
    return api.get('/api/invite/info');
  },
  
  // 获取邀请历史
  history(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    return api.get(`/api/invite/history?${query.toString()}`);
  },
  
  // 邀请用户
  send(userId) {
    return api.post('/api/invite', { invite_user_id: userId });
  },
  
  // 撤销邀请
  revoke(userId) {
    return api.post('/api/invite/revoke', { user_id: userId });
  }
};

export default inviteApi;
