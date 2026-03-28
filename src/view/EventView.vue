<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'

const router = useRouter()

const events = ref<any[]>([])

const fetchEvents = async () => {
  try {
    const response = await api.get('/listEvent')
    const result = response.data
    if (result.success && result.data) {
      events.value = result.data.map((eV: any) => ({
        id: eV.id,
        name: eV.event,
        uid: eV.uid,
        sold: eV.tiket_terjual.toString(),
        verified: eV.tiket_terverifikasi.toString(),
        image: eV.cover ? `${import.meta.env.VITE_APP_URL}/storage/cover/${eV.cover}` : 'https://go-tik.com/storage/cover/_1773939956_IMG_9883.jpeg'
      }))
    }
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }
}

onMounted(() => {
  fetchEvents()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-gotik-dark)] text-white flex flex-col font-sans max-w-[480px] mx-auto relative border-x border-[#1a1a1a]">
    
    <!-- Header -->
    <header class="flex items-center justify-between sticky top-0 z-50 bg-[var(--color-gotik-dark)] px-5 pt-6 pb-4 mb-4 relative">
      <!-- Back Button -->
      <button @click="router.back()" class="text-[#bbb] hover:text-white transition z-10 w-10 h-10 flex items-center justify-center cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" class="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1.5"/>
        </svg>
      </button>
      
      <!-- Title -->
      <h1 class="text-[17px] font-bold absolute w-full text-center left-0 pointer-events-none tracking-wide text-white">Event Kamu</h1>
      
      <!-- Placeholder to balance flex distribution -->
      <div class="w-10"></div>
      
      <!-- Bottom gradient shadow for smooth scrolling effect -->
      <div class="absolute bottom-0 left-0 w-full h-4 translate-y-full bg-gradient-to-b from-[var(--color-gotik-dark)] to-transparent pointer-events-none"></div>
    </header>

    <main class="px-5 pb-10 flex-1">
      <!-- Event List -->
    <section class="space-y-6 pb-12">
      <div v-for="event in events" :key="event.id" @click="router.push(`/list/${event.uid}`)" class="rounded-[24px] border border-gray-800 bg-black overflow-hidden relative cursor-pointer hover:border-gray-600 transition shadow-lg shadow-black/50">
        
        
        <div class="h-[210px] w-full relative bg-gray-900 overflow-hidden">
          <img :src="event.image" alt="Event Cover" class="absolute top-0 left-0 w-full h-full object-cover select-none" />
        </div>
        
        <!-- Event Details -->
        <div class="pt-4 pb-5 px-4 bg-[#0a0a0a]">
          <h3 class="text-[16px] font-bold mb-3 tracking-wide text-white">{{ event.name }}</h3>
          
          <div class="flex justify-between items-center text-[15px] font-medium">
            <span class="text-gray-300">Tiket terjual : <span class="text-white font-bold">{{ event.sold }}</span></span>
            <span class="text-gray-300">Terverifikasi : <span class="text-white font-bold">{{ event.verified }}</span></span>
          </div>
        </div>
        
      </div>
    </section>
    
    </main>

  </div>
</template>

