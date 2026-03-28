<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import api from '@/api/api'

const isAppLoading = ref(true)
const logoUrl = ref('')

onMounted(async () => {
  try {
    const response = await api.get('/landing')
    
    if (response.data && response.data.success) {
      const data = response.data.data
      logoUrl.value = data.logo
      
      // Update Title
      document.title = "Scan Gotik"
      
      // Update Description
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.setAttribute('name', 'description')
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute('content', data.description || 'App Scan Gotik')
      
      // Update Favicon
      let iconLink = document.getElementById("favicon") as HTMLLinkElement
      if (!iconLink) {
        iconLink = document.createElement('link')
        iconLink.id = 'favicon'
        iconLink.rel = 'icon'
        document.head.appendChild(iconLink)
      }
      iconLink.href = data.icon

      // Create dynamic manifest for PWA
      const manifest = {
        name: "Scan Gotik",
        short_name: "Scan Gotik",
        start_url: "/",
        display: "standalone",
        background_color: "#1D1D21",
        theme_color: "#FBBF24",
        icons: [
          {
            src: data.icon,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: data.icon,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
      
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
      const manifestURL = URL.createObjectURL(blob)
      
      let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement
      if (!manifestLink) {
        manifestLink = document.createElement('link')
        manifestLink.rel = 'manifest'
        document.head.appendChild(manifestLink)
      }
      manifestLink.href = manifestURL
    }
  } catch (error) {
    console.error("Gagal memuat data landing:", error)
    document.title = "Scan Gotik"
  } finally {
    // Tampilkan logo setidaknya selama 1.5 detik
    setTimeout(() => {
      isAppLoading.value = false
    }, 1500)
  }
})
</script>

<template>
  <div v-if="isAppLoading" class="min-h-screen bg-[#1D1D21] flex flex-col items-center justify-center fixed inset-0 z-[100] transition-opacity duration-500">
    <img v-if="logoUrl" :src="logoUrl" alt="Scan Gotik Logo" class="w-48 h-auto animate-pulse" />
    <div v-else class="flex items-center justify-center animate-pulse">
      <div class="w-16 h-16 bg-[#FBBF24] rounded-2xl flex items-center justify-center mr-4">
        <svg class="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
      </div>
      <h1 class="text-5xl font-bold tracking-wide text-white">Go<span class="text-[#FBBF24]">Tik</span></h1>
    </div>
  </div>
  <RouterView v-else />
</template>