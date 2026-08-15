<script setup>
import { escapeHtml, getOriginalImageUrl } from '@/utils/format.js'

defineProps({
  channels: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  isSearching: { type: Boolean, default: false },
  pageSize: { type: Number, default: 20 },
  searchQuery: { type: String, default: '' }
})

const emit = defineEmits(['goToDetail'])

const generateSkeletonArray = (count) => Array.from({ length: count }, (_, i) => i)

const parseChannelCode = (code) => {
  if (!code) return { prefix: '', number: '' }
  const prefix = code.replace(/[0-9]+/g, '')
  const number = code.replace(/[^0-9]/g, '')
  return { prefix, number }
}

const formatChannelPrefix = (prefix) => {
  if (!prefix) return { first: '', rest: '' }
  const sanitized = prefix.replace(/[^A-Za-z]/g, '')
  if (!sanitized) return { first: '', rest: '' }
  return { first: sanitized[0], rest: sanitized.slice(1) }
}
</script>

<template>
  <div id="liveView" class="view-container">
    <div id="liveChannelList" class="live-grid">
      <template v-if="isLoading && (channels.length === 0 || isSearching)">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-live-' + i" class="skeleton-live-card-wrapper">
          <div class="skeleton-live-card"><div class="skeleton-live-logo"></div><div class="skeleton-live-info"><div class="skeleton-live-title"></div><div class="skeleton-live-meta"></div></div></div>
        </div>
      </template>

      <template v-else-if="!isSearching">
        <div v-for="channel in channels" :key="channel.id || channel.code" class="live-channel-card" @click="emit('goToDetail', channel)">
          <div class="live-logo-container">
            <img v-if="channel.image_poster_url || channel.image_poster" :src="getOriginalImageUrl(channel.image_poster_url || channel.image_poster)" :alt="escapeHtml(channel.title)" @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'" loading="lazy">
            <div class="live-logo-fallback" style="display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; height: 100%;">
              <div class="live-logo-badge">
                <span class="live-logo-prefix"><span class="red-c">{{ formatChannelPrefix(parseChannelCode(channel.code || channel.title).prefix).first }}</span>{{ formatChannelPrefix(parseChannelCode(channel.code || channel.title).prefix).rest }}</span>
                <span class="live-logo-number-badge">{{ parseChannelCode(channel.code || channel.title).number }}</span>
              </div>
              <div class="live-logo-channel-name">综合</div>
            </div>
          </div>
          <div class="live-channel-info">
            <div class="live-channel-title">{{ channel.title }}</div>
            <div v-if="channel.tagline" class="live-channel-tagline">{{ channel.tagline }}</div>
            <div v-if="channel.description" class="live-channel-desc">{{ channel.description }}</div>
            <div class="live-channel-meta"><span><i class="fas fa-tv"></i> {{ channel.media_count || 0 }} 个节目</span></div>
          </div>
        </div>
      </template>

      <template v-if="isLoading && channels.length > 0">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-live-more-' + i" class="skeleton-live-card-wrapper">
          <div class="skeleton-live-card"><div class="skeleton-live-logo"></div><div class="skeleton-live-info"><div class="skeleton-live-title"></div><div class="skeleton-live-meta"></div></div></div>
        </div>
      </template>
    </div>

    <div v-if="!isLoading && channels.length === 0" id="liveEmptyState" class="list-empty">
      <i class="fas fa-broadcast-tower" style="font-size: 3rem; margin-bottom: 1rem;"></i>
      <p>{{ searchQuery ? '没有找到匹配的频道' : '暂无直播频道' }}</p>
    </div>
  </div>
</template>

<style scoped>
.live-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.live-channel-card { background: var(--opaque-shelf-bg); border-radius: 20px; overflow: hidden; cursor: pointer; }
.live-channel-card:active { opacity: 0.9; }
.live-logo-container { width: 100%; aspect-ratio: 16/10; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 20px; }
.live-logo-container img { width: 100%; height: 100%; object-fit: contain; }
.live-logo-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; height: 100%; }
.live-logo-badge { display: flex; align-items: center; background: #fff; border-radius: 20px; padding: 8px 16px 8px 12px; gap: 0; }
.live-logo-prefix { font-size: 2rem; font-weight: 900; color: #fff; letter-spacing: -2px; line-height: 1; -webkit-text-stroke: 2px #000; paint-order: stroke fill; }
.live-logo-prefix .red-c { color: #ff3b30; }
.live-logo-number-badge { background: #5a8f6b; color: #fff; font-size: 2rem; font-weight: 900; padding: 8px 14px; border-radius: 0 20px 20px 0; line-height: 1; min-width: 36px; text-align: center; -webkit-text-stroke: 1.5px #000; paint-order: stroke fill; }
.live-logo-channel-name { font-size: 1.5rem; font-weight: 800; color: #fff; -webkit-text-stroke: 2px #000; paint-order: stroke fill; letter-spacing: 12px; text-align: center; }
.live-channel-info { padding: 1rem; }
.live-channel-title { font: var(--callout-emphasized); color: var(--system-primary); margin-bottom: 0.3rem; }
.live-channel-tagline { font: var(--callout); color: var(--system-secondary); margin-bottom: 0.3rem; }
.live-channel-desc { font: var(--callout); color: var(--system-tertiary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 0.5rem; }
.live-channel-meta { font: var(--footnote); color: var(--system-tertiary); }
.live-channel-meta i { margin-right: 4px; }
.skeleton-live-card-wrapper { display: block; min-width: 0; }
.skeleton-live-card { border-radius: 20px; overflow: hidden; background: var(--opaque-shelf-bg); }
.skeleton-live-logo { width: 100%; aspect-ratio: 16/10; background: var(--system-quaternary); }
.skeleton-live-info { padding: 1rem; }
.skeleton-live-title { height: 18px; border-radius: 4px; background: var(--system-quaternary); margin-bottom: 8px; width: 60%; }
.skeleton-live-meta { height: 14px; width: 40%; border-radius: 4px; background: var(--system-quaternary); }
@media (max-width: 480px) {
  .live-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .live-channel-card { border-radius: 14px; }
  .live-logo-container { padding: 10px; }
  .live-logo-badge { padding: 4px 8px 4px 6px; border-radius: 12px; }
  .live-logo-prefix { font-size: 1.2rem; letter-spacing: -1px; -webkit-text-stroke: 1px #000; }
  .live-logo-number-badge { font-size: 1.2rem; padding: 4px 8px; border-radius: 0 12px 12px 0; -webkit-text-stroke: 1px #000; }
  .live-logo-channel-name { font-size: 0.9rem; letter-spacing: 6px; -webkit-text-stroke: 1px #000; }
  .live-channel-info { padding: 0.6rem; }
  .live-channel-title { font: var(--footnote); }
  .live-channel-tagline { display: none; }
  .live-channel-desc { display: none; }
  .skeleton-live-card { border-radius: 14px; }
  .skeleton-live-info { padding: 0.6rem; }
}
</style>