// 检测是否为本地开发环境（localhost）
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API Base URL 配置：
// 1. 本地开发：使用空字符串（通过 Vite 代理）
// 2. 生产环境：使用生产地址
let API_BASE;
if (isLocalhost) {
  // 本地开发：使用空字符串，通过 Vite 代理转发到后端
  API_BASE = '';
} else {
  API_BASE = 'https://emos.best';
}

// 打印当前环境信息（仅开发环境）
if (import.meta.env.DEV) {
  if (isLocalhost) {
    console.log('💻 当前环境: 本地开发模式');
    console.log('🔧 Base URL:', API_BASE || '(使用 Vite 代理)', '(直连 EMOS Backend)');
  } else {
    console.log('✅ 当前环境: 生产模式');
  }
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  // 获取 Token
  getToken() {
    return localStorage.getItem('activeToken');
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
    const config = {
      ...options,
      headers: this.buildHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);

      // 处理 401 未授权 - 只在真正的401时才清除token
      if (response.status === 401) {
        console.error('🔴 API 401 错误:', endpoint);
        console.error('   Token:', this.getToken() ? this.getToken().substring(0, 20) + '...' : '无');
        console.error('   即将清除 token 并跳转到登录页');
        localStorage.removeItem('activeToken');
        localStorage.removeItem('activeUser');
        window.location.href = '/login';
        throw new Error('登录已过期，请重新登录');
      }

      // 530或其他错误不要清除token，可能是网络或服务器问题
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // 如果解析JSON失败，尝试获取文本内容
          const text = await response.text().catch(() => '');
          errorData = { message: text || `请求失败: ${response.status}` };
        }
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      }

      // DELETE 请求或 204 状态码可能没有响应体
      if (response.status === 204 || options.method === 'DELETE') {
        return null;
      }

      // 克隆响应用于错误处理
      const clonedResponse = response.clone();
      
      try {
        return await response.json();
      } catch (e) {
        console.error(`Response is not JSON [${endpoint}]:`, e);
        try {
          const text = await clonedResponse.text();
          console.error('Response content:', text.substring(0, 500));
          console.error('Response status:', response.status);
          console.error('Response headers:', Object.fromEntries(response.headers.entries()));
          throw new Error(`服务器返回了无效的数据格式: ${text.substring(0, 100)}`);
        } catch (textError) {
          throw new Error('服务器返回了无效的数据格式');
        }
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
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
export default api;
