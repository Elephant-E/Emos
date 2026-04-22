import api from './index.js';

/**
 * 片单相关 API
 */
const watchlistApi = {
  /**
   * 获取片单列表
   */
  getList() {
    return api.get('/api/watch');
  },
  
  /**
   * 创建片单
   * @param {Object} data - 片单数据
   */
  create(data) {
    return api.post('/api/watch', data);
  },
  
  /**
   * 添加视频到片单
   * @param {number} watchId - 片单ID
   * @param {Object} data - 视频数据
   */
  addVideo(watchId, data) {
    return api.post(`/api/watch/${watchId}/video`, data);
  },
  
  /**
   * 订阅/取消订阅片单
   * @param {number} watchId - 片单ID
   */
  toggleSubscribe(watchId) {
    return api.put(`/api/watch/${watchId}/subscribe`)
  }
};

export default watchlistApi;
