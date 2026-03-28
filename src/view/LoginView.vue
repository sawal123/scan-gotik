<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    const response = await api.post('/login', {
      email: email.value,
      password: password.value
    })
    const result = response.data

    // ... kode login sebelumnya ...

    const user = result.user || result.data?.user
    if (user) {
      // Simpan objek utuh agar bisa di-parse di halaman lain
      localStorage.setItem('user_data', JSON.stringify({
        name: user.name || user.user_name || 'User',
        gambar: user.gambar || user.avatar || user.user_image || ''
      }))
    }

    // Tetap simpan token
    const token = result.token || result.data?.token
    if (token) {
      localStorage.setItem('auth_token', token)
    }

    router.push('/')
  } catch (error: any) {
    console.error('Login error:', error)
    const result = error.response?.data || {}
    errorMessage.value = result.message || 'Terjadi kesalahan jaringan atau login gagal.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gotik-dark text-white flex flex-col items-center justify-center px-8 relative font-sans">
    
    <div class="mb-12 text-center">
      <div class="flex items-center justify-center mb-6">
        <div class="w-12 h-12 bg-gotik-yellow rounded-xl flex items-center justify-center mr-3">
          <svg class="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
        </div>
        <h1 class="text-4xl font-bold tracking-wide">Go<span class="text-gotik-yellow">Tik</span></h1>
      </div>
      <h2 class="text-3xl font-bold mb-2">Welcome Back</h2>
      <p class="text-gray-400 text-sm">Let's continue your journey</p>
    </div>

    <form @submit.prevent="handleLogin" class="w-full max-w-sm space-y-5">
      
      <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-xl p-3 text-center mb-4">
        {{ errorMessage }}
      </div>

      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-5 text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </span>
        <input type="email" v-model="email" placeholder="Email" class="w-full bg-gotik-card text-white rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-gotik-yellow transition" required>
      </div>

      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-5 text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
        </span>
        <input type="password" v-model="password" placeholder="Password" class="w-full bg-gotik-card text-white rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-gotik-yellow transition" required>
      </div>

      <div class="pt-4">
        <button type="submit" :disabled="isSubmitting" class="w-full bg-gotik-yellow hover:bg-yellow-500 text-black font-bold text-lg rounded-2xl py-4 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center">
          <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSubmitting ? 'Processing...' : 'Continue' }}
        </button>
      </div>
    </form>

    <div class="absolute bottom-8 text-gray-500 text-xs tracking-wider">
      App Go-Tik V.0.1
    </div>
  </div>
</template>