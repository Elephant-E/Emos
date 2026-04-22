import api from './index.js';

const lineApi = {
  // 获取所有线路列表
  list() {
    return api.get('/api/proxy/line');
  },
  
  // 添加线路
  add(data) {
    return api.post('/api/proxy/line', data);
  },
  
  // 删除线路
  delete(id) {
    return api.delete(`/api/proxy/line?id=${encodeURIComponent(id)}`);
  }
};

export default lineApi;
