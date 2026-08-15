<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'

import { useChannelDetail } from '@/composables/useChannelDetail.js'
import { useChannelEdit } from '@/composables/useChannelEdit.js'
import { useChannelMedia } from '@/composables/useChannelMedia.js'

// 组件名称（用于keep-alive）
defineOptions({
  name: 'LiveChannelDetailView'
})

const router = useRouter()

// ================= 共享状态（装配层创建，注入各域）=================
const detailState = reactive({
  id: null,
  title: '',
  description: '',
  tagline: '',
  imagePosterUrl: '',
  code: '',
  mediaCount: 0,
  isCanEdit: false,
  medias: [],
  searchQuery: '',
  isLoading: false
})

// 模态框状态
const modals = reactive({
  addMedia: false,
  editChannel: false
})

// ================= 核心数据域 =================
const {
  isLoadingInfo,
  isLoadingMore,
  hasMoreMedias,
  loadChannelInfo,
  loadChannelMedias,
  backToList,
  handleSearchInput,
} = useChannelDetail({ detailState })

// ================= 频道编辑域 =================
const {
  editChannelForm,
  isSubmittingChannel,
  closeEditChannelModal,
  openEditChannelModal,
  saveEditChannel,
  deleteChannel,
  setRouterPushMedia,
} = useChannelEdit({ detailState, modals, loadChannelInfo })

// 删除频道后跳转媒体页
setRouterPushMedia(() => {
  router.push('/media')
})

// ================= 媒体管理域 =================
const {
  mediaFormList,
  isSavingMedia,
  closeAddMediaModal,
  openAddMediaModal,
  addMediaRow,
  removeMediaRow,
  saveMedia,
  deleteMedia,
} = useChannelMedia({ detailState, modals, loadChannelMedias })
</script>

<template>
  <div class="watchlist-detail-view">
    <!-- 第一行：左侧返回 + 右侧操作按钮组 -->
    <div class="detail-header-row">
      <div class="cloud-buttons">
        <button class="cloud-btn" @click="backToList" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>
      <div class="detail-actions-group">
        <div v-if="detailState.isCanEdit" class="cloud-buttons">
          <button class="cloud-btn" @click="openEditChannelModal" title="编辑频道">
            <i class="fas fa-edit"></i>
          </button>
          <button class="cloud-btn cloud-btn--danger" @click="deleteChannel" title="删除频道">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="cloud-buttons">
          <button class="cloud-btn" @click="openAddMediaModal" title="添加直播源">
            <i class="fas fa-plus-circle"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 第二行：左侧标题 + 右侧资源数 -->
    <div class="detail-title-row">
      <h1 class="detail-title">{{ detailState.title }}</h1>
      <span class="video-count-badge">
        <i class="fas fa-tv"></i> {{ detailState.mediaCount }}
      </span>
    </div>

    <!-- 简介 -->
    <div v-if="detailState.description" class="detail-description">
      {{ detailState.description }}
    </div>

    <!-- 搜索框 -->
    <div class="search-container" style="max-width: none; margin-left: 0; margin-bottom: 1.5rem;">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        class="search-input" 
        v-model="detailState.searchQuery"
        @input="handleSearchInput"
        placeholder="搜索直播源..."
      >
    </div>

    <!-- 初次加载骨架 -->
    <div v-if="detailState.isLoading" class="video-list">
      <div
        v-for="i in 6"
        :key="`skeleton-${i}`"
        class="video-item"
      >
        <div class="video-info">
          <div class="skeleton-text" style="width: 60%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 80%;"></div>
        </div>
        <div class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="detailState.medias.length === 0" class="list-empty">
      <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem;"></i>
      <p>暂无直播源</p>
    </div>

    <!-- 直播源列表 -->
    <div v-else class="video-list">
      <div 
        v-for="media in detailState.medias" 
        :key="media.media_id || media.id"
        class="video-item"
      >
        <div class="video-info">
          <div class="video-title">{{ media.name }}</div>
          <div class="list-item-desc">
            <span v-if="media.path_type">{{ media.path_type }}</span>
            <span v-if="media.status" :class="['status-badge', media.status]">
              {{ media.status === 'normal' ? '正常' : '错误' }}
            </span>
            <span v-if="media.pseudonym">{{ media.pseudonym }}</span>
          </div>
        </div>
        <div v-if="media.is_can_edit" class="video-actions" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn cloud-btn--sm cloud-btn--danger" @click="deleteMedia(media.media_id || media.id)" title="删除直播源">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 加载更多骨架屏 -->
      <div
        v-if="isLoadingMore"
        v-for="i in Math.min(pageSize, Math.max(detailState.mediaCount - detailState.medias.length, 1))"
        :key="`loading-more-${i}`"
        class="video-item"
      >
        <div class="video-info">
          <div class="skeleton-text" style="width: 60%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 80%;"></div>
        </div>
        <div class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 添加直播源模态框 -->
    <BaseModal :visible="modals.addMedia" title="批量添加直播源" @close="closeAddMediaModal">
      <div 
        v-for="(row, index) in mediaFormList" 
        :key="index"
        class="media-form-row"
      >
        <div class="form-row-header">
          <span class="form-row-title">直播源 {{ index + 1 }}</span>
          <button 
            v-if="mediaFormList.length > 1"
            class="modal-close modal-close--sm"
            @click="removeMediaRow(index)"
            title="删除此行"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        
        <div class="form-group">
          <label class="form-label">名称</label>
          <input type="text" class="modal-input" v-model="row.name" placeholder="例如：1080p、720p">
        </div>

        <div class="form-group">
          <label class="form-label">地址</label>
          <input type="text" class="modal-input" v-model="row.pathUrl" placeholder="http://example.com/stream.m3u8">
        </div>

        <div class="form-group">
          <label class="form-label">类型</label>
          <select class="modal-input" v-model="row.pathType">
            <option value="m3u8">M3U8</option>
            <option value="mp4">MP4</option>
            <option value="rtmp">RTMP</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <button class="btn-subtle" @click="addMediaRow" style="width: 100%; border-radius: 12px; height: auto; padding: 10px;">
        <i class="fas fa-plus"></i>
        <span>添加更多直播源</span>
      </button>
      <template #footer>
        <button class="modal-btn secondary" @click="closeAddMediaModal">取消</button>
        <button class="modal-btn primary" @click="saveMedia" :disabled="isSavingMedia">
          <i v-if="isSavingMedia" class="fas fa-circle-notch fa-spin"></i>
          <span v-else>批量添加 ({{ mediaFormList.filter(r => r.name && r.pathUrl).length }})</span>
        </button>
      </template>
    </BaseModal>

    <!-- 编辑频道模态框 -->
    <BaseModal :visible="modals.editChannel" title="编辑频道" @close="closeEditChannelModal">
      <div class="form-group">
        <label class="form-label">频道标题</label>
        <input 
          v-model="editChannelForm.title" 
          class="modal-input" 
          type="text" 
          placeholder="请输入频道标题" 
        />
      </div>

      <div class="form-group">
        <label class="form-label">宣传词</label>
        <input 
          v-model="editChannelForm.tagline" 
          class="modal-input" 
          type="text" 
          placeholder="请输入宣传词（可选）" 
        />
      </div>

      <div class="form-group">
        <label class="form-label">简介</label>
        <textarea 
          v-model="editChannelForm.description" 
          class="modal-input modal-textarea" 
          placeholder="请输入频道简介（可选）" 
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">封面图片</label>
        <ImageUploader
          :model-value="editChannelForm.imagePosterUrl"
          @change="(data) => { editChannelForm.imagePosterUrl = data.url || '' }"
          :max-size="5 * 1024 * 1024"
          placeholder-text="点击上传封面"
          hint-text="支持 JPG、PNG，≤5MB"
        />
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditChannelModal">
          取消
        </button>
        <button 
          class="modal-btn primary" 
          @click="saveEditChannel"
          :disabled="isSubmittingChannel"
        >
          <i v-if="isSubmittingChannel" class="fas fa-circle-notch fa-spin"></i>
          <span v-else>保存</span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.detail-description {
  font: var(--callout);
  color: var(--system-tertiary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  padding: 0 20px;
}

.list-item-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--footnote);
  color: var(--system-secondary);
  margin-top: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font: var(--footnote);
}

.status-badge.normal {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.status-badge.error {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.media-form-row {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--system-quaternary);
  border-radius: 12px;
}

.media-form-row:last-child {
  margin-bottom: 12px;
}

.form-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-row-title {
  font: var(--callout-emphasized);
  color: var(--system-primary);
}

@media (max-width: 768px) {
  .detail-tagline,
  .detail-description {
    padding: 0 12px;
  }
}
</style>
