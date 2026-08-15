import { escapeHtml } from '@/utils/format.js'

/**
 * Toast 提示工具
 */
const TOAST_CONFIG = {
  duration: 2500,
  hideDuration: 400,
  maxCount: 5,
};

const ICON_MAP = {
  info: 'fa-info-circle',
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
};

export function showToast(message, type = 'info', options = {}) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }

  const { duration = TOAST_CONFIG.duration } = options;

  const currentToasts = container.querySelectorAll('.toast-apple:not(.hide)');
  if (currentToasts.length >= TOAST_CONFIG.maxCount) {
    const oldest = currentToasts[0];
    oldest.classList.add('hide');
    setTimeout(() => oldest.remove(), TOAST_CONFIG.hideDuration);
  }

  const toast = document.createElement('div');
  toast.className = `toast-apple ${type}`;

  toast.innerHTML = `
    <i class="fas ${ICON_MAP[type] || ICON_MAP.info}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), TOAST_CONFIG.hideDuration);
  }, duration);
}

export function showSuccess(message, options = {}) {
  showToast(message, 'success', options);
}

export function showError(message, options = {}) {
  showToast(message, 'error', options);
}

export function showWarning(message, options = {}) {
  showToast(message, 'warning', options);
}

export function showInfo(message, options = {}) {
  showToast(message, 'info', options);
}

export function clearAllToasts() {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toasts = container.querySelectorAll('.toast-apple');
  toasts.forEach(toast => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), TOAST_CONFIG.hideDuration);
  });
}

