import api from './index.js';

const signApi = {
  // 获取签到状态
  getStatus() {
    return api.get('/api/sign/check');
  },
  
  // 提交签到
  submit(content) {
    const url = content ? `/api/user/sign?content=${encodeURIComponent(content)}` : '/api/user/sign';
    return api.put(url);
  },
  
  // 获取签到排行榜
  rank() {
    return api.get('/api/rank/sign');
  }
};

export default signApi;
