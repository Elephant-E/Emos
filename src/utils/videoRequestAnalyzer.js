/**
 * 视频请求异常检测工具
 * 
 * 用于分析观影请求记录，智能识别异常高频访问行为
 * 核心原则：
 * - 正常行为：同一播放器在短时间内用 Range 分段请求同一视频文件（视频缓冲）
 * - 异常行为：同一 IP 短时间内请求大量不同文件、非播放器 UA 高频请求、无 Range 头的高频完整下载
 */

// 播放器 UA 白名单
export const PLAYER_UA_KEYWORDS = [
  'Lenna',
  'Hills',
  'EplayerX',
  'Yamby',
  'Senplayer',
  '小幻影视',
  'Forward',
  'Vidora',
  'CapyPlayer',
  'Afusekt',
  'VidHub',
  'Themby',
  'chaichai'
]

/**
 * 检查 UA 是否为已知播放器
 * @param {string} ua - User-Agent 字符串
 * @returns {boolean}
 */
export const isPlayerUA = (ua) => {
  if (!ua) return false
  return PLAYER_UA_KEYWORDS.some(keyword => ua.includes(keyword))
}

/**
 * 分析视频请求的异常程度（智能检测）
 * 
 * 核心原则：
 * - 正常行为：同一播放器在短时间内用 Range 分段请求同一视频文件，即使频率较高，也属于正常视频缓冲
 * - 异常行为：同一 IP 在短时间内请求大量不同文件，或非播放器 UA 的高频请求，或无 Range 头的完整下载高频
 * 
 * @param {Array} requestList - 请求记录列表
 * @param {Object} options - 配置选项
 * @param {number} options.timeWindow - 时间窗口（秒），默认 10 秒
 * @param {number} options.requestThreshold - 请求数阈值，默认 5 次
 * @returns {Object} 异常映射表，key 为记录标识，value 为异常信息
 */
export const analyzeVideoRequests = (requestList, options = {}) => {
  const TIME_WINDOW = options.timeWindow || 10 // 时间窗口：10秒
  const REQUEST_THRESHOLD = options.requestThreshold || 5 // 请求数阈值：5次
  
  const result = {}
  
  // 按 IP 分组
  const ipGroups = {}
  requestList.forEach(item => {
    if (!ipGroups[item.ip]) {
      ipGroups[item.ip] = []
    }
    ipGroups[item.ip].push(item)
  })
  
  // 对每个 IP 的请求进行分析
  Object.entries(ipGroups).forEach(([ip, requests]) => {
    // 按时间排序
    const sortedRequests = [...requests].sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime()
    })
    
    // 对每条记录进行判定
    sortedRequests.forEach((currentRequest) => {
      const currentTime = new Date(currentRequest.time).getTime()
      const windowStart = currentTime - TIME_WINDOW * 1000
      
      // Step 1: 找出同一 IP 在 [currentTime - T, currentTime] 内的所有记录
      const windowRequests = sortedRequests.filter(req => {
        const reqTime = new Date(req.time).getTime()
        return reqTime >= windowStart && reqTime <= currentTime
      })
      
      const count = windowRequests.length
      
      // Step 2 & 3: 若 count > N，则初步标记为"频繁"
      if (count > REQUEST_THRESHOLD) {
        // Step 4: 误报排除检查
        const allSameFile = windowRequests.every(req => 
          req.video_media_id === currentRequest.video_media_id
        )
        
        const allHasRange = windowRequests.every(req => 
          req.range && req.range.trim() !== ''
        )
        
        const allPlayerUA = windowRequests.every(req => 
          isPlayerUA(req.ua)
        )
        
        // 若以上全部满足，则认为这是正常的视频分段播放，豁免告警
        if (allSameFile && allHasRange && allPlayerUA) {
          // 正常播放，不标记异常
          return
        }
        
        // 否则，标记为异常
        const key = currentRequest.id || `${currentRequest.ip}_${currentRequest.time}`
        result[key] = {
          abnormal: true,
          reason: `${TIME_WINDOW}秒内${count}次请求`,
          level: 'high'
        }
      }
    })
  })
  
  return result
}

/**
 * 获取记录的异常信息
 * @param {Object} item - 请求记录项
 * @param {Object} abnormalMap - 异常映射表
 * @returns {Object|null} 异常信息或 null
 */
export const getAbnormalInfo = (item, abnormalMap) => {
  const key = item.id || `${item.ip}_${item.time}`
  return abnormalMap[key] || null
}
