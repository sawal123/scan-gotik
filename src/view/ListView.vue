<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/api'

const router = useRouter()
const route = useRoute()

const users = ref<any[]>([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const searchQuery = ref('')
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => user.inv.toLowerCase().includes(query))
})

const eventTitle = ref('Memuat Event...')
const ticketSold = ref('-')
const ticketVerified = ref('-')

const fetchEventDetails = async () => {
  const uid = route.params.uid
  if (!uid) return
  try {
    const response = await api.get('/listEvent')
    const result = response.data
    if (result.success && result.data) {
      const currentEvent = result.data.find((e: any) => e.uid === uid)
      console.log(currentEvent)
      if (currentEvent) {
        ticketSold.value = currentEvent.tiket_terjual.toString()
        ticketVerified.value = currentEvent.tiket_terverifikasi.toString()
        eventTitle.value = currentEvent.event
      } else {
        eventTitle.value = 'Event Tidak Ditemukan'
      }
    }
  } catch (error) {
    console.error('Failed to fetch event details:', error)
  }
}

const fetchVerifiedTickets = async () => {
  const uid = route.params.uid
  if (!uid) {
    loading.value = false
    errorMessage.value = 'Tidak ada data event'
    return
  }
  
  loading.value = true
  try {
    const response = await api.get(`/event/${uid}/verified-tickets`)
    const result = response.data
    // console.log(result)
    
    if (result.success) {
      successMessage.value = result.message
      users.value = (result.data || []).map((item: any) => ({
        id: item.uid,
        name: item.user_name,
        inv: item.invoice,
        event: item.event_name,
        tickets: item.total_qty,
        status: item.konfirmasi === "1" ? "Terverifikasi" : "Belum Verifikasi",
        hasAvatar: !!(item.user_image && item.user_image !== ''),
        avatar: item.user_image,
        initials: (item.user_name || '?').charAt(0).toUpperCase(),
        waktu_verifikasi: item.waktu_verifikasi
      }))
      if (users.value.length > 0 && eventTitle.value === 'Memuat Event...') {
        eventTitle.value = users.value[0].event
      }
    } else {
      errorMessage.value = result.message || 'Gagal memuat data tiket'
    }
  } catch (error: any) {
    console.error('Failed to fetch verified tickets:', error)
    const res = error.response?.data || {}
    errorMessage.value = res.message || 'Terjadi kesalahan jaringan'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEventDetails()
  fetchVerifiedTickets()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-gotik-dark)] text-white flex flex-col font-sans max-w-[480px] mx-auto relative border-x border-[#1a1a1a]">
    
    <!-- Fixed Top Area -->
    <div class="sticky top-0 z-50 bg-[var(--color-gotik-dark)] px-5 pt-6 pb-2 border-b border-[rgba(26,26,26,0.6)] shadow-md">
      
      <!-- Header -->
      <header class="flex items-center justify-between mb-6 relative">
        <button @click="router.back()" class="text-[#bbb] hover:text-white transition z-10 w-10 h-10 flex items-center justify-center cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 14 4 9l5-5"/>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1.5"/>
          </svg>
        </button>
        <h1 class="text-[17px] font-bold absolute w-full text-center left-0 pointer-events-none tracking-wide text-white">{{ eventTitle }}</h1>
        <div class="w-10"></div>
      </header>

      <!-- Search Box -->
      <div class="relative mb-5">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg class="h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input v-model="searchQuery" type="text" class="block w-full pl-12 pr-4 py-3 border border-gray-800/80 rounded-[12px] leading-5 bg-[#1c1c1e] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors text-[16px] shadow-sm" placeholder="Search by Invoice ..." />
      </div>

      <!-- Ticket Summary Cards -->
      <div class="flex gap-3 mb-2">
        <!-- Card 1 -->
        <div class="flex-1 flex items-center bg-[#151515] border border-gray-600 rounded-[14px] p-2.5 shadow-sm hover:border-gray-500 transition cursor-pointer">
          <div class="w-8 h-8 flex items-center justify-center mr-1 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-white">
              <path d="M22 10V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10Z"/>
            </svg>
          </div>
          <div class="flex flex-col min-w-0 pr-1">
            <span class="text-[12px] text-gray-300 font-normal leading-tight mb-1 truncate">Ticket terjual</span>
            <span class="text-[var(--color-gotik-yellow)] font-bold text-[15px] leading-none">{{ ticketSold }}</span>
          </div>
        </div>

        <!-- Card 2 -->
        <div class="flex-1 flex items-center bg-[#151515] border border-gray-600 rounded-[14px] p-2.5 shadow-sm hover:border-gray-500 transition cursor-pointer">
          <div class="w-8 h-8 flex items-center justify-center mr-1 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-white">
              <path d="M22 10V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10Z"/>
            </svg>
          </div>
          <div class="flex flex-col min-w-0 pr-1">
            <span class="text-[12px] text-gray-300 font-normal leading-tight mb-1 truncate">Ticket terverifikasi</span>
            <span class="text-[var(--color-gotik-yellow)] font-bold text-[15px] leading-none">{{ ticketVerified }}</span>
          </div>
        </div>
      </div>

      <!-- Linear gradient boundary below fixed header -->
      <div class="absolute bottom-0 left-0 w-full h-5 translate-y-full bg-gradient-to-b from-[var(--color-gotik-dark)] to-transparent pointer-events-none"></div>
    </div>

    <!-- Scrollable Main Content -->
    <main class="px-5 pb-12 pt-6 flex-1">
      <section class="space-y-4">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-10">
          <div class="inline-block w-8 h-8 rounded-full border-4 border-t-[var(--color-gotik-yellow)] border-gray-700 animate-spin"></div>
          <p class="mt-4 text-gray-400 text-sm">Memuat data tiket...</p>
        </div>
        
        <!-- Empty / Error State -->
        <div v-else-if="users.length === 0" class="text-center py-10 px-4 bg-[#111] rounded-2xl border border-gray-800">
          <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-[15px] font-medium text-gray-300">{{ errorMessage || successMessage || 'Belum ada tiket terverifikasi' }}</p>
        </div>

        <!-- No Search Results -->
        <div v-else-if="filteredUsers.length === 0" class="text-center py-10 px-4 bg-[#111] rounded-2xl border border-gray-800">
          <p class="text-[15px] font-medium text-gray-300">Invoice tidak ditemukan</p>
        </div>

        <!-- Data List -->
        <div v-else v-for="user in filteredUsers" :key="user.id" @click="router.push(`/detail/${user.id}`)" class="flex items-center bg-[var(--color-gotik-card)] border border-gray-600/30 rounded-[16px] p-3.5 shadow-sm hover:border-gray-500 transition cursor-pointer">
          <!-- Avatar -->
          <div v-if="user.hasAvatar" class="w-[50px] h-[50px] rounded-full overflow-hidden mr-4 shrink-0 shadow-sm">
            <img :src="user.avatar" alt="Avatar" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-[50px] h-[50px] rounded-full bg-[var(--color-gotik-yellow)] text-black flex items-center justify-center text-[22px] font-bold mr-4 shrink-0 shadow-sm">
            {{ user.initials }}
          </div>
          
          <!-- Info -->
          <div class="flex-1 flex flex-col justify-center min-w-0 pr-2">
            <h4 class="font-normal text-[16px] mb-1.5 leading-none truncate tracking-wide">{{ user.name }}</h4>
            <div class="flex items-center mb-1.5">
              <span class="bg-[var(--color-gotik-yellow)] text-black text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] leading-none">{{ user.inv }}</span>
            </div>
            <p class="text-[13px] text-gray-400 truncate">{{ user.event }}</p>
          </div>
          
          <!-- Tickets -->
          <div class="flex flex-col items-center justify-center mr-6 shrink-0">
            <span class="font-normal text-[15px] leading-none mb-1.5 tracking-wide">{{ user.tickets }} Ticket</span>
            <span class="text-[11px] text-gray-400 leading-none">{{ user.status }}</span>
          </div>
          
          <!-- Action Icon -->
          <button class="p-1 shrink-0 group">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-gotik-yellow)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-110 transition-transform">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </section>
    </main>

  </div>
</template>

<style scoped>
</style>
