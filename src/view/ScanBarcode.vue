<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

const router = useRouter()
const errorMsg = ref('')
let html5QrCode: Html5Qrcode | null = null

const startCamera = async () => {
  errorMsg.value = ''
  
  // Tunggu sampai DOM benar-benar siap
  await nextTick()
  
  try {
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
        // Jika sukses scan
        stopCamera()
        // Kirim hasil ke halaman Result
        router.push({ path: '/result', query: { invoice: decodedText } })
      },
      (errorMessage) => {
        // Abaikan error saat mencari (sering terjadi tiap frame)
      }
    )
    console.log("Kamera Berhasil Dimuat")
  } catch (err: any) {
    console.error('Kamera gagal diakses:', err)
    errorMsg.value = 'Kamera tidak ditemukan atau izin ditolak.'
  }
}

const stopCamera = async () => {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop()
      html5QrCode.clear()
    } catch (err) {
      console.error("Gagal stop kamera", err)
    }
  }
}

onMounted(() => {
  startCamera()
})

onBeforeUnmount(() => {
  stopCamera()
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

        <p class="mt-8 text-white/70 text-sm font-medium z-30">Arahkan kamera ke QR Code</p>
      </div>

      <div v-if="errorMsg" class="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-10 text-center">
         <p class="text-red-500 mb-6">{{ errorMsg }}</p>
         <button @click="startCamera" class="bg-gotik-yellow text-black px-6 py-3 rounded-2xl font-bold">Coba Lagi</button>
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