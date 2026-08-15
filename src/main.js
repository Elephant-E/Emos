import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useAppStore } from './stores/app.js'

// 导入全局CSS（按顺序）
import './assets/css/base.css'


import './assets/css/components.css'
import './assets/css/live.css'
import './assets/css/login.css'
import './assets/css/upload.css'
import './assets/css/utilities.css'

// 设置默认主题为 auto（跟随系统）
if (!localStorage.getItem('theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  localStorage.setItem('theme', 'auto')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化Store（从LocalStorage恢复状态）
const appStore = useAppStore()
appStore.init()

app.mount('#app')
