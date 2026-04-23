import api from './index.js';
import { STORAGE_KEYS } from '@/utils/storage.js';

const uploadApi = {
  getStoredUserId() {
    try {
      const userInfo = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.USER_INFO) ||
        localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) ||
        '{}'
      );
      return userInfo.id || userInfo.user_id || '';
    } catch (e) {
      console.warn('无法从 localStorage 获取用户信息:', e);
      return '';
    }
  },

  // 获取上传排行榜
  rank() {
    return api.get('/api/rank/upload');
  },

  /**
   * 获取上传 Token
   * @param {Object} params - 上传参数
   * @param {string} params.type - 资源类型：video | subtitle | image
   * @param {string} params.file_type - 文件格式：video/mp4, image/jpeg 等
   * @param {string} params.file_name - 文件名称
   * @param {number} params.file_size - 文件大小（字节）
   * @param {string} params.file_storage - 存储位置：global | internal | default
   * @returns {Promise<Object>} 返回上传 token 信息 { type, file_id, data: { upload_url } }
   */
  getUploadToken(params) {
    return api.post('/api/upload/getUploadToken', params);
  },

  /**
   * 保存视频上传结果
   * @param {Object} params - 保存参数
   * @param {string} params.item_type - 资源类型：vl | ve
   * @param {number} params.item_id - 资源 ID
   * @param {string} params.file_id - 文件 ID
   * @returns {Promise<Object>} 返回 { count, carrot, media_id }
   */
  saveVideoResult(params) {
    return api.post('/api/upload/video/save', params);
  },

  /**
   * 保存字幕上传结果
   * @param {Object} params - 保存参数
   * @param {string} params.item_type - 资源类型：vl | ve
   * @param {number} params.item_id - 资源 ID
   * @param {string} params.file_id - 文件 ID
   * @returns {Promise<Object>} 返回 { carrot, subtitle_id }
   */
  saveSubtitleResult(params) {
    return api.post('/api/upload/subtitle/save', params);
  },

  /**
   * 获取视频基本信息
   * @param {string} itemType - 资源类型：vl | ve
   * @param {number} itemId - 资源 ID
   * @returns {Promise<Object>} 返回视频基本信息
   */
  getVideoBaseInfo(itemType, itemId) {
    return api.get(`/api/upload/video/base`, { item_type: itemType, item_id: itemId });
  },

  /**
   * 上传文件到 OneDrive
   * @param {string} uploadUrl - 上传 URL
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 进度回调 (uploaded, total)
   * @returns {Promise<void>}
   */
  async uploadToOneDrive(uploadUrl, file, onProgress) {
    const start = 0;
    const end = file.size - 1;
    const total = file.size;

    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes ${start}-${end}/${total}`
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`OneDrive 上传失败: ${response.status}`);
      }

      return response;
    } catch (error) {
      throw new Error(`OneDrive 上传失败: ${error.message}`);
    }
  },

  /**
   * 上传文件到 R2
   * @param {string} uploadUrl - 上传 URL
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 进度回调 (uploaded, total)
   * @returns {Promise<void>}
   */
  async uploadToR2(uploadUrl, file, onProgress) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!response.ok) {
        throw new Error(`R2 上传失败: ${response.status}`);
      }

      return response;
    } catch (error) {
      throw new Error(`R2 上传失败: ${error.message}`);
    }
  },

  /**
   * 使用 tus 协议上传文件
   * @param {string} endpoint - tus 服务端点
   * @param {File} file - 文件对象
   * @param {string} userId - 用户 ID
   * @param {string} fileId - 文件 ID
   * @param {Function} onProgress - 进度回调 (bytesUploaded, bytesTotal)
   * @param {string} taskId - 任务 ID（用于暂停）
   * @returns {Promise<Object>} 返回 { file_id, url }
   */
  async uploadWithTus(endpoint, file, userId, fileId, onProgress, taskId) {
    // 检查 tus 库是否已加载（通过 window.tus 访问）
    if (typeof window.tus === 'undefined') {
      throw new Error('tus-js-client 库未加载，请先引入 tus-js-client');
    }

    // 验证必要参数
    if (!userId || !fileId) {
      throw new Error('上传参数错误：缺少 user_id 或 file_id');
    }

    return new Promise((resolve, reject) => {
      const upload = new window.tus.Upload(file, {
        endpoint: endpoint,
        chunkSize: 100 * 1024 * 1024, // 100MB
        retryDelays: [0, 1000],
        removeFingerprintOnSuccess: true,
        metadata: {
          user_id: userId,
          file_id: fileId,
        },
        headers: {
          'Authorization': `Bearer ${api.getToken() || ''}`,
        },
        onError: (error) => {
          console.error('Tus 上传失败:', error);
          // 清理存储的上传实例
          if (taskId && window.tusUploads) {
            delete window.tusUploads[taskId];
          }
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          // console.log(`上传进度: ${bytesUploaded}/${bytesTotal} (${percentage}%)`);
          if (onProgress) onProgress(bytesUploaded, bytesTotal);
        },
        onSuccess: () => {
          try {
            const responseBody = upload.lastResponse ? upload.lastResponse.getBody() : '';
            let file_id, url;
            
            if (responseBody) {
              try {
                const data = JSON.parse(responseBody);
                file_id = data.file_id || fileId;
                url = data.url || '';
              } catch (e) {
                file_id = fileId;
                url = '';
              }
            } else {
              file_id = fileId;
              url = '';
            }
            
            // 清理存储的上传实例
            if (taskId && window.tusUploads) {
              delete window.tusUploads[taskId];
            }
            
            resolve({ file_id, url });
          } catch (error) {
            // 清理存储的上传实例
            if (taskId && window.tusUploads) {
              delete window.tusUploads[taskId];
            }
            resolve({ file_id: fileId, url: '' });
          }
        }
      });

      // 存储上传实例以便后续可以中断
      if (taskId) {
        if (!window.tusUploads) {
          window.tusUploads = {};
        }
        window.tusUploads[taskId] = upload;
      }

      upload.start();
    });
  },

  /**
   * 根据存储类型上传文件
   * @param {string} type - 存储类型：onedrive | r2 | tusd
   * @param {Object} data - 上传数据
   * @param {File} file - 文件对象
   * @param {Object} options - 其他选项
   * @returns {Promise<Object>}
   */
  async uploadFile(type, data, file, options = {}) {
    const { upload_url } = data;

    switch (type) {
      case 'onedrive':
        return await this.uploadToOneDrive(upload_url, file, options.onProgress);

      case 'r2':
        return await this.uploadToR2(upload_url, file, options.onProgress);

      case 'tusd':
        return await this.uploadWithTus(
          upload_url || 'https://file.emos.best/files/',
          file,
          options.userId || '',
          options.fileId || '',
          options.onProgress,
          options.taskId // 传递 taskId
        );

      default:
        throw new Error(`不支持的存储类型: ${type}`);
    }
  },

  /**
   * 完整的视频上传流程
   * @param {Object} options - 上传选项
   * @param {File} options.file - 文件对象
   * @param {string} options.itemType - 资源类型：vl | ve
   * @param {number} options.itemId - 资源 ID
   * @param {string} options.fileStorage - 存储位置：global | internal | default
   * @param {Function} options.onProgress - 进度回调 (bytesUploaded, bytesTotal)
   * @param {string} options.taskId - 任务 ID（用于暂停）
   * @returns {Promise<Object>} 返回 { count, carrot, media_id }
   */
  async uploadVideo(options) {
    const { file, itemType, itemId, fileStorage = 'default', onProgress, taskId } = options;

    try {
      // 1. 获取视频基本信息
      const baseInfo = await this.getVideoBaseInfo(itemType, itemId);

      // 2. 获取上传 Token
      const tokenData = await this.getUploadToken({
        type: 'video',
        file_type: file.type,
        file_name: file.name,
        file_size: file.size,
        file_storage: fileStorage
      });

      // 从 localStorage 获取用户 ID
      let userId = tokenData.user_id || this.getStoredUserId();

      // 3. 上传文件
      await this.uploadFile(tokenData.type, tokenData.data, file, {
        userId: userId,
        fileId: tokenData.file_id,
        onProgress: onProgress,
        taskId: taskId // 传递 taskId
      });

      // 4. 保存上传结果
      const result = await this.saveVideoResult({
        item_type: itemType,
        item_id: itemId,
        file_id: tokenData.file_id
      });

      return result;
    } catch (error) {
      console.error('视频上传失败:', error);
      throw error;
    }
  },

  /**
   * 完整的字幕上传流程
   * @param {Object} options - 上传选项
   * @param {File} options.file - 文件对象
   * @param {string} options.itemType - 资源类型：vl | ve
   * @param {number} options.itemId - 资源 ID
   * @param {string} options.fileStorage - 存储位置：global | internal | default
   * @param {Function} options.onProgress - 进度回调 (bytesUploaded, bytesTotal)
   * @param {string} options.taskId - 任务 ID（用于暂停）
   * @returns {Promise<Object>} 返回 { carrot, subtitle_id }
   */
  async uploadSubtitle(options) {
    const { file, itemType, itemId, fileStorage = 'default', onProgress, taskId } = options;

    try {
      // 1. 获取上传 Token
      const tokenData = await this.getUploadToken({
        type: 'subtitle',
        file_type: file.type,
        file_name: file.name,
        file_size: file.size,
        file_storage: fileStorage
      });

      // 从 localStorage 获取用户 ID
      let userId = tokenData.user_id || this.getStoredUserId();

      // 2. 上传文件
      await this.uploadFile(tokenData.type, tokenData.data, file, {
        userId: userId,
        fileId: tokenData.file_id,
        onProgress: onProgress,
        taskId: taskId // 传递 taskId
      });

      // 3. 保存上传结果
      const result = await this.saveSubtitleResult({
        item_type: itemType,
        item_id: itemId,
        file_id: tokenData.file_id
      });

      return result;
    } catch (error) {
      console.error('字幕上传失败:', error);
      throw error;
    }
  }
};

export default uploadApi;
