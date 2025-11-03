<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const token = localStorage.getItem('token')
const goBackLabel = computed(() => (token ? 'Kembali ke Dashboard' : 'Kembali ke Login'))

function goBack() {
  if (token) router.push('/dashboard')
  else router.push('/')
}
</script>

<template>
  <div class="min-h-screen grid place-items-center bg-gray-50 p-6">
    <div class="text-center max-w-lg w-full bg-white shadow-md rounded-xl p-8">
      <h1 class="text-3xl font-bold mb-2">404 - Halaman Tidak Ditemukan</h1>
      <p class="text-gray-600 mb-6">Maaf, halaman yang Anda cari tidak tersedia.</p>
      <div class="text-sm text-gray-500 mb-6">
        <div>Path: <code class="bg-gray-100 px-2 py-1 rounded">{{ route.fullPath }}</code></div>
      </div>
      <button
        class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
        @click="goBack"
      >
        {{ goBackLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped></style>
