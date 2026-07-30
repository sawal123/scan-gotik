<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'

const router = useRouter()

const loading = ref(true)
const verifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// ─── Session / device keys ────────────────────────────────────────────────────
const GATE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const MANUAL_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/

const PENDING_GATE_TOKEN_KEY = 'pending_gate_token'
const PENDING_MANUAL_CODE_KEY = 'pending_manual_code'
const PENDING_MANUAL_EVENT_UID_KEY = 'pending_manual_event_uid'
const SCAN_DEVICE_ID_KEY = 'scan_device_id'

// ─── Mode detection ───────────────────────────────────────────────────────────
type ScanMode = 'qr' | 'manual' | 'unknown'

const scanMode = ref<ScanMode>('unknown')

const getGateToken = (): string => {
  const token = sessionStorage.getItem(PENDING_GATE_TOKEN_KEY)?.trim() ?? ''
  return GATE_TOKEN_PATTERN.test(token) ? token : ''
}

const getManualCode = (): string => {
  const code = sessionStorage.getItem(PENDING_MANUAL_CODE_KEY)?.trim() ?? ''
  return MANUAL_CODE_PATTERN.test(code) ? code : ''
}

const getManualEventUid = (): string =>
  sessionStorage.getItem(PENDING_MANUAL_EVENT_UID_KEY)?.trim() ?? ''

const detectMode = (): ScanMode => {
  if (getGateToken()) return 'qr'
  if (getManualCode() && getManualEventUid()) return 'manual'
  return 'unknown'
}

// ─── Ticket data ──────────────────────────────────────────────────────────────
const ticketData = ref({
  uid: '',
  event: 'Memuat...',
  image: 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg',
  buyer: {
    nama: '-',
    email: '-',
    invoice: '-'
  },
  tickets: [] as Array<{ type: string; count: number }>,
  status: '-'
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getOrCreateScanDeviceId = (): string => {
  const existing = localStorage.getItem(SCAN_DEVICE_ID_KEY)?.trim()
  if (existing) return existing

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`

  localStorage.setItem(SCAN_DEVICE_ID_KEY, generated)
  return generated
}

const apiErrorMessage = (error: any, fallback: string): string => {
  const responseMessage = error?.response?.data?.message
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  switch (error?.response?.status) {
    case 401:
      return 'Sesi login telah berakhir. Silakan login kembali.'
    case 403:
      return 'Akun ini tidak memiliki akses ke event tiket tersebut.'
    case 404:
      return 'Kode tidak valid atau tiket tidak ditemukan.'
    case 409:
      return 'Tiket sudah pernah digunakan.'
    case 422:
      return 'Tiket belum lunas atau status tiket tidak dapat dipindai.'
    case 429:
      return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    default:
      return error?.response
        ? fallback
        : 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  }
}

const clearSessionCredentials = () => {
  sessionStorage.removeItem(PENDING_GATE_TOKEN_KEY)
  sessionStorage.removeItem(PENDING_MANUAL_CODE_KEY)
  sessionStorage.removeItem(PENDING_MANUAL_EVENT_UID_KEY)
}

const mapTicketResponse = (td: any) => {
  ticketData.value = {
    uid: td.uid,
    event: td.event_name,
    image: td.cover
      ? `${import.meta.env.VITE_APP_URL}/storage/cover/${td.cover}`
      : 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg',
    buyer: {
      nama: td.buyer_name,
      email: td.email,
      invoice: td.invoice
    },
    tickets: Array.isArray(td.ticket_items)
      ? td.ticket_items.map((ticket: any) => ({
          type: ticket.jenis_tiket,
          count: Number(ticket.qty) || 0
        }))
      : [],
    status: td.status_label || (td.konfirmasi ? 'Terverifikasi' : 'Belum Terverifikasi')
  }
}

// ─── QR / handheld mode ───────────────────────────────────────────────────────
const fetchQrTicket = async () => {
  const gateToken = getGateToken()

  if (!gateToken) {
    errorMessage.value =
      'Gate token tidak ditemukan atau format QR tidak valid. Silakan scan ulang tiket terbaru.'
    loading.value = false
    return
  }

  try {
    const response = await api.post('/ticket/search', { gate_token: gateToken })
    const result = response.data

    if (result.success && result.data) {
      mapTicketResponse(result.data)
    } else {
      errorMessage.value = result.message || 'Tiket tidak ditemukan.'
    }
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'Terjadi kesalahan saat mencari tiket.')
  } finally {
    loading.value = false
  }
}

const verifyQrTicket = async () => {
  const gateToken = getGateToken()
  if (!gateToken) {
    errorMessage.value = 'Gate token tidak tersedia. Silakan scan ulang tiket.'
    return
  }

  try {
    const response = await api.post('/ticket/confirm', {
      gate_token: gateToken,
      scan_device_id: getOrCreateScanDeviceId()
    })
    const result = response.data

    if (result.success) {
      successMessage.value = result.message || 'Check-in berhasil.'
      ticketData.value.status = 'Terverifikasi'
      clearSessionCredentials()
    } else {
      errorMessage.value = result.message || 'Gagal melakukan verifikasi.'
    }
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'Terjadi kesalahan saat melakukan check-in.')
  }
}

// ─── Manual code mode ─────────────────────────────────────────────────────────
const fetchManualTicket = async () => {
  const manualCode = getManualCode()
  const eventUid = getManualEventUid()

  if (!manualCode || !eventUid) {
    errorMessage.value =
      'Kode manual atau event tidak ditemukan. Silakan kembali dan masukkan kode ulang.'
    loading.value = false
    return
  }

  try {
    const response = await api.post('/ticket/manual/search', {
      manual_code: manualCode,
      event_uid: eventUid
    })
    const result = response.data

    if (result.success && result.data) {
      mapTicketResponse(result.data)
    } else {
      errorMessage.value = result.message || 'Tiket tidak ditemukan.'
    }
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'Terjadi kesalahan saat mencari tiket.')
  } finally {
    loading.value = false
  }
}

const verifyManualTicket = async () => {
  const manualCode = getManualCode()
  const eventUid = getManualEventUid()

  if (!manualCode || !eventUid) {
    errorMessage.value = 'Kode manual tidak tersedia. Silakan kembali dan masukkan kode ulang.'
    return
  }

  try {
    const response = await api.post('/ticket/manual/confirm', {
      manual_code: manualCode,
      event_uid: eventUid,
      scan_device_id: getOrCreateScanDeviceId()
    })
    const result = response.data

    if (result.success) {
      successMessage.value = result.message || 'Check-in berhasil.'
      ticketData.value.status = 'Terverifikasi'
      clearSessionCredentials()
    } else {
      errorMessage.value = result.message || 'Gagal melakukan verifikasi.'
    }
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'Terjadi kesalahan saat melakukan check-in.')
  }
}

// ─── Unified entry points ─────────────────────────────────────────────────────
const fetchTicketSearch = async () => {
  const mode = detectMode()
  scanMode.value = mode

  if (mode === 'qr') {
    await fetchQrTicket()
  } else if (mode === 'manual') {
    await fetchManualTicket()
  } else {
    errorMessage.value =
      'Tidak ada data tiket yang ditemukan. Silakan scan ulang atau masukkan kode manual.'
    loading.value = false
  }
}

const handleVerify = async () => {
  // Guard: prevent double-submit
  if (!ticketData.value.uid || verifying.value) return

  verifying.value = true
  errorMessage.value = ''

  try {
    if (scanMode.value === 'manual') {
      await verifyManualTicket()
    } else {
      await verifyQrTicket()
    }
  } finally {
    verifying.value = false
  }
}

const handleBack = () => {
  // Clean up any pending credentials when user cancels the flow
  clearSessionCredentials()
  router.back()
}

onMounted(() => {
  void fetchTicketSearch()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-gotik-dark)] text-white flex flex-col font-sans max-w-[480px] mx-auto relative border-x border-[#1a1a1a]">
    <header class="flex items-center justify-between sticky top-0 z-50 bg-[var(--color-gotik-dark)] px-5 pt-6 pb-4 mb-2 relative">
      <button @click="handleBack" class="text-[#bbb] hover:text-white transition z-10 w-10 h-10 flex items-center justify-center cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1.5"/>
        </svg>
      </button>
      <h1 class="text-[17px] font-bold absolute w-full text-center left-0 pointer-events-none tracking-wide text-white">Hasil Scan</h1>
      <div class="w-10"></div>
    </header>

    <main class="px-5 pb-10 flex-1 relative flex flex-col">
      <div v-if="loading" class="flex-1 flex flex-col items-center justify-center animate-pulse mt-10">
        <div class="inline-block w-10 h-10 rounded-full border-4 border-t-[var(--color-gotik-yellow)] border-gray-700 animate-spin mb-4"></div>
        <p class="text-gray-400">Mencari Tiket...</p>
      </div>

      <div v-else-if="errorMessage && !ticketData.uid" class="flex-1 flex flex-col items-center justify-center animate-fade-in mt-10">
        <div class="bg-[#111] border border-gray-800 rounded-2xl p-6 text-center shadow-lg w-full max-w-[320px]">
          <svg class="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-white font-medium mb-4">{{ errorMessage }}</p>
          <button @click="router.push('/scan')" class="bg-gray-800 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-700 transition">Scan Ulang</button>
        </div>
      </div>

      <div v-if="!loading && ticketData.uid" class="rounded-[24px] border border-gray-600/80 bg-black overflow-hidden relative shadow-lg mt-2 mb-10 shrink-0 animate-fade-in">
        <div class="h-[180px] w-full relative overflow-hidden bg-gray-900 border-b border-gray-800">
          <img :src="ticketData.image" alt="Event Cover" class="absolute top-0 left-0 w-full h-full object-cover select-none" />
        </div>

        <div class="pt-5 pb-8 px-5 bg-[#0a0a0a]">
          <h3 class="text-[17px] font-bold mb-6 tracking-wide text-white">{{ ticketData.event }}</h3>

          <div class="grid grid-cols-[110px_1fr] gap-y-2 mb-8 text-[15px]">
            <div class="text-gray-200 font-normal">Nama</div>
            <div class="text-gray-200">{{ ticketData.buyer.nama }}</div>

            <div class="text-gray-200 font-normal">Email</div>
            <div class="text-gray-200">{{ ticketData.buyer.email }}</div>

            <div class="text-gray-200 font-normal">Invoice</div>
            <div class="text-gray-200">{{ ticketData.buyer.invoice }}</div>
          </div>

          <h4 class="text-[15px] font-bold mb-4 text-white">Ticket</h4>

          <div class="grid grid-cols-[140px_30px_1fr] gap-y-2 mb-10 text-[15px]">
            <template v-for="(ticket, idx) in ticketData.tickets" :key="idx">
              <div class="text-gray-200 font-normal">{{ ticket.type }}</div>
              <div class="text-white font-bold">{{ ticket.count }}</div>
              <div class="text-gray-200">Ticket</div>
            </template>
          </div>

          <div class="flex justify-between items-center text-[16px]">
            <span class="text-white font-bold">Status</span>
            <span class="text-[var(--color-gotik-yellow)] font-bold tracking-wide">{{ ticketData.status }}</span>
          </div>
        </div>
      </div>

      <div v-if="!loading && ticketData.uid" class="mt-auto pt-4 flex shrink-0 animate-fade-in">
        <button
          v-if="ticketData.status !== 'Terverifikasi'"
          @click="handleVerify"
          :disabled="verifying"
          class="w-full bg-[var(--color-gotik-yellow)] text-black font-bold text-[18px] py-4 rounded-[14px] hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="verifying" class="inline-block w-5 h-5 border-[2.5px] border-t-black border-black/30 rounded-full animate-spin"></span>
          {{ verifying ? 'Memverifikasi...' : 'Verifikasi' }}
        </button>
        <button v-else class="w-full bg-[#1a1a1a] text-[#888] font-bold text-[18px] py-4 rounded-[14px] cursor-not-allowed shadow-sm border border-[#2a2a2a]">
          Sudah Terverifikasi
        </button>
      </div>

      <div v-if="errorMessage && ticketData.uid" class="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm text-center animate-fade-in">
        {{ errorMessage }}
      </div>

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
          <p class="text-gray-400 text-[15px] mb-8 leading-relaxed">{{ successMessage }}<br><span class="text-gray-500 text-sm">Selamat menikmati acara.</span></p>
          <button @click="router.push('/')" class="w-full bg-white text-black font-bold text-[16px] py-3.5 rounded-[12px] hover:bg-gray-200 transition shadow-sm">
            Kembali ke Beranda
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
