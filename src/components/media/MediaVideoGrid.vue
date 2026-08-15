<script setup>
import { escapeHtml, getOriginalImageUrl, extractYear } from '@/utils/format.js'

defineProps({
  videos: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  isSearching: { type: Boolean, default: false },
  pageSize: { type: Number, default: 20 },
  searchQuery: { type: String, default: '' }
})

const emit = defineEmits(['goToDetail', 'showPlaylist', 'handleSeek'])

const generateSkeletonArray = (count) => Array.from({ length: count }, (_, i) => i)
</script>

<template>
  <div id="videoView" class="view-container">
    <div id="videoListContainer" class="video-grid">
      <template v-if="isLoading && (videos.length === 0 || isSearching)">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-' + i" class="skeleton-card-wrapper">
          <div class="skeleton-card"><div class="skeleton-poster"></div></div>
          <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
        </div>
      </template>

      <template v-else-if="!isSearching">
        <div v-for="video in videos" :key="video.video_id" class="video-card-wrapper" style="cursor: pointer;" @click="emit('goToDetail', video.video_id)">
          <div class="video-card">
            <div class="video-poster-wrapper">
              <img v-if="video.video_image_poster" :src="getOriginalImageUrl(video.video_image_poster)" :alt="escapeHtml(video.video_title)" class="video-poster" @error="$event.target.style.display='none'" loading="lazy">
              <div v-else class="video-poster" style="display: flex; align-items: center; justify-content: center; background: var(--system-quaternary);">
                <i class="fas fa-film" style="font-size: 2.5rem; color: var(--system-tertiary);"></i>
              </div>
              <div class="video-actions-cloud">
                <div class="cloud-buttons video-action-left">
                  <button class="cloud-btn" :class="{ 'cloud-btn--active': video.seek_is_request }" :data-video-id="video.video_id" title="求片" @click.stop="emit('handleSeek', video)">
                    <i class="fas fa-heart"></i>
                  </button>
                </div>
                <div class="cloud-buttons video-action-right">
                  <button class="cloud-btn" :data-video-id="video.video_id" title="收藏" @click.stop="emit('showPlaylist', video)">
                    <i class="fas fa-star"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-title">{{ video.video_title }}</div>
            <div class="video-year">{{ extractYear(video.video_date_air) }}</div>
          </div>
        </div>
      </template>

      <template v-if="isLoading && videos.length > 0">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-more-' + i" class="skeleton-card-wrapper">
          <div class="skeleton-card"><div class="skeleton-poster"></div></div>
          <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
        </div>
      </template>
    </div>

    <div v-if="!isLoading && videos.length === 0" id="videoEmptyState" class="list-empty">
      <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 1rem;"></i>
      <p>{{ searchQuery ? '没有找到匹配的视频' : '暂无影视资源' }}</p>
    </div>
  </div>
</template>

<style scoped>
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.video-card-wrapper { cursor: pointer; }
.video-card { position: relative; border-radius: 20px; overflow: visible; }
.video-poster-wrapper { position: relative; width: 100%; aspect-ratio: 2/3; overflow: hidden; border-radius: 20px; background: var(--system-quaternary); }
.video-poster { width: 100%; height: 100%; object-fit: cover; display: block; }
.video-actions-cloud { position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; pointer-events: none; }
.video-actions-cloud .cloud-buttons { pointer-events: auto; background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.15s ease; }
.video-card-wrapper:hover .video-actions-cloud .cloud-buttons { opacity: 1; }
.video-actions-cloud .cloud-btn--active { opacity: 1 !important; }
.video-actions-cloud .cloud-btn { color: #fff; width: 28px; height: 28px; font-size: 0.7rem; }
.video-actions-cloud .cloud-btn--active { color: #ff3b30; }
.video-info { text-align: center; margin-top: 0.35rem; }
.video-title { font: var(--callout-emphasized); color: var(--system-primary); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.video-year { font: var(--footnote); color: var(--system-tertiary); }
.skeleton-card-wrapper { display: block; min-width: 0; }
.skeleton-card { border-radius: 20px; overflow: visible; }
.skeleton-poster { width: 100%; aspect-ratio: 2/3; border-radius: 20px; background: var(--system-quaternary); }
.skeleton-info { text-align: center; margin-top: 0.35rem; }
.skeleton-title { height: 16px; border-radius: 4px; background: var(--system-quaternary); margin-bottom: 4px; }
.skeleton-year { height: 12px; width: 40%; margin: 0 auto; border-radius: 4px; background: var(--system-quaternary); }
@media (max-width: 480px) {
  .video-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .video-card { border-radius: 14px; }
  .video-poster-wrapper { border-radius: 14px; }
  .skeleton-card { border-radius: 14px; }
  .skeleton-poster { border-radius: 14px; }
  .video-actions-cloud { bottom: 4px; left: 4px; right: 4px; }
  .video-actions-cloud .cloud-btn { width: 24px; height: 24px; font-size: 0.6rem; }
  .video-actions-cloud .cloud-buttons { padding: 2px; }
  .video-info { margin-top: 0.25rem; }
  .video-title { font: var(--footnote); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.05rem; }
  .video-year { font-size: 0.6rem; }
}
</style>