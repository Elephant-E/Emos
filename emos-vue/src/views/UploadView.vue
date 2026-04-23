<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app.js'
import { useUploadStore } from '@/stores/upload.js'
import videoApi from '@/api/videoApi.js'
import uploadApi from '@/api/uploadApi.js'
import { formatFileSize } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'

const appStore = useAppStore()
const uploadStore = useUploadStore()

// 使用 storeToRefs 保持响应式状态
const { allTasks, concurrency, uploadingCount, hasAutoStarted } = storeToRefs(uploadStore)
// 非响应式数据、Map对象和方法直接解构
const { UploadStatus, activeXHRs, generateId, saveToStorage } = uploadStore

// 文件类型映射
const FILE_TYPES = {
  video: ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm'],
  subtitle: ['.srt', '.ass', '.ssa', '.vtt', '.sub', '.idx'],
}

// 本地状态（仅UI相关）
const currentFilter = ref('all')
const isDragging = ref(false)
const fileInputRef = ref(null)

const getTaskById = (taskId) => allTasks.value.find(f => f.id === taskId)

const isAbortError = (error) => {
  if (!error) return false
  const message = String(error.message || '').toLowerCase()
  return error.name === 'AbortError' || message.includes('abort')
}

const createTusAbortHandle = (taskId) => ({
  abort: async () => {
    const upload = window.tusUploads?.[taskId]
    if (upload) {
      try {
        await upload.abort(true)
      } finally {
        delete window.tusUploads[taskId]
      }
    }
  }
})

// 处理拖拽
const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = async (e) => {
  e.preventDefault()
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  await processFiles(files)
}

const handleFileSelect = async (e) => {
  const files = Array.from(e.target.files)
  await processFiles(files)
  e.target.value = ''
}

// 处理文件
const processFiles = async (files) => {
  const validFiles = []

  for (const file of files) {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const isVideo = FILE_TYPES.video.includes(ext)
    const isSubtitle = FILE_TYPES.subtitle.includes(ext)

    if (!isVideo && !isSubtitle) {
      showToast(`不支持的文件类型: ${file.name}`, 'error')
      continue
    }

    const category = isVideo ? 'video' : 'subtitle'

    // 队列内匹配恢复（根据文件名和大小）
    const existingTask = allTasks.value.find(
      f => f.name === file.name && f.size === file.size && f.status !== UploadStatus.COMPLETED
    )
    
    if (existingTask) {
      existingTask.fileObj = file
      existingTask.errorMessage = null
      if (existingTask.status === UploadStatus.FAILED) {
        existingTask.status = UploadStatus.PAUSED
      }
      saveToStorage()
      showToast(`已恢复文件: ${file.name}`, 'success')
      continue
    }

    // 去重检查
    const exists = allTasks.value.some(
      f => f.name === file.name && f.size === file.size
    )

    if (exists) {
      showToast(`文件已存在: ${file.name}`, 'warning')
      continue
    }

    validFiles.push({
      id: generateId(),
      name: file.name,
      size: file.size,
      category,
      fileObj: file,
      status: UploadStatus.PENDING,  // 先设为PENDING，识别成功后才保存
      isIdentifying: true,  // ✅ 添加识别中标记
      itemType: null,
      itemId: null,
      displayTitle: null,
      season: null,
      episode: null,
      errorMessage: null,
      progress: 0,
      uploadedBytes: 0,
    })
  }

  if (validFiles.length > 0) {
    // 立即添加到任务列表并开始识别
    allTasks.value.push(...validFiles)
    await runIdentification()
    // 识别完成后，只保存成功的任务
    saveToStorage()
  }
}

// 执行智能识别
const runIdentification = async () => {
  const tasksToIdentify = allTasks.value.filter(f => f.status === UploadStatus.PENDING && f.isIdentifying)
  
  for (const file of tasksToIdentify) {
    try {
      const data = await videoApi.identify(file.name)
      
      // 识别成功，更新元数据
      file.itemType = data.item_type
      file.itemId = data.item_id
      file.displayTitle = data.title
      file.season = data.season
      file.episode = data.episode
      file.isIdentifying = false  // ✅ 识别完成，移除标记
    } catch (error) {
      // 识别失败，标记为 FAILED
      file.status = UploadStatus.FAILED
      file.errorMessage = error.message || '识别失败'
      file.isIdentifying = false  // ✅ 识别完成，移除标记
    }
  }
}

// 队列调度器
const startNext = () => {
  // 先处理 WAITING 状态的任务（当有槽位空出时）
  const waitingFiles = allTasks.value.filter(
    f => f.status === UploadStatus.WAITING && f.fileObj  // ✅ 必须有文件对象
  )

  let availableSlots = concurrency.value - uploadingCount.value
  
  for (const file of waitingFiles) {
    if (availableSlots <= 0) break
    
    file.status = UploadStatus.UPLOADING
    uploadingCount.value++
    availableSlots--
    startUpload(file)
  }

  // 如果还有空位，处理 PENDING 任务
  availableSlots = concurrency.value - uploadingCount.value
  if (availableSlots <= 0) {
    // 并发已满，将剩余 PENDING 任务标记为等待
    const pendingFiles = allTasks.value.filter(
      f => f.status === UploadStatus.PENDING && f.fileObj  // ✅ 必须有文件对象
    )
    pendingFiles.forEach(file => {
      file.status = UploadStatus.WAITING
    })
    if (pendingFiles.length > 0) {
      saveToStorage()
    }
    return
  }

  // 找出所有待处理的任务（必须有文件对象）
  const pendingFiles = allTasks.value.filter(
    f => f.status === UploadStatus.PENDING && f.fileObj  // ✅ 关键修复：必须有文件对象
  )

  if (pendingFiles.length === 0) return

  // 启动任务（最多启动 availableSlots 个）
  for (let i = 0; i < Math.min(availableSlots, pendingFiles.length); i++) {
    pendingFiles[i].status = UploadStatus.UPLOADING
    uploadingCount.value++
    startUpload(pendingFiles[i])
  }

  // 将剩余的待处理任务标记为等待状态
  if (pendingFiles.length > availableSlots) {
    for (let i = availableSlots; i < pendingFiles.length; i++) {
      pendingFiles[i].status = UploadStatus.WAITING
    }
  }

  saveToStorage()
}

// 启动上传任务
const startUpload = async (fileEntry) => {
  try {
    // 获取文件的 MIME type
    const fileExtension = fileEntry.name.split('.').pop().toLowerCase()
    let mimeType = 'application/octet-stream' // 默认值
    
    if (fileEntry.category === 'video') {
      // 视频文件 MIME type 映射
      const videoTypes = {
        'mp4': 'video/mp4',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'webm': 'video/webm',
        'm4v': 'video/x-m4v'
      }
      mimeType = videoTypes[fileExtension] || 'video/mp4'
    } else if (fileEntry.category === 'subtitle') {
      // 字幕文件 MIME type 映射
      const subtitleTypes = {
        'srt': 'application/x-subrip',
        'ass': 'text/x-ssa',
        'ssa': 'text/x-ssa',
        'vtt': 'text/vtt',
        'sub': 'text/plain'
      }
      mimeType = subtitleTypes[fileExtension] || 'text/plain'
    }
    
    if (!fileEntry.uploadType || !fileEntry.uploadUrl || !fileEntry.fileId) {
      const tokenData = await uploadApi.getUploadToken({
        type: fileEntry.category,
        file_type: mimeType,
        file_name: fileEntry.name,
        file_size: fileEntry.size,
        file_storage: 'global',
      })

      fileEntry.fileId = tokenData.file_id
      fileEntry.uploadUrl = tokenData.data.upload_url
      fileEntry.uploadType = tokenData.type
      fileEntry.userId = tokenData.user_id || uploadApi.getStoredUserId()
      if (!fileEntry.uploadedBytes) {
        fileEntry.progress = 0
      }
      saveToStorage()
    }

    fileEntry.status = UploadStatus.UPLOADING
    fileEntry._saving = false

    if (fileEntry.uploadType === 'tusd') {
      const tusHandle = createTusAbortHandle(fileEntry.id)
      activeXHRs.set(fileEntry.id, tusHandle)
      await uploadWithTus(fileEntry)
    } else if (fileEntry.uploadType === 'r2') {
      fileEntry.uploadedBytes = 0
      fileEntry.progress = 0
      const controller = new AbortController()
      activeXHRs.set(fileEntry.id, controller)
      await uploadWholeFile(fileEntry, controller)
    } else {
      const controller = new AbortController()
      activeXHRs.set(fileEntry.id, controller)
      await uploadWithChunks(fileEntry, controller)
    }
  } catch (error) {
    if (isAbortError(error)) {
      return
    } else {
      fileEntry.status = UploadStatus.FAILED
      fileEntry.errorMessage = error.message
      showToast(`上传失败: ${fileEntry.name}`, 'error')
      saveToStorage()
    }
  } finally {
    activeXHRs.delete(fileEntry.id)
    const taskStillExists = allTasks.value.some(f => f.id === fileEntry.id)
    if (taskStillExists && (fileEntry.status === UploadStatus.UPLOADING || fileEntry.status === UploadStatus.SAVING)) {
      uploadingCount.value = Math.max(0, uploadingCount.value - 1)
      saveToStorage()
      startNext()
    }
  }
}

// 分片上传
const uploadWithChunks = async (fileEntry, controller) => {
  const CHUNK_SIZE = 200 * 1024 * 1024
  const fileSize = fileEntry.fileObj.size
  let uploadedBytes = Math.min(fileEntry.uploadedBytes || 0, fileSize)

  try {
    while (uploadedBytes < fileSize) {
      if (controller.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const start = uploadedBytes
      const end = Math.min(uploadedBytes + CHUNK_SIZE, fileSize) - 1
      const chunk = fileEntry.fileObj.slice(start, end + 1)
      const contentRange = `bytes ${start}-${end}/${fileSize}`

      await uploadChunkWithProgress(fileEntry.uploadUrl, chunk, contentRange, controller, (loaded) => {
        const currentTotal = uploadedBytes + loaded
        const progress = Math.round((currentTotal / fileSize) * 100)
        
        if (progress !== fileEntry.progress) {
          fileEntry.progress = progress
          fileEntry.uploadedBytes = currentTotal
          if (progress % 5 === 0) {
            saveToStorage()
          }
        }
      })

      uploadedBytes = end + 1
      fileEntry.uploadedBytes = uploadedBytes
      fileEntry.progress = Math.round((uploadedBytes / fileSize) * 100)
      saveToStorage()
    }

    fileEntry.status = UploadStatus.SAVING
    saveToStorage()

    // 根据文件类型调用不同的保存方法
    if (fileEntry.category === 'video') {
      await uploadApi.saveVideoResult({
        item_type: fileEntry.itemType,
        item_id: fileEntry.itemId,
        file_id: fileEntry.fileId,
      })
    } else {
      await uploadApi.saveSubtitleResult({
        item_type: fileEntry.itemType,
        item_id: fileEntry.itemId,
        file_id: fileEntry.fileId,
      })
    }

    fileEntry.status = UploadStatus.COMPLETED
    fileEntry.progress = 100
    fileEntry.uploadedBytes = fileSize
    fileEntry.retryCount = 0
    
    saveToStorage()
    showToast(`上传完成: ${fileEntry.name}`, 'success')
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    throw error
  }
}

const uploadWholeFile = async (fileEntry, controller) => {
  const fileSize = fileEntry.fileObj.size

  await uploadFileWithProgress(fileEntry.uploadUrl, fileEntry.fileObj, controller, (loaded) => {
    const progress = Math.round((loaded / fileSize) * 100)
    fileEntry.progress = progress
    fileEntry.uploadedBytes = loaded
    if (progress % 5 === 0 || loaded === fileSize) {
      saveToStorage()
    }
  })

  fileEntry.status = UploadStatus.SAVING
  saveToStorage()

  if (fileEntry.category === 'video') {
    await uploadApi.saveVideoResult({
      item_type: fileEntry.itemType,
      item_id: fileEntry.itemId,
      file_id: fileEntry.fileId,
    })
  } else {
    await uploadApi.saveSubtitleResult({
      item_type: fileEntry.itemType,
      item_id: fileEntry.itemId,
      file_id: fileEntry.fileId,
    })
  }

  fileEntry.status = UploadStatus.COMPLETED
  fileEntry.progress = 100
  fileEntry.uploadedBytes = fileSize
  fileEntry.retryCount = 0

  saveToStorage()
  showToast(`上传完成: ${fileEntry.name}`, 'success')
}

const uploadWithTus = async (fileEntry) => {
  const fileSize = fileEntry.fileObj.size

  await uploadApi.uploadFile(fileEntry.uploadType, { upload_url: fileEntry.uploadUrl }, fileEntry.fileObj, {
    userId: fileEntry.userId || uploadApi.getStoredUserId(),
    fileId: fileEntry.fileId,
    taskId: fileEntry.id,
    onProgress: (bytesUploaded, bytesTotal) => {
      const safeTotal = bytesTotal || fileSize
      fileEntry.uploadedBytes = bytesUploaded
      fileEntry.progress = Math.round((bytesUploaded / safeTotal) * 100)
      if (fileEntry.progress % 5 === 0 || bytesUploaded === safeTotal) {
        saveToStorage()
      }
    }
  })

  fileEntry.status = UploadStatus.SAVING
  saveToStorage()

  if (fileEntry.category === 'video') {
    await uploadApi.saveVideoResult({
      item_type: fileEntry.itemType,
      item_id: fileEntry.itemId,
      file_id: fileEntry.fileId,
    })
  } else {
    await uploadApi.saveSubtitleResult({
      item_type: fileEntry.itemType,
      item_id: fileEntry.itemId,
      file_id: fileEntry.fileId,
    })
  }

  fileEntry.status = UploadStatus.COMPLETED
  fileEntry.progress = 100
  fileEntry.uploadedBytes = fileSize
  fileEntry.retryCount = 0

  saveToStorage()
  showToast(`上传完成: ${fileEntry.name}`, 'success')
}

// 使用XMLHttpRequest上传分片
const uploadChunkWithProgress = (url, chunk, contentRange, controller, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response)
      } else {
        reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'))
    })
    
    xhr.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'))
    })
    
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Range', contentRange)
    
    controller.signal.addEventListener('abort', () => {
      xhr.abort()
    })
    
    xhr.send(chunk)
  })
}

const uploadFileWithProgress = (url, file, controller, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response)
      } else {
        reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'))
    })

    xhr.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'))
    })

    xhr.open('PUT', url)

    controller.signal.addEventListener('abort', () => {
      xhr.abort()
    })

    xhr.send(file)
  })
}

// 暂停上传
const pauseUpload = (taskId) => {
  const file = getTaskById(taskId)
  if (!file) return

  const controller = activeXHRs.get(taskId)
  if (controller) {
    controller.abort()
  }
  
  if (file.status === UploadStatus.UPLOADING) {
    file.status = UploadStatus.PAUSED
    uploadingCount.value = Math.max(0, uploadingCount.value - 1)
    saveToStorage()
    startNext()
  }
}

// 继续上传
const resumeUpload = async (taskId) => {
  const file = getTaskById(taskId)
  if (!file) return

  // PAUSED状态直接触发文件恢复
  if (file.status === UploadStatus.PAUSED) {
    await recoverFile(file)
    return
  }

  file.status = UploadStatus.PENDING
  saveToStorage()
  startNext()
}

// 文件恢复
const recoverFile = async (fileEntry) => {
  try {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker()
      const file = await fileHandle.getFile()

      if (file.name !== fileEntry.name || file.size !== fileEntry.size) {
        showToast('选择的文件与任务不匹配', 'error')
        return
      }

      fileEntry.fileObj = file
      fileEntry.status = UploadStatus.PENDING
      saveToStorage()
      startNext()
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = fileEntry.name.endsWith('.mp4') ? '.mp4,.mkv,.avi,.mov' : '.srt,.ass,.vtt'

      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file.name === fileEntry.name && file.size === fileEntry.size) {
          fileEntry.fileObj = file
          fileEntry.status = UploadStatus.PENDING
          saveToStorage()
          startNext()
        } else {
          showToast('选择的文件与任务不匹配', 'error')
        }
      }

      input.click()
    }
  } catch (error) {
    // 用户取消恢复
  }
}

// 删除任务
const deleteFile = (taskId) => {
  if (!confirm('确定要删除该任务吗？')) return

  const file = getTaskById(taskId)
  if (!file) return

  const wasUploading = file.status === UploadStatus.UPLOADING || file.status === UploadStatus.SAVING
  const controller = activeXHRs.get(taskId)
  if (controller) {
    if (wasUploading) {
      file.status = UploadStatus.PAUSED
    }
    controller.abort()
  }

  allTasks.value = allTasks.value.filter(f => f.id !== taskId)
  activeXHRs.delete(taskId)
  
  if (wasUploading) {
    uploadingCount.value = Math.max(0, uploadingCount.value - 1)
  }
  
  saveToStorage()
  showToast('已删除任务', 'success')
  startNext()
}

// 从识别池开始上传（单个文件）
const startUploadFromIdentified = async (taskId) => {
  const file = getTaskById(taskId)
  if (!file) {
    showToast('文件不存在', 'error')
    return
  }

  // 如果已经在队列中且正在上传或等待，不允许重复操作
  if (file.status === UploadStatus.UPLOADING || file.status === UploadStatus.WAITING) {
    showToast('该文件已在上传队列中', 'warning')
    return
  }

  // 如果是PAUSED且有进度，触发文件恢复
  if (file.status === UploadStatus.PAUSED && file.progress > 0) {
    await recoverFile(file)
    return
  }

  // 如果是PENDING但没有fileObj，也需要恢复文件
  if (file.status === UploadStatus.PENDING && !file.fileObj) {
    await recoverFile(file)
    return
  }

  // 如果没有文件对象，提示错误
  if (!file.fileObj) {
    showToast('文件对象不存在，请重新选择文件', 'error')
    return
  }

  // 如果当前上传数已达并发上限，设置为WAITING
  if (uploadingCount.value >= concurrency.value) {
    file.status = UploadStatus.WAITING
    saveToStorage()
    showToast('已添加到队列，等待上传', 'success')
    return
  }

  // 有空位，直接开始上传
  file.status = UploadStatus.UPLOADING
  uploadingCount.value++
  saveToStorage()
  startUpload(file)
  showToast('已开始上传', 'success')
}

// 清空所有任务
const clearAllTasks = () => {
  const completedCount = allTasks.value.filter(f => f.status === UploadStatus.COMPLETED).length
  
  if (completedCount > 0) {
    // 有已完成任务，只清空已完成的
    if (!confirm(`确定要清空 ${completedCount} 个已完成的任务吗？`)) return

    // 只移除已完成的任务
    allTasks.value = allTasks.value.filter(f => f.status !== UploadStatus.COMPLETED)
    
    saveToStorage()
    
    showToast('已清空已完成任务', 'success')
  } else {
    // 没有已完成任务，清空所有
    if (!confirm('确定要清空所有任务吗？此操作不可恢复。')) return
    
    // 中止所有活跃上传
    activeXHRs.forEach(controller => controller.abort())
    activeXHRs.clear()

    allTasks.value = []
    uploadingCount.value = 0

    saveToStorage()
    
    showToast('已清空所有任务', 'success')
  }
}

// 开始所有待处理任务
const startAllPending = () => {
  const readyToUpload = allTasks.value.filter(
    f => f.status === UploadStatus.PENDING
  )

  if (readyToUpload.length === 0) {
    showToast('没有可上传的文件', 'warning')
    return
  }

  // 触发调度器，自动处理并发控制
  startNext()
  
  const startedCount = Math.min(readyToUpload.length, concurrency.value - uploadingCount.value + readyToUpload.length)
  showToast(`已开始 ${startedCount} 个文件的上传`, 'success')
}

// 调整并发数
const adjustConcurrency = (delta) => {
  concurrency.value = Math.max(1, Math.min(5, concurrency.value + delta))
  startNext()
}

// 筛选器点击
const handleFilterClick = (filter) => {
  currentFilter.value = filter
}

onMounted(async () => {
  // 只在第一次挂载时初始化 Store 并启动调度
  if (!hasAutoStarted.value) {
    if (allTasks.value.length === 0) {
      await uploadStore.init()
    }
    startNext()  // ✅ 只在首次挂载时自动调度
    hasAutoStarted.value = true  // ✅ 标记已自动启动
  }
  // 后续切换界面返回时，不调用 startNext()，保持当前状态
})

// 监听真正的账号切换，避免普通用户信息刷新清空队列
watch(() => appStore.token, async (newToken, oldToken) => {
  if (newToken && oldToken && newToken !== oldToken) {
    activeXHRs.forEach(controller => controller.abort())
    activeXHRs.clear()
    allTasks.value = []
    uploadingCount.value = 0
    hasAutoStarted.value = false
    saveToStorage()
    await uploadStore.init()
  }
}, { immediate: false })

// 计算属性 - 筛选后的列表
const filteredItems = computed(() => {
  if (currentFilter.value === 'all') {
    return allTasks.value
  }
  
  const filterMap = {
    'pending': UploadStatus.PENDING,
    'paused': UploadStatus.PAUSED,
    'uploading': UploadStatus.UPLOADING,
    'completed': UploadStatus.COMPLETED,
    'failed': UploadStatus.FAILED
  }
  
  const targetStatus = filterMap[currentFilter.value]
  if (targetStatus) {
    return allTasks.value.filter(f => f.status === targetStatus)
  }
  
  return allTasks.value
})
</script>

<template>
  <header class="page-header">
    <h1 class="page-title">上传管理</h1>
    <p class="page-subtitle">拖拽文件到下方区域开始上传</p>
  </header>

    <!-- 上传区域 -->
    <div 
      class="bento-card upload-zone" 
      id="uploadZone"
      :class="{ dragover: isDragging }"
      @click="fileInputRef?.click()"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      style="margin-bottom: 1.5rem;"
    >
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
        <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">拖拽文件到此处</h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">或点击选择文件</p>
        <div style="display: flex; justify-content: center; gap: 0.8rem; flex-wrap: wrap;">
          <span class="badge badge-secondary">视频: MP4, MKV, AVI, MOV</span>
          <span class="badge badge-secondary">字幕: SRT, ASS, VTT</span>
        </div>
      </div>
      <input 
        type="file" 
        ref="fileInputRef"
        @change="handleFileSelect"
        multiple 
        hidden 
        accept=".mp4,.mkv,.avi,.mov,.flv,.webm,.srt,.ass,.ssa,.vtt,.sub,.idx"
      >
    </div>

    <!-- 上传队列区域 -->
    <div v-if="allTasks.length > 0" class="bento-card queue-section">
      <div class="queue-header">
        <div class="filter-group">
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'all' }"
            @click="handleFilterClick('all')"
          >
            全部
          </button>
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'pending' }"
            @click="handleFilterClick('pending')"
          >
            待处理
          </button>
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'paused' }"
            @click="handleFilterClick('paused')"
          >
            等待
          </button>
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'uploading' }"
            @click="handleFilterClick('uploading')"
          >
            上传中
          </button>
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'completed' }"
            @click="handleFilterClick('completed')"
          >
            完成
          </button>
          <button 
            class="filter-chip" 
            :class="{ active: currentFilter === 'failed' }"
            @click="handleFilterClick('failed')"
          >
            失败
          </button>
        </div>
        <div class="queue-actions">
          <div class="concurrency-control">
            <button class="action-icon" @click="adjustConcurrency(-1)">
              <i class="fas fa-minus"></i>
            </button>
            <span class="concurrency-value">{{ concurrency }}</span>
            <button class="action-icon" @click="adjustConcurrency(1)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <button class="action-icon" @click="clearAllTasks" title="清空">
            <i class="fas fa-trash"></i>
          </button>
          <button class="action-icon" @click="startAllPending" title="开始全部">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>

      <div 
        class="upload-queue" 
        id="uploadQueue" 
        style="display: flex; flex-direction: column; gap: 0; max-height: 600px; overflow-y: auto; margin: -22px; padding: 0;"
      >
        <!-- 队列项目 -->
        <div 
          v-for="file in filteredItems" 
          :key="file.id"
          class="list-item" 
          style="display: flex; flex-direction: column; padding: 14px 20px; background: transparent; border-bottom: 0.5px solid var(--border); transition: background 0.2s;"
        >
          <!-- 第一行：头像 + 内容 + 按钮 -->
          <div style="display: flex; align-items: center; width: 100%;">
            <div class="list-item-avatar" style="width: 40px; height: 40px; border-radius: 8px; background: rgba(120, 120, 128, 0.16); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 12px;">
              <i 
                :class="'fas ' + (file.status === UploadStatus.FAILED ? 'fa-times-circle' : file.isIdentifying ? 'fa-spinner fa-spin' : file.category === 'video' ? 'fa-film' : 'fa-closed-captioning')"
                :style="{ fontSize: '1.1rem', color: file.status === UploadStatus.FAILED ? 'var(--danger)' : file.isIdentifying ? 'var(--info)' : 'var(--text-secondary)' }"
              ></i>
            </div>
            <div class="list-item-content" style="flex: 1; min-width: 0; margin-right: 12px;">
              <div class="list-item-title" style="color: var(--text-primary); font-weight: 400; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">{{ file.name }}</div>
              <div class="list-item-desc" style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-tertiary); font-size: 0.85rem;">
                <span v-if="file.isIdentifying">识别中...</span>
                <span v-else-if="file.status === UploadStatus.FAILED" style="color: var(--danger); font-size: 0.85rem; line-height: 1.4; word-break: break-word;">{{ file.errorMessage || '识别失败' }}</span>
                <span v-else-if="file.status === UploadStatus.PAUSED && file.progress > 0" style="color: var(--success); font-size: 0.85rem;">识别到上传记录，可断点续传</span>
                <span v-else>
                  {{ formatFileSize(file.size) }}
                  <span v-if="file.itemType && file.itemId"> • {{ file.itemType }}-{{ file.itemId }}</span>
                  <span v-if="file.displayTitle"> • {{ file.displayTitle }}</span>
                  <span v-if="file.season != null && file.episode != null"> • S{{ String(file.season).padStart(2, '0') }}E{{ String(file.episode).padStart(2, '0') }}</span>
                </span>
              </div>
              <div v-if="file.status === UploadStatus.PAUSED && file.progress > 0" style="font-size: 0.8rem; color: var(--warning); margin-top: 0.3rem; display: flex; align-items: center; gap: 0.4rem;">
                <i class="fas fa-exclamation-triangle"></i> 文件已丢失，点击播放重新选择
              </div>
            </div>
            <div class="list-item-action" style="display: flex; gap: 0.5rem; flex-shrink: 0;">
              <!-- 识别中 -->
              <button v-if="file.isIdentifying" class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);" disabled>
                <i class="fas fa-times"></i>
              </button>
              
              <!-- 待处理 -->
              <template v-else-if="file.status === UploadStatus.PENDING">
                <button class="action-simple" @click="startUploadFromIdentified(file.id)" style="color: var(--accent);">
                  <i class="fas fa-play"></i>
                </button>
                <button class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                  <i class="fas fa-times"></i>
                </button>
              </template>
              
              <!-- 等待 -->
              <button v-else-if="file.status === UploadStatus.WAITING" class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                <i class="fas fa-times"></i>
              </button>
              
              <!-- 已暂停 -->
              <template v-else-if="file.status === UploadStatus.PAUSED">
                <button class="action-simple" @click="resumeUpload(file.id)" style="color: var(--accent);">
                  <i class="fas fa-play"></i>
                </button>
                <button class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                  <i class="fas fa-times"></i>
                </button>
              </template>
              
              <!-- 上传中 -->
              <template v-else-if="file.status === UploadStatus.UPLOADING">
                <button class="action-simple" @click="pauseUpload(file.id)" style="color: var(--warning);">
                  <i class="fas fa-pause"></i>
                </button>
                <button class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                  <i class="fas fa-times"></i>
                </button>
              </template>
              
              <!-- 保存中 -->
              <template v-else-if="file.status === UploadStatus.SAVING">
                <span style="font-size: 0.85rem; color: var(--info);">保存中...</span>
              </template>
              
              <!-- 已完成 -->
              <button v-else-if="file.status === UploadStatus.COMPLETED" class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                <i class="fas fa-times"></i>
              </button>
              
              <!-- 失败（仅删除，无重试） -->
              <button v-else-if="file.status === UploadStatus.FAILED" class="action-simple" @click="deleteFile(file.id)" style="color: var(--text-secondary);">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- 进度条 -->
          <div v-if="file.status === UploadStatus.UPLOADING || file.status === UploadStatus.PAUSED" style="width: 100%; margin-top: 8px;">
            <div style="width: 100%; height: 4px; background: rgba(120, 120, 128, 0.16); border-radius: 2px; overflow: hidden;">
              <div 
                :style="{
                  height: '100%', 
                  background: 'var(--accent)', 
                  borderRadius: '2px', 
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  width: file.progress + '%',
                  animation: file.status === UploadStatus.UPLOADING ? 'progress-pulse 1.5s ease-in-out infinite' : 'none'
                }"
              ></div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary); text-align: right; margin-top: 2px;">{{ file.progress }}%</div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div 
        v-if="filteredItems.length === 0"
        class="empty-state" 
        id="queueEmpty" 
        style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; text-align: center;"
      >
        <p style="font-size: 1rem; font-weight: 500; color: var(--text-secondary);">没有符合条件的任务</p>
      </div>
    </div>
</template>

<style scoped>
@keyframes progress-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
