import { STORAGE_KEYS } from '@/utils/storage.js'

// API Base URL 配置
// 使用相对路径，通过 Vite 代理转发到后端
const API_BASE = '';


class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    this._redirecting = false; // 防重入：并发 401 只跳转一次
  }

  // 获取 Token
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
  }

  // 构建请求头
  buildHeaders(extraHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...extraHeaders };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  isRequestConfig(value) {
    if (!this.isPlainObject(value)) {
      return false;
    }

    const configKeys = [
      'params',
      'headers',
      'signal',
      'mode',
      'cache',
      'credentials',
      'redirect',
      'referrer',
      'referrerPolicy',
      'integrity',
      'keepalive',
      'body',
      'data'
    ];

    return configKeys.some((key) => key in value);
  }

  buildUrl(endpoint, params = {}) {
    const [path, existingQuery = ''] = endpoint.split('?');
    const query = new URLSearchParams(existingQuery);

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value == null || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item != null && item !== '') {
            query.append(key, item);
          }
        });
        return;
      }

      query.append(key, value);
    });

    const queryString = query.toString();
    return queryString ? `${path}?${queryString}` : path;
  }

  normalizeWriteArgs(dataOrConfig, config = {}) {
    if (config && Object.keys(config).length > 0) {
      return {
        data: dataOrConfig,
        ...config
      };
    }

    if (this.isRequestConfig(dataOrConfig)) {
      return {
        ...dataOrConfig,
        data: dataOrConfig.data
      };
    }

    return {
      data: dataOrConfig
    };
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    
    const config = {
      ...options,
      headers: {
        ...this.buildHeaders(options.headers)
      },
      signal: options.signal || controller.signal
    };

    let retries = 1;
    let lastError = null;

    while (retries >= 0) {
      try {
        const response = await fetch(url, config);

        if (response.status === 401) {
          if (!this._redirecting) {
            this._redirecting = true
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
            window.location.href = '/login';
          }
          throw new Error('登录已过期，请重新登录');
        }

        if (!response.ok) {
          let errorData = {};
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { message: text || `请求失败: ${response.status}` };
          }
          
          if (response.status === 530) {
            errorData.message = errorData.message || '服务器正在维护中，请稍后重试';
          }
          
          throw new Error(errorData.message || `请求失败: ${response.status}`);
        }

        if (response.status === 204 || options.method === 'DELETE') {
          return null;
        }

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error(text || '服务器返回了无效的数据格式');
        }
      } catch (error) {
        lastError = error;
        console.error(`API Error [${endpoint}] (尝试 ${2 - retries}/2):`, error);
        
        if (error.name === 'AbortError' && !options.signal) {
          lastError = new Error('请求超时，请检查网络连接');
        }
        
        const method = options.method || 'GET';
        const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'PUT';
        if (retries > 0 && isIdempotent && (error.name === 'TypeError' || error.message.includes('Load failed'))) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }

  // GET 请求
  get(endpoint, paramsOrConfig = {}) {
    const config = this.isRequestConfig(paramsOrConfig)
      ? paramsOrConfig
      : { params: paramsOrConfig };
    const { params, ...requestOptions } = config;

    return this.request(this.buildUrl(endpoint, params), {
      method: 'GET',
      ...requestOptions
    });
  }

  // POST 请求
  post(endpoint, dataOrConfig = {}, config = {}) {
    const normalized = this.normalizeWriteArgs(dataOrConfig, config);
    const { params, data, ...requestOptions } = normalized;

    return this.request(this.buildUrl(endpoint, params), {
      method: 'POST',
      ...requestOptions,
      body: requestOptions.body ?? JSON.stringify(data ?? {})
    });
  }

  // PUT 请求
  put(endpoint, dataOrConfig = {}, config = {}) {
    const normalized = this.normalizeWriteArgs(dataOrConfig, config);
    const { params, data, ...requestOptions } = normalized;

    return this.request(this.buildUrl(endpoint, params), {
      method: 'PUT',
      ...requestOptions,
      body: requestOptions.body ?? JSON.stringify(data ?? {})
    });
  }

  // PATCH 请求
  patch(endpoint, dataOrConfig = {}, config = {}) {
    const normalized = this.normalizeWriteArgs(dataOrConfig, config);
    const { params, data, ...requestOptions } = normalized;

    return this.request(this.buildUrl(endpoint, params), {
      method: 'PATCH',
      ...requestOptions,
      body: requestOptions.body ?? JSON.stringify(data ?? {})
    });
  }

  // DELETE 请求
  delete(endpoint, dataOrConfig = undefined, config = {}) {
    const normalized = this.normalizeWriteArgs(dataOrConfig, config);
    const { params, data, ...requestOptions } = normalized;
    const options = {
      method: 'DELETE',
      ...requestOptions
    };

    if (requestOptions.body !== undefined || data !== undefined) {
      options.body = requestOptions.body ?? JSON.stringify(data ?? {});
    }

    return this.request(this.buildUrl(endpoint, params), options);
  }
}

// 导出单例
const api = new ApiClient();

export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
}

export default api;
