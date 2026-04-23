/**
 * TMDB API 封装
 */

import videoApi from './videoApi.js';

// TMDB API 配置（通过 Worker 代理）
const TMDB_BASE_URL = '/tmdb/3';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

/**
 * 获取视频预告片（通过 EMOS 后端代理）
 * @param {string|number} tmdbId - TMDB ID
 * @param {string} mediaType - 媒体类型：'movie' 或 'tv'
 * @returns {Promise<Object|null>} 预告片信息 { embed_url: string, key: string }
 */
export async function getTrailer(tmdbId, mediaType) {
  try {
    const response = await videoApi.getTrailer(tmdbId, mediaType);
    
    if (response && response.embed_url) {
      return {
        key: extractYouTubeKey(response.embed_url),
        embed_url: response.embed_url
      };
    }
    
    return null;
  } catch (error) {
    console.error('[TMDB API] 获取预告片失败:', error.message);
    return null;
  }
}

/**
 * 从 YouTube embed URL 中提取视频 key
 * @param {string} embedUrl - YouTube embed URL
 * @returns {string|null} 视频 key
 */
function extractYouTubeKey(embedUrl) {
  const match = embedUrl.match(/\/embed\/([^?]+)/);
  return match ? match[1] : null;
}

/**
 * 获取 TMDB 图片 URL（通过 Worker 代理）
 * @param {string} path - 图片路径（如 /xxx.jpg）
 * @param {string} size - 尺寸：'w500', 'w780', 'original' 等
 * @returns {string} 完整的图片 URL
 */
export function getImageUrl(path, size = 'w500') {
  if (!path) return '';
  // 使用 Worker 代理路径
  return `/tmdb-image/${size}${path}`;
}

export default {
  getTrailer,
  getImageUrl,
};
