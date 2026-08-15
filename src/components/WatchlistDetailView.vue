<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'

import { useWatchlistDetail } from '@/composables/useWatchlistDetail.js'
import { useAddVideo } from '@/composables/useAddVideo.js'
import { useWatchlistEdit } from '@/composables/useWatchlistEdit.js'
import { useVideoEdit } from '@/composables/useVideoEdit.js'

// 组件名称（用于keep-alive）
defineOptions({
  name: 'WatchlistDetailView'
})

const router = useRouter()

// ================= 共享状态（装配层创建，注入各域）=================
const detailState = reactive({
  id: null,
  name: '',
  description: '',
  carrot: 0,
  tags: [],
  isPublic: false,
  imagePosterUrl: '',
  videos: [],
  videoCount: 0,
  searchQuery: '',
  isLoading: false,
  isSelf: false,
  isEditVideo: false,
  isShowEmpty: false,
  userIsShow: null,
  isSubscribe: false,
  dynamicUrl: '',
  userSort: 80,
  maintainers: []
})

// 模态框状态
const modals = reactive({
  editWatch: false,
  addVideo: false,
  maintainer: false,
  sort: false,
  dynamic: false,
  editVideo: false
})

const detailVideoSkeletonCount = 6

// ================= 核心数据域 =================
const {
  isLoadingInfo,
  isLoadingMore,
  hasMoreVideos,
  loadWatchlistInfo,
  loadWatchVideos,
  backToList,
  goToVideoDetail,
  handleDetailSearchInput,
} = useWatchlistDetail({ detailState })

// ================= 添加视频域 =================
const {
  addVideoSearch,
  searchResults,
  selectedVideos,
  isLoadingVideos,
  addVideoSkeletonCount,
  closeAddVideoModal,
  openAddVideoModal,
  searchVideos,
  toggleVideoSelection,
  isVideoSelected,
  addVideos,
} = useAddVideo({ detailState, modals, loadWatchVideos })

// ================= 片单编辑域 =================
const {
  editForm,
  tagInput,
  maintainerState,
  sortState,
  closeEditWatchModal,
  openEditModal,
  saveWatchlist,
  addTag,
  removeTag,
  closeMaintainerModal,
  openMaintainerModal,
  addMaintainer,
  removeMaintainer,
  saveMaintainers,
  closeSortModal,
  openSortModal,
  saveSort,
  closeDynamicModal,
  openDynamicModal,
  saveDynamic,
  toggleSubscriptionVisibility,
  clearAllVideos,
  deleteWatchlist,
  setRouterPushWatchlist,
} = useWatchlistEdit({
  detailState,
  modals,
  loadWatchlistInfo,
  loadWatchVideos,
})

// 删除片单后跳转
setRouterPushWatchlist(() => {
  router.push('/watchlist')
})

// ================= 视频编辑/移除域 =================
const {
  videoEditForm,
  closeEditVideoModal,
  openVideoEditModal,
  saveVideoEdit,
  removeVideo,
} = useVideoEdit({ detailState, modals, loadWatchVideos })
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
      
      <div v-if="detailState.isSubscribe || detailState.isSelf || detailState.isEditVideo" class="detail-actions-group">
        <template v-if="detailState.isEditVideo">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openAddVideoModal" title="添加视频">
              <i class="fas fa-plus-circle"></i>
            </button>
          </div>
        </template>
        
        <template v-if="detailState.isSelf">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openEditModal" title="编辑片单">
              <i class="fas fa-edit"></i>
            </button>
            <button class="cloud-btn" @click="openMaintainerModal" title="管理维护者">
              <i class="fas fa-user-shield"></i>
            </button>
            <button class="cloud-btn" @click="openDynamicModal" :title="detailState.dynamicUrl ? '编辑动态片单' : '设置动态片单'">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="cloud-btn cloud-btn--danger" @click="clearAllVideos" title="清空所有视频">
              <i class="fas fa-eraser"></i>
            </button>
            <button class="cloud-btn cloud-btn--danger" @click="deleteWatchlist" title="删除片单">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </template>

        <template v-if="detailState.isSubscribe">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openSortModal" title="片单排序">
              <i class="fas fa-sort-amount-down-alt"></i>
            </button>
            <button class="cloud-btn" @click="toggleSubscriptionVisibility" :title="detailState.userIsShow ? '隐藏订阅片单' : '显示订阅片单'">
              <i :class="detailState.userIsShow ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 第二行：左侧标题 + 右侧资源数 -->
    <div class="detail-title-row">
      <h1 class="detail-title">{{ detailState.name }}</h1>
      <span class="video-count-badge">
        <i class="fas fa-film"></i> {{ detailState.videoCount }}
      </span>
    </div>

    <!-- 搜索框（仅可编辑视频时显示） -->
    <div v-if="detailState.isEditVideo" class="search-container">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        class="search-input" 
        v-model="detailState.searchQuery"
        @input="handleDetailSearchInput"
        placeholder="搜索片单内的影片..."
      >
    </div>

    <!-- 初次加载骨架 -->
    <div v-if="detailState.isLoading" class="video-list">
      <div
        v-for="i in detailVideoSkeletonCount"
        :key="`detail-skeleton-${i}`"
        class="video-item"
      >
        <div class="video-poster skeleton-cover"></div>
        <div class="video-info">
          <div class="skeleton-badge" style="width: 64px; margin-bottom: 10px;"></div>
          <div class="skeleton-text" style="width: 62%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 48%; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 30%;"></div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="detailState.videos.length === 0" class="empty-state">
      <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem; opacity: 0.4;"></i>
      <div style="font-size: 1rem; font-weight: 500;">暂无影片</div>
      <div v-if="detailState.isEditVideo" style="font-size: 0.85rem; color: var(--system-tertiary); margin-top: 0.3rem;">点击右上角「+」按钮添加影片</div>
    </div>

    <!-- 视频列表 -->
    <div v-else class="video-list">
      <div 
        v-for="video in detailState.videos" 
        :key="video.video_id"
        class="video-item"
        @click="goToVideoDetail(video)"
      >
        <div class="video-poster">
          <img :src="video.video_image_poster || `https://picsum.photos/seed/${video.video_id}/200/300`" 
            alt=""
           loading="lazy">
        </div>
        <div class="video-info">
          <div class="video-type-badge">{{ video.video_type === 'tv' ? '电视剧' : '电影' }}</div>
          <div class="video-title">{{ video.video_title }}</div>
          <div class="video-origin-title">{{ video.video_origin_title }}</div>
          <div v-if="video.remark" class="video-remark">{{ video.remark }}</div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn cloud-btn--sm" @click="openVideoEditModal(video)" title="编辑视频">
              <i class="fas fa-edit"></i>
            </button>
            <button class="cloud-btn cloud-btn--sm cloud-btn--danger" @click="removeVideo(video.video_id)" title="删除视频">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isLoadingMore"
        v-for="i in Math.min(pageSize, Math.max(detailState.videoCount - detailState.videos.length, 1))"
        :key="`detail-loading-more-${i}`"
        class="video-item"
      >
        <div class="video-poster skeleton-cover"></div>
        <div class="video-info">
          <div class="skeleton-badge" style="width: 64px; margin-bottom: 10px;"></div>
          <div class="skeleton-text" style="width: 62%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 48%; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 30%;"></div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 编辑片单模态框 -->
    <BaseModal :visible="modals.editWatch" title="编辑片单" @close="closeEditWatchModal">
      <div class="form-group">
        <label class="form-label">片单封面</label>
        <ImageUploader
          :model-value="editForm.imagePosterUrl"
          @change="(data) => { editForm.imagePosterUrl = data.url || '' }"
          :max-size="5 * 1024 * 1024"
          placeholder-text="点击上传封面"
          hint-text="支持 JPG、PNG，≤5MB"
        />
      </div>

      <div class="form-group">
        <label class="form-label">片单名称</label>
        <input 
          type="text" 
          class="modal-input" 
          v-model="editForm.name"
          placeholder="片单名称（100字内）"
          maxlength="100"
        >
      </div>

      <div class="form-group">
        <label class="form-label">简介</label>
        <textarea 
          class="modal-input modal-textarea" 
          v-model="editForm.description"
          rows="3" 
          placeholder="简介（1万字内）"
          maxlength="10000"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">所需萝卜</label>
        <input 
          type="number" 
          class="modal-input" 
          v-model.number="editForm.carrot"
          min="0"
          max="50000"
          placeholder="0 - 50000"
        >
      </div>

      <div class="form-group">
        <label class="form-label">标签 (回车添加)</label>
        <input 
          type="text" 
          class="modal-input"
          v-model="tagInput"
          @keypress="addTag"
          placeholder="输入标签..."
        >
        <div class="tags-list">
          <span v-for="tag in editForm.tags" :key="tag" class="tag-item">
            {{ tag }}
            <i class="fas fa-times" @click="removeTag(tag)"></i>
          </span>
        </div>
      </div>

      <div class="toggle-row">
        <span class="form-label" style="margin:0">是否公开</span>
        <div 
          :class="['toggle-switch', { active: editForm.isPublic }]"
          @click="editForm.isPublic = !editForm.isPublic"
        ><div class="toggle-slider"></div></div>
      </div>

      <div class="toggle-row">
        <span class="form-label" style="margin:0">显示空媒体</span>
        <div 
          :class="['toggle-switch', { active: editForm.isShowEmpty }]"
          @click="editForm.isShowEmpty = !editForm.isShowEmpty"
        ><div class="toggle-slider"></div></div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditWatchModal">取消</button>
        <button class="modal-btn primary" @click="saveWatchlist">保存</button>
      </template>
    </BaseModal>

    <!-- 添加视频模态框 -->
    <BaseModal :visible="modals.addVideo" title="添加视频" size="xl" @close="closeAddVideoModal">
      <div class="form-group">
        <input 
          type="text" 
          class="modal-input" 
          v-model="addVideoSearch"
          @input="searchVideos"
          placeholder="搜索未加入片单的视频..."
        >
      </div>

      <div v-if="isLoadingVideos" class="video-select-list">
        <div
          v-for="i in addVideoSkeletonCount"
          :key="`add-video-skeleton-${i}`"
          class="video-select-item"
        >
          <div class="video-poster skeleton-cover"></div>
          <div class="video-info">
            <div class="skeleton-text" style="width: 68%; height: 18px; margin-bottom: 10px;"></div>
            <div class="skeleton-text-sm" style="width: 52%;"></div>
          </div>
          <div class="select-checkbox">
            <div class="skeleton-circle" style="width: 22px; height: 22px;"></div>
          </div>
        </div>
      </div>

      <div v-else-if="searchResults.length === 0" class="empty-state">
        <i class="fas fa-search" style="font-size: 2rem; opacity: 0.3;"></i>
        <div>{{ addVideoSearch ? '未找到相关视频' : '暂无可添加视频' }}</div>
      </div>

      <div v-else class="video-select-list">
        <div 
          v-for="video in searchResults" 
          :key="video.video_id"
          :class="['video-select-item', { selected: isVideoSelected(video.video_id) }]"
          @click="toggleVideoSelection(video)"
        >
          <div class="video-poster">
            <img :src="video.video_image_poster || 'https://picsum.photos/seed/' + video.video_id + '/200/300'" alt="" loading="lazy">
          </div>
          <div class="video-info">
            <div class="video-title">{{ video.video_title }}</div>
            <div class="video-origin-title">{{ video.video_origin_title }}</div>
          </div>
          <div class="select-checkbox">
            <i v-if="isVideoSelected(video.video_id)" class="fas fa-check-circle"></i>
            <i v-else class="far fa-circle"></i>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeAddVideoModal">取消</button>
        <button class="modal-btn primary" @click="addVideos" :disabled="selectedVideos.length === 0">
          {{ selectedVideos.length > 0 ? `添加（${selectedVideos.length}）` : '添加' }}
        </button>
      </template>
    </BaseModal>

    <!-- 维护者管理模态框 -->
    <BaseModal :visible="modals.maintainer" title="管理维护者" @close="closeMaintainerModal">
      <div v-if="maintainerState.isLoading" class="loading-state loading-state--sm">
        <i class="fas fa-circle-notch fa-spin"></i>
        </div>
      <template v-else>
        <div class="form-group">
          <label class="form-label">当前维护者 ({{ maintainerState.currentMaintainers.length }})</label>
          <div class="maintainer-list">
            <div 
              v-for="maintainer in maintainerState.currentMaintainers" 
              :key="maintainer.user_id"
              class="maintainer-item"
            >
              <div class="maintainer-avatar">
                <img v-if="maintainer.avatar" :src="maintainer.avatar" :alt="maintainer.username" loading="lazy">
                <i v-else class="fas fa-user"></i>
              </div>
              <div class="maintainer-info">
                <div class="maintainer-name">{{ maintainer.username }}</div>
                <div class="maintainer-id">{{ maintainer.user_id }}</div>
              </div>
              <button class="remove-maintainer-btn" @click="removeMaintainer(maintainer.user_id)">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div v-if="maintainerState.currentMaintainers.length === 0" class="empty-maintainers">
              暂无维护者
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">添加维护者</label>
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              class="modal-input"
              v-model="maintainerState.newUserId"
              @keyup.enter="addMaintainer"
              placeholder="输入用户ID..."
              style="flex: 1;"
            >
            <button class="btn-subtle" @click="addMaintainer" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="modal-btn secondary" @click="closeMaintainerModal">取消</button>
        <button class="modal-btn primary" @click="saveMaintainers">保存</button>
      </template>
    </BaseModal>

    <!-- 片单排序模态框 -->
    <BaseModal :visible="modals.sort" title="片单排序" size="sm" @close="closeSortModal">
      <div class="form-group">
        <label class="form-label">排序</label>
        <input 
          type="number" 
          class="modal-input"
          v-model.number="sortState.currentSort"
          placeholder="1-100，越小越靠前"
          min="1"
          max="100"
        >
        <div class="form-hint">
          排序范围：1-100，默认80，数值越小越靠前
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeSortModal">取消</button>
        <button class="modal-btn primary" @click="saveSort">保存</button>
      </template>
    </BaseModal>

    <!-- 动态片单设置模态框 -->
    <BaseModal :visible="modals.dynamic" title="设置动态片单" @close="closeDynamicModal">
      <div class="form-group">
        <label class="form-label">抓取地址</label>
        <input 
          type="text" 
          class="modal-input"
          v-model="detailState.dynamicUrl"
          placeholder="输入动态抓取URL，留空则关闭此功能"
        >
        <div class="form-hint">
          留空将关闭动态抓取功能，设置后将自动从指定地址同步视频
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeDynamicModal">取消</button>
        <button class="modal-btn primary" @click="saveDynamic">保存</button>
      </template>
    </BaseModal>

    <!-- 编辑视频模态框 -->
    <BaseModal :visible="modals.editVideo" title="编辑视频" size="md" @close="closeEditVideoModal">
      <div class="form-group">
        <label class="form-label">排序</label>
        <input 
          type="number" 
          class="modal-input"
          v-model.number="videoEditForm.sort"
          min="1"
          max="100"
          placeholder="1-100，越小越靠前"
        >
        <div class="form-hint">
          排序范围：1-100，默认80，数值越小越靠前
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea 
          class="modal-input modal-textarea"
          v-model="videoEditForm.remark"
          maxlength="100"
          rows="3"
          placeholder="可选，最多100字"
        ></textarea>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditVideoModal">取消</button>
        <button class="modal-btn primary" @click="saveVideoEdit">保存</button>
      </template>
    </BaseModal>
  </div>
</template>

