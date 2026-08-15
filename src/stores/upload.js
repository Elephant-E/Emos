import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import uploadApi from '@/api/uploadApi.js'
import uploader from '@/utils/uploader.js'
import { identifyVideoFile as identifyVideoFileLogic, identifyMusicFile as identifyMusicFileLogic } from '@/utils/identify.js'

const UPLOAD_QUEUE_KEY = 'upload_queue'
const MAX_CONCURRENCY = 10
const DEFAULT_CONCURRENCY = 3

export const useUploadStore = defineStore('upload', () => {
  const queue = ref([])
  const concurrency = ref(DEFAULT_CONCURRENCY)
  
  const activeCount = computed(() => 
    queue.value.filter(item => 
      (item.status === 'uploading' || item.status === 'saving') && item._active
    ).length
  )
  
  const uploadingItems = computed(() => 
    queue.value.filter(item => item.status === 'uploading' || item.status === 'saving')
  )
  
  const waitingItems = computed(() => 
    queue.value.filter(item => item.status === 'waiting')
  )
  
  const readyItems = computed(() => 
    queue.value.filter(item => item.status === 'ready')
  )
  
  const pausedItems = computed(() => 
    queue.value.filter(item => item.status === 'paused')
  )
  
  const hasActiveUploads = computed(() => activeCount.value > 0)
  
  const detectFileType = (file) => {
    const name = file.name.toLowerCase()
    const type = file.type
    
    if (type.startsWith('video/') || /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i.test(name)) {
      return 'video'
    }
    if (type === 'application/x-subrip' || type === 'text/srt' || /\.(srt|ass|ssa|vtt|sub)$/i.test(name)) {
      return 'subtitle'
    }
    if (type.startsWith('audio/') || /\.(mp3|flac|wav|aac|ogg|m4a|wma|ape|alac|dsd|dff|dsf)$/i.test(name)) {
      return 'music'
    }
    return null
  }
  
  const generateId = () => {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
  
  const checkDuplicate = (name, excludeId = null) => {
    return queue.value.find(
      item => 
        item.name === name && 
        item.id !== excludeId && 
        item.status !== 'failed' &&
        !(item.status === 'paused' && item.canResume)
    )
  }
  
  const saveToStorage = () => {
    const data = queue.value
      .filter(item => 
        (item.status === 'uploading' || 
         item.status === 'paused' || 
         item.status === 'saving') &&
        (item.progress > 0 || item.uploadedSize > 0)
      )
      .map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.type,
        progress: item.progress,
        uploadedSize: item.uploadedSize,
        videoInfo: item.videoInfo,
        storageType: item.storageType,
        uploadUrl: item.uploadUrl,
        fileId: item.fileId,
        userId: item.userId,
        result: item.result,
        createdAt: item.createdAt,
        updatedAt: Date.now()
      }))
    
    if (data.length > 0) {
      localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(UPLOAD_QUEUE_KEY)
    }
  }
  
  const restoreFromStorage = () => {
    if (queue.value.length > 0) return
    
    try {
      const data = localStorage.getItem(UPLOAD_QUEUE_KEY)
      if (!data) return
      
      const items = JSON.parse(data)
      if (!items || items.length === 0) return
      
      queue.value = items.map(item => ({
        ...item,
        status: 'paused',
        file: null,
        speed: 0,
        startTime: null,
        xhr: null,
        tusUpload: null,
        error: null,
        canResume: true,
        _active: false,
        progress: item.progress || 0,
        uploadedSize: item.uploadedSize || 0
      }))
      
      localStorage.removeItem(UPLOAD_QUEUE_KEY)
    } catch (e) {
      console.error('[UploadStore] 恢复失败:', e)
      localStorage.removeItem(UPLOAD_QUEUE_KEY)
    }
  }
  
  const addFiles = async (files) => {
    for (const file of files) {
      const fileType = detectFileType(file)
      if (!fileType) {
        console.warn(`[UploadStore] 不支持的文件类型: ${file.name}`)
        continue
      }
      
      if (checkDuplicate(file.name)) {
        console.warn(`[UploadStore] 文件已存在: ${file.name}`)
        continue
      }
      
      const item = {
        id: generateId(),
        file,
        type: fileType,
        name: file.name,
        size: file.size,
        status: 'identifying',
        progress: 0,
        speed: 0,
        uploadedSize: 0,
        startTime: null,
        xhr: null,
        tusUpload: null,
        error: null,
        result: null,
        videoInfo: null,
        storageType: null,
        uploadUrl: null,
        fileId: null,
        userId: null,
        canResume: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      queue.value.push(item)
      identifyFile(item)
    }
  }
  
  const identifyFile = async (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return

    if (item.type === 'music') {
      await identifyMusicFile(item)
    } else {
      await identifyVideoFile(item)
    }
  }

  const identifyVideoFile = async (item) => {
    const { patches } = await identifyVideoFileLogic(item.name, item.size)

    const idx = queue.value.findIndex(i => i.id === item.id)
    if (idx === -1) return

    Object.assign(queue.value[idx], patches)
    queue.value[idx].updatedAt = Date.now()
  }

  const identifyMusicFile = async (item) => {
    const { patches } = await identifyMusicFileLogic(item.name)

    const idx = queue.value.findIndex(i => i.id === item.id)
    if (idx === -1) return

    Object.assign(queue.value[idx], patches)
    queue.value[idx].updatedAt = Date.now()
  }

  const selectMusicCandidate = (itemId, songId) => {
    const index = queue.value.findIndex(i => i.id === itemId)
    if (index === -1) return

    const candidate = queue.value[index].musicCandidates?.find(s => s.song_id === songId)
    if (!candidate) return

    queue.value[index].videoInfo = {
      title: candidate.name,
      item_type: 'music',
      item_id: candidate.song_id,
      song_id: candidate.song_id,
      person_artists: candidate.person_artists || []
    }
    queue.value[index].status = 'ready'
    queue.value[index].musicCandidates = null
    queue.value[index].updatedAt = Date.now()
  }
  
  const processQueue = () => {
    const available = concurrency.value - activeCount.value
    if (available <= 0) return
    
    const toStart = waitingItems.value
      .filter(item => item.file || !item.canResume)
      .slice(0, available)
    
    for (const item of toStart) {
      startUpload(item)
    }
  }
  
  const startUpload = async (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    const currentItem = queue.value[index]
    
    if (!currentItem.file) {
      console.error('[UploadStore] 无文件')
      return
    }
    
    queue.value[index].status = 'uploading'
    queue.value[index].startTime = Date.now()
    queue.value[index].error = null
    queue.value[index].xhr = {}
    queue.value[index].canResume = false
    queue.value[index]._active = true
    queue.value[index].progress = queue.value[index].progress || 0
    queue.value[index].uploadedSize = queue.value[index].uploadedSize || 0
    queue.value[index].speed = queue.value[index].speed || 0
    
    const resumeFrom = queue.value[index].uploadedSize || 0
    
    const onProgress = (loaded, total) => {
      const idx = queue.value.findIndex(i => i.id === item.id)
      if (idx === -1) return
      
      queue.value[idx].uploadedSize = loaded
      queue.value[idx].progress = total > 0 ? Math.round((loaded / total) * 100) : 0
      
      const elapsed = (Date.now() - queue.value[idx].startTime) / 1000
      if (elapsed > 0) {
        queue.value[idx].speed = loaded / elapsed
      }
      
      if (!saveToStorage._timer) {
        saveToStorage._timer = setTimeout(() => {
          saveToStorage()
          saveToStorage._timer = null
        }, 2000)
      }
    }
    
    const onUploadInfo = (info) => {
      const idx = queue.value.findIndex(i => i.id === item.id)
      if (idx !== -1) {
        queue.value[idx].storageType = info.storageType
        queue.value[idx].uploadUrl = info.uploadUrl
        queue.value[idx].fileId = info.fileId
        queue.value[idx].userId = info.userId
        saveToStorage()
      }
    }
    
    try {
      const result = await uploader.upload(currentItem.file, {
        type: currentItem.type,
        storage: 'default',
        onProgress,
        onUploadInfo,
        xhr: queue.value[index].xhr,
        resumeFrom,
        uploadUrl: currentItem.uploadUrl,
        fileId: currentItem.fileId,
      })
      
      const idx = queue.value.findIndex(i => i.id === item.id)
      if (idx === -1) return
      
      queue.value[idx].status = 'saving'
      queue.value[idx].result = result
      
      if (!currentItem.videoInfo) {
        throw new Error('缺少视频信息')
      }
      
      const maxSaveRetries = 3
      let saveError = null
      
      for (let retry = 0; retry < maxSaveRetries; retry++) {
        try {
          if (currentItem.type === 'video') {
            await uploadApi.videoSave({
              item_type: currentItem.videoInfo.item_type,
              item_id: currentItem.videoInfo.item_id,
              file_id: result.file_id
            })
          } else if (currentItem.type === 'subtitle') {
            await uploadApi.subtitleSave({
              item_type: currentItem.videoInfo.item_type,
              item_id: currentItem.videoInfo.item_id,
              file_id: result.file_id
            })
          } else if (currentItem.type === 'music') {
            await uploadApi.musicSave({
              music_song_id: currentItem.videoInfo.song_id,
              file_id: result.file_id
            })
          }
          saveError = null
          break
        } catch (error) {
          saveError = error
          if (retry < maxSaveRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (retry + 1)))
          }
        }
      }
      
      if (saveError) {
        throw saveError
      }
      
      const idx2 = queue.value.findIndex(i => i.id === item.id)
      if (idx2 !== -1) {
        queue.value[idx2].status = 'completed'
        queue.value[idx2].progress = 100
        queue.value[idx2]._active = false
        queue.value[idx2].updatedAt = Date.now()
      }
      
      localStorage.removeItem(UPLOAD_QUEUE_KEY)

    } catch (error) {
      const idx = queue.value.findIndex(i => i.id === item.id)
      if (idx !== -1) {
        if (error.message === '上传已取消') {
          queue.value[idx]._active = false
          return
        }
        queue.value[idx].status = 'failed'
        queue.value[idx]._active = false
        queue.value[idx].error = error.message || '上传失败'
        queue.value[idx].updatedAt = Date.now()
      }
    } finally {
      const idx = queue.value.findIndex(i => i.id === item.id)
      if (idx !== -1) {
        queue.value[idx]._active = false
      }
      processQueue()
    }
  }
  
  const startItem = (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    const currentItem = queue.value[index]
    
    if (currentItem.canResume && !currentItem.file) {
      return
    }
    
    if (currentItem.status === 'ready') {
      if (activeCount.value < concurrency.value) {
        queue.value[index].status = 'uploading'
        startUpload(item)
      } else {
        queue.value[index].status = 'waiting'
      }
    } else if (currentItem.status === 'waiting') {
      if (activeCount.value < concurrency.value) {
        queue.value[index].status = 'uploading'
        startUpload(item)
      }
    } else if (currentItem.status === 'paused') {
      if (activeCount.value < concurrency.value) {
        queue.value[index].status = 'uploading'
        startUpload(item)
      } else {
        queue.value[index].status = 'waiting'
      }
    }
  }
  
  const startAll = () => {
    for (const item of queue.value) {
      const index = queue.value.findIndex(i => i.id === item.id)
      if (index === -1) continue
      
      const currentItem = queue.value[index]
      
      if (currentItem.status === 'ready') {
        queue.value[index].status = 'waiting'
      } else if (currentItem.status === 'waiting') {
        // 已经是等待状态，保持
      } else if (currentItem.status === 'paused') {
        if (currentItem.canResume && !currentItem.file) {
          // 需要断点续传但没有文件，保持暂停
          continue
        }
        queue.value[index].status = 'waiting'
        queue.value[index].canResume = false
      }
    }
    
    processQueue()
  }
  
  const pauseItem = (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    const currentItem = queue.value[index]
    
    if (currentItem.xhr) {
      if (currentItem.xhr.ref) {
        currentItem.xhr.ref.abort()
      }
      if (currentItem.xhr.tusUpload) {
        currentItem.xhr.tusUpload.abort()
      }
    }
    
    queue.value[index].status = 'paused'
    queue.value[index]._active = false
    queue.value[index].speed = 0
    queue.value[index].updatedAt = Date.now()
    
    saveToStorage()
  }
  
  const pauseWaitingItem = (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    queue.value[index].status = 'paused'
    queue.value[index].updatedAt = Date.now()
  }
  
  const pauseAll = () => {
    for (const item of queue.value) {
      if (item.status === 'uploading') {
        pauseItem(item)
      }
    }
  }
  
  const removeItem = (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    const currentItem = queue.value[index]
    
    if (currentItem.xhr) {
      if (currentItem.xhr.ref) {
        currentItem.xhr.ref.abort()
      }
      if (currentItem.xhr.tusUpload) {
        currentItem.xhr.tusUpload.abort()
      }
    }
    
    queue.value[index]._active = false
    queue.value.splice(index, 1)
    
    saveToStorage()
  }
  
  const clearCompleted = () => {
    queue.value = queue.value.filter(item => item.status !== 'completed')
  }
  
  const clearAll = () => {
    for (const item of queue.value) {
      if (item.xhr) {
        if (item.xhr.ref) {
          item.xhr.ref.abort()
        }
        if (item.xhr.tusUpload) {
          item.xhr.tusUpload.abort()
        }
      }
      item._active = false
    }
    queue.value = []
    localStorage.removeItem(UPLOAD_QUEUE_KEY)
  }
  
  const retryItem = async (item) => {
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return
    
    const currentItem = queue.value[index]
    
    if (currentItem.result && currentItem.result.file_id) {
      queue.value[index].status = 'saving'
      queue.value[index].error = null
      queue.value[index]._active = true
      
      try {
        if (currentItem.type === 'video') {
          await uploadApi.videoSave({
            item_type: currentItem.videoInfo.item_type,
            item_id: currentItem.videoInfo.item_id,
            file_id: currentItem.result.file_id
          })
        } else if (currentItem.type === 'subtitle') {
          await uploadApi.subtitleSave({
            item_type: currentItem.videoInfo.item_type,
            item_id: currentItem.videoInfo.item_id,
            file_id: currentItem.result.file_id
          })
        } else if (currentItem.type === 'music') {
          await uploadApi.musicSave({
            music_song_id: currentItem.videoInfo.song_id,
            file_id: currentItem.result.file_id
          })
        }
        
        const idx = queue.value.findIndex(i => i.id === item.id)
        if (idx !== -1) {
          queue.value[idx].status = 'completed'
          queue.value[idx].progress = 100
          queue.value[idx]._active = false
          queue.value[idx].updatedAt = Date.now()
        }
      } catch (error) {
        const idx = queue.value.findIndex(i => i.id === item.id)
        if (idx !== -1) {
          queue.value[idx].status = 'failed'
          queue.value[idx]._active = false
          queue.value[idx].error = error.message || '保存失败'
          queue.value[idx].updatedAt = Date.now()
        }
      }
    } else {
      queue.value[index].status = 'identifying'
      queue.value[index].error = null
      queue.value[index].updatedAt = Date.now()
      
      await identifyFile(item)
    }
  }
  
  const setConcurrency = (value) => {
    if (value < 1 || value > MAX_CONCURRENCY) return
    
    concurrency.value = value
    processQueue()
  }
  
  const resumeItem = (item, file) => {
    if (!file) return false
    
    if (file.name.toLowerCase() !== item.name.toLowerCase() || file.size !== item.size) {
      return false
    }
    
    const index = queue.value.findIndex(i => i.id === item.id)
    if (index === -1) return false
    
    queue.value[index].file = file
    queue.value[index].canResume = false
    queue.value[index]._active = false
    queue.value[index].status = 'waiting'
    queue.value[index].updatedAt = Date.now()
    
    processQueue()
    return true
  }
  
  return {
    queue,
    concurrency,
    activeCount,
    uploadingItems,
    waitingItems,
    readyItems,
    pausedItems,
    hasActiveUploads,
    
    addFiles,
    identifyFile,
    selectMusicCandidate,
    startUpload,
    startItem,
    startAll,
    pauseItem,
    pauseWaitingItem,
    pauseAll,
    removeItem,
    clearCompleted,
    clearAll,
    retryItem,
    setConcurrency,
    resumeItem,
    restoreFromStorage,
    saveToStorage,
    checkDuplicate,
  }
})
