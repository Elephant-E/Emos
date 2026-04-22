import api from './index.js';

/**
 * 直播相关 API
 */
const liveApi = {
  // ==================== 频道管理 ====================
  
  /**
   * 获取媒体库
   */
  getLibrary() {
    return api.get('/api/live/library');
  },
  
  /**
   * 获取频道列表或单个频道详情
   * @param {Object} params - 查询参数（可选）
   * @param {number} params.id - 频道ID
   * @param {string} params.title - 搜索标题
   */
  getChannelList(params = {}) {
    const query = new URLSearchParams();
    if (params.id) query.append('id', params.id);
    if (params.title) query.append('title', params.title);
    
    const queryString = query.toString();
    return api.get(queryString ? `/api/live/list?${queryString}` : '/api/live/list');
  },
  
  /**
   * 创建或编辑频道
   * @param {Object} data - 频道数据
   */
  createOrUpdateChannel(data) {
    return api.post('/api/live/list', data);
  },
  
  // ==================== 直播源管理 ====================
  
  /**
   * 获取直播源列表
   * @param {Object} params - 查询参数
   * @param {number} params.live_list_id - 频道ID
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   * @param {string} params.name - 搜索关键词
   */
  getMediaList(params) {
    const query = new URLSearchParams();
    if (params.live_list_id) query.append('live_list_id', params.live_list_id);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.name) query.append('name', params.name);
    
    return api.get(`/api/live/media?${query.toString()}`);
  },
  
  /**
   * 批量更新直播源
   * @param {Object} data - 更新数据
   */
  updateMediaBatch(data) {
    return api.post('/api/live/media/update', data);
  },
  
  /**
   * 删除直播源
   * @param {number} mediaId - 直播源ID
   */
  deleteMedia(mediaId) {
    return api.delete(`/api/live/media/${mediaId}`);
  },
  
  /**
   * 删除频道
   * @param {number} channelId - 频道ID
   */
  deleteChannel(channelId) {
    return api.delete(`/api/live/list/${channelId}`);
  }
};

export default liveApi;
