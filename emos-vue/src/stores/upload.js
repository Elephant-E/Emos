import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 状态枚举
const UploadStatus = {
  PAUSED: 'paused',
  PENDING: 'pending',
  WAITING: 'waiting',
  UPLOADING: 'uploading',
  RETRYING: 'retrying',
  SAVING: 'saving',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

export const useUploadStore = defineStore('upload', () => {
  // 响应式数据
  const allTasks = ref([])
  const concurrency = ref(3)
  const uploadingCount = ref(0)
  const activeXHRs = new Map()
  const hasAutoStarted = ref(false)  // ✅ 标记是否已自动启动过调度
  let taskIdCounter = 0

  // 生成唯一ID
  const generateId = () => {
    taskIdCounter++
    return `task_${Date.now()}_${taskIdCounter}`
  }

  // 保存到LocalStorage（只保存非FAILED的任务）
  const saveToStorage = () => {
    try {
      const safeTasks = allTasks.value
        .filter(f => f.status !== UploadStatus.FAILED)
        .map(f => {
          const { fileObj, isIdentifying, ...rest } = f
          return {
            ...rest,
            hasFile: !!f.fileObj,
            uploadedBytes: f.uploadedBytes || 0
          }
        })

      localStorage.setItem('upload_tasks', JSON.stringify(safeTasks))
      localStorage.setItem('upload_concurrency', concurrency.value)
    } catch (error) {
      console.error('保存到 LocalStorage 失败:', error)
    }
  }

  // 从LocalStorage加载
  const loadFromStorage = async () => {
    try {
      const tasksData = localStorage.getItem('upload_tasks')
      const concurrencyData = localStorage.getItem('upload_concurrency')

      if (tasksData) {
        const parsedTasks = JSON.parse(tasksData)
        
        allTasks.value = parsedTasks.map(f => {
          if (f.status === UploadStatus.UPLOADING) {
            f.status = UploadStatus.PAUSED
          }
          f.fileObj = null
          f.isIdentifying = false
          if (f.uploadedBytes && f.size) {
            f.progress = Math.round((f.uploadedBytes / f.size) * 100)
          } else {
            f.progress = f.progress || 0
          }
          return f
        })
        
        const originalCount = allTasks.value.length
        allTasks.value = allTasks.value.filter(f => {
          return f.progress != null && f.progress > 0 && f.status !== UploadStatus.COMPLETED
        })
        
        if (allTasks.value.length < originalCount) {
          saveToStorage()
        }
      }

      if (concurrencyData) {
        concurrency.value = parseInt(concurrencyData) || 3
      }
    } catch (error) {
      console.error('从 LocalStorage 加载失败:', error)
    }
  }

  // 初始化（只在应用启动时调用一次）
  const init = async () => {
    await loadFromStorage()
  }

  return {
    // 状态
    allTasks,
    concurrency,
    uploadingCount,
    hasAutoStarted,  // ✅ 导出标记
    UploadStatus,
    
    // Map 对象（非响应式）
    activeXHRs,
    
    // 方法
    generateId,
    saveToStorage,
    loadFromStorage,
    init,
  }
})
