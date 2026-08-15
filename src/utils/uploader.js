/**
 * 上传服务
 * 通用上传逻辑，支持：临时文件、视频、字幕、图片等
 */

import api from '@/api/index.js'
import uploadApi from '@/api/uploadApi.js'
import { STORAGE_KEYS } from '@/utils/storage.js'

class Uploader {
  // 获取用户 ID
  getUserId() {
    try {
      const userInfo = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.USER_INFO) ||
        localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) ||
        '{}'
      )
      return userInfo.id || userInfo.user_id || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * 临时文件上传（红包封面等）
   * @param {File} file - 文件对象（80MB 内）
   * @returns {Promise<{url: string}>} 返回直链地址
   */
  async uploadTemporary(file) {
    const userId = this.getUserId()
    if (!userId) {
      throw new Error('用户未登录')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('emos_id', userId)

    const response = await fetch('https://temporary.emos.best/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api.getToken() || ''}`
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`上传失败: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * 通用上传（支持视频、字幕、图片）
   * @param {File} file - 文件对象
   * @param {Object} options - 选项
   * @param {string} options.type - 资源类型：video | subtitle | image
   * @param {string} options.storage - 存储位置：global | internal | default
   * @param {Function} options.onProgress - 进度回调
   * @param {Object} options.xhr - XHR 引用（用于取消）
   * @param {number} options.resumeFrom - 断点续传起始位置
   * @param {string} options.uploadUrl - 已有的上传 URL（断点续传）
   * @param {string} options.fileId - 已有的文件 ID（断点续传）
   * @param {Function} options.onUploadInfo - 上传信息回调（用于保存断点续传信息）
   * @returns {Promise<{file_id: string, url: string}>}
   */
  async upload(file, options = {}) {
    const { 
      type = 'image', 
      storage = 'default', 
      onProgress, 
      xhr,
      resumeFrom = 0,
      uploadUrl: existingUrl,
      fileId: existingFileId,
      onUploadInfo
    } = options

    let uploadUrl = existingUrl
    let fileId = existingFileId
    let uploadType = null
    let userId = null

    if (!uploadUrl || !fileId) {
      const tokenData = await uploadApi.getUploadToken({
        type,
        file_type: file.type || 'application/octet-stream',
        file_name: file.name,
        file_size: file.size,
        file_storage: storage,
      })

      uploadType = tokenData.type
      fileId = tokenData.file_id
      uploadUrl = tokenData.data.upload_url
      userId = tokenData.user_id || this.getUserId()
      
      if (onUploadInfo) {
        onUploadInfo({
          storageType: uploadType,
          uploadUrl,
          fileId,
          userId
        })
      }
    } else {
      const tokenData = await uploadApi.getUploadToken({
        type,
        file_type: file.type || 'application/octet-stream',
        file_name: file.name,
        file_size: file.size,
        file_storage: storage,
      })
      uploadType = tokenData.type
      userId = tokenData.user_id || this.getUserId()
    }

    if (uploadType === 'onedrive') {
      await this.uploadToOneDriveXHR(file, uploadUrl, { 
        onProgress, 
        xhr,
        resumeFrom 
      })
      return { file_id: fileId, url: '' }
    } else if (uploadType === 'r2') {
      await this.uploadToR2XHR(file, uploadUrl, { onProgress, xhr })
      return { file_id: fileId, url: '' }
    } else if (uploadType === 'tusd') {
      const result = await this.uploadWithTusd(file, { 
        userId, 
        fileId,
        uploadUrl,
        onProgress,
        resumeFrom,
        onTusUpload: (tusUpload) => {
          if (xhr) xhr.tusUpload = tusUpload
        }
      })
      return { file_id: result.file_id || fileId, url: result.url || '' }
    } else {
      throw new Error(`不支持的存储类型: ${uploadType}`)
    }
  }

  /**
   * 图片上传
   */
  async uploadImage(file, options = {}) {
    return this.upload(file, { ...options, type: 'image' })
  }

  /**
   * 视频上传
   */
  async uploadVideo(file, options = {}) {
    return this.upload(file, { ...options, type: 'video' })
  }

  /**
   * 字幕上传
   */
  async uploadSubtitle(file, options = {}) {
    return this.upload(file, { ...options, type: 'subtitle' })
  }

  /**
   * 查询 OneDrive upload session 状态
   * @returns {Promise<{nextExpectedRanges: string[]}>}
   */
  async queryOneDriveSession(uploadUrl) {
    const response = await fetch(uploadUrl, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`查询上传状态失败: ${response.status}`)
    }
    return await response.json()
  }

  /**
   * OneDrive 上传 (XMLHttpRequest，支持断点续传和重试)
   */
  async uploadToOneDriveXHR(file, uploadUrl, options = {}) {
    const { onProgress, xhr, resumeFrom = 0 } = options
    const totalSize = file.size
    const chunkSize = 200 * 1024 * 1024
    const maxRetries = 3
    
    let uploadedBytes = 0
    
    if (resumeFrom > 0) {
      try {
        const session = await this.queryOneDriveSession(uploadUrl)
        if (session.nextExpectedRanges && session.nextExpectedRanges.length > 0) {
          const range = session.nextExpectedRanges[0]
          const match = range.match(/(\d+)-/)
          if (match) {
            uploadedBytes = parseInt(match[1], 10)
          }
        }
      } catch (e) {
        console.warn('[OneDrive] 查询 session 失败，从头开始:', e.message)
        uploadedBytes = 0
      }
    }
    
    while (uploadedBytes < totalSize) {
      const start = uploadedBytes
      const end = Math.min(start + chunkSize, totalSize)
      const chunk = file.slice(start, end)
      
      let lastError = null
      let success = false
      
      for (let retry = 0; retry < maxRetries && !success; retry++) {
        try {
          await new Promise((resolve, reject) => {
            const xhrInstance = new XMLHttpRequest()
            
            xhrInstance.upload.onprogress = (e) => {
              if (e.lengthComputable && onProgress) {
                onProgress(start + e.loaded, totalSize)
              }
            }
            
            xhrInstance.onload = () => {
              if (xhrInstance.status === 200 || xhrInstance.status === 201) {
                uploadedBytes = totalSize
                success = true
                resolve()
              } else if (xhrInstance.status === 202) {
                uploadedBytes = end
                success = true
                resolve()
              } else if (xhrInstance.status === 416) {
                this.queryOneDriveSession(uploadUrl)
                  .then(session => {
                    if (session.nextExpectedRanges && session.nextExpectedRanges.length > 0) {
                      const range = session.nextExpectedRanges[0]
                      const match = range.match(/(\d+)-/)
                      if (match) {
                        uploadedBytes = parseInt(match[1], 10)
                        if (uploadedBytes >= totalSize) {
                          uploadedBytes = totalSize
                          success = true
                          resolve()
                        } else {
                          resolve()
                        }
                      } else {
                        reject(new Error('无法解析上传范围'))
                      }
                    } else {
                      uploadedBytes = totalSize
                      success = true
                      resolve()
                    }
                  })
                  .catch(err => reject(err))
              } else {
                reject(new Error(`上传失败: ${xhrInstance.status}`))
              }
            }
            
            xhrInstance.onerror = () => reject(new Error('网络错误'))
            xhrInstance.onabort = () => reject(new Error('上传已取消'))
            
            xhrInstance.open('PUT', uploadUrl)
            xhrInstance.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`)
            xhrInstance.send(chunk)
            
            if (xhr) xhr.ref = xhrInstance
          })
        } catch (error) {
          lastError = error
          if (error.message === '上传已取消') {
            throw error
          }
          if (retry < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (retry + 1)))
          }
        }
      }
      
      if (!success && uploadedBytes < totalSize) {
        throw lastError || new Error('上传失败')
      }
    }
  }

  /**
   * R2 上传 (XMLHttpRequest，支持重试)
   */
  async uploadToR2XHR(file, uploadUrl, options = {}) {
    const { onProgress, xhr } = options
    const maxRetries = 3
    
    let lastError = null
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        await new Promise((resolve, reject) => {
          const xhrInstance = new XMLHttpRequest()
          
          xhrInstance.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
              onProgress(e.loaded, e.total)
            }
          }
          
          xhrInstance.onload = () => {
            if (xhrInstance.status === 200 || xhrInstance.status === 201) {
              resolve()
            } else {
              reject(new Error(`上传失败: ${xhrInstance.status}`))
            }
          }
          
          xhrInstance.onerror = () => reject(new Error('网络错误'))
          xhrInstance.onabort = () => reject(new Error('上传已取消'))
          
          xhrInstance.open('PUT', uploadUrl)
          xhrInstance.send(file)
          
          if (xhr) xhr.ref = xhrInstance
        })
        return
      } catch (error) {
        lastError = error
        if (error.message === '上传已取消') {
          throw error
        }
        if (retry < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (retry + 1)))
        }
      }
    }
    
    throw lastError || new Error('上传失败')
  }

  /**
   * tusd 上传（支持断点续传）
   */
  async uploadWithTusd(file, options = {}) {
    const { userId, fileId, uploadUrl, onProgress, resumeFrom = 0, onTusUpload } = options

    if (typeof window.tus === 'undefined') {
      throw new Error('tus-js-client 库未加载')
    }

    if (!userId || !fileId) {
      throw new Error('缺少 userId 或 fileId')
    }

    return new Promise((resolve, reject) => {
      const upload = new window.tus.Upload(file, {
        endpoint: uploadUrl || 'https://file.emos.best/files/',
        chunkSize: 100 * 1024 * 1024,
        retryDelays: [0, 1000, 3000],
        removeFingerprintOnSuccess: true,
        metadata: {
          user_id: String(userId),
          file_id: String(fileId),
        },
        headers: {
          'Authorization': `Bearer ${api.getToken() || ''}`,
        },
        offset: undefined,
        onError: (error) => {
          const msg = error.message || ''
          if (msg.includes('failed to resume') || msg.includes('resume upload')) {
            console.warn('[tus] 恢复上传失败，从头开始:', msg)
            const freshUpload = new window.tus.Upload(file, {
              endpoint: uploadUrl || 'https://file.emos.best/files/',
              chunkSize: 100 * 1024 * 1024,
              retryDelays: [0, 1000, 3000],
              removeFingerprintOnSuccess: true,
              metadata: {
                user_id: String(userId),
                file_id: String(fileId),
              },
              headers: {
                'Authorization': `Bearer ${api.getToken() || ''}`,
              },
              onError: (e2) => reject(new Error(e2.message || 'tus 上传失败')),
              onProgress: (bytesUploaded, bytesTotal) => {
                if (onProgress) onProgress(bytesUploaded, bytesTotal)
              },
              onSuccess: () => {
                const responseBody = freshUpload.lastResponse?.getBody() || ''
                let resultFileId = fileId
                let url = ''
                try {
                  const data = JSON.parse(responseBody)
                  resultFileId = data.file_id || fileId
                  url = data.url || ''
                } catch (e) {}
                resolve({ file_id: resultFileId, url })
              },
            })
            if (onTusUpload) onTusUpload(freshUpload)
            freshUpload.start()
            return
          }
          reject(new Error(msg || 'tus 上传失败'))
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          if (onProgress) onProgress(bytesUploaded, bytesTotal)
        },
        onSuccess: () => {
          const responseBody = upload.lastResponse?.getBody() || ''
          let resultFileId = fileId
          let url = ''

          try {
            const data = JSON.parse(responseBody)
            resultFileId = data.file_id || fileId
            url = data.url || ''
          } catch (e) {}

          resolve({ file_id: resultFileId, url })
        },
      })

      if (onTusUpload) {
        onTusUpload(upload)
      }

      upload.start()
    })
  }
}

const uploader = new Uploader()

export default uploader

