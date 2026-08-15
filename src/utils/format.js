export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export const formatFileSize = formatBytes;

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '未知';
  
  const now = new Date();
  const date = new Date(dateString);
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (months < 12) return `${months} 个月前`;
  return `${years} 年前`
}

/**
 * 数字滚动动画函数
 * @param {number} start - 起始值
 * @param {number} end - 结束值
 * @param {number} duration - 动画持续时间（毫秒）
 * @param {Function} onUpdate - 每次更新时的回调函数
 */
export function animateValue(start, end, duration, onUpdate, frameIds) {
  let startTime = null
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp
    const progress = Math.min((timestamp - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 4)
    const current = Math.floor(start + (end - start) * ease)
    onUpdate(current)
    if (progress < 1) {
      const id = requestAnimationFrame(step)
      if (frameIds) frameIds.push(id)
    }
  }
  const id = requestAnimationFrame(step)
  if (frameIds) frameIds.push(id)
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

export function getOriginalImageUrl(url) {
  if (!url) return null
  if (url.includes('emos') || url.includes('emosstore')) return url
  return url.replace(/\/w\d+\//, '/original/')
}

export function extractYear(dateString) {
  if (!dateString) return ''
  return dateString.substring(0, 4)
}

export function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data?.items || data?.list || []
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
