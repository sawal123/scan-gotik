<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const verifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const ticketData = ref({
  uid: '',
  event: 'Memuat...',
  image: 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg',
  buyer: {
    nama: '-',
    email: '-',
    invoice: '-'
  },
  tickets: [] as any[],
  status: '-'
})

const fetchTicketDetail = async () => {
  const uid = route.params.uid
  if (!uid) {
    errorMessage.value = 'Tidak ada UID tiket'
    loading.value = false
    return
  }
  
  try {
    const response = await api.get(`/ticket/${uid}/detail`)
    const result = response.data
    
    if (result.success && result.data) {
      const td = result.data
      ticketData.value = {
        uid: uid as string,
        event: td.event_name,
        image: 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg',
        buyer: {
          nama: td.buyer_name,
          email: td.email,
          invoice: td.invoice
        },
        tickets: td.ticket_items.map((t: any) => ({
          type: t.jenis_tiket,
          count: t.qty
        })),
        status: td.status_verifikasi
      }
    } else {
      errorMessage.value = result.message || 'Gagal memuat detail tiket'
    }
  } catch (error: any) {
    console.error('Failed to fetch ticket detail:', error)
    const res = error.response?.data || {}
    errorMessage.value = res.message || 'Terjadi kesalahan jaringan'
  } finally {
    loading.value = false
  }
}

const handleVerify = async () => {
  const uid = ticketData.value.uid
  if (!uid) return
  verifying.value = true
  errorMessage.value = ''
  
  try {
    const response = await api.post(`/ticket/confirm/${uid}`)
    const result = response.data
    
    if (result.success) {
      successMessage.value = result.message || 'Check-in Berhasil! Selamat datang.'
      ticketData.value.status = 'Terverifikasi'
    } else {
      errorMessage.value = result.message || 'Gagal melakukan verifikasi'
    }
  } catch (error: any) {
    console.error('Failed to verify ticket:', error)
    const res = error.response?.data || {}
    errorMessage.value = res.message || 'Terjadi kesalahan saat verifikasi'
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  fetchTicketDetail()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-gotik-dark)] text-white flex flex-col font-sans max-w-[480px] mx-auto relative border-x border-[#1a1a1a]">
    
    <!-- Header -->
    <header class="flex items-center justify-between sticky top-0 z-50 bg-[var(--color-gotik-dark)] px-5 pt-6 pb-4 mb-2 relative">
      <button @click="router.back()" class="text-[#bbb] hover:text-white transition z-10 w-10 h-10 flex items-center justify-center cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1.5"/>
        </svg>
      </button>
      <h1 class="text-[17px] font-bold absolute w-full text-center left-0 pointer-events-none tracking-wide text-white">Detail Ticket</h1>
      <div class="w-10"></div>
    </header>

    <!-- Main Content -->
    <main class="px-5 pb-10 flex-1 relative flex flex-col">
      <div v-if="loading" class="text-center py-10 mt-10">
        <div class="inline-block w-8 h-8 rounded-full border-4 border-t-[var(--color-gotik-yellow)] border-gray-700 animate-spin"></div>
        <p class="mt-4 text-gray-400 text-sm">Memuat detail tiket...</p>
      </div>

      <div v-else-if="errorMessage && !ticketData.uid" class="text-center py-10 px-4 bg-[#111] rounded-2xl border border-gray-800 mt-10">
        <p class="text-[15px] font-medium text-gray-300">{{ errorMessage }}</p>
      </div>

      <div v-else class="rounded-[24px] border border-gray-600/80 bg-black overflow-hidden relative shadow-lg mt-2 mb-8 shrink-0 animate-fade-in">
        
        <!-- Image Cover -->
        <div class="h-[180px] w-full relative overflow-hidden bg-gray-900 border-b border-gray-800">
          <img :src="ticketData.image" alt="Event Cover" class="absolute top-0 left-0 w-full h-full object-cover select-none" />
        </div>
        
        <!-- Details Body -->
        <div class="pt-5 pb-8 px-5 bg-[#0a0a0a]">
          <h3 class="text-[17px] font-bold mb-6 tracking-wide text-white">{{ ticketData.event }}</h3>
          
          <!-- Buyer Info -->
          <div class="grid grid-cols-[110px_1fr] gap-y-2 mb-8 text-[15px]">
            <div class="text-gray-200 font-normal">Nama</div>
            <div class="text-gray-200">{{ ticketData.buyer.nama }}</div>
            
            <div class="text-gray-200 font-normal">Email</div>
            <div class="text-gray-200">{{ ticketData.buyer.email }}</div>
            
            <div class="text-gray-200 font-normal">Invoice</div>
            <div class="text-gray-200">{{ ticketData.buyer.invoice }}</div>
          </div>
          
          <!-- Ticket Subtitle -->
          <h4 class="text-[15px] font-bold mb-4 text-white">Ticket</h4>
          
          <!-- Ticket Types -->
          <div class="grid grid-cols-[140px_30px_1fr] gap-y-2 mb-10 text-[15px]">
            <template v-for="(ticket, idx) in ticketData.tickets" :key="idx">
              <div class="text-gray-200 font-normal">{{ ticket.type }}</div>
              <div class="text-white font-bold">{{ ticket.count }}</div>
              <div class="text-gray-200">Ticket</div>
            </template>
          </div>
          
          <!-- Status -->
          <div class="flex justify-between items-center text-[16px]">
            <span class="text-white font-bold">Status</span>
            <span class="text-[var(--color-gotik-yellow)] font-bold tracking-wide">{{ ticketData.status }}</span>
          </div>
          
        </div>
      </div>

      <!-- Action Button (Verifikasi) -->
      <div v-if="!loading && ticketData.uid" class="mt-auto pt-4 flex shrink-0 animate-fade-in">
        <button v-if="ticketData.status !== 'Terverifikasi'" @click="handleVerify" :disabled="verifying" class="w-full bg-[var(--color-gotik-yellow)] text-black font-bold text-[18px] py-4 rounded-[14px] hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2">
          <span v-if="verifying" class="inline-block w-5 h-5 border-[2.5px] border-t-black border-black/30 rounded-full animate-spin"></span>
          {{ verifying ? 'Memverifikasi...' : 'Verifikasi' }}
        </button>
        <button v-else class="w-full bg-[#1a1a1a] text-[#888] font-bold text-[18px] py-4 rounded-[14px] cursor-not-allowed shadow-sm border border-[#2a2a2a]">
          Sudah Terverifikasi
        </button>
      </div>
      
      <!-- General Error Fallback for Verify failures (overlay/card bottom) -->
      <div v-if="errorMessage && ticketData.uid" class="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm text-center animate-fade-in">
        {{ errorMessage }}
      </div>

      <!-- Success Modal Overlay -->
      <div v-if="successMessage" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-5 backdrop-blur-sm animate-fade-in pointer-events-auto">
        <div class="bg-[#111] border border-[var(--color-gotik-yellow)] w-full max-w-[340px] rounded-[24px] p-6 text-center relative shadow-[0_0_40px_rgba(255,215,0,0.15)] flex flex-col items-center transform transition-transform">
          <div class="w-24 h-24 bg-[var(--color-gotik-yellow)] rounded-full flex items-center justify-center text-black mb-5 shadow-lg relative animate-[bounce_1s_ease-out]">
            <div class="absolute inset-0 rounded-full border border-[var(--color-gotik-yellow)] animate-ping opacity-75"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="text-white text-[22px] font-bold mb-2">Check-in Berhasil!</h3>
          <p class="text-gray-400 text-[15px] mb-8 leading-relaxed">{{ successMessage }}<br><span class="text-gray-500 text-sm">Verifikasi telah dikonfirmasi.</span></p>
          <button @click="router.back()" class="w-full bg-white text-black font-bold text-[16px] py-3.5 rounded-[12px] hover:bg-gray-200 transition shadow-sm">
            Kembali
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
</style>
