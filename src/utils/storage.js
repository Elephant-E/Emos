/**
 * LocalStorage 键名常量
 */
export const STORAGE_KEYS = {
  ACTIVE_TOKEN: 'activeToken',
  ACTIVE_USER: 'activeUser',
  USER_INFO: 'emos_user_info',
  ACCOUNTS: 'accounts',
  THEME: 'theme',
  UPLOAD_STATE: 'upload_state',
};

/**
 * Storage 工具类
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};
