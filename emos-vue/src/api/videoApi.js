/**
 * 视频识别 API
 */

import api from './index.js';

export const videoApi = {
  /**
   * 获取视频列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 视频列表
   */
  list(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.title) query.append('title', params.title);  // ✅ 标题搜索
    if (params.tmdb_id) query.append('tmdb_id', params.tmdb_id);  // ✅ TMDB ID 搜索
    if (params.video_id) query.append('video_id', params.video_id);  // ✅ 单个视频ID
    return api.get(`/api/video/list?${query.toString()}`);
  },
  
  /**
   * 获取视频详情
   * @param {string|number} id - 视频ID
   * @returns {Promise<Object>} 视频详情
   */
  detail(id) {
    return api.get(`/api/video/${id}`);
  },
  
  /**
   * 获取季和集列表
   * @param {string|number} videoId - 视频ID
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>} 集列表
   */
  getEpisodes(videoId, params = {}) {
    const query = new URLSearchParams();
    if (params.with_seek_is_request) query.append('with_seek_is_request', params.with_seek_is_request);
    return api.get(`/api/video/${videoId}/episode?${query.toString()}`);
  },
  
  /**
   * 获取资源列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>} 资源列表
   */
  getMediaList(params = {}) {
    const query = new URLSearchParams();
    if (params.video_list_id) query.append('video_list_id', params.video_list_id);
    if (params.video_season_id != null) query.append('video_season_id', params.video_season_id);
    if (params.video_episode_id != null) query.append('video_episode_id', params.video_episode_id);
    if (params.video_part_id != null) query.append('video_part_id', params.video_part_id);
    if (params.video_media_id) query.append('video_media_id', params.video_media_id);
    return api.get(`/api/video/media/list?${query.toString()}`);
  },
  
  /**
   * 重命名资源
   * @param {Object} data - 重命名数据
   * @returns {Promise<Object>}
   */
  renameMedia(data) {
    return api.put('/api/video/media/rename', null, {
      params: {
        media_id: data.media_id,
        name: data.name
      }
    });
  },
  
  /**
   * 移动资源
   * @param {Object} data - 移动数据
   * @returns {Promise<Object>}
   */
  moveMedia(data) {
    return api.put('/api/video/media/move', null, {
      params: {
        media_id: data.media_id,
        item_type: data.item_type,
        item_id: data.item_id
      }
    });
  },
  
  /**
   * 删除资源
   * @param {Object} data - 删除数据
   * @returns {Promise<Object>}
   */
  deleteMedia(data) {
    return api.delete('/api/video/media/delete', {
      params: {
        media_id: data.media_id
      },
      data: data.reason ? { reason: data.reason } : {}
    });
  },
  
  /**
   * 获取字幕列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>} 字幕列表
   */
  getSubtitleList(params = {}) {
    const query = new URLSearchParams();
    if (params.video_list_id) query.append('video_list_id', params.video_list_id);
    if (params.video_episode_id != null) query.append('video_episode_id', params.video_episode_id);
    if (params.video_part_id != null) query.append('video_part_id', params.video_part_id);
    if (params.video_media_id) query.append('video_media_id', params.video_media_id);
    return api.get(`/api/video/subtitle/list?${query.toString()}`);
  },
  
  /**
   * 重命名字幕
   * @param {Object} data - 重命名数据
   * @returns {Promise<Object>}
   */
  renameSubtitle(data) {
    return api.put('/api/video/subtitle/rename', null, {
      params: {
        subtitle_id: data.subtitle_id,
        title: data.title
      }
    });
  },
  
  /**
   * 删除字幕
   * @param {Object} data - 删除数据
   * @returns {Promise<Object>}
   */
  deleteSubtitle(data) {
    return api.delete('/api/video/subtitle/delete', {
      params: {
        subtitle_id: data.subtitle_id
      },
      data: data.reason ? { reason: data.reason } : {}
    });
  },
  
  /**
   * 识别视频文件
   * @param {string} filename - 文件名
   * @returns {Promise<Object>} 识别结果
   */
  async identify(filename) {
    try {
      return await api.get('/api/video/identify', { filename });
    } catch (error) {
      console.error('[VideoAPI] 识别失败:', error);
      throw error;
    }
  },
  
  /**
   * 批量识别文件
   * @param {string[]} filenames - 文件名数组
   * @param {Function} onProgress - 进度回调 (current, total)
   * @returns {Promise<Array>} 识别结果数组
   */
  async identifyBatch(filenames, onProgress) {
    const results = [];
    const total = filenames.length;
    
    for (let i = 0; i < total; i++) {
      try {
        const result = await this.identify(filenames[i]);
        results.push({ success: true, data: result, filename: filenames[i] });
        
        if (onProgress) {
          onProgress(i + 1, total);
        }
        
        // 避免请求过快，延迟 500ms
        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        results.push({ success: false, error: error.message, filename: filenames[i] });
        
        if (onProgress) {
          onProgress(i + 1, total);
        }
      }
    }
    
    return results;
  },
  
  /**
   * 获取 TMDB 预告片
   * @param {string|number} tmdbId - TMDB ID
   * @param {string} mediaType - 媒体类型：'movie' 或 'tv'
   * @returns {Promise<Object>} 预告片信息 { embed_url: string }
   */
  getTrailer(tmdbId, mediaType) {
    const query = new URLSearchParams();
    query.append('tmdb_id', tmdbId);
    query.append('media_type', mediaType);
    return api.get(`/api/video/trailer?${query.toString()}`);
  },
};

export default videoApi;
