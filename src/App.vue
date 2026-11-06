<template>
  <router-view />
  <ToastHost />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { setUnauthorizedHandler } from '@/api/client';
import { useRouter } from 'vue-router';
import ToastHost from '@/components/ui/ToastHost.vue';

const auth = useAuthStore();
const router = useRouter();

onMounted(() => {
  // Восстанавливаем сессию из sessionStorage (если была)
  auth.initFromStorage();

  // При 401 — уводим на /login
  setUnauthorizedHandler(() => {
    auth.logout();
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login');
    }
  });
});
</script>
