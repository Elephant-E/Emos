import api from './index.js';

const voteApi = {
  // 创建投票
  create(data) {
    return api.post('/api/telegram/vote/create', data);
  },
  
  // 查看投票结果
  result(voteId) {
    return api.get(`/api/telegram/vote/result?vote_id=${voteId}`);
  }
};

export default voteApi;
