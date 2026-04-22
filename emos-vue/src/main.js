import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useAppStore } from './stores/app.js'
import { useUploadStore } from './stores/upload.js'

// 导入全局CSS（按顺序）
import './assets/css/base.css'
import './assets/css/component-library.css'
import './assets/css/design-tokens.css'
import './assets/css/components.css'
import './assets/css/upload.css'
import './assets/css/utilities.css'

// 设置默认主题为 dark
if (!localStorage.getItem('theme')) {
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.setItem('theme', 'dark')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化Store（从LocalStorage恢复状态）
const appStore = useAppStore()
appStore.init()

// 初始化上传Store
const uploadStore = useUploadStore()
uploadStore.init()

app.mount('#app')
