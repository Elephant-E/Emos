<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { formatDate, escapeHtml, formatFileSize, extractYear, formatDuration } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'

import { useVideoDetail } from '@/composables/useVideoDetail.js'
import { useResourceActions } from '@/composables/useResourceActions.js'
import { useSubtitleManager } from '@/composables/useSubtitleManager.js'
import { useMoveTarget } from '@/composables/useMoveTarget.js'

// ================= 核心数据域 =================
const {
  videoData,
  videoId,
  isLoading,
  isSyncing,
  isLoadingResources,
  seasons,
  episodes,
  resources,
  expandedSeasons,
  selectedEpisode,
  allEpisodesData,
  getNumericId,
  formatVideoType,
  formatGenres,
  loadResourcesForEpisode,
  loadResourcesForMovie,
  loadSeasonsAndEpisodes,
  toggleSeason,
  getSeasonResourceStatus,
  selectEpisode,
  loadVideoDetail,
  goBack,
  handleSyncData,
  handleEpisodeSeekRequest,
} = useVideoDetail()

// ================= 资源操作域 =================
const {
  showResourcesModal,
  currentResource,
  showActionDropdown,
  dropdownPosition,
  showRenameModal,
  renameForm,
  isRenaming,
  showDeleteModal,
  deleteForm,
  showDropdown,
  closeActionDropdown,
  handleGlobalClick,
  openResourcesModal,
  closeResourcesModal,
  openRenameModal,
  closeRenameModal,
  submitRename,
  deleteResource,
  closeDeleteModal,
  confirmDelete,
  submitDelete,
} = useResourceActions({
  selectedEpisode,
  loadResourcesForEpisode,
  loadResourcesForMovie,
})

// ================= 字幕管理域 =================
const {
  showSubtitleModal,
  subtitles,
  isLoadingSubtitles,
  showEditSubtitleModal,
  currentSubtitle,
  editSubtitleForm,
  isEditingSubtitle,
  showDeleteSubtitleModal,
  deleteSubtitleForm,
  manageSubtitles,
  loadSubtitles,
  closeSubtitleModal,
  closeEditSubtitleModal,
  editSubtitle,
  submitEditSubtitle,
  closeDeleteSubtitleModal,
  confirmDeleteSubtitle,
  submitDeleteSubtitle,
  deleteSubtitle,
} = useSubtitleManager({
  getNumericId,
  videoId,
  selectedEpisode,
  currentResource,
  showActionDropdown,
})

// ================= 移动目标域 =================
const {
  showMoveModal,
  moveForm,
  isMoving,
  moveSearchQuery,
  moveSearchResults,
  moveSearching,
  moveSearched,
  selectedMoveVideo,
  moveTreeData,
  moveTreeLoading,
  expandedMoveSeasons,
  selectedMoveTarget,
  handleMoveSearchInput,
  searchMoveTarget,
  selectMoveVideo,
  selectMoveEpisode,
  toggleMoveSeason,
  moveResource,
  closeMoveModal,
  submitMove,
} = useMoveTarget({
  currentResource,
  showActionDropdown,
  loadResourcesForEpisode,
  selectedEpisode,
})

// ================= 视图层：更多详情模态框 =================
const showOverviewModal = ref(false)
const showMoreOverview = () => {
  showOverviewModal.value = true
}
const closeOverviewModal = () => {
  showOverviewModal.value = false
}

// ================= 生命周期 =================
onMounted(() => {
  // 激活详情页样式
  document.body.classList.add('detail-page-active')
  loadVideoDetail()
  // 添加全局点击事件监听
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  // 清理详情页样式，恢复 body 默认 padding-top
  document.body.classList.remove('detail-page-active')
  // 移除全局点击事件监听
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<template>
  <div class="detail-container">
    <!-- 加载骨架屏 -->
    <div v-if="isLoading" class="detail-skeleton">
      <div class="hero-section">
        <div class="skeleton-backdrop"></div>
        <div class="hero-gradient"></div>
        <div class="hero-actions"><div class="skeleton-action-btn-small"></div></div>
        <div class="hero-content">
          <div class="hero-info">
            <div class="skeleton-title-logo"></div>
            <div class="skeleton-meta"><div class="skeleton-meta-item"></div><div class="skeleton-meta-item"></div><div class="skeleton-meta-item"></div></div>
            <div class="skeleton-overview"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>

          </div>
        </div>
      </div>
      <div class="detail-content">
        <div class="detail-section">
          <div class="skeleton-section-title"></div>
          <div class="skeleton-accordion-list">
            <div v-for="i in 3" :key="'item-' + i" class="skeleton-accordion-item">
              <div class="skeleton-chevron"></div>
              <div class="skeleton-season-info"><div class="skeleton-line short"></div></div>
              <div class="skeleton-status-dot"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Hero Section - 背景大图 -->
    <div v-if="!isLoading" class="hero-section" id="heroSection">
      <div class="hero-backdrop" id="heroBackdrop" :style="{ backgroundImage: videoData?.video_image_backdrop ? `url(${videoData.video_image_backdrop})` : 'none' }"></div>
      <div class="hero-gradient"></div>
      <div class="hero-actions">
        <button class="hero-action-btn back-btn" @click="goBack"><i class="fas fa-chevron-left"></i></button>
      </div>
      <div class="hero-content">
        <div class="hero-info">
          <div class="hero-title-wrapper" id="heroTitleWrapper">
            <img v-if="videoData?.video_image_logo" class="hero-title-logo" id="videoLogo" :src="videoData.video_image_logo" :alt="escapeHtml(videoData.video_title)" @error="$event.target.style.display='none'; document.getElementById('videoTitle').style.display='block'" loading="lazy">
            <h1 class="hero-title" id="videoTitle" :style="{ display: videoData?.video_image_logo ? 'none' : 'block' }">{{ videoData?.video_title }}</h1>
          </div>
          <div class="hero-meta">
            <span id="videoType">{{ formatVideoType(videoData?.video_type) }}</span>
            <span class="meta-dot">·</span>
            <span id="videoYear">{{ extractYear(videoData?.video_date_air) }}年</span>
            <span class="meta-dot">·</span>
            <span id="videoGenres">{{ formatGenres(videoData?.genres) }}</span>
          </div>
          <div class="overview-wrapper">
            <p class="hero-overview" id="videoOverview">{{ videoData?.overview }}</p>
            <button class="more-btn-inline" id="moreOverviewBtn" @click="showMoreOverview">更多</button>
          </div>

        </div>
      </div>
    </div>
      
      <!-- 内容区域 -->
      <div class="detail-content" v-if="!isLoading">
        <!-- 电视剧：显示季/集手风琴 -->
        <section class="detail-section" id="seasonsSection" v-if="videoData?.video_type === 'tv' && seasons.length > 0">
          <h2 class="section-title">
            剧集列表
            <div class="cloud-buttons">
              <button class="cloud-btn" :class="{ 'cloud-btn--active': isSyncing }" :disabled="isSyncing" @click="handleSyncData" title="同步资源"><i :class="isSyncing ? 'fas fa-circle-notch fa-spin' : 'fas fa-sync-alt'"></i></button>
            </div>
          </h2>
          
          <div class="list-group">
            <template v-for="(season, index) in seasons" :key="season.season_id">
              <div class="list-row clickable" @click="toggleSeason(season)">
                <i class="fas fa-chevron-right list-row__chevron-icon" :class="{ expanded: expandedSeasons[season.season_id] }"></i>
                <img v-if="season.season_image_logo" class="season-logo" :src="season.season_image_logo" :alt="season.season_title || `第 ${season.season_number} 季`" @error="$event.target.style.display='none'" loading="lazy">
                <div class="list-row__content">
                  <div class="list-row__title">{{ season.season_number === 0 ? '特别季' : `第 ${season.season_number} 季` }}<span class="season-episodes-count">{{ season.episodes_count }} 集</span></div>
                </div>
                <div class="season-status-dot" :class="getSeasonResourceStatus(season.season_id)"></div>
              </div>
              <template v-if="expandedSeasons[season.season_id] && episodes[season.season_id]">
                <div 
                  v-for="episode in episodes[season.season_id]" 
                  :key="episode.item_id"
                  class="list-row clickable"
                  @click="openResourcesModal(episode)"
                >
                  <div class="list-row__content">
                    <div class="list-row__title"><span class="episode-number">{{ episode.episode_number }}.</span> {{ episode.episode_title || `第 ${episode.episode_number} 集` }}</div>
                    <div class="list-row__subtitle" v-if="episode.date_air || episode.item_id">
                      <span v-if="episode.date_air">{{ episode.date_air }}</span>
                      <span v-if="episode.date_air && episode.item_id"> · </span>
                      <span v-if="episode.item_id">{{ episode.item_id }}</span>
                    </div>
                  </div>
                  <div class="list-row__action" @click.stop>
                    <div class="cloud-buttons">
                      <button class="cloud-btn" :class="{ 'cloud-btn--active': episode.with_seek_is_request }" @click="handleEpisodeSeekRequest(episode)" title="求片"><i class="fas fa-heart"></i></button>
                    </div>
                  </div>
                  <div class="list-row__value">{{ episode.medias_count || 0 }}</div>
                </div>
              </template>
            </template>
          </div>
        </section>
        
        <section class="detail-section" id="resourcesSection" v-if="videoData?.video_type !== 'tv'">
          <h2 class="section-title">
            资源列表
            <div class="cloud-buttons">
              <button class="cloud-btn" :class="{ 'cloud-btn--active': isSyncing }" :disabled="isSyncing" @click="handleSyncData" title="同步资源"><i :class="isSyncing ? 'fas fa-circle-notch fa-spin' : 'fas fa-sync-alt'"></i></button>
            </div>
          </h2>
          
          <div v-if="resources.length > 0" class="list-group">
            <div v-for="resource in resources" :key="resource.media_id" class="list-row">
              <div class="list-row__content">
                <div class="list-row__title">{{ resource.media_name || '未命名' }}</div>
                <div class="list-row__subtitle">
                  <span v-if="resource.media_file_size">{{ formatFileSize(resource.media_file_size) }}</span>
                  <span v-if="resource.media_file_second"> · {{ formatDuration(resource.media_file_second) }}</span>
                  <span v-if="resource.subtitle_count > 0"> · {{ resource.subtitle_count }} 字幕</span>
                  <span v-if="resource.created_at"> · {{ formatDate(resource.created_at) }}</span>
                </div>
              </div>
              <div class="list-row__action" @click.stop>
                <div class="cloud-buttons">
                  <button class="cloud-btn" @click="openRenameModal(resource)" title="编辑"><i class="fas fa-pen"></i></button>
                  <button class="cloud-btn" @click="showDropdown($event, resource)" title="更多"><i class="fas fa-ellipsis"></i></button>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="list-empty">
            <p>暂无资源</p>
          </div>
        </section>
      </div>
    </div>

  <!-- 更多详情模态框 -->
  <BaseModal :visible="showOverviewModal" title="详细信息" @close="closeOverviewModal">
    <div class="detail-info-list">
      <div class="detail-info-item">
        <span class="detail-info-label">原始标题</span>
        <span class="detail-info-value">{{ videoData?.video_title_original }}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">类型</span>
        <span class="detail-info-value">{{ formatVideoType(videoData?.video_type) }}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">上映日期</span>
        <span class="detail-info-value">{{ videoData?.video_date_air || '-' }}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">资源数</span>
        <span class="detail-info-value">{{ videoData?.medias_count || 0 }} 个</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">点播数</span>
        <span class="detail-info-value">{{ videoData?.request_count || 0 }} 人</span>
      </div>
      <div class="detail-info-item" v-if="videoData?.tmdb_url">
        <span class="detail-info-label">TMDB 链接</span>
        <a class="detail-info-link" :href="videoData.tmdb_url" target="_blank" rel="noopener noreferrer">{{ videoData.tmdb_url }}</a>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">TMDB ID</span>
        <span class="detail-info-value">{{ videoData?.tmdb_id || '-' }}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">TODB ID</span>
        <span class="detail-info-value">{{ videoData?.todb_id || '-' }}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">完整简介</span>
        <p class="detail-info-overview">{{ videoData?.overview }}</p>
      </div>
    </div>
  </BaseModal>
  
  <!-- 资源列表模态框 -->
  <BaseModal :visible="showResourcesModal" title="资源列表" @close="closeResourcesModal">
    <div v-if="selectedEpisode" class="episode-info">
      <p class="episode-title">
        剧集：{{ selectedEpisode.episode_title || `第 ${selectedEpisode.episode_number} 集` }}
      </p>
    </div>
    
    <div v-if="isLoadingResources" class="loading-state loading-state--sm">
      <i class="fas fa-circle-notch fa-spin"></i>
    </div>
    
    <div v-else-if="resources.length > 0" class="list-group">
      <div 
        v-for="resource in resources" 
        :key="resource.media_id"
        class="list-row"
      >
        <div class="list-row__content">
          <div class="list-row__title">{{ resource.media_name || '未命名' }}</div>
          <div class="list-row__subtitle">
            <span v-if="resource.media_file_size">{{ formatFileSize(resource.media_file_size) }}</span>
            <span v-if="resource.media_file_second"> · </span>
            <span v-if="resource.media_file_second">{{ formatDuration(resource.media_file_second) }}</span>
            <span v-if="resource.subtitle_count > 0"> · </span>
            <span v-if="resource.subtitle_count > 0">{{ resource.subtitle_count }} 字幕</span>
            <span v-if="resource.created_at"> · </span>
            <span v-if="resource.created_at">{{ formatDate(resource.created_at) }}</span>
          </div>
        </div>
        
        <div class="list-row__action" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openRenameModal(resource)" title="编辑"><i class="fas fa-pen"></i></button>
            <button class="cloud-btn" @click="showDropdown($event, resource)" title="更多"><i class="fas fa-ellipsis"></i></button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="list-empty">
      <i class="fas fa-file-video"></i>
      <p>暂无资源</p>
    </div>
  </BaseModal>
  
  <!-- 操作下拉菜单 - 使用Teleport移到body -->
  <Teleport to="body">
    <div 
      v-if="showActionDropdown && currentResource" 
      class="dropdown-overlay"
      @click="showActionDropdown = false"
    >
      <div 
        class="resource-action-dropdown"
        :style="{ 
          position: 'absolute',
          top: dropdownPosition.top + 'px', 
          left: dropdownPosition.left + 'px',
          right: 'auto'
        }"
        @click.stop
      >
        <div class="dropdown-menu__item" @click="manageSubtitles(currentResource)">
          <i class="fas fa-closed-captioning"></i>
          <span>字幕</span>
        </div>
        <div class="dropdown-menu__item" @click="moveResource(currentResource)">
          <i class="fas fa-arrows-alt"></i>
          <span>移动</span>
        </div>
        <div class="dropdown-menu__item danger" @click="deleteResource(currentResource)">
          <i class="fas fa-trash-alt"></i>
          <span>删除</span>
        </div>
      </div>
    </div>
  </Teleport>
  
  <!-- 重命名资源模态框 -->
  <BaseModal :visible="showRenameModal" title="重命名资源" @close="closeRenameModal">
    <input 
      v-model="renameForm.name" 
      type="text" 
      class="modal-input"
      placeholder="请输入资源名称"
      @keyup.enter="submitRename"
      autofocus
    />
    <template #footer>
      <button class="modal-btn secondary" @click="closeRenameModal">取消</button>
      <button class="modal-btn primary" @click="submitRename" :disabled="isRenaming">
        <i v-if="isRenaming" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确定</span>
      </button>
    </template>
  </BaseModal>
  
  <!-- 字幕列表模态框 -->
  <BaseModal :visible="showSubtitleModal" title="字幕列表" @close="closeSubtitleModal">
    <div v-if="isLoadingSubtitles" class="loading-state loading-state--sm">
      <i class="fas fa-circle-notch fa-spin"></i>
    </div>
    
    <div v-else-if="subtitles.length > 0" class="list-group">
      <div 
        v-for="subtitle in subtitles" 
        :key="subtitle.subtitle_id"
        class="list-row"
      >
        <div class="list-row__content">
          <div class="list-row__title">{{ subtitle.subtitle_title || '未命名' }}</div>
          <div class="list-row__subtitle">
            <span>{{ subtitle.subtitle_codec }}</span>
            <span v-if="subtitle.user_pseudonym"> · </span>
            <span v-if="subtitle.user_pseudonym">{{ subtitle.user_pseudonym }}</span>
            <span v-if="subtitle.created_at"> · </span>
            <span v-if="subtitle.created_at">{{ formatDate(subtitle.created_at) }}</span>
          </div>
        </div>
        
        <div class="list-row__action" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="editSubtitle(subtitle)" title="编辑"><i class="fas fa-pen"></i></button>
            <button class="cloud-btn cloud-btn--danger" @click="deleteSubtitle(subtitle)" title="删除"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="list-empty">
      <i class="fas fa-closed-captioning"></i>
      <p>暂无字幕</p>
    </div>
  </BaseModal>
  
  <!-- 重命名字幕模态框 -->
  <BaseModal :visible="showEditSubtitleModal" title="重命名字幕" @close="closeEditSubtitleModal">
    <input 
      v-model="editSubtitleForm.subtitle_title" 
      type="text" 
      class="modal-input"
      placeholder="请输入字幕名称"
      @keyup.enter="submitEditSubtitle"
      autofocus
    />
    <template #footer>
      <button class="modal-btn secondary" @click="closeEditSubtitleModal">取消</button>
      <button class="modal-btn primary" @click="submitEditSubtitle" :disabled="isEditingSubtitle">
        <i v-if="isEditingSubtitle" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确定</span>
      </button>
    </template>
  </BaseModal>
  
  <!-- 删除字幕模态框 -->
  <BaseModal :visible="showDeleteSubtitleModal" title="删除字幕" @close="closeDeleteSubtitleModal">
    <div class="form-hint" style="margin-bottom: 1rem;">
      请输入删除原因（50字以内）
    </div>
    <textarea 
      v-model="deleteSubtitleForm.reason" 
      class="modal-input modal-textarea"
      placeholder="请输入删除原因"
      rows="4"
      maxlength="50"
    ></textarea>
    <div class="form-hint" style="text-align: right; margin-top: 0.5rem;">
      {{ deleteSubtitleForm.reason.length }}/50
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeDeleteSubtitleModal">取消</button>
      <button class="modal-btn danger" @click="submitDeleteSubtitle">删除</button>
    </template>
  </BaseModal>
  
  <!-- 移动资源模态框 -->
  <BaseModal :visible="showMoveModal" title="移动资源" @close="closeMoveModal">
    <div class="form-group">
      <label class="form-label">搜索目标</label>
      <input v-model="moveSearchQuery" class="modal-input" type="text" placeholder="输入影视标题搜索" @input="handleMoveSearchInput" />
    </div>
    <div v-if="!selectedMoveVideo && moveSearchResults.length > 0" class="move-results">
      <button v-for="item in moveSearchResults" :key="item.video_id" class="move-item" @click="selectMoveVideo(item)">
        <div class="move-info">
          <div class="move-name">{{ item.video_title }}</div>
          <div class="move-meta">{{ item.video_type === 'movie' ? '电影' : '电视剧' }}</div>
        </div>
        <i class="fas fa-chevron-right" style="color: var(--system-tertiary); font-size: 0.8rem;"></i>
      </button>
    </div>
    <div v-if="!selectedMoveVideo && moveSearching" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
    <div v-if="!selectedMoveVideo && moveSearched && !moveSearching && moveSearchResults.length === 0" style="text-align: center; padding: 20px; color: var(--system-secondary);">未找到匹配结果</div>

    <div v-if="selectedMoveVideo" class="move-selected-video">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <div style="font-weight: 500;">{{ selectedMoveVideo.video_title }}</div>
          <div style="font-size: 0.8rem; color: var(--system-tertiary);">{{ selectedMoveVideo.video_type === 'movie' ? '电影' : '电视剧' }}</div>
        </div>
        <button class="modal-btn secondary" style="padding: 4px 12px; font-size: 0.8rem;" @click="selectedMoveVideo = null; moveTreeData = []; selectedMoveTarget = null">重新选择</button>
      </div>

      <div v-if="selectedMoveVideo.video_type === 'movie'" class="move-results">
        <div class="move-item selected" style="cursor: default; background: var(--system-quaternary);">
          <div class="move-info"><div class="move-name">{{ selectedMoveVideo.video_title }}</div></div>
          <i class="fas fa-check" style="color: var(--key-color); font-size: 0.85rem;"></i>
        </div>
      </div>

      <div v-if="selectedMoveVideo.video_type === 'tv' && moveTreeLoading" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
      <div v-if="selectedMoveVideo.video_type === 'tv' && !moveTreeLoading" class="move-tree">
        <div v-for="(season, sIdx) in moveTreeData" :key="sIdx" class="move-season">
          <button class="move-season-header" @click="toggleMoveSeason(sIdx)">
            <i :class="expandedMoveSeasons[sIdx] ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" style="font-size: 0.7rem; color: var(--system-tertiary); width: 16px;"></i>
            <span>第 {{ season.season_number }} 季</span>
          </button>
          <div v-if="expandedMoveSeasons[sIdx]" class="move-episodes">
            <button v-for="ep in season.episodes" :key="ep.item_id" class="move-item" :class="{ selected: selectedMoveTarget?.item_id === ep.item_id }" @click="selectMoveEpisode(ep)">
              <div class="move-info"><div class="move-name"><span class="episode-number">{{ ep.episode_number }}.</span> {{ ep.episode_title || `第 ${ep.episode_number} 集` }}</div></div>
              <i v-if="selectedMoveTarget?.item_id === ep.item_id" class="fas fa-check" style="color: var(--key-color); font-size: 0.85rem;"></i>
              <i v-else class="fas fa-chevron-right" style="color: var(--system-tertiary); font-size: 0.8rem;"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <template v-if="selectedMoveTarget" #footer>
      <button class="modal-btn secondary" @click="selectedMoveTarget = null">取消选择</button>
      <button class="modal-btn primary" @click="submitMove" :disabled="isMoving"><i v-if="isMoving" class="fas fa-circle-notch fa-spin"></i><span v-else>移动到 {{ selectedMoveTarget.label }}</span></button>
    </template>
  </BaseModal>
  
  <!-- 删除资源模态框 -->
  <BaseModal :visible="showDeleteModal" title="删除资源" @close="closeDeleteModal">
    <div class="form-hint" style="margin-bottom: 1rem;">
      请输入删除原因（50字以内）
    </div>
    <textarea 
      v-model="deleteForm.reason" 
      class="modal-input modal-textarea"
      placeholder="请输入删除原因"
      rows="4"
      maxlength="50"
    ></textarea>
    <div class="form-hint" style="text-align: right; margin-top: 0.5rem;">
      {{ deleteForm.reason.length }}/50
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeDeleteModal">取消</button>
      <button class="modal-btn danger" @click="submitDelete">删除</button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* 详情页容器 - 负边距抵消 MainLayout 的左右边距 */
.detail-container {
  min-height: 100vh;
  background: var(--page-bg);
  width: calc(100% + 50px);
  margin-left: -25px;
  margin-top: -32px;
  padding-top: 0;
}

.hero-section {
  position: relative;
  min-height: 70vh;
}

.hero-backdrop {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: 
    linear-gradient(
      to top,
      var(--hero-gradient-bottom) 0%,
      var(--hero-gradient-mid) 15%,
      var(--hero-gradient-top) 30%,
      rgba(0, 0, 0, 0) 50%
    ),
    linear-gradient(
      to right,
      var(--hero-gradient-bottom) 0%,
      transparent 40%
    );
}

/* 剧集信息 */
.episode-info {
  margin-bottom: 16px;
}

.episode-info .episode-title {
  color: var(--system-secondary);
  font: var(--callout);
  margin-bottom: 8px;
}

/* 资源骨架屏容器 */
.resource-skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

/* 骨架屏图标组 */
.skeleton-action-group {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.skeleton-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--system-quaternary);
}

.resource-row.no-border {
  border-bottom: none !important;
}

.skeleton-bg {
  background: var(--system-quaternary);
}

.detail-skeleton {
  min-height: 100vh;
}

.detail-skeleton .detail-content {
  padding: 2rem;
}

@media (max-width: 768px) {
  .detail-skeleton .detail-content {
    padding: 1rem;
  }
}

.skeleton-backdrop {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--system-quaternary);
}

.skeleton-title-logo {
  width: 300px;
  height: 80px;
  background: var(--system-quaternary);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.skeleton-action-btn-small {
  width: 38px;
  height: 38px;
  background: var(--system-quaternary);
  border-radius: 50%;
}

.skeleton-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.skeleton-meta-item {
  width: 80px;
  height: 20px;
  background: var(--system-quaternary);
  border-radius: 4px;
}

.skeleton-overview {
  margin-bottom: 2rem;
  max-width: 600px;
}

.skeleton-line {
  height: 16px;
  background: var(--system-quaternary);
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.skeleton-line.short {
  width: 60%;
}


.skeleton-section-title {
  width: 120px;
  height: 28px;
  background: var(--system-quaternary);
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-list-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--system-quaternary);
  border-radius: 12px;
}

.skeleton-poster {
  width: 60px;
  height: 90px;
  background: var(--system-quaternary);
  border-radius: 8px;
  flex-shrink: 0;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.skeleton-accordion-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-accordion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--system-quaternary);
  border-radius: 12px;
}

.skeleton-chevron {
  width: 16px;
  height: 16px;
  background: var(--system-quaternary);
  border-radius: 4px;
  flex-shrink: 0;
}

.skeleton-season-info {
  flex: 1;
}

.skeleton-status-dot {
  width: 8px;
  height: 8px;
  background: var(--system-quaternary);
  border-radius: 50%;
  flex-shrink: 0;
}

/* 展开的集列表骨架 */
.skeleton-episodes-list {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Hero Section */

/* 顶部操作栏 */
.hero-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 1.5rem 25px 0;
  z-index: 10;
}

.hero-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--opaque-shelf-bg);
  border: none;
  color: var(--system-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.hero-action-btn:active {
  opacity: 0.7;
}

/* Hero 内容 */
.hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 25px 1.5rem;
  gap: 2rem;
}

.hero-info {
  flex: 1;
  max-width: 650px;
}

.hero-title-wrapper {
  margin-bottom: 0.5rem;
}

.hero-title-logo {
  max-width: 400px;
  max-height: 120px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 20px rgba(0, 0, 0, 0.5));
}

.hero-title {
  font: var(--header-emphasized);
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  color: rgba(255, 255, 255, 0.9);
  font: var(--callout);
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.meta-dot {
  opacity: 0.5;
}

.overview-wrapper {
  position: relative;
  margin-bottom: 0.6rem;
  max-width: 440px;
  color: rgba(255, 255, 255, 0.7);
}

.hero-overview {
  font: var(--body);
  line-height: 18px;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
}

.overview-wrapper:not(.expanded) .hero-overview {
  -webkit-mask:
    linear-gradient(0deg, transparent 0, transparent 18px, #000 18px),
    linear-gradient(270deg, transparent 0, transparent 32px, #000 56px);
  mask:
    linear-gradient(0deg, transparent 0, transparent 18px, #000 18px),
    linear-gradient(270deg, transparent 0, transparent 32px, #000 56px);
  -webkit-mask-position: right bottom;
  mask-position: right bottom;
  -webkit-mask-size: initial, initial;
  mask-size: initial, initial;
}

.more-btn-inline {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  padding: 0 6px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
  z-index: 1;
  margin-left: 3px;
}

.more-btn-inline:active {
  opacity: 0.7;
}


/* 内容区域 */
.detail-content {
  padding: 1.5rem 25px;
  background: var(--page-bg);
}

.detail-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font: var(--title-2-emphasized);
  color: var(--system-primary);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}


/* 季Logo */
.season-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.season-episodes-count {
  font: var(--callout);
  color: var(--system-secondary);
  margin-left: 0.5rem;
}

.season-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.season-status-dot.complete {
  background: var(--success);
}

.season-status-dot.incomplete {
  background: var(--danger);
}

.list-row__chevron-icon {
  color: var(--system-tertiary);
  font-size: 0.75rem;
  transition: transform 0.3s var(--ease);
  flex-shrink: 0;
  margin-right: 0;
}

.list-row__chevron-icon.expanded {
  transform: rotate(90deg);
}

.episode-number {
  color: var(--system-primary);
  font: var(--body-emphasized);
  margin-right: 0.25rem;
}

.badge-self-upload {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--key-color);
  color: #fff;
  font: var(--footnote);
  white-space: nowrap;
}


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 14px;
  border-bottom: 0.5px solid var(--system-quaternary);
}

.modal-title {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  margin: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--modal-close-bg);
  border: none;
  color: var(--system-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.1rem;
}

.modal-close:active {
  background: var(--modal-close-bg-pressed);
  color: var(--system-primary);
}

.modal-body {
  padding: 20px;
}

.detail-info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-info-label {
  font: var(--callout-emphasized);
  color: var(--system-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-info-value {
  font: var(--body);
  color: var(--system-primary);
  line-height: 1.5;
}

.detail-info-overview {
  font: var(--body);
  color: var(--system-primary);
  line-height: 1.385;
  margin: 0;
  white-space: pre-wrap;
}

.detail-info-link {
  font: var(--body);
  color: var(--key-color);
  text-decoration: none;
  line-height: 1.5;
  word-break: break-all;
}

.detail-info-link:active {
  opacity: 0.7;
}

/* 移动端适配 */
@media (max-width: 768px) {

  .detail-container {
    margin-top: -16px;
    width: calc(100% + 32px);
    margin-left: -16px;
  }

  .detail-content {
    padding: 1rem 16px;
  }

  .hero-actions {
    padding: 1rem 16px 0;
  }
  
  .hero-content {
    padding: 0 16px 1rem;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .hero-info {
    max-width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .hero-title {
    font-size: 1.5rem;
  }
  
  .overview-wrapper {
    max-width: 100%;
  }

}

/* 移动端资源列表模态框适配 */
@media (max-width: 768px) {
}
</style>

<style>
/* 资源操作下拉菜单 - 非scoped，因为使用Teleport */
.resource-action-dropdown {
  background: var(--opaque-shelf-bg);
  border: none;
  border-radius: 20px;
  padding: 6px;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 10010;
}

.resource-action-dropdown .dropdown-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--system-primary);
  font: var(--body);
}

.resource-action-dropdown .dropdown-menu__item:active {
  opacity: 0.7;
}

.resource-action-dropdown .dropdown-menu__item i {
  width: 18px;
  text-align: center;
  color: var(--system-secondary);
  font-size: 0.95rem;
}

.resource-action-dropdown .dropdown-menu__item.danger {
  color: var(--danger);
}

.resource-action-dropdown .dropdown-menu__item.danger i {
  color: var(--danger);
}

.move-results { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.move-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; background: var(--system-quaternary); border: none; border-radius: 10px; cursor: pointer; text-align: left; width: 100%; }
.move-item:active { opacity: 0.7; }
.move-item.selected { background: color-mix(in srgb, var(--key-color) 12%, var(--system-quaternary)); }
.move-info { flex: 1; min-width: 0; }
.move-name { font: var(--callout-emphasized); color: var(--system-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.move-meta { font: var(--footnote); color: var(--system-tertiary); margin-top: 2px; }
.move-selected-video { margin-top: 12px; padding: 12px; background: var(--system-quaternary); border: none; border-radius: 10px; }
.move-tree { margin-top: 8px; }
.move-season { margin-bottom: 4px; }
.move-season-header { display: flex; align-items: center; gap: 8px; padding: 0.5rem 0.6rem; background: var(--opaque-shelf-bg); border: none; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; font: var(--callout); color: var(--system-primary); }
.move-season-header:active { opacity: 0.7; }
.move-episodes { padding-left: 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }
</style>
