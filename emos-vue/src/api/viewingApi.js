/**
 * 观影记录 API
 */

import api from './index.js';

export const viewingApi = {
  /**
   * 获取观影记录请求数（近一周）
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   * @returns {Promise<Object>} 观影记录列表
   */
  requests(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    return api.get(`/api/video/record/request?${query.toString()}`);
  },
};

export default viewingApi;
