<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChatApi } from '../api/chat'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const router = useRouter()

const onSubmit = async () => {
  error.value = null
  loading.value = true
  try {
    if (!email.value || !password.value) {
      throw new Error('Email dan password wajib diisi')
    }
    const { token, user } = await ChatApi.login(email.value, password.value)
    localStorage.setItem('token', token)
    localStorage.setItem('authUser', JSON.stringify(user))
    router.push('/dashboard')
  } catch (e: unknown) {
    const err = e as Error
    error.value = err?.message ?? 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white shadow-md rounded-lg p-6">
      <h1 class="text-2xl font-semibold text-center mb-6">Masuk</h1>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Kata Sandi</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="text-sm text-red-600">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full inline-flex justify-center items-center rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="!loading">Masuk</span>
          <span v-else>Mengirim…</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
