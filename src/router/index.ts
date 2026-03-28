import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../view/LoginView.vue'
import HomeView from '../view/HomeView.vue'
import EventView from '../view/EventView.vue'
import ListView from '../view/ListView.vue'
import DetailTicketView from '../view/DetailTicketView.vue'
import ScanBarcode from '../view/ScanBarcode.vue'
import ResultQrcode from '../view/ResultQrcode.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/event',
            name: 'event',
            component: EventView
        },
        {
            path: '/list/:uid?',
            name: 'list',
            component: ListView
        },
        {
            path: '/detail/:uid',
            name: 'detail',
            component: DetailTicketView
        },
        {
            path: '/scan',
            name: 'scan',
            component: ScanBarcode
        },
        {
            path: '/result',
            name: 'result',
            component: ResultQrcode
        }
    ]
})

router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('auth_token')
    if (to.name !== 'login' && !isAuthenticated) next({ name: 'login' })
    else if (to.name === 'login' && isAuthenticated) next({ name: 'home' })
    else next()
})

export default router