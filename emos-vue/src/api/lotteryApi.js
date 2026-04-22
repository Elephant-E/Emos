import api from './index.js';

const lotteryApi = {
  // 创建抽奖
  create(data) {
    return api.post('/api/lottery/create', data);
  },
  
  // 查看抽奖列表
  list(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return api.get(`/api/lottery/list?${query.toString()}`);
  },
  
  // 查看抽奖详情
  detail(lotteryId) {
    return api.get(`/api/lottery/${lotteryId}`);
  },
  
  // 取消抽奖
  cancel(lotteryId) {
    return api.delete(`/api/lottery/${lotteryId}`);
  },
  
  // 获取中奖列表
  winners(lotteryId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    return api.get(`/api/lottery/${lotteryId}/winners?${query.toString()}`);
  }
};

export default lotteryApi;
