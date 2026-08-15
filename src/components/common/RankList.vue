<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  emptyText: { type: String, default: '暂无数据' },
  skeletonCount: { type: Number, default: 5 },
  rankField: { type: String, default: '' },
  descField: { type: String, default: '' },
  formatRank: { type: Function, default: null },
  formatDesc: { type: Function, default: null },
  wrapDesc: { type: Boolean, default: false }
})
</script>

<template>
  <div>
    <div v-if="loading">
      <div v-for="i in skeletonCount" :key="i" class="list-row">
        <div class="list-row__rank skeleton-block" style="width:24px;height:18px;"></div>
        <div class="skeleton-block" style="width:40px;height:40px;border-radius:50%;"></div>
        <div class="list-row__content">
          <div class="skeleton-block skeleton-w60"></div>
          <div class="skeleton-block skeleton-w40"></div>
        </div>
        <div class="skeleton-block" style="width:60px;height:18px;"></div>
      </div>
    </div>
    <div v-else-if="items.length === 0" class="list-empty">
      {{ emptyText }}
    </div>
    <template v-else>
      <div
        v-for="(user, index) in items"
        :key="user.id || index"
        class="list-row rank-list__item"
      >
        <div
          class="list-row__rank"
          :class="{
            'list-row__rank--gold': index === 0,
            'list-row__rank--silver': index === 1,
            'list-row__rank--bronze': index === 2
          }"
        >
          {{ index + 1 }}
        </div>
        <img v-if="user.avatar" :src="user.avatar" :alt="user.username" class="list-row__avatar" loading="lazy" />
        <div v-else class="list-row__avatar-placeholder">
          {{ (user.username || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="list-row__content">
          <div class="list-row__title">{{ user.username || '未知用户' }}</div>
          <div v-if="formatDesc ? formatDesc(user) : (descField ? user[descField] : user.level_name)" class="list-row__subtitle" :class="{ 'list-row__subtitle--wrap': wrapDesc }">
            {{ formatDesc ? formatDesc(user) : (descField ? (descField === 'sign_content' ? `"${user[descField]}"` : user[descField]) : user.level_name) }}
          </div>
        </div>
        <div class="list-row__value">
          {{ formatRank ? formatRank(user) : (rankField ? user[rankField]?.toLocaleString?.() || '0' : '') }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rank-list__item {
  align-items: center;
  padding: 12px 14px;
}
</style>
