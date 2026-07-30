<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'

const router = useRouter()

const handleLogout = async () => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    try {
      await api.post('/logout')
    } catch (e) {
      console.error('Logout error', e)
    }
  }
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_data')
  router.push('/login')
}

const eventData = ref({
  uid: '',
  name: '...',
  sold: '-',
  verified: '-',
  cover: 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg'
})


const fetchEventData = async () => {
  try {
    const response = await api.get('/listEvent')
    const result = response.data
    if (result.success && result.data && result.data.length > 0) {
      const eV = result.data[0]
      eventData.value = {
        name: eV.event,
        uid: eV.uid,
        sold: eV.tiket_terjual.toString(),
        verified: eV.tiket_terverifikasi.toString(),
        cover: eV.cover ? `${import.meta.env.VITE_APP_URL}/storage/cover/${eV.cover}` : 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg'
      }
      fetchVerifiedUsers(eV.uid)
    }
  } catch (error) {
    console.error('Fetch event error:', error)
  }
}

const currentUser = ref({
  name: 'User',
  avatar: '',
  initials: 'U'
})

const loadUserFromStorage = () => {
  const storageData = localStorage.getItem('user_data')
  
  if (storageData) {
    try {
      const user = JSON.parse(storageData)
      
      currentUser.value = {
        name: user.name || 'User',
        avatar: user.gambar && user.gambar !== 'null' 
                ? `${import.meta.env.VITE_APP_URL}/storage/user/${user.gambar}` 
                : '',
        initials: (user.name || 'U').charAt(0).toUpperCase()
      }
    } catch (e) {
      console.error('Gagal parse user data', e)
    }
  } else {
    currentUser.value = { name: 'User', avatar: '', initials: 'U' }
  }
}

onMounted(() => {
  loadUserFromStorage()
  fetchEventData()
})

// ─── Manual Code Input ────────────────────────────────────────────────────────
const ALLOWED_CHARS = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/
const PENDING_MANUAL_CODE_KEY = 'pending_manual_code'
const PENDING_MANUAL_EVENT_UID_KEY = 'pending_manual_event_uid'

const showInputModal = ref(false)
const manualCode = ref('')
const manualCodeError = ref('')

/**
 * Normalise raw input: uppercase, strip spaces and dashes.
 * The result is written back to manualCode so the input field stays in sync.
 */
const normaliseManualCode = (raw: string): string =>
  raw.toUpperCase().replace(/[\s-]/g, '').slice(0, 8)

const onManualCodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const normalised = normaliseManualCode(target.value)
  manualCode.value = normalised
  // keep cursor at end after value is replaced programmatically
  target.value = normalised
  manualCodeError.value = ''
}

const validateManualCode = (code: string): string => {
  if (code.length === 0) return 'Kode tidak boleh kosong.'
  if (code.length !== 8) return `Kode harus tepat 8 karakter (sekarang ${code.length} karakter).`
  if (!ALLOWED_CHARS.test(code)) return 'Kode mengandung karakter yang tidak diizinkan.'
  return ''
}

const handleManualSubmit = () => {
  const code = normaliseManualCode(manualCode.value)
  manualCode.value = code

  const err = validateManualCode(code)
  if (err) {
    manualCodeError.value = err
    return
  }

  if (!eventData.value.uid) {
    manualCodeError.value = 'Data event belum siap. Coba lagi sebentar.'
    return
  }

  // Store credentials in sessionStorage – never put them in the URL
  // Clear any stale QR gate token so the old token is never reused
  sessionStorage.removeItem('pending_gate_token')
  sessionStorage.setItem(PENDING_MANUAL_CODE_KEY, code)
  sessionStorage.setItem(PENDING_MANUAL_EVENT_UID_KEY, eventData.value.uid)

  // Clear the input field before navigating
  manualCode.value = ''
  manualCodeError.value = ''
  showInputModal.value = false

  router.push({ path: '/result' })
}

const handleModalClose = () => {
  manualCode.value = ''
  manualCodeError.value = ''
  showInputModal.value = false
}

// ─── Verified Users ───────────────────────────────────────────────────────────
const verifiedUsers = ref<any[]>([])

const fetchVerifiedUsers = async (uid: string) => {
  try {
    const response = await api.get(`/event/${uid}/verified-tickets`)
    const result = response.data
    
    if (result.success && result.data) {
      verifiedUsers.value = result.data.slice(0, 10).map((item: any) => ({
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
    }
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-gotik-dark)] text-white flex flex-col font-sans max-w-[480px] mx-auto relative border-x border-[#1a1a1a]">
    
    <!-- Header -->
    <header class="flex justify-between items-center sticky top-0 z-50 bg-[var(--color-gotik-dark)] px-5 pt-6 pb-4 mb-6 relative">
      <div class="flex items-center gap-4">
        <!-- Avatar or Initials -->
        <div v-if="currentUser.avatar" class="w-[50px] h-[50px] rounded-full overflow-hidden shadow-md border border-gray-800 shrink-0">
          <img :src="currentUser.avatar" alt="User Avatar" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-[50px] h-[50px] rounded-full bg-[var(--color-gotik-yellow)] text-black flex items-center justify-center text-[22px] font-bold shadow-md border border-gray-800 shrink-0">
          {{ currentUser.initials || 'U' }}
        </div>
        
        <!-- Name -->
        <span class="text-[16px] font-medium">{{ currentUser.name }}</span>
      </div>
      <button class="text-[#888] hover:text-white transition" @click="handleLogout">
        <!-- Log Out Icon -->
        <svg fill="currentColor" width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H12C13.1046 21 14 20.1046 14 19V17H12V19H5V5H12V7H14V5C14 3.89543 13.1046 3 12 3H5ZM16.2929 7.29289L14.8787 8.70711L18.1716 12H9V14H18.1716L14.8787 17.2929L16.2929 18.7071L22 13L16.2929 7.29289Z"/>
        </svg>
      </button>
      
      <!-- Bottom gradient shadow for smooth scrolling effect -->
      <div class="absolute bottom-0 left-0 w-full h-4 translate-y-full bg-gradient-to-b from-[var(--color-gotik-dark)] to-transparent pointer-events-none"></div>
    </header>

    <main class="px-5 pb-10 flex-1">
      <!-- Event saat ini -->
    <section class="mb-5">
      <h2 class="text-[17px] font-bold mb-4">Event saat ini :</h2>
      <div @click="router.push(`/list/${eventData.uid}`)" class="rounded-[24px] border border-gray-800 bg-black overflow-hidden relative">
        <!-- Image Cover -->
        <div class="h-[210px] w-full relative overflow-hidden bg-gray-900 border-b border-gray-800">
          <img :src="eventData.cover" alt="Event Cover" class="absolute top-0 left-0 w-full h-full object-cover select-none" />
        </div>
        
        <div class="p-4 pt-5 pb-5">
          <h3 class="text-[17px] font-bold mb-3">{{ eventData.name }}</h3>
          <div class="flex justify-between text-[15px] font-medium">
            <span class="text-gray-300">Tiket terjual : <span class="text-white font-bold">{{ eventData.sold }}</span></span>
            <span class="text-gray-300">Terverifikasi : <span class="text-white font-bold">{{ eventData.verified }}</span></span>
          </div>
        </div>
      </div>
    </section>

    <!-- Progress Bar & View All -->
    <div class="flex flex-row justify-between items-center mb-8">
      <div class="h-[2px] bg-gray-600 rounded-full flex-1 mr-4"></div>
      <button @click="router.push('/event')" class="bg-[var(--color-gotik-yellow)] text-black text-[12px] font-bold px-4 py-1.5 rounded-[6px] hover:opacity-90 transition shadow-sm">
        View All
      </button>
    </div>

    <!-- Actions (Input/Scan) -->
    <section class="bg-[var(--color-gotik-yellow)] rounded-2xl p-2 mb-8 shadow-md">
      <div class="flex gap-2">
        <button @click="showInputModal = true" class="flex-1 bg-black text-white rounded-xl py-4 flex items-center justify-center gap-2.5 hover:bg-gray-900 transition shadow-sm">
          <span class="text-[var(--color-gotik-yellow)] font-bold text-[18px]">123</span>
          <span class="font-bold text-[15px]">Input Barcode</span>
        </button>
        <button @click="router.push('/scan')" class="flex-1 bg-black text-white rounded-xl py-4 flex items-center justify-center gap-2.5 hover:bg-gray-900 transition shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" class="text-[var(--color-gotik-yellow)]" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/>
          </svg>
          <span class="font-bold text-[15px]">Scan Barcode</span>
        </button>
      </div>
    </section>      

    <!-- List -->
    <section class="mb-4 space-y-3.5">
      <div v-for="user in verifiedUsers" :key="user.id" @click="router.push(`/detail/${user.id}`)" class="flex items-center bg-[var(--color-gotik-card)] border border-gray-600/30 rounded-[16px] p-3.5 shadow-sm hover:border-gray-500 transition cursor-pointer">
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
    
    <!-- View All for list -->
    <div class="flex justify-end mt-4 mb-8">
      <button @click="router.push(`/list/${eventData.uid}`)" class="bg-[var(--color-gotik-yellow)] text-black text-[12px] font-bold px-4 py-1.5 rounded-[6px] hover:opacity-90 transition shadow-sm">
        View All
      </button>
    </div>
    
    </main>

    <!-- Modal Input Manual Code -->
    <div v-if="showInputModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5 backdrop-blur-[2px]">
      <div class="bg-[#111] border border-gray-700 w-full max-w-[340px] rounded-[18px] p-5 relative shadow-2xl">
        <!-- Close Button -->
        <button @click="handleModalClose" class="absolute top-3 right-3 text-gray-300 hover:text-white transition bg-[#2a2a2a] rounded-full p-[3px] border border-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Title -->
        <h3 class="text-[15px] font-bold mb-1 text-white">Input Kode Manual</h3>
        <p class="text-[12px] text-gray-400 mb-4">Masukkan kode 8 karakter dari tiket.</p>
        
        <!-- Input Field -->
        <div class="mt-1 mb-2">
          <input
            :value="manualCode"
            @input="onManualCodeInput"
            @keydown.enter="handleManualSubmit"
            type="text"
            id="manual-code-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="characters"
            spellcheck="false"
            class="w-full bg-[#1c1c1e] text-center text-gray-200 placeholder-gray-400 rounded-[12px] py-4 border border-gray-800 focus:outline-none focus:border-gray-500 transition-colors text-[18px] font-mono tracking-[0.25em]"
            :class="{ 'border-red-500/70': manualCodeError }"
            placeholder="XXXXXXXX"
          />
        </div>

        <!-- Character counter -->
        <div class="flex justify-between items-center mb-4">
          <p v-if="manualCodeError" class="text-red-400 text-[12px]">{{ manualCodeError }}</p>
          <p v-else class="text-gray-500 text-[12px]">Karakter yang diizinkan: A-Z, 0-9 (kecuali 0, 1, I, O)</p>
          <span class="text-gray-500 text-[12px] ml-auto shrink-0">{{ manualCode.length }}/8</span>
        </div>
        
        <!-- Submit Button -->
        <button
          @click="handleManualSubmit"
          :disabled="manualCode.length !== 8"
          class="w-full bg-[var(--color-gotik-yellow)] text-black font-bold text-[15px] py-3.5 rounded-[12px] hover:opacity-90 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
</style>
