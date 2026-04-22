import api from './index.js';

const carrotApi = {
  // 获取萝卜变化记录
  history(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.user_id) query.append('user_id', params.user_id);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    return api.get(`/api/carrot/history?${query.toString()}`);
  },
  
  // 获取萝卜排行榜
  rank() {
    return api.get('/api/rank/carrot');
  },
  
  // 转赠萝卜
  transfer(userId, amount) {
    return api.put('/api/carrot/transfer', { user_id: userId, carrot: amount });
  }
};

export default carrotApi;
