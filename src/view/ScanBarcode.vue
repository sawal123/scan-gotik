<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

const router = useRouter()
const errorMsg = ref('')
const handheldStatus = ref('Scanner handheld siap digunakan')
const scanLocked = ref(false)
let html5QrCode: Html5Qrcode | null = null
let handheldBuffer = ''
let lastKeyAt = 0
let fastKeyCount = 0
let bufferResetTimer: number | undefined
let componentUnmounted = false

type ScanSource = 'camera' | 'handheld'

const MAX_KEY_GAP = 200
const BUFFER_RESET_DELAY = 500
const MINIMUM_CODE_LENGTH = 3
const CAMERA_UNAVAILABLE_MESSAGE = 'Kamera tidak tersedia. Scanner handheld tetap dapat digunakan.'

const normalizeScanValue = (rawValue: string) => {
  const trimmedValue = rawValue.trim()

  if (!trimmedValue) {
    return ''
  }

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue
  }

  try {
    const url = new URL(trimmedValue)
    const queryValue = url.searchParams.get('invoice')
      ?? url.searchParams.get('code')
      ?? url.searchParams.get('ticket')

    if (queryValue?.trim()) {
      return queryValue.trim()
    }

    const lastPathSegment = url.pathname.split('/').filter(Boolean).pop()
    return lastPathSegment ? decodeURIComponent(lastPathSegment).trim() : trimmedValue
  } catch (err) {
    console.error('Gagal membaca URL hasil scan:', err)
    return trimmedValue
  }
}

const clearBufferResetTimer = () => {
  if (bufferResetTimer !== undefined) {
    window.clearTimeout(bufferResetTimer)
    bufferResetTimer = undefined
  }
}

const resetHandheldBuffer = () => {
  handheldBuffer = ''
  lastKeyAt = 0
  fastKeyCount = 0
  clearBufferResetTimer()
}

const scheduleBufferReset = () => {
  clearBufferResetTimer()
  bufferResetTimer = window.setTimeout(() => {
    resetHandheldBuffer()
    if (!scanLocked.value) {
      handheldStatus.value = 'Scanner handheld siap digunakan'
    }
  }, BUFFER_RESET_DELAY)
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

const stopCamera = async () => {
  if (!html5QrCode) {
    return
  }

  const activeQrCode = html5QrCode

  try {
    if (activeQrCode.isScanning) {
      await activeQrCode.stop()
    }

    activeQrCode.clear()
  } catch (err) {
    console.error('Gagal menghentikan kamera:', err)
  } finally {
    if (html5QrCode === activeQrCode) {
      html5QrCode = null
    }
  }
}

const processScanResult = async (rawValue: string, source: ScanSource) => {
  const invoice = normalizeScanValue(rawValue)

  if (!invoice || scanLocked.value) {
    return
  }

  scanLocked.value = true
  errorMsg.value = ''
  handheldStatus.value = source === 'handheld'
    ? `Barcode diterima: ${invoice}`
    : 'QR Code kamera diterima'

  try {
    await stopCamera()
    await router.push({
      path: '/result',
      query: {
        invoice,
        source
      }
    })
  } catch (err) {
    console.error('Gagal membuka halaman hasil scan:', err)
    scanLocked.value = false
    handheldStatus.value = 'Scanner handheld siap digunakan'
    errorMsg.value = 'Gagal membuka halaman hasil scan. Silakan coba scan ulang.'

    if (!componentUnmounted) {
      await startCamera()
    }
  }
}

const handleHandheldKeydown = (event: KeyboardEvent) => {
  if (scanLocked.value || isEditableTarget(event.target) || event.ctrlKey || event.altKey || event.metaKey) {
    return
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    const now = Date.now()
    const bufferedValue = handheldBuffer.trim()
    const isScannerTiming = lastKeyAt > 0 && now - lastKeyAt <= MAX_KEY_GAP && fastKeyCount > 0

    if (bufferedValue) {
      event.preventDefault()
    }

    resetHandheldBuffer()

    if (bufferedValue.length >= MINIMUM_CODE_LENGTH && isScannerTiming) {
      void processScanResult(bufferedValue, 'handheld')
    }

    return
  }

  if (event.key.length !== 1) {
    return
  }

  const now = Date.now()
  const keyGap = lastKeyAt > 0 ? now - lastKeyAt : 0

  if (lastKeyAt > 0 && keyGap > MAX_KEY_GAP) {
    resetHandheldBuffer()
  } else if (lastKeyAt > 0) {
    fastKeyCount += 1
  }

  handheldBuffer += event.key
  lastKeyAt = now
  handheldStatus.value = 'Menerima data scanner handheld...'
  scheduleBufferReset()
}

const startCamera = async () => {
  if (componentUnmounted) {
    return
  }

  errorMsg.value = ''
  
  // Tunggu sampai DOM benar-benar siap
  await nextTick()
  
  try {
    await stopCamera()
    html5QrCode = new Html5Qrcode("reader")
    
    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      // Penting: aspectRatio 1.0 agar pas di kotak scanner
      aspectRatio: 1.0 
    }

    await html5QrCode.start(
      { facingMode: "environment" }, // Gunakan kamera belakang
      config,
      (decodedText) => {
        void processScanResult(decodedText, 'camera')
      },
      (errorMessage) => {
        // Abaikan error saat mencari (sering terjadi tiap frame)
      }
    )
    console.log("Kamera Berhasil Dimuat")
  } catch (err) {
    console.error('Kamera gagal diakses:', err)
    errorMsg.value = CAMERA_UNAVAILABLE_MESSAGE
    await stopCamera()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleHandheldKeydown)
  startCamera()
})

onBeforeUnmount(() => {
  componentUnmounted = true
  window.removeEventListener('keydown', handleHandheldKeydown)
  resetHandheldBuffer()
  void stopCamera()
})
</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col max-w-md mx-auto relative overflow-hidden">
    
    <header class="p-6 flex items-center z-50">
      <button @click="router.back()" class="p-2 bg-gray-900/50 rounded-xl">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <h1 class="flex-1 text-center font-bold mr-10">Scan Barcode</h1>
    </header>

    <main class="flex-1 relative flex flex-col items-center justify-center">
      
      <div id="reader" class="absolute inset-0 w-full h-full object-cover"></div>
      
      <div class="absolute z-20 pointer-events-none flex flex-col items-center justify-center inset-0">
        <div class="absolute inset-0 bg-black/40"></div>
        
        <div class="w-64 h-64 border-2 border-white/50 rounded-[40px] relative z-30 overflow-hidden bg-transparent shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
           <div class="absolute top-0 left-0 right-0 h-1 bg-gotik-yellow shadow-[0_0_15px_#EAB308] animate-scan"></div>
        </div>

        <p class="mt-8 text-white/70 text-sm font-medium z-30">Arahkan kamera ke QR Code atau gunakan scanner handheld</p>
        <p class="mt-3 px-4 py-2 rounded-full bg-black/70 border border-white/10 text-gotik-yellow text-xs font-semibold z-30 max-w-[320px] text-center">
          {{ handheldStatus }}
        </p>
      </div>

      <div v-if="errorMsg" class="absolute left-5 right-5 bottom-8 z-40 rounded-2xl border border-red-500/40 bg-black/90 p-4 text-center shadow-xl">
         <p class="text-red-200 text-sm mb-4">{{ errorMsg }}</p>
         <button @click="startCamera" class="bg-gotik-yellow text-black px-5 py-3 rounded-xl font-bold">Coba Kamera Lagi</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-scan {
  animation: scan 2.5s infinite ease-in-out;
}
@keyframes scan {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}

/* CSS untuk memaksa video memenuhi layar */
:deep(#reader) video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
</style>
