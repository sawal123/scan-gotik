// Pastikan baris ini mengarah ke file CSS yang benar tempat kamu menaruh kode Tailwind
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.mount('#app')