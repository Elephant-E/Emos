import api from './index.js';

/**
 * 求片相关 API
 */
const seekApi = {
  /**
   * 发布求片
   * @param {Object} data - 求片数据
   */
  create(data) {
    return api.post('/api/seek', data);
  },
  
  /**
   * 申请/取消求片（切换状态）
   * @param {string} itemType - 项目类型: 'vl' (视频库), 've' (单集)
   * @param {number} itemId - 项目ID
   */
  apply(itemType, itemId) {
    return api.put(`/api/seek/apply?item_type=${itemType}&item_id=${itemId}`);
  },
  
  /**
   * 认领求片
   * @param {number} seekId - 求片ID
   * @param {string} type - 操作类型: 'confirm' 认领, 'cancel' 取消
   */
  claim(seekId, type = 'confirm') {
    return api.put('/api/seek/claim', { seek_id: seekId, type });
  },
  
  /**
   * 催更求片
   * @param {number} seekId - 求片ID
   * @param {number} carrot - 萝卜数量
   */
  urge(seekId, carrot) {
    return api.put('/api/seek/urge', { seek_id: seekId, carrot });
  }
};

export default seekApi;
