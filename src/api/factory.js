import api from './index.js'

/**
 * 声明式 API 工厂：把"模板式"的 api 方法定义收敛为配置。
 *
 * 用法：
 *   createApi({
 *     // 静态端点
 *     getUserInfo: { method: 'get', url: '/api/user' },
 *
 *     // 动态端点（函数返回完整路径）
 *     getVideoDetail: { method: 'get', url: (id) => `/api/video/${id}` },
 *
 *     // 查询参数（api.get 的 config.params，可传 undefined/null 过滤）
 *     listWatches: { method: 'get', url: '/api/watch', params: (params) => params },
 *
 *     // 写操作 body（默认取第一个参数作为 data）
 *     createVideo: { method: 'post', url: '/api/video', body: (data) => data },
 *
 *     // delete 带 body（后端需要 data 载荷）
 *     deleteVideo: { method: 'delete', url: '/api/video/media/delete', body: (data) => data },
 *
 *     // 无 body 的写操作（put(url, null, { params })）
 *     updateBan: { method: 'put', url: '/api/ban/change', body: false, params: (type, id) => ({ type, user_id: id }) },
 *
 *     // config 透传（第二个参数原样传给 api.get，如 { signal } 用于取消请求）
 *     listVideos: { method: 'get', url: (params, config) => `/api/video/list`, passConfig: true },
 *   })
 */
export function createApi(definitions) {
  const methods = {
    get: api.get.bind(api),
    post: api.post.bind(api),
    put: api.put.bind(api),
    patch: api.patch.bind(api),
    delete: api.delete.bind(api),
  }

  const result = {}

  for (const [name, def] of Object.entries(definitions)) {
    const { method = 'get', url, params = null, body = null, passConfig = false } = def

    result[name] = function (...args) {
      // 解析端点：字符串直接用；函数用调用参数计算
      const endpoint = typeof url === 'function' ? url(...args) : url

      // 组装 config（params + 透传 config）
      const requestConfig = {}
      let hasConfig = false

      if (params) {
        requestConfig.params = typeof params === 'function' ? params(...args) : params
        hasConfig = true
      }

      if (passConfig) {
        const configArg = args[1]
        if (configArg && typeof configArg === 'object') {
          Object.assign(requestConfig, configArg)
          hasConfig = true
        }
      }

      const handler = methods[method]

      if (method === 'get') {
        return hasConfig ? handler(endpoint, requestConfig) : handler(endpoint)
      }

      if (method === 'delete') {
        // delete 带 body：原版形态 api.delete(url, { data: body })
        if (body) {
          const data = typeof body === 'function' ? body(...args) : args[0]
          return handler(endpoint, { data })
        }
        return hasConfig ? handler(endpoint, requestConfig) : handler(endpoint)
      }

      // 写操作（post/put/patch）：
      // - body === false → 无 body（null data + config）
      // - body 是函数     → 用调用参数计算 data
      // - body 为 null    → 仅当端点是静态字符串时取 args[0] 作为 data；
      //                    动态端点（url 是函数）时参数用于拼路径，默认无 body
      if (body === false) {
        return hasConfig ? handler(endpoint, null, requestConfig) : handler(endpoint, null)
      }

      if (typeof body === 'function') {
        const data = body(...args)
        return hasConfig ? handler(endpoint, data, requestConfig) : handler(endpoint, data)
      }

      // 静态端点：默认取 args[0] 作为 data（原版 api.put(url, data)）
      if (typeof url !== 'function') {
        const data = args[0] ?? {}
        return hasConfig ? handler(endpoint, data, requestConfig) : handler(endpoint, data)
      }

      // 动态端点且未声明 body：无 body（原版 api.put(url)）
      return hasConfig ? handler(endpoint, null, requestConfig) : handler(endpoint, null)
    }
  }

  return result
}

export default createApi