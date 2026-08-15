<script setup>
import { ref, reactive, watch, onUnmounted } from 'vue'
import redpacketApi from '@/api/redpacketApi.js'
import uploader from '@/utils/uploader.js'
import { showToast } from '@/utils/toast.js'
import { formatRelativeTime, normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const rpCoverFileInput = ref(null)

const state = reactive({
  activeTab: 'send',
  sendForm: {
    type: 'default',
    receive: 'average',
    carrot: '',
    number: '',
    blessing: '',
    text: '',
    is_exclusive: false,
    seconds: 86400
  },
  coverTab: 'upload',
  coverUrl: '',
  coverFile: null,
  coverPreviewUrl: null,
  coverFileType: null,
  uploading: false,
  recordId: '',
  recordList: [],
  recordPage: 1,
  recordTotal: 0,
  recordPageSize: 15,
  recordLoading: false,
  recordHasMore: true
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.activeTab = 'send'
    state.sendForm = { type: 'default', receive: 'average', carrot: '', number: '', blessing: '', text: '', is_exclusive: false, seconds: 86400 }
    state.coverTab = 'upload'
    state.coverUrl = ''
    state.coverFile = null
    state.coverPreviewUrl = null
    state.coverFileType = null
    state.uploading = false
    state.recordId = ''
    state.recordList = []
    state.recordPage = 1
    state.recordTotal = 0
    state.recordLoading = false
    state.recordHasMore = true
  }
})

const tabs = [
  { value: 'send', label: '发红包' },
  { value: 'record', label: '领取记录' }
]

onUnmounted(() => {
  if (state.coverPreviewUrl) {
    URL.revokeObjectURL(state.coverPreviewUrl)
  }
})

watch(() => props.visible, (v) => {
  if (!v) return
  state.activeTab = 'send'
  state.sendForm = {
    type: 'default',
    receive: 'average',
    carrot: '',
    number: '',
    blessing: '',
    text: '',
    is_exclusive: false,
    seconds: 86400
  }
  state.coverTab = 'upload'
  state.coverUrl = ''
  state.coverFile = null
  state.coverPreviewUrl = null
  state.coverFileType = null
  state.uploading = false
  state.recordId = ''
  state.recordList = []
  state.recordPage = 1
  state.recordTotal = 0
  state.recordLoading = false
  state.recordHasMore = true
})

const handleCoverFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 80 * 1024 * 1024) {
    showToast('文件大小不能超过 80MB', 'error')
    event.target.value = ''
    return
  }
  const isImage = file.type.startsWith('image/')
  const isAudio = file.type.startsWith('audio/')
  if (!isImage && !isAudio) {
    showToast('仅支持图片和音频文件', 'error')
    event.target.value = ''
    return
  }
  state.coverFile = file
  state.coverFileType = isImage ? 'image' : 'audio'
  state.coverPreviewUrl = URL.createObjectURL(file)
  event.target.value = ''
}

const uploadCoverFile = async (file) => {
  try {
    const result = await uploader.uploadTemporary(file)
    return result.url || result
  } catch (e) {
    showToast('封面上传失败: ' + (e.message || '未知错误'), 'error')
    throw e
  }
}

const deleteCoverPreview = () => {
  if (state.coverPreviewUrl) {
    URL.revokeObjectURL(state.coverPreviewUrl)
  }
  state.coverPreviewUrl = null
  state.coverFile = null
  state.coverFileType = null
}

const submitRedpacket = async () => {
  const form = state.sendForm
  if (!form.carrot || form.carrot < 1 || form.carrot > 60000) {
    showToast('总金额需在 1-60000 之间', 'error')
    return
  }
  if (!form.number || form.number < 1 || form.number > 10000) {
    showToast('红包个数需在 1-10000 之间', 'error')
    return
  }
  if (!form.blessing.trim()) {
    showToast('请输入祝福语', 'error')
    return
  }
  if (form.type === 'password' && !form.text.trim()) {
    showToast('口令红包需输入口令内容', 'error')
    return
  }
  state.uploading = true
  try {
    let fileUrl = state.coverUrl
    let fileType = null
    if (state.coverTab === 'upload' && state.coverFile) {
      fileUrl = await uploadCoverFile(state.coverFile)
      fileType = state.coverFileType
    } else if (state.coverTab === 'url' && state.coverUrl) {
      fileUrl = state.coverUrl
      const ext = fileUrl.toLowerCase()
      if (ext.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) fileType = 'image'
      else if (ext.match(/\.(mp3|wav|ogg|flac|aac|m4a)/)) fileType = 'audio'
    }
    const data = {
      type: form.type,
      receive: form.receive,
      carrot: Number(form.carrot),
      number: Number(form.number),
      blessing: form.blessing.trim(),
      seconds: Number(form.seconds) || 86400
    }
    if (form.type === 'password') {
      data.text = form.text.trim()
    }
    if (fileUrl) {
      data.file_url = fileUrl
      data.file_type = fileType || 'image'
    }
    if (form.is_exclusive && fileUrl) {
      data.is_exclusive = true
    }
    await redpacketApi.create(data)
    showToast('红包发送成功！', 'success')
    emit('close')
  } catch (e) {
    showToast('发送失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    state.uploading = false
  }
}

const queryRedpacketRecords = () => {
  if (!state.recordId.trim()) {
    showToast('请输入红包 ID', 'error')
    return
  }
  state.recordList = []
  state.recordPage = 1
  state.recordTotal = 0
  state.recordHasMore = true
  loadRedpacketRecords()
}

const loadRedpacketRecords = async (isLoadMore = false) => {
  if (state.recordLoading) return
  if (!isLoadMore && !state.recordId.trim()) return
  state.recordLoading = true
  try {
    const res = await redpacketApi.receive(state.recordId.trim(), {
      page: state.recordPage,
      page_size: state.recordPageSize
    })
    const data = res.data || res
    const items = normalizeList(data)
    const total = data.total || 0
    if (isLoadMore) {
      state.recordList = [...state.recordList, ...items]
    } else {
      state.recordList = items
    }
    state.recordTotal = total
    state.recordHasMore = state.recordList.length < total
  } catch (e) {
    if (!isLoadMore) {
      showToast('查询失败: ' + (e.message || '未知错误'), 'error')
    }
  } finally {
    state.recordLoading = false
  }
}

const handleRedpacketRecordScroll = (event) => {
  const el = event.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
    if (state.recordLoading || !state.recordHasMore) return
    state.recordPage++
    loadRedpacketRecords(true)
  }
}
</script>

<template>
  <BaseModal :visible="visible" title="红包工具" size="xxl" @close="emit('close')">
    <SegmentedControl :tabs="tabs" v-model="state.activeTab" />

    <div v-show="state.activeTab === 'send'" class="rp-form">
      <div class="form-group">
        <label class="form-label">红包类型</label>
        <select class="modal-input modal-select" v-model="state.sendForm.type">
          <option value="default">普通红包</option>
          <option value="password">口令红包</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">领取类型</label>
        <select class="modal-input modal-select" v-model="state.sendForm.receive">
          <option value="average">均分模式</option>
          <option value="random">随机模式</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">总金额（萝卜）</label>
        <input type="number" class="modal-input" v-model="state.sendForm.carrot" placeholder="1 - 60000" min="1" max="60000">
      </div>
      <div class="form-group">
        <label class="form-label">红包个数</label>
        <input type="number" class="modal-input" v-model="state.sendForm.number" placeholder="1 - 10000" min="1" max="10000">
      </div>
      <div class="form-group">
        <label class="form-label">祝福语</label>
        <input type="text" class="modal-input" v-model="state.sendForm.blessing" placeholder="最多 50 字" maxlength="50">
      </div>
      <div v-show="state.sendForm.type === 'password'" class="form-group">
        <label class="form-label">口令内容</label>
        <input type="text" class="modal-input" v-model="state.sendForm.text" placeholder="1-50字符，区分大小写" maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">过期时间（秒）</label>
        <input type="number" class="modal-input" v-model="state.sendForm.seconds" placeholder="60 - 172800（默认86400即24小时）" min="60" max="172800">
        <div class="form-hint">60秒 - 48小时，默认24小时</div>
      </div>
      <div class="form-group rp-toggle-row" @click="state.sendForm.is_exclusive = !state.sendForm.is_exclusive">
        <div>
          <label class="form-label form-label--no-margin">独占模式</label>
          <div class="form-hint form-hint--sm">仅显示封面文件，不显示寄语</div>
        </div>
        <div class="toggle-switch" :class="{ active: state.sendForm.is_exclusive }">
          <div class="toggle-slider"></div>
        </div>
      </div>
      <div class="rp-cover">
        <label class="form-label">红包封面（可选）</label>
        <div class="rp-cover__tabs">
          <button
            :class="['rp-cover__tab', { active: state.coverTab === 'upload' }]"
            @click="state.coverTab = 'upload'"
          ><i class="fas fa-folder-open"></i> 上传文件</button>
          <button
            :class="['rp-cover__tab', { active: state.coverTab === 'url' }]"
            @click="state.coverTab = 'url'"
          ><i class="fas fa-link"></i> 使用外链</button>
        </div>
        <div v-show="state.coverTab === 'upload'" class="image-uploader-preview" @click="rpCoverFileInput.click()">
          <div v-if="state.coverPreviewUrl" class="preview-container">
            <div v-if="state.coverFileType === 'image'" style="position: relative; display: inline-block;">
              <img :src="state.coverPreviewUrl" alt="预览" loading="lazy" class="preview-image" @error="$event.target.style.display='none'">
              <button class="preview-delete-btn" @click.stop="deleteCoverPreview"><i class="fas fa-times"></i></button>
            </div>
            <div v-else-if="state.coverFileType === 'audio'" style="position: relative; display: inline-block; width: 300px;">
              <audio :src="state.coverPreviewUrl" controls style="width: 100%; display: block;"></audio>
              <button class="preview-delete-btn" @click.stop="deleteCoverPreview"><i class="fas fa-times"></i></button>
            </div>
          </div>
          <div v-if="!state.coverPreviewUrl" class="preview-placeholder">
            <i class="fas fa-cloud-upload-alt"></i>
            <div class="placeholder-text">点击上传</div>
            <div class="placeholder-hint">支持图片/音频，≤80MB</div>
          </div>
          <input ref="rpCoverFileInput" type="file" accept="image/*,audio/*" class="sr-only" @change="handleCoverFileChange">
        </div>
        <div v-show="state.coverTab === 'url'">
          <input type="text" class="modal-input" v-model="state.coverUrl" placeholder="https:// 或 http:// 开头的图片/音频链接">
          <div class="form-hint">直接输入图片或音频的 URL 地址</div>
        </div>
      </div>
    </div>

    <div v-show="state.activeTab === 'record'" class="rp-record">
      <div class="form-group">
        <label class="form-label">红包 ID</label>
        <input type="text" class="modal-input" v-model="state.recordId" placeholder="请输入红包 ID">
      </div>
      <button class="modal-btn primary btn-full" @click="queryRedpacketRecords">查询记录</button>
      <div v-if="state.recordList.length > 0 || state.recordLoading" class="rp-record__list" @scroll="handleRedpacketRecordScroll">
        <div v-for="record in state.recordList" :key="record.user_id" class="list-row">
          <img v-if="record.avatar" :src="record.avatar" :alt="record.username || record.user_id" class="list-row__avatar" loading="lazy">
          <div v-else class="list-row__avatar-placeholder">{{ (record.username || record.user_id || '?').charAt(0).toUpperCase() }}</div>
          <div class="list-row__content">
            <div class="list-row__title">{{ record.username || record.user_id || '未知用户' }}</div>
            <div class="list-row__subtitle">ID: {{ record.user_id || '-' }}</div>
          </div>
          <div class="list-row__action" style="text-align:right;">
            <div class="list-row__value rp-record__carrot">+{{ record.carrot || 0 }}</div>
            <div class="list-row__subtitle">{{ formatRelativeTime(record.receive_at) }}</div>
          </div>
        </div>
        <div v-if="state.recordLoading && state.recordList.length > 0" class="loading-state loading-state--sm">
          <i class="fas fa-circle-notch fa-spin"></i></div>
      </div>
      <div v-else-if="state.recordId" class="rp-record__empty">暂无领取记录</div>
    </div>

    <template v-if="state.activeTab === 'send'" #footer>
      <button class="modal-btn secondary" @click="emit('close')">取消</button>
      <button class="modal-btn primary" @click="submitRedpacket" :disabled="state.uploading">
        <i v-if="state.uploading" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>发红包</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-label--no-margin { margin: 0; }
.form-hint--sm { margin-top: 2px; }
.form-hint--lg { margin-top: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.btn-full { width: 100%; margin-bottom: 20px; }

.rp-toggle-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.rp-cover { margin-top: 16px; }
.rp-cover__tabs {
  display: flex; gap: 20px; margin-bottom: 12px;
  border-bottom: 0.5px solid var(--system-quaternary);
}
.rp-cover__tab {
  padding: 8px 0; border: none; background: none;
  font: var(--body); cursor: pointer;
  color: var(--system-secondary); border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.rp-cover__tab.active { color: var(--key-color); border-bottom-color: var(--key-color); }

.rp-record__list { overflow-y: auto; }
.rp-record__carrot { color: var(--success); font: var(--title-3-emphasized); }
.rp-record__empty { padding: 40px 20px; text-align: center; color: var(--system-tertiary); font: var(--body); }
</style>
