import { ref, computed } from 'vue'
import { showToast } from '@/utils/toast.js'
import { formatFileSize } from '@/utils/format.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 上传队列操作域：文件选择/拖拽校验、单个任务控制、批量控制、过滤统计。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - uploadStore：上传队列 store
 */
export function useUploadQueue({ uploadStore }) {
  // ================= 状态 =================
  const isDragging = ref(false)
  const fileInput = ref(null)
  const resumeFileInput = ref(null)
  const resumeItem = ref(null)
  const statusFilter = ref('all')

  // ================= 过滤/统计 =================

  const statusOptions = [
    { value: 'all', label: '全部', icon: 'fa-layer-group' },
    { value: 'ready', label: '待上传', icon: 'fa-clock' },
    { value: 'waiting', label: '等待中', icon: 'fa-hourglass-half' },
    { value: 'uploading', label: '上传中', icon: 'fa-upload' },
    { value: 'paused', label: '已暂停', icon: 'fa-pause' },
    { value: 'completed', label: '已完成', icon: 'fa-check' },
    { value: 'failed', label: '失败', icon: 'fa-times' }
  ]

  const filteredQueue = computed(() => {
    if (statusFilter.value === 'all') return uploadStore.queue
    return uploadStore.queue.filter(item => item.status === statusFilter.value)
  })

  const statusCounts = computed(() => {
    const counts = { all: uploadStore.queue.length }
    for (const item of uploadStore.queue) {
      counts[item.status] = (counts[item.status] || 0) + 1
    }
    return counts
  })

  const canStartAll = computed(() => {
    return uploadStore.queue.some(
      item => item.status === 'ready' || item.status === 'waiting' || item.status === 'paused'
    )
  })

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s'
    return formatFileSize(bytesPerSec) + '/s'
  }

  // ================= 文件选择 =================

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    isDragging.value = false
    const files = Array.from(e.dataTransfer.files || [])
    handleFiles(files)
  }

  const handleFiles = (files) => {
    const validFiles = []

    for (const file of files) {
      const name = file.name.toLowerCase()
      const type = file.type

      const isVideo = type.startsWith('video/') || /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i.test(name)
      const isSubtitle = type === 'application/x-subrip' || type === 'text/srt' || /\.(srt|ass|ssa|vtt|sub)$/i.test(name)
      const isMusic = type.startsWith('audio/') || /\.(mp3|flac|wav|aac|ogg|m4a|wma|ape|alac|dsd|dff|dsf)$/i.test(name)

      if (!isVideo && !isSubtitle && !isMusic) {
        showToast(`不支持的文件类型: ${file.name}`, 'error')
        continue
      }

      if (uploadStore.checkDuplicate(file.name)) {
        showToast(`文件已存在: ${file.name}`, 'error')
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      uploadStore.addFiles(validFiles)
    }
  }

  const handleResumeFileSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return
    if (!resumeItem.value) {
      handleFiles([file])
      return
    }

    if (file.name.toLowerCase() !== resumeItem.value.name.toLowerCase() || file.size !== resumeItem.value.size) {
      showToast('文件不匹配，请选择相同的文件', 'error')
      return
    }

    uploadStore.resumeItem(resumeItem.value, file)
    resumeItem.value = null
  }

  // ================= 单个任务 =================

  const startItem = (item) => {
    if (item.canResume) {
      resumeItem.value = item
      resumeFileInput.value?.click()
      return
    }
    uploadStore.startItem(item)
  }

  const pauseItem = (item) => {
    uploadStore.pauseItem(item)
  }

  const pauseWaitingItem = (item) => {
    uploadStore.pauseWaitingItem(item)
  }

  const deleteItem = async (item) => {
    if (item.status === 'completed') {
      uploadStore.removeItem(item)
      return
    }

    if (await confirmDialog(`确定删除 "${item.name}"？`, '确认', true)) {
      uploadStore.removeItem(item)
    }
  }

  // ================= 批量控制 =================

  const startAll = () => {
    uploadStore.startAll()
  }

  const pauseAll = () => {
    uploadStore.pauseAll()
  }

  const clearAll = async () => {
    const hasCompleted = uploadStore.queue.some(item => item.status === 'completed')

    if (hasCompleted) {
      uploadStore.clearCompleted()
    } else {
      if (await confirmDialog('确定清空所有任务？', '确认', true)) {
        uploadStore.clearAll()
      }
    }
  }

  const adjustConcurrency = (delta) => {
    uploadStore.setConcurrency(uploadStore.concurrency + delta)
  }

  return {
    isDragging,
    fileInput,
    resumeFileInput,
    resumeItem,
    statusFilter,
    statusOptions,
    filteredQueue,
    statusCounts,
    canStartAll,
    formatSpeed,
    handleFileSelect,
    handleDrop,
    handleFiles,
    handleResumeFileSelect,
    startItem,
    pauseItem,
    pauseWaitingItem,
    deleteItem,
    startAll,
    pauseAll,
    clearAll,
    adjustConcurrency,
  }
}