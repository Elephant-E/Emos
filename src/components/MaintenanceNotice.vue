<template>
  <div class="maintenance-notice">
    <div class="maintenance-icon">
      <i class="fas fa-tools"></i>
    </div>
    <div class="maintenance-title">系统维护中</div>
    <div class="maintenance-message">
      服务器正在维护，请稍后重试
    </div>
  </div>
</template>

<style scoped>
.maintenance-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  min-height: 400px;
}

.maintenance-icon {
  font-size: 4rem;
  color: var(--warning);
  margin-bottom: 1.5rem;
}

.maintenance-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--system-primary);
  margin-bottom: 1rem;
}

.maintenance-message {
  font-size: 1rem;
  color: var(--system-secondary);
  line-height: 1.5;
  max-width: 400px;
}


</style>